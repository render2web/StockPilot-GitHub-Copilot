import { getStockStatus } from '../models/stock-status.js';

const STATUS_META = Object.freeze({
  ok: Object.freeze({ icon: '✓', label: 'Normal' }),
  low: Object.freeze({ icon: '⚠', label: 'Stock bajo' }),
  out: Object.freeze({ icon: '⛔', label: 'Agotado' })
});

export function renderStats(elements, stats) {
  if (elements.totalProducts) {
    elements.totalProducts.textContent = String(stats.totalProducts);
  }
  if (elements.totalUnits) {
    elements.totalUnits.textContent = String(stats.totalUnits);
  }
  if (elements.totalCategories) {
    elements.totalCategories.textContent = String(stats.totalCategories);
  }
  if (elements.lowStock) {
    elements.lowStock.textContent = String(stats.lowStockCount ?? 0);
  }
  if (elements.lowStockCard) {
    const hasLowStock = (stats.lowStockCount ?? 0) > 0;
    elements.lowStockCard.classList.toggle('stat-card-alert', hasLowStock);
  }
}

export function renderProductsTable(elements, products, { onRestock, onSell } = {}) {
  const { tableBody, tableContainer, emptyState } = elements;
  if (!tableBody) {
    return;
  }

  tableBody.replaceChildren();

  if (!Array.isArray(products) || products.length === 0) {
    if (tableContainer) {
      tableContainer.hidden = true;
    }
    if (emptyState) {
      emptyState.hidden = false;
    }
    return;
  }

  if (tableContainer) {
    tableContainer.hidden = false;
  }
  if (emptyState) {
    emptyState.hidden = true;
  }

  const fragment = document.createDocumentFragment();

  for (const product of products) {
    const status = getStockStatus(product);
    const row = document.createElement('tr');
    row.dataset.productId = product.id;
    row.dataset.stockStatus = status;

    if (status === 'low') {
      row.className = 'row-low-stock';
    } else if (status === 'out') {
      row.className = 'row-out-of-stock';
    }

    const nameCell = document.createElement('td');
    nameCell.className = 'product-name-cell';
    nameCell.textContent = product.name;

    const categoryCell = document.createElement('td');
    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'category-tag';
    categoryBadge.textContent = product.category;
    categoryCell.appendChild(categoryBadge);

    const quantityCell = document.createElement('td');
    quantityCell.className = 'col-numeric quantity-cell';
    quantityCell.textContent = String(product.quantity);

    const stockMinimoCell = document.createElement('td');
    stockMinimoCell.className = 'col-numeric min-stock-cell';
    stockMinimoCell.textContent = String(product.stockMinimo);

    const statusCell = document.createElement('td');
    statusCell.className = 'status-cell';

    const meta = STATUS_META[status] || STATUS_META.ok;
    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge status-badge--${status}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'status-badge-icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = meta.icon;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'status-badge-label';
    labelSpan.textContent = meta.label;

    statusBadge.append(iconSpan, labelSpan);
    statusCell.appendChild(statusBadge);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';

    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'actions-group';

    const sellButton = document.createElement('button');
    sellButton.type = 'button';
    sellButton.className = 'btn-sell';
    sellButton.dataset.action = 'sell';
    sellButton.dataset.productId = product.id;
    sellButton.textContent = 'Vender −1';
    sellButton.disabled = product.quantity <= 0;
    sellButton.title =
      product.quantity <= 0
        ? `Sin existencias disponibles de ${product.name}`
        : `Vender 1 unidad de ${product.name}`;

    if (typeof onSell === 'function') {
      sellButton.addEventListener('click', () => {
        if (product.quantity > 0) {
          onSell(product.id);
        }
      });
    }

    const restockButton = document.createElement('button');
    restockButton.type = 'button';
    restockButton.className = 'btn-restock';
    restockButton.dataset.action = 'restock';
    restockButton.dataset.productId = product.id;
    restockButton.textContent = 'Reponer +5';
    restockButton.title = `Reponer +5 unidades de ${product.name}`;

    if (typeof onRestock === 'function') {
      restockButton.addEventListener('click', () => {
        onRestock(product.id);
      });
    }

    actionsGroup.append(sellButton, restockButton);
    actionsCell.appendChild(actionsGroup);

    row.append(nameCell, categoryCell, quantityCell, stockMinimoCell, statusCell, actionsCell);
    fragment.appendChild(row);
  }

  tableBody.appendChild(fragment);
}

export function renderCategorySuggestions(datalistElement, categories) {
  if (!datalistElement) {
    return;
  }

  datalistElement.replaceChildren();
  const fragment = document.createDocumentFragment();

  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    fragment.appendChild(option);
  }

  datalistElement.appendChild(fragment);
}

export function renderStorageWarning(bannerElement, warningMessage) {
  if (!bannerElement) {
    return;
  }

  if (warningMessage) {
    bannerElement.textContent = warningMessage;
    bannerElement.hidden = false;
  } else {
    bannerElement.textContent = '';
    bannerElement.hidden = true;
  }
}
