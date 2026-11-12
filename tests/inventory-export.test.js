import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initInventoryExport } from '../public/js/ui/inventory-export.js';
import { createInventoryService } from '../public/js/services/inventory-service.js';
import { createProductStorage, STORAGE_KEY } from '../public/js/storage/product-storage.js';

const HEADER = '\uFEFFNombre,Categor\u00eda,Cantidad disponible,Stock m\u00ednimo\r\n';
const PRODUCTS = [
  { id: 'p1', name: 'L\u00e1mpara', category: 'Hogar', quantity: 3, stockMinimo: 5 },
  { id: 'p2', name: 'Taza', category: 'Hogar', quantity: 0, stockMinimo: 0 }
];

function createStorage(products = PRODUCTS) {
  const values = new Map([[STORAGE_KEY, JSON.stringify(products)]]);
  return {
    writes: 0,
    failSave: false,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      this.writes += 1;
      if (this.failSave) {
        throw new Error('Storage unavailable');
      }
      values.set(key, String(value));
    },
    snapshot() {
      return JSON.stringify([...values]);
    }
  };
}

function element(tagName = 'div') {
  const listeners = new Map();
  return {
    tagName,
    children: [],
    dataset: {},
    textContent: '',
    hidden: false,
    addEventListener(type, handler) {
      const handlers = listeners.get(type) ?? [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    dispatch(type) {
      for (const handler of listeners.get(type) ?? []) {
        handler();
      }
    },
    click() {
      this.dispatch('click');
    },
    appendChild(child) {
      if (child.tagName === 'fragment') {
        this.append(...child.children);
      } else {
        this.children.push(child);
        child.parent = this;
      }
      return child;
    },
    append(...children) {
      children.forEach((child) => this.appendChild(child));
    },
    replaceChildren(...children) {
      this.children = [];
      this.append(...children);
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    remove() {
      if (this.parent) {
        this.parent.children = this.parent.children.filter((child) => child !== this);
        this.parent = null;
      }
    }
  };
}

function stubGlobal(t, name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  t.after(() => {
    if (original) {
      Object.defineProperty(globalThis, name, original);
    } else {
      delete globalThis[name];
    }
  });
}

function createBrowser(t) {
  const ids = [
    'export-csv', 'export-status', 'product-filter', 'product-table-body',
    'table-container', 'empty-state', 'empty-state-title', 'empty-state-text',
    'stat-total-products', 'stat-total-units', 'storage-warning'
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, element()]));
  const body = element('body');
  const downloads = [];
  const urls = [];
  const revoked = [];
  const timers = [];
  const faults = {};
  const document = {
    readyState: 'complete',
    body,
    getElementById: (id) => elements[id] ?? null,
    createDocumentFragment: () => element('fragment'),
    createElement(tagName) {
      if (tagName === 'a' && faults.createLink) {
        throw new Error('Cannot create link');
      }
      const node = element(tagName);
      if (tagName === 'a') {
        node.click = () => {
          if (faults.click) {
            throw new Error('Cannot start download');
          }
          assert.ok(body.children.includes(node));
          assert.equal(revoked.includes(node.href), false);
          downloads.push({ href: node.href, filename: node.download });
        };
      }
      return node;
    }
  };
  stubGlobal(t, 'document', document);
  t.mock.method(URL, 'createObjectURL', (blob) => {
    if (faults.createUrl) {
      throw new Error('Cannot create URL');
    }
    const url = `blob:test-${urls.length}`;
    urls.push({ url, blob });
    return url;
  });
  t.mock.method(URL, 'revokeObjectURL', (url) => revoked.push(url));
  t.mock.method(globalThis, 'setTimeout', (callback, delay) => {
    timers.push({ callback, delay });
    return timers.length;
  });
  const errors = t.mock.method(console, 'error', () => {});

  return {
    elements, document, body, downloads, urls, revoked, timers, faults, errors,
    button: elements['export-csv'],
    statusElement: elements['export-status'],
    flushTimers() {
      for (const timer of timers.splice(0)) {
        assert.ok(timer.delay > 0);
        timer.callback();
      }
    },
    async content(index = urls.length - 1) {
      return Buffer.from(await urls[index].blob.arrayBuffer()).toString('utf8');
    }
  };
}

describe('inventory-export', () => {
  it('descarga un Blob UTF-8 con nombre exacto sin escribir ni modificar el servicio', async (t) => {
    const browser = createBrowser(t);
    const rawStorage = createStorage();
    const service = createInventoryService({ storage: createProductStorage(rawStorage) });
    service.init();
    const before = { products: service.list(), stats: service.getStats(), stored: rawStorage.snapshot() };
    const getProducts = t.mock.fn(() => service.list());
    initInventoryExport({ ...browser, getProducts });
    assert.equal(getProducts.mock.callCount(), 0);

    browser.button.click();
    assert.equal(getProducts.mock.callCount(), 1);
    assert.deepEqual(browser.downloads, [{ href: 'blob:test-0', filename: 'stockpilot-inventario.csv' }]);
    assert.ok(browser.urls[0].blob instanceof Blob);
    assert.equal(browser.urls[0].blob.type, 'text/csv;charset=utf-8');
    assert.equal(await browser.content(), `${HEADER}L\u00e1mpara,Hogar,3,5\r\nTaza,Hogar,0,0\r\n`);
    const bytes = new Uint8Array(await browser.urls[0].blob.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
    assert.deepEqual({ products: service.list(), stats: service.getStats(), stored: rawStorage.snapshot() }, before);
    assert.equal(rawStorage.writes, 0);
    assert.equal(browser.body.children.length, 0);
    assert.deepEqual(browser.revoked, []);
    assert.equal(browser.statusElement.hidden, true);
    browser.flushTimers();
    assert.deepEqual(browser.revoked, ['blob:test-0']);
  });

  it('consulta los cambios actuales tras agregar, vender y reponer aunque falle persistencia', async (t) => {
    const browser = createBrowser(t);
    const rawStorage = createStorage();
    const service = createInventoryService({ storage: createProductStorage(rawStorage) });
    service.init();
    initInventoryExport({ ...browser, getProducts: () => service.list() });
    const storedBefore = rawStorage.snapshot();
    rawStorage.failSave = true;

    assert.equal(service.add({ id: 'p3', name: '=1+1', category: '+1', quantity: 2, stockMinimo: 1 }).ok, true);
    browser.button.click();
    assert.equal(await browser.content(), `${HEADER}L\u00e1mpara,Hogar,3,5\r\nTaza,Hogar,0,0\r\n'=1+1,'+1,2,1\r\n`);
    assert.equal(service.sell('p1').ok, true);
    browser.button.click();
    assert.equal(await browser.content(), `${HEADER}L\u00e1mpara,Hogar,2,5\r\nTaza,Hogar,0,0\r\n'=1+1,'+1,2,1\r\n`);
    assert.equal(service.restock('p2').ok, true);
    const warning = service.getWarning();
    browser.button.click();
    assert.equal(await browser.content(), `${HEADER}L\u00e1mpara,Hogar,2,5\r\nTaza,Hogar,5,0\r\n'=1+1,'+1,2,1\r\n`);
    assert.ok(warning);
    assert.equal(service.getWarning(), warning);
    assert.equal(rawStorage.snapshot(), storedBefore);
    assert.equal(rawStorage.writes, 3);
    assert.equal(browser.downloads.length, 3);
    assert.equal(browser.body.children.length, 0);
    browser.flushTimers();
    assert.deepEqual(browser.revoked, ['blob:test-0', 'blob:test-1', 'blob:test-2']);
  });

  it('descarga solamente encabezados cuando el servicio esta vacio', async (t) => {
    const browser = createBrowser(t);
    const service = createInventoryService({ storage: createProductStorage(createStorage([])) });
    service.init();
    initInventoryExport({ ...browser, getProducts: () => service.list() });
    browser.button.click();
    assert.equal(await browser.content(), HEADER);
    assert.equal(browser.downloads.length, 1);
    browser.flushTimers();
  });

  for (const failure of ['getProducts', 'generateCsv', 'createUrl', 'createLink', 'click']) {
    it(`notifica ${failure}, limpia recursos y permite reintentar`, async (t) => {
      const browser = createBrowser(t);
      browser.faults[failure] = true;
      initInventoryExport({
        ...browser,
        getProducts() {
          if (browser.faults.getProducts) {
            throw new Error('Cannot read inventory');
          }
          return browser.faults.generateCsv ? null : PRODUCTS;
        }
      });
      browser.button.click();
      assert.equal(browser.statusElement.hidden, false);
      assert.match(browser.statusElement.textContent, /No se pudo exportar/);
      assert.equal(browser.errors.mock.callCount(), 1);
      assert.equal(browser.downloads.length, 0);
      assert.equal(browser.body.children.length, 0);
      browser.flushTimers();
      assert.deepEqual(browser.revoked, browser.urls.map(({ url }) => url));

      browser.faults[failure] = false;
      browser.button.click();
      assert.equal(browser.statusElement.hidden, true);
      assert.equal(browser.statusElement.textContent, '');
      assert.equal(browser.downloads.length, 1);
      assert.equal(await browser.content(), `${HEADER}L\u00e1mpara,Hogar,3,5\r\nTaza,Hogar,0,0\r\n`);
      browser.flushTimers();
      assert.deepEqual(browser.revoked, browser.urls.map(({ url }) => url));
    });
  }

  it('main conecta el inventario completo pese al filtro y una tabla vacia, sin alterar la vista', async (t) => {
    const browser = createBrowser(t);
    const rawStorage = createStorage();
    stubGlobal(t, 'window', { localStorage: rawStorage });
    await import('../public/js/main.js');
    const filter = browser.elements['product-filter'];
    const table = browser.elements['product-table-body'];
    const units = browser.elements['stat-total-units'];
    const warning = browser.elements['storage-warning'];
    assert.equal(table.children.length, 2);

    filter.value = 'out-of-stock';
    filter.dispatch('change');
    assert.equal(table.children.length, 1);
    assert.equal(table.children[0].dataset.productId, 'p2');
    const rowBefore = table.children[0];
    const storedBefore = rawStorage.snapshot();
    browser.button.click();
    assert.equal(await browser.content(), `${HEADER}L\u00e1mpara,Hogar,3,5\r\nTaza,Hogar,0,0\r\n`);
    assert.equal(table.children[0], rowBefore);
    assert.equal(filter.value, 'out-of-stock');
    assert.equal(units.textContent, '3');
    assert.equal(rawStorage.snapshot(), storedBefore);
    assert.equal(rawStorage.writes, 0);

    rawStorage.failSave = true;
    const restockButton = rowBefore.children[5].children[0].children[1];
    restockButton.click();
    assert.equal(table.children.length, 0);
    assert.equal(browser.elements['empty-state'].hidden, false);
    assert.equal(units.textContent, '8');
    assert.equal(warning.hidden, false);
    const warningBefore = warning.textContent;
    browser.button.click();
    assert.equal(await browser.content(), `${HEADER}L\u00e1mpara,Hogar,3,5\r\nTaza,Hogar,5,0\r\n`);
    assert.equal(filter.value, 'out-of-stock');
    assert.equal(table.children.length, 0);
    assert.equal(units.textContent, '8');
    assert.equal(warning.textContent, warningBefore);
    assert.equal(rawStorage.snapshot(), storedBefore);
    assert.equal(rawStorage.writes, 1);

    browser.faults.createUrl = true;
    browser.button.click();
    assert.equal(browser.statusElement.hidden, false);
    assert.equal(warning.textContent, warningBefore);
    assert.equal(warning.hidden, false);
    assert.equal(browser.body.children.length, 0);
    browser.flushTimers();
    assert.equal(browser.revoked.length, 2);
  });
});
