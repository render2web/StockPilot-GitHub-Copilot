import { generateInventoryCsv } from '../models/inventory-csv.js';

export function initInventoryExport({ button, statusElement, getProducts }) {
  button.addEventListener('click', () => {
    statusElement.textContent = '';
    statusElement.hidden = true;
    let url;
    let link;

    try {
      const csv = generateInventoryCsv(getProducts());
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      url = URL.createObjectURL(blob);
      link = document.createElement('a');
      link.href = url;
      link.download = 'stockpilot-inventario.csv';
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('No se pudo exportar el inventario a CSV.', error);
      statusElement.textContent = 'No se pudo exportar el inventario. Intenta descargarlo de nuevo.';
      statusElement.hidden = false;
    } finally {
      link?.remove();
      if (url) {
        // Give the browser time to consume the URL before releasing it.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }
  });
}
