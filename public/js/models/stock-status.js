export function getStockStatus(product) {
  const quantity = Number(product?.quantity);
  const stockMinimo = Number(product?.stockMinimo);

  if (quantity <= 0) {
    return 'out';
  }

  if (quantity <= stockMinimo) {
    return 'low';
  }

  return 'ok';
}

export function isLowStock(product) {
  return getStockStatus(product) !== 'ok';
}
