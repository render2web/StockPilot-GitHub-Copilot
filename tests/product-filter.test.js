import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_FILTERS,
  filterProducts,
  getEmptyStateMessage,
  isOutOfStock,
  normalizeProductFilter
} from '../public/js/models/product-filter.js';
import { createProductStorage } from '../public/js/storage/product-storage.js';
import { createInventoryService } from '../public/js/services/inventory-service.js';

function createFakeStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    snapshot() {
      return JSON.stringify(Array.from(store.entries()));
    }
  };
}

function createSampleProducts() {
  return [
    { id: 'p1', name: 'Cuaderno', category: 'Papelería', quantity: 10, stockMinimo: 5 },
    { id: 'p2', name: 'Bolígrafo', category: 'Papelería', quantity: 0, stockMinimo: 5 },
    { id: 'p3', name: 'Taza', category: 'Hogar', quantity: 2, stockMinimo: 5 },
    { id: 'p4', name: 'Lámpara', category: 'Hogar', quantity: 0, stockMinimo: 0 }
  ];
}

function createServiceWith(products) {
  const rawStorage = createFakeStorage();
  const service = createInventoryService({
    storage: createProductStorage(rawStorage),
    seedProducts: products
  });
  service.init();
  return { service, rawStorage };
}

function outOfStockIds(service) {
  return filterProducts(service.list(), PRODUCT_FILTERS.OUT_OF_STOCK).map((product) => product.id);
}

describe('product-filter: filtro de productos agotados', () => {
  it('"Solo agotados" devuelve únicamente productos con cantidad igual a cero', () => {
    const result = filterProducts(createSampleProducts(), PRODUCT_FILTERS.OUT_OF_STOCK);

    assert.deepEqual(result.map((product) => product.id), ['p2', 'p4']);
    assert.ok(result.every((product) => product.quantity === 0));
  });

  it('"Solo agotados" no incluye productos con stock bajo pero con existencias', () => {
    const result = filterProducts(createSampleProducts(), PRODUCT_FILTERS.OUT_OF_STOCK);

    assert.equal(result.some((product) => product.id === 'p3'), false);
    assert.equal(isOutOfStock({ quantity: 1, stockMinimo: 5 }), false);
    assert.equal(isOutOfStock({ quantity: 0, stockMinimo: 5 }), true);
  });

  it('"Todos" devuelve el inventario completo en el mismo orden', () => {
    const products = createSampleProducts();

    assert.deepEqual(filterProducts(products, PRODUCT_FILTERS.ALL), products);
    assert.deepEqual(filterProducts(products), products);
  });

  it('volver a "Todos" tras "Solo agotados" muestra de nuevo el inventario completo', () => {
    const products = createSampleProducts();

    assert.equal(filterProducts(products, PRODUCT_FILTERS.OUT_OF_STOCK).length, 2);
    assert.equal(filterProducts(products, PRODUCT_FILTERS.ALL).length, 4);
  });

  it('no modifica la lista ni los productos recibidos', () => {
    const products = createSampleProducts();
    const before = JSON.parse(JSON.stringify(products));

    const all = filterProducts(products, PRODUCT_FILTERS.ALL);
    const out = filterProducts(products, PRODUCT_FILTERS.OUT_OF_STOCK);

    assert.deepEqual(products, before);
    assert.notEqual(all, products);
    assert.notEqual(out, products);
  });

  it('devuelve una lista vacía cuando no hay agotados o la entrada no es válida', () => {
    const inStock = [{ id: 'p1', name: 'Cuaderno', category: 'Papelería', quantity: 3, stockMinimo: 5 }];

    assert.deepEqual(filterProducts(inStock, PRODUCT_FILTERS.OUT_OF_STOCK), []);
    assert.deepEqual(filterProducts([], PRODUCT_FILTERS.OUT_OF_STOCK), []);
    assert.deepEqual(filterProducts(null, PRODUCT_FILTERS.OUT_OF_STOCK), []);
    assert.deepEqual(filterProducts(undefined), []);
  });

  it('trata un filtro desconocido como "Todos"', () => {
    assert.equal(normalizeProductFilter('out-of-stock'), PRODUCT_FILTERS.OUT_OF_STOCK);
    assert.equal(normalizeProductFilter('all'), PRODUCT_FILTERS.ALL);
    assert.equal(normalizeProductFilter('desconocido'), PRODUCT_FILTERS.ALL);
    assert.equal(normalizeProductFilter(undefined), PRODUCT_FILTERS.ALL);
    assert.equal(filterProducts(createSampleProducts(), 'desconocido').length, 4);
  });

  it('elige el mensaje de estado vacío según el filtro y el inventario', () => {
    const noProducts = getEmptyStateMessage(PRODUCT_FILTERS.ALL, 0);
    const noOutOfStock = getEmptyStateMessage(PRODUCT_FILTERS.OUT_OF_STOCK, 3);

    assert.equal(noProducts.title, 'No hay productos registrados');
    assert.equal(noOutOfStock.title, 'No hay productos agotados');
    assert.equal(getEmptyStateMessage(PRODUCT_FILTERS.OUT_OF_STOCK, 0).title, noProducts.title);
  });
});

describe('product-filter: integración con inventory-service', () => {
  it('un producto aparece en "Solo agotados" al venderse su última unidad', () => {
    const { service } = createServiceWith([
      { id: 'p1', name: 'Cuaderno', category: 'Papelería', quantity: 1, stockMinimo: 5 },
      { id: 'p2', name: 'Taza', category: 'Hogar', quantity: 4, stockMinimo: 2 }
    ]);

    assert.deepEqual(outOfStockIds(service), []);

    assert.equal(service.sell('p1', 1).ok, true);

    assert.deepEqual(outOfStockIds(service), ['p1']);
  });

  it('un producto desaparece de "Solo agotados" al reponerse', () => {
    const { service } = createServiceWith([
      { id: 'p1', name: 'Cuaderno', category: 'Papelería', quantity: 0, stockMinimo: 5 },
      { id: 'p2', name: 'Taza', category: 'Hogar', quantity: 0, stockMinimo: 2 }
    ]);

    assert.deepEqual(outOfStockIds(service), ['p1', 'p2']);

    assert.equal(service.restock('p1', 5).ok, true);

    assert.deepEqual(outOfStockIds(service), ['p2']);
    assert.equal(filterProducts(service.list(), PRODUCT_FILTERS.ALL).length, 2);
  });

  it('aplicar filtros no modifica el inventario del servicio ni los datos almacenados', () => {
    const { service, rawStorage } = createServiceWith(createSampleProducts());
    const storedBefore = rawStorage.snapshot();
    const listBefore = service.list();
    const statsBefore = service.getStats();

    filterProducts(service.list(), PRODUCT_FILTERS.OUT_OF_STOCK);
    filterProducts(service.list(), PRODUCT_FILTERS.ALL);
    filterProducts(service.list(), PRODUCT_FILTERS.OUT_OF_STOCK);

    assert.equal(rawStorage.snapshot(), storedBefore);
    assert.deepEqual(service.list(), listBefore);
    assert.deepEqual(service.getStats(), statsBefore);
  });
});
