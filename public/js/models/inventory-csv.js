const HEADERS = 'Nombre,Categor\u00eda,Cantidad disponible,Stock m\u00ednimo';

function escapeText(value) {
  // Whitespace and invisible controls can hide a spreadsheet formula prefix.
  const protectedValue = /^[\s\p{Cc}\p{Cf}]*[=+\-@\t\r\n]/u.test(value)
    ? `'${value}`
    : value;

  return /[",\r\n]/u.test(protectedValue)
    ? `"${protectedValue.replaceAll('"', '""')}"`
    : protectedValue;
}

export function generateInventoryCsv(products) {
  const rows = products.map((product) => [
    escapeText(product.name),
    escapeText(product.category),
    product.quantity,
    product.stockMinimo
  ].join(','));

  return `\uFEFF${[HEADERS, ...rows].join('\r\n')}\r\n`;
}
