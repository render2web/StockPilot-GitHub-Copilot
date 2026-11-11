export const DEFAULT_STOCK_MINIMO = 5;

function generateId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `prod-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseInteger(rawValue) {
  if (typeof rawValue === 'number') {
    if (!Number.isFinite(rawValue) || !Number.isInteger(rawValue)) {
      return { valid: false, value: NaN };
    }
    return { valid: true, value: rawValue };
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (trimmed === '' || !/^-?\d+$/.test(trimmed)) {
      return { valid: false, value: NaN };
    }
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed)) {
      return { valid: false, value: NaN };
    }
    return { valid: true, value: parsed };
  }

  return { valid: false, value: NaN };
}

export function validateProduct(input) {
  const errors = {};
  const raw = input && typeof input === 'object' ? input : {};

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const category = typeof raw.category === 'string' ? raw.category.trim() : '';
  const quantityResult = parseInteger(raw.quantity);
  const stockMinimoResult = parseInteger(raw.stockMinimo);

  if (!name) {
    errors.name = 'El nombre del producto es obligatorio.';
  }

  if (!category) {
    errors.category = 'La categoría es obligatoria.';
  }

  if (!quantityResult.valid) {
    errors.quantity = 'La cantidad debe ser un número entero válido.';
  } else if (quantityResult.value < 0) {
    errors.quantity = 'La cantidad no puede ser negativa.';
  }

  if (!stockMinimoResult.valid) {
    errors.stockMinimo = 'El stock mínimo debe ser un número entero válido.';
  } else if (stockMinimoResult.value < 0) {
    errors.stockMinimo = 'El stock mínimo no puede ser negativo.';
  }

  const valid = Object.keys(errors).length === 0;

  return {
    valid,
    errors,
    value: valid
      ? {
          id:
            typeof raw.id === 'string' && raw.id.trim() !== ''
              ? raw.id.trim()
              : generateId(),
          name,
          category,
          quantity: quantityResult.value,
          stockMinimo: stockMinimoResult.value
        }
      : null
  };
}

export function createProduct(input) {
  const validation = validateProduct(input);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] || 'Datos de producto inválidos.';
    const error = new Error(firstError);
    error.errors = validation.errors;
    throw error;
  }
  return validation.value;
}
