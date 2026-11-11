import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getStockStatus, isLowStock } from '../public/js/models/stock-status.js';

describe('stock-status model (Fase 2)', () => {
  it('clasifica cantidad superior al mínimo como ok y no es inventario bajo (10 vs 5)', () => {
    const product = { quantity: 10, stockMinimo: 5 };
    assert.equal(getStockStatus(product), 'ok');
    assert.equal(isLowStock(product), false);
  });

  it('clasifica cantidad justo por encima del mínimo como ok y no es inventario bajo (6 vs 5)', () => {
    const product = { quantity: 6, stockMinimo: 5 };
    assert.equal(getStockStatus(product), 'ok');
    assert.equal(isLowStock(product), false);
  });

  it('clasifica cantidad igual al mínimo como low y sí es inventario bajo (5 vs 5)', () => {
    const product = { quantity: 5, stockMinimo: 5 };
    assert.equal(getStockStatus(product), 'low');
    assert.equal(isLowStock(product), true);
  });

  it('clasifica cantidad inferior al mínimo como low y sí es inventario bajo (3 vs 5)', () => {
    const product = { quantity: 3, stockMinimo: 5 };
    assert.equal(getStockStatus(product), 'low');
    assert.equal(isLowStock(product), true);
  });

  it('clasifica cantidad positiva con mínimo 0 como ok y no es inventario bajo (1 vs 0)', () => {
    const product = { quantity: 1, stockMinimo: 0 };
    assert.equal(getStockStatus(product), 'ok');
    assert.equal(isLowStock(product), false);
  });

  it('clasifica existencias en cero como out y sí es inventario bajo (0 vs 5)', () => {
    const product = { quantity: 0, stockMinimo: 5 };
    assert.equal(getStockStatus(product), 'out');
    assert.equal(isLowStock(product), true);
  });

  it('clasifica existencias en cero con mínimo 0 como out y sí es inventario bajo (0 vs 0)', () => {
    const product = { quantity: 0, stockMinimo: 0 };
    assert.equal(getStockStatus(product), 'out');
    assert.equal(isLowStock(product), true);
  });
});
