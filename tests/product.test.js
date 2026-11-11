import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProduct,
  DEFAULT_STOCK_MINIMO,
  validateProduct
} from '../public/js/models/product.js';

describe('product model (Fases 1 y 2)', () => {
  it('expone DEFAULT_STOCK_MINIMO igual a 5', () => {
    assert.equal(DEFAULT_STOCK_MINIMO, 5);
  });

  it('normaliza espacios y convierte cantidad y stockMinimo en texto a enteros', () => {
    const product = createProduct({
      name: '  Cuaderno A5  ',
      category: '  Papelería ',
      quantity: ' 24 ',
      stockMinimo: ' 10 '
    });

    assert.equal(product.name, 'Cuaderno A5');
    assert.equal(product.category, 'Papelería');
    assert.equal(product.quantity, 24);
    assert.equal(product.stockMinimo, 10);
    assert.equal(typeof product.id, 'string');
    assert.ok(product.id.length > 0);
  });

  it('acepta cantidad igual a 0 y stockMinimo igual a 0 como válidos', () => {
    const result = validateProduct({
      name: 'Grapadora',
      category: 'Oficina',
      quantity: 0,
      stockMinimo: 0
    });

    assert.equal(result.valid, true);
    assert.equal(result.value.quantity, 0);
    assert.equal(result.value.stockMinimo, 0);
  });

  it('genera identificadores únicos cuando no se proporciona id', () => {
    const p1 = createProduct({ name: 'Prod 1', category: 'Cat', quantity: 1, stockMinimo: 5 });
    const p2 = createProduct({ name: 'Prod 2', category: 'Cat', quantity: 2, stockMinimo: 5 });

    assert.notEqual(p1.id, p2.id);
  });

  it('rechaza nombre o categoría vacíos o de solo espacios', () => {
    const result = validateProduct({
      name: '   ',
      category: '',
      quantity: 5,
      stockMinimo: 5
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.name);
    assert.ok(result.errors.category);
    assert.equal(result.value, null);
  });

  it('rechaza cantidades negativas, decimales, NaN o texto no numérico', () => {
    const invalidQuantities = [-1, '-5', 3.5, '2.5', NaN, Infinity, 'abc', '', null, undefined];

    for (const qty of invalidQuantities) {
      const result = validateProduct({
        name: 'Producto',
        category: 'General',
        quantity: qty,
        stockMinimo: 5
      });

      assert.equal(result.valid, false, `Debería fallar para quantity=${String(qty)}`);
      assert.ok(result.errors.quantity);
    }
  });

  it('rechaza stockMinimo vacío, negativo, decimal, NaN o texto no numérico', () => {
    const invalidMinStocks = [-1, '-3', 1.5, '4.2', NaN, Infinity, 'xyz', '', '   ', null, undefined];

    for (const minStock of invalidMinStocks) {
      const result = validateProduct({
        name: 'Producto',
        category: 'General',
        quantity: 10,
        stockMinimo: minStock
      });

      assert.equal(result.valid, false, `Debería fallar para stockMinimo=${String(minStock)}`);
      assert.ok(result.errors.stockMinimo);
    }
  });

  it('createProduct lanza un Error con detalle de campos cuando los datos son inválidos', () => {
    assert.throws(
      () => createProduct({ name: '', category: 'Cat', quantity: -2, stockMinimo: -1 }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.errors.name);
        assert.ok(err.errors.quantity);
        assert.ok(err.errors.stockMinimo);
        return true;
      }
    );
  });
});
