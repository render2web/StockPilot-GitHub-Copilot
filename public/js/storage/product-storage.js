import { DEFAULT_STOCK_MINIMO, validateProduct } from '../models/product.js';

export const STORAGE_KEY = 'stockpilot:products:v1';

export function createProductStorage(storage, key = STORAGE_KEY) {
  return {
    load() {
      if (!storage || typeof storage.getItem !== 'function') {
        return {
          products: null,
          warning: 'El almacenamiento local no está disponible. Los cambios solo se mantendrán en esta sesión.'
        };
      }

      let rawValue = null;
      try {
        rawValue = storage.getItem(key);
      } catch {
        return {
          products: null,
          warning: 'No se pudo acceder al almacenamiento local. Se usarán datos en memoria.'
        };
      }

      if (rawValue === null) {
        return { products: null, warning: null };
      }

      let parsed;
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        return {
          products: null,
          warning: 'Los datos guardados estaban dañados y se restauraron los productos de ejemplo.'
        };
      }

      if (!Array.isArray(parsed)) {
        return {
          products: null,
          warning: 'El formato de los datos guardados no era válido y se restauraron los productos de ejemplo.'
        };
      }

      const validProducts = [];
      let discardedCount = 0;
      let migratedLegacy = false;

      for (const item of parsed) {
        const isObject = item !== null && typeof item === 'object' && !Array.isArray(item);
        const needsDefaultMinStock = isObject && item.stockMinimo === undefined;
        const candidate = needsDefaultMinStock
          ? { ...item, stockMinimo: DEFAULT_STOCK_MINIMO }
          : item;

        const result = validateProduct(candidate);
        if (result.valid) {
          validProducts.push(result.value);
          if (needsDefaultMinStock) {
            migratedLegacy = true;
          }
        } else {
          discardedCount += 1;
        }
      }

      if (migratedLegacy && typeof storage.setItem === 'function') {
        try {
          storage.setItem(key, JSON.stringify(validProducts));
        } catch {
          // Si no se puede persistir la migración, se conservan los datos normalizados en memoria.
        }
      }

      const warning =
        discardedCount > 0
          ? 'Algunos registros inválidos fueron descartados al cargar el inventario.'
          : null;

      return {
        products: validProducts,
        warning
      };
    },

    save(products) {
      if (!storage || typeof storage.setItem !== 'function') {
        return {
          ok: false,
          warning: 'El almacenamiento local no está disponible. Los cambios no se pudieron guardar permanentemente.'
        };
      }

      try {
        storage.setItem(key, JSON.stringify(products));
        return { ok: true, warning: null };
      } catch {
        return {
          ok: false,
          warning: 'No se pudieron guardar los cambios en el almacenamiento local (espacio insuficiente o acceso denegado).'
        };
      }
    }
  };
}
