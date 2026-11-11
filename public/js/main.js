import { createProductStorage } from './storage/product-storage.js';
import { createInventoryService } from './services/inventory-service.js';
import {
  renderStats,
  renderProductsTable,
  renderCategorySuggestions,
  renderStorageWarning
} from './ui/render.js';
import { initProductForm } from './ui/product-form.js';
import {
  PRODUCT_FILTERS,
  filterProducts,
  getEmptyStateMessage,
  normalizeProductFilter
} from './models/product-filter.js';

function getSafeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function bootstrap() {
  const storage = createProductStorage(getSafeLocalStorage());
  const service = createInventoryService({ storage });

  const uiElements = {
    stats: {
      totalProducts: document.getElementById('stat-total-products'),
      totalUnits: document.getElementById('stat-total-units'),
      totalCategories: document.getElementById('stat-total-categories'),
      lowStock: document.getElementById('stat-low-stock'),
      lowStockCard: document.getElementById('stat-card-low-stock')
    },
    table: {
      tableBody: document.getElementById('product-table-body'),
      tableContainer: document.getElementById('table-container'),
      emptyState: document.getElementById('empty-state'),
      emptyStateTitle: document.getElementById('empty-state-title'),
      emptyStateText: document.getElementById('empty-state-text')
    },
    filter: document.getElementById('product-filter'),
    datalist: document.getElementById('category-suggestions'),
    warningBanner: document.getElementById('storage-warning'),
    form: document.getElementById('product-form')
  };

  // El filtro es solo estado de vista: no se persiste ni altera el inventario.
  let activeFilter = PRODUCT_FILTERS.ALL;

  function handleRestock(productId) {
    const result = service.restock(productId, 5);
    if (result.ok) {
      refreshUI(result.warning || service.getWarning());
    }
  }

  function handleSell(productId) {
    const result = service.sell(productId, 1);
    if (result.ok) {
      refreshUI(result.warning || service.getWarning());
    }
  }

  function refreshUI(warningMessage = service.getWarning()) {
    const products = service.list();
    const stats = service.getStats();
    const categories = service.getCategories();

    renderStats(uiElements.stats, stats);
    renderProductsTable(uiElements.table, filterProducts(products, activeFilter), {
      onRestock: handleRestock,
      onSell: handleSell,
      emptyMessage: getEmptyStateMessage(activeFilter, products.length)
    });
    renderCategorySuggestions(uiElements.datalist, categories);
    renderStorageWarning(uiElements.warningBanner, warningMessage);
  }

  if (uiElements.filter) {
    uiElements.filter.value = activeFilter;
    uiElements.filter.addEventListener('change', () => {
      activeFilter = normalizeProductFilter(uiElements.filter.value);
      refreshUI();
    });
  }

  const initResult = service.init();
  refreshUI(initResult.warning);

  if (uiElements.form) {
    initProductForm({
      form: uiElements.form,
      onSubmit(input) {
        const result = service.add(input);
        if (result.ok) {
          refreshUI(result.warning || service.getWarning());
        }
        return result;
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
