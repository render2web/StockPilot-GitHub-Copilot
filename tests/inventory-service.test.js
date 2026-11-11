import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
    }
  };
}

describe('inventory-service (Fases 1 y 2)', () => {
  it('carga los 4 productos de ejemplo en el primer uso, los persiste y calcula lowStockCount = 2', () => {
    const rawStorage = createFakeStorage();
    const storage = createProductStorage(rawStorage);
    const service = createInventoryService({ storage });

    const initResult = service.init();
    assert.equal(initResult.products.length, 4);
    assert.equal(initResult.warning, null);

    const stats = service.getStats();
    assert.equal(stats.totalProducts, 4);
    assert.equal(stats.totalUnits, 24 + 3 + 12 + 8);
    assert.equal(stats.totalCategories, 3);
    assert.equal(stats.lowStockCount, 2);
  });

  it('no duplica los productos de ejemplo en recargas posteriores', () => {
    const rawStorage = createFakeStorage();
    const storage = createProductStorage(rawStorage);

    const firstService = createInventoryService({ storage });
    firstService.init();
    firstService.add({ name: 'Archivador', category: 'Papelería', quantity: 6, stockMinimo: 5 });

    const secondService = createInventoryService({ storage });
    const secondInit = secondService.init();

    assert.equal(secondInit.products.length, 5);
    assert.equal(secondService.getStats().totalProducts, 5);
  });

  it('agrega un producto válido con cantidad superior al mínimo sin incrementar lowStockCount', () => {
    const rawStorage = createFakeStorage();
    const storage = createProductStorage(rawStorage);
    const service = createInventoryService({ storage });
    service.init();

    const addResult = service.add({
      name: 'Lámpara LED',
      category: 'Iluminación',
      quantity: '15',
      stockMinimo: '5'
    });

    assert.equal(addResult.ok, true);
    assert.equal(addResult.product.name, 'Lámpara LED');
    assert.equal(addResult.product.quantity, 15);
    assert.equal(addResult.product.stockMinimo, 5);

    const stats = service.getStats();
    assert.equal(stats.totalProducts, 5);
    assert.equal(stats.totalUnits, 47 + 15);
    assert.equal(stats.totalCategories, 4);
    assert.equal(stats.lowStockCount, 2);
  });

  it('calcula lowStockCount correctamente con cantidades superiores, iguales, inferiores al mínimo y en cero', () => {
    const rawStorage = createFakeStorage();
    const storage = createProductStorage(rawStorage);
    const customSeed = [
      { id: '1', name: 'Superior', category: 'General', quantity: 10, stockMinimo: 5 },
      { id: '2', name: 'Igual', category: 'General', quantity: 5, stockMinimo: 5 },
      { id: '3', name: 'Inferior', category: 'General', quantity: 3, stockMinimo: 5 },
      { id: '4', name: 'Agotado', category: 'General', quantity: 0, stockMinimo: 5 },
      { id: '5', name: 'Agotado min 0', category: 'General', quantity: 0, stockMinimo: 0 }
    ];
    const service = createInventoryService({ storage, seedProducts: customSeed });
    service.init();

    assert.equal(service.getStats().lowStockCount, 4);

    service.add({ name: 'Nuevo igual', category: 'General', quantity: 4, stockMinimo: 4 });
    assert.equal(service.getStats().lowStockCount, 5);

    service.add({ name: 'Nuevo inferior', category: 'General', quantity: 1, stockMinimo: 4 });
    assert.equal(service.getStats().lowStockCount, 6);

    service.add({ name: 'Nuevo en cero', category: 'General', quantity: 0, stockMinimo: 2 });
    assert.equal(service.getStats().lowStockCount, 7);

    service.add({ name: 'Nuevo superior', category: 'General', quantity: 9, stockMinimo: 2 });
    assert.equal(service.getStats().lowStockCount, 7);
  });

  it('rechaza un producto inválido o sin stockMinimo válido sin modificar la lista ni persistir', () => {
    const rawStorage = createFakeStorage();
    const storage = createProductStorage(rawStorage);
    const service = createInventoryService({ storage });
    service.init();

    const invalidAdd = service.add({
      name: '   ',
      category: 'Papelería',
      quantity: -5,
      stockMinimo: -1
    });

    assert.equal(invalidAdd.ok, false);
    assert.ok(invalidAdd.errors.name);
    assert.ok(invalidAdd.errors.quantity);
    assert.ok(invalidAdd.errors.stockMinimo);
    assert.equal(service.list().length, 4);

    const missingMinStockAdd = service.add({
      name: 'Agenda',
      category: 'Papelería',
      quantity: 10,
      stockMinimo: ''
    });

    assert.equal(missingMinStockAdd.ok, false);
    assert.ok(missingMinStockAdd.errors.stockMinimo);
    assert.equal(service.list().length, 4);
  });

  it('conserva compatibilidad con productos guardados en Fase 1 sin stockMinimo', () => {
    const rawStorage = createFakeStorage();
    rawStorage.setItem(
      'stockpilot:products:v1',
      JSON.stringify([
        { id: 'f1-1', name: 'Resma A4', category: 'Papelería', quantity: 10 },
        { id: 'f1-2', name: 'Tóner', category: 'Impresión', quantity: 5 },
        { id: 'f1-3', name: 'Grapas', category: 'Papelería', quantity: 0 }
      ])
    );
    const storage = createProductStorage(rawStorage);
    const service = createInventoryService({ storage });

    const initResult = service.init();
    assert.equal(initResult.products.length, 3);
    assert.equal(initResult.products[0].stockMinimo, 5);
    assert.equal(initResult.products[1].stockMinimo, 5);
    assert.equal(initResult.products[2].stockMinimo, 5);
    assert.equal(service.getStats().lowStockCount, 2);
  });

  it('restaura los 4 productos de ejemplo si localStorage contiene JSON corrupto', () => {
    const rawStorage = createFakeStorage();
    rawStorage.setItem('stockpilot:products:v1', '{{{corrupto');
    const storage = createProductStorage(rawStorage);
    const service = createInventoryService({ storage });

    const initResult = service.init();
    assert.equal(initResult.products.length, 4);
    assert.ok(initResult.warning);
  });

  it('repone +5 unidades a un producto existente, persiste el cambio y actualiza estadísticas y alertas de stock bajo', () => {
    const rawStorage = createFakeStorage();
    const storage = createProductStorage(rawStorage);
    const service = createInventoryService({ storage });
    service.init();

    // 'seed-boligrafo-azul' inicia con quantity: 3, stockMinimo: 5 (lowStockCount = 2, totalUnits = 47)
    const restockResult = service.restock('seed-boligrafo-azul');
    assert.equal(restockResult.ok, true);
    assert.equal(restockResult.error, null);
    assert.equal(restockResult.product.id, 'seed-boligrafo-azul');
    assert.equal(restockResult.product.quantity, 8);

    const statsAfterFirst = service.getStats();
    assert.equal(statsAfterFirst.totalUnits, 47 + 5);
    assert.equal(statsAfterFirst.lowStockCount, 1);

    // 'seed-cafe-molido-500g' inicia con quantity: 12, stockMinimo: 12 -> tras +5 pasa a 17 (ok)
    const secondRestock = service.restock('seed-cafe-molido-500g', 5);
    assert.equal(secondRestock.ok, true);
    assert.equal(secondRestock.product.quantity, 17);

    const statsAfterSecond = service.getStats();
    assert.equal(statsAfterSecond.totalUnits, 47 + 10);
    assert.equal(statsAfterSecond.lowStockCount, 0);

    // Verifica persistencia recargando desde un nuevo servicio
    const reloadedService = createInventoryService({ storage });
    const reloadedInit = reloadedService.init();
    const reloadedBoligrafo = reloadedInit.products.find((p) => p.id === 'seed-boligrafo-azul');
    const reloadedCafe = reloadedInit.products.find((p) => p.id === 'seed-cafe-molido-500g');

    assert.equal(reloadedBoligrafo.quantity, 8);
    assert.equal(reloadedCafe.quantity, 17);
    assert.equal(reloadedService.getStats().lowStockCount, 0);
  });

  it('rechaza la reposición si el producto no existe o la cantidad es inválida sin alterar el inventario', () => {
    const rawStorage = createFakeStorage();
    const storage = createProductStorage(rawStorage);
    const service = createInventoryService({ storage });
    service.init();

    const notFoundResult = service.restock('id-inexistente', 5);
    assert.equal(notFoundResult.ok, false);
    assert.equal(notFoundResult.product, null);

    const invalidAmountResult = service.restock('seed-cuaderno-a5', 0);
    assert.equal(invalidAmountResult.ok, false);
    assert.equal(invalidAmountResult.product, null);

    assert.equal(service.getStats().totalUnits, 47);
  });

  it('registra la venta de 1 unidad, persiste el cambio y actualiza las alertas de inventario bajo', () => {
    const rawStorage = createFakeStorage();
    const storage = createProductStorage(rawStorage);
    const customSeed = [
      { id: 'prod-1', name: 'Teclado', category: 'Electrónica', quantity: 6, stockMinimo: 5 },
      { id: 'prod-2', name: 'Ratón', category: 'Electrónica', quantity: 1, stockMinimo: 2 }
    ];
    const service = createInventoryService({ storage, seedProducts: customSeed });
    service.init();

    assert.equal(service.getStats().totalUnits, 7);
    assert.equal(service.getStats().lowStockCount, 1);

    // 'prod-1' pasa de 6 (ok) a 5 (low -> igual a stockMinimo)
    const firstSale = service.sell('prod-1');
    assert.equal(firstSale.ok, true);
    assert.equal(firstSale.error, null);
    assert.equal(firstSale.product.quantity, 5);
    assert.equal(service.getStats().totalUnits, 6);
    assert.equal(service.getStats().lowStockCount, 2);

    // 'prod-2' pasa de 1 (low) a 0 (out)
    const secondSale = service.sell('prod-2', 1);
    assert.equal(secondSale.ok, true);
    assert.equal(secondSale.product.quantity, 0);
    assert.equal(service.getStats().totalUnits, 5);
    assert.equal(service.getStats().lowStockCount, 2);

    // Verifica persistencia en almacenamiento
    const reloadedService = createInventoryService({ storage, seedProducts: customSeed });
    const reloaded = reloadedService.init();
    assert.equal(reloaded.products.find((p) => p.id === 'prod-1').quantity, 5);
    assert.equal(reloaded.products.find((p) => p.id === 'prod-2').quantity, 0);
  });

  it('impide registrar una venta cuando el producto tiene 0 unidades y nunca permite existencias negativas', () => {
    const rawStorage = createFakeStorage();
    const storage = createProductStorage(rawStorage);
    const customSeed = [
      { id: 'prod-out', name: 'Agotado', category: 'General', quantity: 0, stockMinimo: 5 },
      { id: 'prod-one', name: 'Última unidad', category: 'General', quantity: 1, stockMinimo: 5 }
    ];
    const service = createInventoryService({ storage, seedProducts: customSeed });
    service.init();

    // Venta sobre producto con 0 unidades debe fallar y mantener quantity en 0
    const zeroStockSale = service.sell('prod-out');
    assert.equal(zeroStockSale.ok, false);
    assert.equal(zeroStockSale.product, null);
    assert.ok(zeroStockSale.error);
    assert.equal(service.list().find((p) => p.id === 'prod-out').quantity, 0);

    // Vender la última unidad de 'prod-one' deja existencias en 0
    const validSale = service.sell('prod-one');
    assert.equal(validSale.ok, true);
    assert.equal(validSale.product.quantity, 0);

    // Intentar vender nuevamente sobre 'prod-one' en 0 debe rechazarse sin pasar a -1
    const negativeAttempt = service.sell('prod-one');
    assert.equal(negativeAttempt.ok, false);
    assert.equal(negativeAttempt.product, null);
    assert.equal(service.list().find((p) => p.id === 'prod-one').quantity, 0);
    assert.equal(service.getStats().totalUnits, 0);

    // Verifica que tras vender hasta 0 aún se puede reponer +5 normalmente
    const restockAfterOut = service.restock('prod-one', 5);
    assert.equal(restockAfterOut.ok, true);
    assert.equal(restockAfterOut.product.quantity, 5);
  });
});
