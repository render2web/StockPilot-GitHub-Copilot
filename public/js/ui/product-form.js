import { getStockStatus } from '../models/stock-status.js';

const FORM_FIELDS = ['name', 'category', 'quantity', 'stockMinimo'];

export function initProductForm({ form, onSubmit }) {
  const nameInput = form.querySelector('#product-name');
  const categoryInput = form.querySelector('#product-category');
  const quantityInput = form.querySelector('#product-quantity');
  const stockMinimoInput = form.querySelector('#product-stock-minimo');

  const errorElements = {
    name: form.querySelector('#error-name'),
    category: form.querySelector('#error-category'),
    quantity: form.querySelector('#error-quantity'),
    stockMinimo: form.querySelector('#error-stock-minimo')
  };

  const inputsByField = {
    name: nameInput,
    category: categoryInput,
    quantity: quantityInput,
    stockMinimo: stockMinimoInput
  };

  const statusElement = form.querySelector('#form-status');

  function clearErrors() {
    for (const [field, errorEl] of Object.entries(errorElements)) {
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
      const inputEl = inputsByField[field];
      if (inputEl) {
        inputEl.removeAttribute('aria-invalid');
      }
    }
  }

  function showErrors(errors) {
    clearErrors();
    if (statusElement) {
      statusElement.textContent = '';
      statusElement.hidden = true;
    }

    let firstInvalidInput = null;

    for (const field of FORM_FIELDS) {
      const message = errors[field];
      const errorEl = errorElements[field];
      const inputEl = inputsByField[field];

      if (message && errorEl && inputEl) {
        errorEl.textContent = message;
        errorEl.hidden = false;
        inputEl.setAttribute('aria-invalid', 'true');
        if (!firstInvalidInput) {
          firstInvalidInput = inputEl;
        }
      }
    }

    if (firstInvalidInput) {
      firstInvalidInput.focus();
    }
  }

  function showSuccess(product) {
    if (!statusElement) {
      return;
    }
    const status = getStockStatus(product);
    if (status === 'out') {
      statusElement.textContent = `Producto "${product.name}" agregado. Alerta: producto agotado (0 disponibles).`;
    } else if (status === 'low') {
      statusElement.textContent = `Producto "${product.name}" agregado. Alerta: stock bajo (${product.quantity} disponibles, mínimo ${product.stockMinimo}).`;
    } else {
      statusElement.textContent = `Producto "${product.name}" agregado correctamente.`;
    }
    statusElement.hidden = false;
  }

  for (const field of FORM_FIELDS) {
    const inputEl = inputsByField[field];
    const errorEl = errorElements[field];
    if (inputEl) {
      inputEl.addEventListener('input', () => {
        if (errorEl && !errorEl.hidden) {
          errorEl.textContent = '';
          errorEl.hidden = true;
          inputEl.removeAttribute('aria-invalid');
        }
        if (statusElement && !statusElement.hidden) {
          statusElement.textContent = '';
          statusElement.hidden = true;
        }
      });
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const payload = {
      name: nameInput ? nameInput.value : '',
      category: categoryInput ? categoryInput.value : '',
      quantity: quantityInput ? quantityInput.value : '',
      stockMinimo: stockMinimoInput ? stockMinimoInput.value : ''
    };

    const result = onSubmit(payload);

    if (!result.ok) {
      showErrors(result.errors || {});
      return;
    }

    clearErrors();
    form.reset();
    showSuccess(result.product);
    if (nameInput) {
      nameInput.focus();
    }
  });
}
