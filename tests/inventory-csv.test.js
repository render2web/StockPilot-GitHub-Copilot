import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateInventoryCsv } from '../public/js/models/inventory-csv.js';

const HEADER = '\uFEFFNombre,Categor\u00eda,Cantidad disponible,Stock m\u00ednimo\r\n';

function product(overrides = {}) {
  return { id: 'p1', name: 'Cuaderno', category: 'General', quantity: 12, stockMinimo: 5, ...overrides };
}

describe('inventory-csv', () => {
  it('genera las cuatro columnas en orden con BOM, comas y CRLF final', () => {
    assert.equal(generateInventoryCsv([
      product(),
      product({ id: 'p2', name: 'Agotado', quantity: 0, stockMinimo: 0 })
    ]), `${HEADER}Cuaderno,General,12,5\r\nAgotado,General,0,0\r\n`);
  });

  it('genera solo encabezados para un inventario vacio', () => {
    assert.equal(generateInventoryCsv([]), HEADER);
  });

  it('conserva Unicode y serializa bytes UTF-8 con un unico BOM inicial', () => {
    const csv = generateInventoryCsv([product({
      name: 'L\u00e1mpara \u00f1 \u{1F4E6}',
      category: '\u65e5\u672c',
      quantity: 10000
    })]);
    const expected = `${HEADER}L\u00e1mpara \u00f1 \u{1F4E6},\u65e5\u672c,10000,5\r\n`;
    assert.equal(csv, expected);
    const bytes = Buffer.from(csv, 'utf8');
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    assert.equal(bytes.toString('utf8'), expected);
    assert.equal(csv.split('\uFEFF').length, 2);
  });

  const escapedCases = [
    ['Con, coma', '"Con, coma"'],
    ['Dos "" comillas', '"Dos """" comillas"'],
    ['Linea\nsegunda', '"Linea\nsegunda"'],
    ['Linea\rsegunda', '"Linea\rsegunda"'],
    ['Linea\r\nsegunda', '"Linea\r\nsegunda"'],
    ['Texto, "citado"\r\nfinal', '"Texto, ""citado""\r\nfinal"'],
    ['=SUM(1,2)\r\n"otra"', '"\'=SUM(1,2)\r\n""otra"""'],
    ['Normal",=1+1,"otra', '"Normal"",=1+1,""otra"']
  ];

  for (const [value, expected] of escapedCases) {
    it(`escapa ambos campos sin romper celdas: ${JSON.stringify(value)}`, () => {
      assert.equal(generateInventoryCsv([product({ name: value, category: value })]),
        `${HEADER}${expected},${expected},12,5\r\n`);
    });
  }

  const dangerousCases = [
    ['=1+1', "'=1+1"],
    ['+1+1', "'+1+1"],
    ['-1+1', "'-1+1"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['  =1', "'  =1"],
    ['\u00a0+1', "'\u00a0+1"],
    ['\u2003-1', "'\u2003-1"],
    ['\u0000@SUM(A1)', "'\u0000@SUM(A1)"],
    ['\u007f=1', "'\u007f=1"],
    ['\u0085=1', "'\u0085=1"],
    ['\u200b=1', "'\u200b=1"],
    ['\uFEFF=1', "'\uFEFF=1"],
    ['\tTexto', "'\tTexto"],
    [' \tTexto', "' \tTexto"],
    ['\rTexto', '"\'\rTexto"'],
    [' \nTexto', '"\' \nTexto"'],
    ['\t \r\n=1', '"\'\t \r\n=1"']
  ];

  for (const [value, expected] of dangerousCases) {
    it(`neutraliza ambos campos antes de escapar: ${JSON.stringify(value)}`, () => {
      assert.equal(generateInventoryCsv([product({ name: value, category: value })]),
        `${HEADER}${expected},${expected},12,5\r\n`);
    });
  }

  it('no altera textos inocuos ni duplica un apostrofo existente', () => {
    for (const text of ['A=B', 'C++', 'A-B', 'a@b', "'=1+1", '  Normal', '123', 'A\tB']) {
      assert.equal(generateInventoryCsv([product({ name: text, category: text })]),
        `${HEADER}${text},${text},12,5\r\n`);
    }
  });

  it('no modifica ni reordena los productos', () => {
    const products = Object.freeze([
      Object.freeze(product({ name: '=1', category: 'Z' })),
      Object.freeze(product({ id: 'p2', name: 'A', category: 'A' }))
    ]);
    const snapshot = structuredClone(products);
    assert.equal(generateInventoryCsv(products), `${HEADER}'=1,Z,12,5\r\nA,A,12,5\r\n`);
    assert.deepEqual(products, snapshot);
  });

  it('no oculta una entrada invalida con una exportacion vacia', () => {
    assert.throws(() => generateInventoryCsv(null), TypeError);
  });
});
