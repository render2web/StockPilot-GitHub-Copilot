# StockPilot

Aplicación web de gestión de inventario para pequeños negocios. Construida con HTML5, CSS3 y JavaScript moderno (ES Modules) sin dependencias externas.

## Características (Fases 1 y 2)

- **Dashboard responsive**: resumen en tiempo real de total de productos, unidades disponibles, categorías registradas e indicador de **inventario bajo**.
- **Control de stock mínimo y alertas visuales**: cada producto define su `stockMinimo` configurable y muestra su estado (`Normal`, `Stock bajo` cuando `cantidad <= stockMinimo` o `Agotado` cuando `cantidad === 0`) mediante texto, icono y color accesible.
- **Listado de productos**: tabla accesible con nombre, categoría, cantidad disponible, stock mínimo, estado y botones de acción rápida (**Vender −1** y **Reponer +5**) para ajustar existencias al instante sin permitir stock negativo.
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
│     ├─ models/stock-status.js
│     ├─ storage/product-storage.js
│     ├─ services/inventory-service.js
│     └─ ui/
│        ├─ render.js
│        └─ product-form.js
└─ tests/
   ├─ product.test.js
   ├─ stock-status.test.js
   ├─ product-storage.test.js
   ├─ inventory-service.test.js
   └─ static-handler.test.js
```
