# Plan: StockPilot (v1)

## Problema y enfoque
Crear desde cero una app web de inventario para un negocio pequeño: dashboard responsive, tabla de productos, formulario de alta, 4 productos de ejemplo y persistencia en `localStorage`.
Enfoque: HTML5 + CSS3 + JS con ES Modules, sin frameworks ni dependencias. Node.js solo sirve archivos estáticos (`node:http`). La lógica se separa de la UI y del acceso a `localStorage` para poder probarla con `node:test` sin navegador.

### Fases
- **FASE 1 — Aplicación inicial**: dashboard, listado de productos, registro de productos, persistencia con `localStorage` y 4 productos de ejemplo.
- **FASE 2 — Control de inventario bajo**: campo `stockMinimo` configurable por producto, alertas visuales cuando `cantidad <= stockMinimo` y un indicador del total de productos con inventario bajo.

La Fase 2 se construye **sobre** la arquitectura de la Fase 1 (mismas capas y módulos); solo agrega un módulo de dominio y extiende los existentes. Cada fase termina con sus pruebas en verde y su checklist manual cumplida antes de empezar la siguiente.

## 1. Requisitos

### Funcionales
**Fase 1**
- RF1. Dashboard con cabecera, tarjetas de resumen (total de productos, unidades totales, categorías), tabla y formulario. Responsive (móvil, tablet, escritorio).
- RF2. Tabla con columnas: **Nombre**, **Categoría**, **Cantidad disponible** y estado vacío si no hay productos.
- RF3. Formulario de alta: nombre (texto), categoría (texto con sugerencias de las existentes), cantidad (entero ≥ 0). Validación con mensajes visibles y accesibles; al guardar se actualiza la tabla y el resumen, y el formulario se limpia.
- RF4. Cuatro productos de ejemplo cargados solo en el primer uso (cuando no existe la clave en `localStorage`).
- RF5. Persistencia: los productos sobreviven a recargas. Datos corruptos o `localStorage` no disponible no rompen la app (se recurre a los datos de ejemplo/memoria y se avisa).

**Fase 2**
- RF6. Cada producto tiene `stockMinimo` (entero ≥ 0). El formulario incluye el campo "Stock mínimo" (obligatorio, valor inicial sugerido: 5) con la misma validación y mensajes que los demás campos.
- RF7. Regla de inventario bajo: un producto está en inventario bajo cuando `cantidad <= stockMinimo`. Estados:
  - `ok` (Normal): `cantidad > stockMinimo`.
  - `low` (Stock bajo): `0 < cantidad <= stockMinimo`.
  - `out` (Agotado): `cantidad === 0` (siempre cuenta como inventario bajo, incluso si `stockMinimo` es 0).
- RF8. La tabla agrega las columnas **Stock mínimo** y **Estado**; las filas `low` y `out` se resaltan con badge de texto + icono + color (nunca solo color).
- RF9. Nueva tarjeta del dashboard "Inventario bajo" con el total de productos en estado `low` u `out`; cambia de estilo de alerta cuando es > 0.
- RF10. Compatibilidad: los datos guardados en la Fase 1 (sin `stockMinimo`) se cargan asignando el valor por defecto (5) y se vuelven a guardar con el campo, sin perder productos.

### Técnicos
- RT1. HTML5 semántico, CSS3 (variables, Grid/Flexbox, media queries), JS moderno con `type="module"`.
- RT2. Node.js (LTS ≥ 20) con `node:http`, `node:fs`, `node:path`; sin paquetes npm.
- RT3. `package.json` con `"type": "module"` y scripts `start` (`node server.js`) y `test` (`node --test`). Sin `dependencies`.
- RT4. Pruebas con `node:test` + `node:assert/strict`.
- RT5. Seguridad básica: render con `textContent` (nunca `innerHTML` con datos del usuario), el servidor impide path traversal y solo sirve desde `public/`, escucha en `127.0.0.1`.
- RT6. Accesibilidad: labels, `aria-live` para errores/avisos, contraste suficiente, foco visible, tabla con `<caption>` y `scope`.
- RT7. Clave versionada de almacenamiento: `stockpilot:products:v1`.

### Fuera de alcance (v1)
Editar/eliminar productos, búsqueda/filtros, precios, autenticación, bases de datos o backend de datos, notificaciones externas (correo/push), exportación, historial de movimientos.

## 2. Arquitectura y responsabilidades

Capas (dependencias siempre hacia abajo; el dominio no toca el DOM ni `localStorage`):

| Componente | Responsabilidad |
|---|---|
| `server.js` | Punto de entrada: crea el servidor y lo arranca (puerto `PORT` o 3000). |
| `server/static-handler.js` | Servir archivos de `public/`, tipos MIME, `index.html` por defecto, 404/405, bloqueo de path traversal. Exporta una función de creación del servidor testeable (puerto 0). |
| `public/index.html` | Estructura semántica y carga de `main.js` como módulo. |
| `public/css/styles.css` | Tema (variables CSS), layout responsive, componentes (tarjetas, tabla, formulario, badges). |
| `public/js/data/seed-products.js` | Los 4 productos de ejemplo. F2: se les agrega `stockMinimo`. |
| `public/js/models/product.js` | `createProduct`/`validateProduct`: normaliza (trim, entero) y valida; genera `id` (`crypto.randomUUID` con respaldo). Sin efectos secundarios. F2: agrega `stockMinimo` (entero ≥ 0) y `DEFAULT_STOCK_MINIMO = 5`. |
| `public/js/models/stock-status.js` *(nuevo en F2)* | Funciones puras `getStockStatus(product)` → `'ok' \| 'low' \| 'out'` e `isLowStock(product)`. Única fuente de la regla `cantidad <= stockMinimo` y del caso agotado. |
| `public/js/storage/product-storage.js` | `load()`/`save()` sobre un objeto tipo `Storage` **inyectado**; JSON seguro, descarta datos inválidos, maneja errores de cuota/acceso. F2: normaliza datos antiguos sin `stockMinimo` (valor por defecto) manteniendo la misma clave `stockpilot:products:v1`. |
| `public/js/services/inventory-service.js` | Lógica de negocio: inicializar (seed si es primer uso), `list()`, `add(input)`, `getStats()` (F1: total de productos, unidades, categorías; F2: + `lowStockCount`). Orquesta modelo + storage. |
| `public/js/ui/render.js` | Funciones puras de render al DOM (tabla, tarjetas, estado vacío, errores) con `textContent`. F2: columnas Stock mínimo/Estado, badges y tarjeta "Inventario bajo". |
| `public/js/ui/product-form.js` | Gestiona el formulario: submit, lectura de campos, mostrar errores, reset y foco. F2: campo "Stock mínimo". |
| `public/js/main.js` | Composición: crea storage real (`window.localStorage`), servicio, conecta formulario y render. |

Flujo: arranque → `service.init()` → render inicial → submit del formulario → `service.add()` (valida y persiste) → re-render tabla y estadísticas.

Modelo `Product`:
- F1: `{ id: string, name: string, category: string, quantity: number }`.
- F2: se añade `stockMinimo: number`.

Productos de ejemplo (propuesta):
- F1: Cuaderno A5 (Papelería, 24), Bolígrafo azul (Papelería, 3), Café molido 500 g (Alimentos, 12), Cable USB-C (Electrónica, 8).
- F2 (mismos productos + `stockMinimo`, cubriendo los tres casos): Cuaderno A5 24/mín 10 → superior (`ok`); Bolígrafo azul 3/mín 5 → inferior (`low`); Café molido 12/mín 12 → igual (`low`); Cable USB-C 8/mín 5 → superior (`ok`). Resultado esperado: tarjeta "Inventario bajo" = 2. El caso de existencias en cero se cubre con pruebas automáticas y manuales (al registrar un producto con cantidad 0).

## 3. Estructura de carpetas y archivos por crear

```
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
│     ├─ models/stock-status.js          (nuevo en Fase 2)
│     ├─ storage/product-storage.js
│     ├─ services/inventory-service.js
│     └─ ui/
│        ├─ render.js
│        └─ product-form.js
└─ tests/
   ├─ product.test.js
   ├─ stock-status.test.js               (nuevo en Fase 2)
   ├─ product-storage.test.js
   ├─ inventory-service.test.js
   └─ static-handler.test.js
```

## 4. Etapas de implementación (ordenadas)

### FASE 1 — Aplicación inicial
1. **Andamiaje**: `package.json` (sin dependencias, scripts `start`/`test`), carpetas, `README.md` base.
2. **Dominio**: `product.js` (sin `stockMinimo`) + `seed-products.js` + `product.test.js` (TDD).
3. **Persistencia**: `product-storage.js` con storage inyectado + `product-storage.test.js` (fake storage en memoria).
4. **Servicio**: `inventory-service.js` (init/seed, list, add, stats F1) + `inventory-service.test.js`.
5. **Servidor**: `static-handler.js` + `server.js` + `static-handler.test.js`.
6. **UI estática**: `index.html` + `styles.css` (layout responsive, tarjetas, tabla, formulario).
7. **UI dinámica**: `render.js`, `product-form.js`, `main.js`; conectar todo.
8. **Pulido y verificación F1**: estados vacío/error, foco, `aria-live`, contraste, responsive; `npm test` y checklist manual F1. **Cierre de Fase 1.**

### FASE 2 — `stockMinimo` y alertas de inventario bajo
9. **Regla de negocio**: `stock-status.js` + `stock-status.test.js` (TDD: superior, igual, inferior, cero).
10. **Modelo y seed**: extender `product.js` (campo, validación, `DEFAULT_STOCK_MINIMO`) y `seed-products.js`; actualizar `product.test.js`.
11. **Persistencia y compatibilidad**: normalizar datos F1 sin `stockMinimo` en `product-storage.js`; actualizar `product-storage.test.js`.
12. **Servicio**: `getStats()` con `lowStockCount` usando `isLowStock`; actualizar `inventory-service.test.js`.
13. **UI**: campo "Stock mínimo" en `index.html`/`product-form.js`; columnas, badges y tarjeta "Inventario bajo" en `render.js`; estilos de alerta en `styles.css`.
14. **Pulido y verificación F2**: accesibilidad de alertas (texto + icono, `aria-live` al agregar), responsive, `npm test` y checklist manual F2, regresión de F1, README final. **Cierre de Fase 2.**

## 5. Criterios de aceptación

### FASE 1
- CA1.1. `npm start` levanta el servidor y `http://localhost:3000` muestra el dashboard sin errores en consola.
- CA1.2. En el primer uso se ven exactamente 4 productos con nombre, categoría y cantidad.
- CA1.3. Agregar un producto válido lo muestra de inmediato en la tabla y actualiza las tarjetas de resumen.
- CA1.4. Tras recargar (F5) y tras cerrar/reabrir la pestaña, los productos (incluidos los nuevos) siguen ahí y los de ejemplo no se duplican.
- CA1.5. Nombre vacío/solo espacios, categoría vacía, cantidad negativa, decimal o no numérica se rechazan con mensaje claro y no se guardan. La cantidad `0` es válida.
- CA1.6. Texto con HTML (p. ej. `<img onerror=...>`) se muestra como texto, sin ejecutarse.
- CA1.7. Layout usable en 360 px, 768 px y ≥ 1280 px, sin scroll horizontal de página (la tabla puede desplazarse dentro de su contenedor).
- CA1.8. Navegable con teclado y con labels asociadas; errores anunciados con `aria-live`.
- CA1.9. Con JSON corrupto en `localStorage`, la app arranca y recupera datos de ejemplo.
- CA1.10. `npm test` pasa en verde sin instalar dependencias; `package.json` no declara dependencias.
- CA1.11. El servidor devuelve 404 para rutas inexistentes y no permite acceder a archivos fuera de `public/` (p. ej. `/../package.json`).

### FASE 2 (además de mantener todos los criterios de la Fase 1)
- CA2.1. El formulario incluye "Stock mínimo"; vacío, negativo, decimal o no numérico se rechaza con mensaje claro. `0` es válido.
- CA2.2. **Cantidad superior al mínimo** (p. ej. 10 vs 5): estado "Normal", sin alerta y no cuenta en "Inventario bajo".
- CA2.3. **Cantidad igual al mínimo** (p. ej. 5 vs 5): estado "Stock bajo", con alerta y cuenta en "Inventario bajo".
- CA2.4. **Cantidad inferior al mínimo** (p. ej. 3 vs 5): estado "Stock bajo", con alerta y cuenta en "Inventario bajo".
- CA2.5. **Existencias en cero** (con cualquier mínimo, incluido 0): estado "Agotado", alerta destacada y cuenta en "Inventario bajo".
- CA2.6. La tarjeta "Inventario bajo" muestra el total correcto (2 con los datos de ejemplo de F2) y se actualiza al agregar un producto sin recargar.
- CA2.7. Las alertas se distinguen sin depender solo del color (texto + icono) y mantienen contraste suficiente.
- CA2.8. `stockMinimo` persiste tras recargar; datos guardados en la Fase 1 se cargan con mínimo por defecto (5) sin perder productos ni duplicar el seed.
- CA2.9. La tabla con 5 columnas sigue siendo usable en 360 px (desplazamiento horizontal contenido en la tabla, no en la página).
- CA2.10. `npm test` en verde (pruebas F1 actualizadas + nuevas F2), sin dependencias.

## 6. Pruebas y verificaciones

### FASE 1 — Automatizadas (`node:test`)
- `product.test.js`: normalización (trim, cantidad entera), rechazo de nombre/categoría vacíos, cantidades inválidas (negativa, decimal, NaN, texto), cantidad `0` válida, `id` único.
- `product-storage.test.js`: carga vacía → `null`; ida y vuelta guardar/cargar; JSON corrupto; elementos inválidos descartados; error al escribir (cuota) controlado; uso de la clave `stockpilot:products:v1`.
- `inventory-service.test.js`: seed en primer uso (4 productos); sin re-seed en usos posteriores; `add` válido persiste; `add` inválido no persiste y devuelve errores; `getStats` (total de productos, unidades, categorías distintas).
- `static-handler.test.js` (servidor en puerto 0 + `fetch`): `/` → 200 HTML; CSS/JS con MIME correcto; ruta inexistente → 404; path traversal → 403/404; método distinto de GET/HEAD → 405.

### FASE 1 — Manuales (navegador)
- Primer arranque con almacenamiento limpio (DevTools → Application → Local Storage).
- Alta válida/inválida, recarga, persistencia entre pestañas.
- Inyección de HTML en nombre/categoría.
- Redimensionado a 360/768/1280 px; navegación con Tab; consola sin errores.

### FASE 2 — Automatizadas (`node:test`)
- `stock-status.test.js` (tabla de casos de `getStockStatus` / `isLowStock`):

  | Cantidad | Mínimo | Estado esperado | ¿Inventario bajo? |
  |---|---|---|---|
  | 10 | 5 | `ok` (superior) | No |
  | 6 | 5 | `ok` (justo por encima) | No |
  | 5 | 5 | `low` (igual) | Sí |
  | 3 | 5 | `low` (inferior) | Sí |
  | 1 | 0 | `ok` (mínimo 0, hay existencias) | No |
  | 0 | 5 | `out` (cero) | Sí |
  | 0 | 0 | `out` (cero con mínimo 0) | Sí |

- `product.test.js`: `stockMinimo` válido (0, entero positivo, texto numérico normalizado); rechazo de vacío, negativo, decimal, NaN, texto; valor por defecto expuesto como `DEFAULT_STOCK_MINIMO`.
- `product-storage.test.js`: producto de la Fase 1 sin `stockMinimo` se carga con el mínimo por defecto; `stockMinimo` presente y válido se conserva en ida y vuelta; `stockMinimo` presente pero inválido descarta el elemento sin romper la carga.
- `inventory-service.test.js`: `getStats().lowStockCount` con un conjunto mixto (superior, igual, inferior y cero) = suma correcta; `add` de un producto en cero/igual/inferior incrementa el contador y uno superior no; seed F2 → `lowStockCount === 2`; `add` sin `stockMinimo` válido no persiste.

### FASE 2 — Manuales (navegador)
- Registrar productos con cantidad superior, igual, inferior al mínimo y en cero; verificar badge, resaltado de fila y contador "Inventario bajo" tras cada alta, y tras recargar.
- Migración: con datos de la Fase 1 en `localStorage` (sin `stockMinimo`), recargar y comprobar mínimo por defecto sin pérdida de productos.
- Alertas sin depender del color (revisar en escala de grises), navegación con teclado, 360/768/1280 px.
- Regresión de los checks manuales de la Fase 1.

### Comandos de verificación (para la fase de implementación)
`npm test` al cerrar cada fase; `npm start` + comprobación HTTP con `curl` (200 en `/`, 404 en ruta inexistente).

## Notas y supuestos
- El umbral deja de ser fijo en la Fase 2: cada producto tiene su `stockMinimo` (por defecto 5 para datos antiguos y valor sugerido en el formulario). En la Fase 1 no hay concepto de stock bajo.
- `cantidad === 0` siempre es "Agotado" y cuenta como inventario bajo, aunque `stockMinimo` sea 0.
- Se mantiene la clave de almacenamiento `stockpilot:products:v1`; la compatibilidad se resuelve normalizando al cargar (sin versión nueva ni migraciones complejas).
- Categoría como texto libre con `<datalist>` de sugerencias (más sencillo que un CRUD de categorías).
- Sin librerías de iconos/fuentes externas: fuentes del sistema y emoji/SVG inline para evitar dependencias de red.
- Un único idioma de interfaz: español.
