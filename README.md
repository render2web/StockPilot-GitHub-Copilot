# StockPilot

Aplicación web de gestión de inventario para pequeños negocios. Construida con HTML5, CSS3 y JavaScript moderno (ES Modules) sin dependencias externas.

## Características (Fases 1 y 2)

- **Dashboard responsive**: resumen en tiempo real de total de productos, unidades disponibles, categorías registradas e indicador de **inventario bajo**.
- **Control de stock mínimo y alertas visuales**: cada producto define su `stockMinimo` configurable y muestra su estado (`Normal`, `Stock bajo` cuando `cantidad <= stockMinimo` o `Agotado` cuando `cantidad === 0`) mediante texto, icono y color accesible.
- **Listado de productos**: tabla accesible con nombre, categoría, cantidad disponible, stock mínimo, estado y botones de acción rápida (**Vender −1** y **Reponer +5**) para ajustar existencias al instante sin permitir stock negativo.
- **Filtro de agotados**: selector **Todos** / **Solo agotados** en el listado para ver únicamente los productos con cantidad igual a cero. Se actualiza al vender o reponer y no modifica los datos almacenados.
- **Exportación CSV**: botón **Exportar CSV** junto al filtro para descargar el inventario completo, sin dependencias ni servicios externos.
- **Registro de productos**: formulario con validación de campos (incluyendo stock mínimo con valor sugerido de 5) y sugerencias dinámicas de categorías (`<datalist>`).
- **Datos de ejemplo**: carga automática de 4 productos iniciales en el primer uso cubriendo los distintos estados de stock.
- **Persistencia local y compatibilidad**: almacenamiento en `localStorage` bajo la clave `stockpilot:products:v1`, asignando automáticamente `stockMinimo = 5` a productos guardados en la Fase 1.
- **Servidor estático propio**: servidor HTTP en Node.js sin dependencias externas.

## Requisitos

- Node.js >= 20 LTS

## Comandos

Iniciar el servidor local (por defecto en `http://127.0.0.1:3000`):

```bash
npm start
```

Ejecutar la suite de pruebas automatizadas (`node:test`):

```bash
npm test
```

## Exportar el inventario

Pulsa **Exportar CSV**, junto al selector **Mostrar**, para descargar `stockpilot-inventario.csv`.

- Incluye **todos** los productos, aunque esté seleccionado **Solo agotados** o la tabla filtrada esté vacía.
- Exporta el estado actual en memoria, en el orden del inventario, incluidos cambios que no hayan podido guardarse. No modifica los datos ni el filtro y mantiene los avisos de almacenamiento.
- Columnas: **Nombre**, **Categoría**, **Cantidad disponible** y **Stock mínimo**.
- Formato UTF-8 con BOM, separador de comas y finales de registro CRLF. Las comas, comillas y saltos de línea dentro de textos se escapan correctamente.
- Si no hay productos, descarga un archivo solo con encabezados.
- Los nombres y categorías con prefijos potencialmente interpretables como fórmulas (`=`, `+`, `-`, `@`, tabulador o salto de línea, incluso tras espacios o controles invisibles) reciben un apóstrofo protector **solo en el CSV**. Los datos originales no cambian.
- Si falla la generación o el inicio de la descarga, se muestra un error junto al botón. La aplicación no puede confirmar que el navegador haya guardado el archivo.

**Compatibilidad:** en Excel, usa **Datos > Desde texto/CSV** (Power Query), seleccionando UTF-8 y delimitador **coma**, especialmente si hay textos multilínea. La apertura directa depende del separador regional y los importadores antiguos pueden dividir incorrectamente los saltos de línea internos. El apóstrofo protector puede verse en algunas herramientas; no lo elimines de textos no confiables. La interpretación varía entre hojas de cálculo y la protección puede perderse al editar o reexportar el archivo. La exportación se genera en memoria y no trunca inventarios grandes.

Pruebas dirigidas del generador y la descarga (incluyen escapado, Unicode, neutralización, filtros, estado actual, errores y limpieza de recursos):

```bash
node --test tests/inventory-csv.test.js tests/inventory-export.test.js
```

Las pruebas usan APIs nativas y dobles pequeños del navegador, sin dependencias. La descarga real y la interpretación en Excel/LibreOffice requieren además comprobación en esas aplicaciones.

## Estructura del proyecto

```text
StockPilot/
├─ package.json
├─ server.js
├─ README.md
├─ server/
│  └─ static-handler.js
├─ public/
│  ├─ index.html
│  ├─ css/
│  │  └─ styles.css
│  └─ js/
│     ├─ main.js
│     ├─ data/seed-products.js
│     ├─ models/product.js
│     ├─ models/product-filter.js
│     ├─ models/inventory-csv.js
│     ├─ models/stock-status.js
│     ├─ storage/product-storage.js
│     ├─ services/inventory-service.js
│     └─ ui/
│        ├─ render.js
│        ├─ inventory-export.js
│        └─ product-form.js
└─ tests/
   ├─ product.test.js
   ├─ product-filter.test.js
   ├─ stock-status.test.js
   ├─ product-storage.test.js
   ├─ inventory-service.test.js
   ├─ inventory-csv.test.js
   ├─ inventory-export.test.js
   └─ static-handler.test.js
```
