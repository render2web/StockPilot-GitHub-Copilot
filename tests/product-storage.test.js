import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createProductStorage, STORAGE_KEY } from '../public/js/storage/product-storage.js';

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    dump() {
      return Object.fromEntries(map.entries());
    }
  };
}

describe('product-storage (Fases 1 y 2)', () => {
  it('usa la clave versionada stockpilot:products:v1 por defecto', () => {
    assert.equal(STORAGE_KEY, 'stockpilot:products:v1');
  });

  it('devuelve products: null sin advertencia cuando el almacenamiento está vacío', () => {
    const fakeStorage = createMemoryStorage();
    const productStorage = createProductStorage(fakeStorage);

    const result = productStorage.load();
    assert.equal(result.products, null);
    assert.equal(result.warning, null);
  });

  it('guarda y recupera productos con stockMinimo correctamente en ida y vuelta', () => {
    const fakeStorage = createMemoryStorage();
    const productStorage = createProductStorage(fakeStorage);

    const sample = [
      { id: 'p1', name: 'Teclado', category: 'Electrónica', quantity: 10, stockMinimo: 4 },
      { id: 'p2', name: 'Ratón', category: 'Electrónica', quantity: 0, stockMinimo: 2 }
    ];

    const saveResult = productStorage.save(sample);
    assert.equal(saveResult.ok, true);
    assert.ok(fakeStorage.getItem(STORAGE_KEY));

    const loadResult = productStorage.load();
    assert.deepEqual(loadResult.products, sample);
    assert.equal(loadResult.warning, null);
  });

  it('carga productos guardados en la Fase 1 (sin stockMinimo) asignando el valor predeterminado 5 y persiste la normalización', () => {
    const legacyProducts = [
      { id: 'legacy-1', name: 'Cuaderno', category: 'Papelería', quantity: 14 },
      { id: 'legacy-2', name: 'Lápiz', category: 'Papelería', quantity: 2 }
    ];
    const fakeStorage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify(legacyProducts)
    });
    const productStorage = createProductStorage(fakeStorage);

    const loadResult = productStorage.load();
    assert.equal(loadResult.warning, null);
    assert.deepEqual(loadResult.products, [
      { id: 'legacy-1', name: 'Cuaderno', category: 'Papelería', quantity: 14, stockMinimo: 5 },
      { id: 'legacy-2', name: 'Lápiz', category: 'Papelería', quantity: 2, stockMinimo: 5 }
    ]);

    const persistedAfterLoad = JSON.parse(fakeStorage.getItem(STORAGE_KEY));
    assert.equal(persistedAfterLoad[0].stockMinimo, 5);
    assert.equal(persistedAfterLoad[1].stockMinimo, 5);
  });

  it('descarta elementos con stockMinimo presente pero inválido sin romper la carga', () => {
    const fakeStorage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify([
        { id: 'ok-1', name: 'Monitor', category: 'Electrónica', quantity: 4, stockMinimo: 2 },
        { id: 'bad-min-1', name: 'Cable', category: 'Electrónica', quantity: 4, stockMinimo: -1 },
        { id: 'bad-min-2', name: 'Adaptador', category: 'Electrónica', quantity: 4, stockMinimo: 'invalido' },
        { id: 'bad-min-3', name: 'Hub USB', category: 'Electrónica', quantity: 4, stockMinimo: null }
      ])
    });
    const productStorage = createProductStorage(fakeStorage);

    const result = productStorage.load();
    assert.equal(result.products.length, 1);
    assert.equal(result.products[0].id, 'ok-1');
    assert.equal(result.products[0].stockMinimo, 2);
    assert.ok(result.warning);
  });

  it('maneja JSON corrupto devolviendo products: null y una advertencia', () => {
    const fakeStorage = createMemoryStorage({
      [STORAGE_KEY]: '{json-corrupto'
    });
    const productStorage = createProductStorage(fakeStorage);

    const result = productStorage.load();
    assert.equal(result.products, null);
    assert.ok(result.warning);
  });

  it('descarta elementos inválidos dentro del arreglo guardado y conserva los válidos', () => {
    const fakeStorage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify([
        { id: 'ok-1', name: 'Monitor', category: 'Electrónica', quantity: 4, stockMinimo: 3 },
        { id: 'bad-1', name: '', category: 'Electrónica', quantity: 4, stockMinimo: 3 },
        { id: 'bad-2', name: 'Silla', category: 'Muebles', quantity: -3, stockMinimo: 3 }
      ])
    });
    const productStorage = createProductStorage(fakeStorage);

    const result = productStorage.load();
    assert.equal(result.products.length, 1);
    assert.equal(result.products[0].name, 'Monitor');
    assert.ok(result.warning);
  });

  it('controla errores de escritura (cuota excedida) sin lanzar excepción', () => {
    const throwingStorage = {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error('QuotaExceededError');
      }
    };
    const productStorage = createProductStorage(throwingStorage);

    const result = productStorage.save([{ id: '1', name: 'A', category: 'B', quantity: 1, stockMinimo: 5 }]);
    assert.equal(result.ok, false);
    assert.ok(result.warning);
  });
});
