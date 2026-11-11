import { SEED_PRODUCTS } from '../data/seed-products.js';
import { validateProduct } from '../models/product.js';
import { isLowStock } from '../models/stock-status.js';

export function createInventoryService({ storage, seedProducts = SEED_PRODUCTS } = {}) {
  let products = [];
  let lastWarning = null;

  function cloneProduct(product) {
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      stockMinimo: product.stockMinimo
    };
  }

  return {
    init() {
      const loadResult = storage ? storage.load() : { products: null, warning: null };
      lastWarning = loadResult.warning || null;

      if (Array.isArray(loadResult.products)) {
        products = loadResult.products.map(cloneProduct);
      } else {
        products = seedProducts.map((item) => {
          const validated = validateProduct(item);
          return validated.valid ? validated.value : cloneProduct(item);
        });

        if (storage) {
          const saveResult = storage.save(products);
          if (!saveResult.ok && !lastWarning) {
            lastWarning = saveResult.warning;
          }
        }
      }

      return {
        products: this.list(),
        warning: lastWarning
      };
    },

    list() {
      return products.map(cloneProduct);
    },

    add(input) {
      const validation = validateProduct(input);
      if (!validation.valid) {
        return {
          ok: false,
          errors: validation.errors,
          product: null,
          warning: null
        };
      }

      const newProduct = validation.value;
      products = [...products, newProduct];

      let warning = null;
      if (storage) {
        const saveResult = storage.save(products);
        if (!saveResult.ok) {
          warning = saveResult.warning;
          lastWarning = warning;
        }
      }

      return {
        ok: true,
        errors: {},
        product: cloneProduct(newProduct),
        warning
      };
    },

    restock(productId, amount = 5) {
      const normalizedId = typeof productId === 'string' ? productId.trim() : '';
      const isValidAmount =
        typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0;

      if (!normalizedId || !isValidAmount) {
        return {
          ok: false,
          error: 'Parámetros de reposición inválidos.',
          product: null,
          warning: null
        };
      }

      const index = products.findIndex((item) => item.id === normalizedId);
      if (index === -1) {
        return {
          ok: false,
          error: 'Producto no encontrado.',
          product: null,
          warning: null
        };
      }

      const current = products[index];
      const updatedProduct = {
        ...current,
        quantity: current.quantity + amount
      };

      products = products.map((item, idx) => (idx === index ? updatedProduct : item));

      let warning = null;
      if (storage) {
        const saveResult = storage.save(products);
        if (!saveResult.ok) {
          warning = saveResult.warning;
          lastWarning = warning;
        }
      }

      return {
        ok: true,
        error: null,
        product: cloneProduct(updatedProduct),
        warning
      };
    },

    sell(productId, amount = 1) {
      const normalizedId = typeof productId === 'string' ? productId.trim() : '';
      const isValidAmount =
        typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0;

      if (!normalizedId || !isValidAmount) {
        return {
          ok: false,
          error: 'Parámetros de venta inválidos.',
          product: null,
          warning: null
        };
      }

      const index = products.findIndex((item) => item.id === normalizedId);
      if (index === -1) {
        return {
          ok: false,
          error: 'Producto no encontrado.',
          product: null,
          warning: null
        };
      }

      const current = products[index];
      if (current.quantity <= 0 || current.quantity < amount) {
        return {
          ok: false,
          error: 'No hay existencias suficientes para registrar la venta.',
          product: null,
          warning: null
        };
      }

      const updatedProduct = {
        ...current,
        quantity: current.quantity - amount
      };

      products = products.map((item, idx) => (idx === index ? updatedProduct : item));

      let warning = null;
      if (storage) {
        const saveResult = storage.save(products);
        if (!saveResult.ok) {
          warning = saveResult.warning;
          lastWarning = warning;
        }
      }

      return {
        ok: true,
        error: null,
        product: cloneProduct(updatedProduct),
        warning
      };
    },

    getStats() {
      const totalProducts = products.length;
      let totalUnits = 0;
      let lowStockCount = 0;
      const categoriesSet = new Set();

      for (const product of products) {
        totalUnits += product.quantity;
        categoriesSet.add(product.category.toLowerCase());
        if (isLowStock(product)) {
          lowStockCount += 1;
        }
      }

      return {
        totalProducts,
        totalUnits,
        totalCategories: categoriesSet.size,
        lowStockCount
      };
    },

    getCategories() {
      const seen = new Map();
      for (const product of products) {
        const key = product.category.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, product.category);
        }
      }
      return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'es'));
    },

    getWarning() {
      return lastWarning;
    }
  };
}
