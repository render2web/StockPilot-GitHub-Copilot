import { getStockStatus } from './stock-status.js';

export const PRODUCT_FILTERS = Object.freeze({
  ALL: 'all',
  OUT_OF_STOCK: 'out-of-stock'
});

const EMPTY_MESSAGES = Object.freeze({
  noProducts: Object.freeze({
    title: 'No hay productos registrados',
    text: 'Utiliza el formulario para agregar el primer producto al inventario.'
  }),
  noOutOfStock: Object.freeze({
    title: 'No hay productos agotados',
    text: 'Todos los productos tienen existencias. Selecciona "Todos" para ver el inventario completo.'
  })
});

export function normalizeProductFilter(filter) {
  return filter === PRODUCT_FILTERS.OUT_OF_STOCK ? PRODUCT_FILTERS.OUT_OF_STOCK : PRODUCT_FILTERS.ALL;
}

export function isOutOfStock(product) {
  return getStockStatus(product) === 'out';
}

// Devuelve siempre un arreglo nuevo: nunca modifica la lista recibida.
export function filterProducts(products, filter = PRODUCT_FILTERS.ALL) {
  if (!Array.isArray(products)) {
    return [];
  }

  if (normalizeProductFilter(filter) === PRODUCT_FILTERS.OUT_OF_STOCK) {
    return products.filter(isOutOfStock);
  }

  return [...products];
}

export function getEmptyStateMessage(filter, totalProducts) {
  const isFiltering = normalizeProductFilter(filter) === PRODUCT_FILTERS.OUT_OF_STOCK;
  return isFiltering && totalProducts > 0 ? EMPTY_MESSAGES.noOutOfStock : EMPTY_MESSAGES.noProducts;
}
