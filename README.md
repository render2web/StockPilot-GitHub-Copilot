<div align="center">

# StockPilot

**Tu inventario, claro y bajo control.**

Gestión de inventario para pequeños negocios: registra productos, controla existencias y detecta cuándo reponer.

![Node.js 20 o superior](https://img.shields.io/badge/Node.js-%E2%89%A5%2020-417E38?style=flat-square&logo=nodedotjs&logoColor=white)
![JavaScript ES Modules](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5 y CSS3](https://img.shields.io/badge/Interfaz-HTML5%20%2B%20CSS3-E34F26?style=flat-square)
![Sin dependencias externas](https://img.shields.io/badge/Dependencias-0-2563EB?style=flat-square)

[Inicio rápido](#inicio-rápido) · [Funcionalidades](#funcionalidades) · [Guía de uso](#guía-de-uso) · [Pruebas](#pruebas) · [Arquitectura](#arquitectura)

</div>

---

## Qué es StockPilot

StockPilot es una aplicación web ligera construida con **HTML5, CSS3 y JavaScript moderno**, sin frameworks ni paquetes externos. Combina un dashboard responsive, alertas visuales de stock y exportación CSV en una interfaz en español.

Los productos se guardan en el navegador mediante `localStorage`. Node.js se utiliza únicamente para servir los archivos estáticos: no requiere configurar una base de datos.

> [!IMPORTANT]
> El inventario es local a cada navegador y origen (protocolo, host y puerto). No se sincroniza entre dispositivos ni usuarios. Borrar los datos del sitio elimina el inventario guardado; exporta el CSV si necesitas conservar una copia de consulta.

## Funcionalidades

| Funcionalidad | Qué puedes hacer |
| --- | --- |
| **Dashboard** | Consultar productos registrados, unidades totales, categorías e inventario bajo. |
| **Registro de productos** | Añadir nombre, categoría, cantidad y stock mínimo, con validación y sugerencias de categorías. |
| **Control de existencias** | Ajustar cantidades con **Vender −1** y **Reponer +5**, sin permitir stock negativo. |
| **Alertas de stock** | Identificar productos normales, con stock bajo o agotados mediante texto, icono y color. |
| **Filtro de agotados** | Alternar entre **Todos** y **Solo agotados**, sin modificar el inventario almacenado. |
| **Exportación CSV** | Descargar el inventario completo, independientemente del filtro activo. |
| **Persistencia local** | Mantener los productos entre recargas y recibir avisos si el almacenamiento falla. |
| **Interfaz responsive y accesible** | Usar formularios etiquetados, tabla semántica y mensajes anunciados mediante `aria-live`. |

En el primer uso se cargan **4 productos de ejemplo** para explorar la aplicación.

## Inicio rápido

### Requisitos

- **Node.js 20 o superior**; se recomienda una versión LTS compatible.
- Un navegador moderno con soporte para ES Modules y `localStorage`.
- Git para clonar el repositorio, o descarga del ZIP desde GitHub.

### Ejecutar en local

```powershell
git clone https://github.com/render2web/StockPilot-GitHub-Copilot.git
cd StockPilot-GitHub-Copilot
npm start
```

Abre **[http://127.0.0.1:3000](http://127.0.0.1:3000)** en el navegador.

No es necesario ejecutar `npm install`: el proyecto no tiene dependencias externas.

<details>
<summary><strong>Usar otro puerto en Windows (PowerShell)</strong></summary>

```powershell
$env:PORT = "3001"
npm start
```

Abre `http://127.0.0.1:3001`. El servidor escucha únicamente en `127.0.0.1`.

Cambiar de puerto cambia el origen del sitio: verás un almacenamiento local independiente, no los datos guardados en el puerto anterior.

</details>

## Guía de uso

1. **Registra un producto** con nombre, categoría, cantidad y stock mínimo (valor sugerido: `5`).
2. **Consulta el dashboard** para conocer el estado general del inventario.
3. **Actualiza las existencias** con **Vender −1** o **Reponer +5**.
4. **Filtra los agotados** para identificar productos sin unidades disponibles.
5. **Exporta el inventario** para consultarlo en una hoja de cálculo.

### Estados del inventario

| Estado | Condición |
| --- | --- |
| **Normal** | La cantidad es superior al stock mínimo. |
| **Stock bajo** | La cantidad es mayor que cero y menor o igual al stock mínimo. |
| **Agotado** | La cantidad es cero, incluso si el stock mínimo también es cero. |

El indicador **Inventario bajo** cuenta tanto los productos con stock bajo como los agotados.

### Almacenamiento y alcance

- Los datos se guardan bajo la clave `stockpilot:products:v1`.
- Los productos de la primera versión sin `stockMinimo` reciben automáticamente el valor `5`.
- Si el almacenamiento no está disponible o no permite guardar cambios, la aplicación muestra un aviso y trabaja con datos en memoria. Esos cambios pueden perderse al cerrar o recargar la página.
- La aplicación no incluye autenticación, sincronización multiusuario ni una base de datos en el servidor.

## Exportación CSV

Pulsa **Exportar CSV**, junto al selector **Mostrar**, para descargar `stockpilot-inventario.csv`.

- **Contenido:** todos los productos, aunque esté seleccionado **Solo agotados** o la tabla filtrada esté vacía.
- **Columnas:** Nombre, Categoría, Cantidad disponible y Stock mínimo.
- **Datos exportados:** estado actual en memoria, en el orden del inventario, incluidos cambios que no hayan podido guardarse.
- **Sin efectos sobre el inventario:** no modifica los datos ni el filtro y mantiene los avisos de almacenamiento.

### Abrir en Excel

Usa **Datos > Desde texto/CSV** (Power Query), selecciona la codificación **UTF-8** y el delimitador **coma**, especialmente si hay textos multilínea.

> [!NOTE]
> La apertura directa depende del separador regional. Los importadores antiguos pueden dividir incorrectamente los saltos de línea internos.

<details>
<summary><strong>Formato, protección de fórmulas y límites de la descarga</strong></summary>

- El archivo usa UTF-8 con BOM, separador de comas y finales de registro CRLF. Las comas, comillas y saltos de línea dentro de los textos se escapan correctamente.
- Si no hay productos, se descarga un archivo solo con encabezados.
- Los nombres y categorías con prefijos potencialmente interpretables como fórmulas (`=`, `+`, `-`, `@`, tabulador o salto de línea, incluso tras espacios o controles invisibles) reciben un apóstrofo protector **solo en el CSV**. Los datos originales no cambian.
- El apóstrofo puede verse en algunas herramientas; no lo elimines de textos no confiables. La interpretación varía entre hojas de cálculo y la protección puede perderse al editar o reexportar el archivo.
- Si falla la generación o el inicio de la descarga, se muestra un error junto al botón. La aplicación no puede confirmar que el navegador haya guardado el archivo.
- La exportación se genera en memoria y no trunca inventarios grandes.

</details>

## Pruebas

Ejecuta la suite automatizada con el runner nativo **`node:test`**:

```powershell
npm test
```

La suite cubre validación de productos, estados de stock, filtros, almacenamiento, servicio de inventario, exportación CSV y servidor estático.

Para ejecutar únicamente las pruebas del generador CSV y la descarga:

```powershell
node --test tests\inventory-csv.test.js tests\inventory-export.test.js
```

Estas pruebas incluyen escapado, Unicode, neutralización de fórmulas, filtros, estado actual, errores y limpieza de recursos. Usan APIs nativas y dobles pequeños del navegador, sin dependencias.

La descarga real y la interpretación en **Excel/LibreOffice** requieren además comprobación manual en esas aplicaciones.

## Arquitectura

La lógica de inventario, la persistencia y la interfaz están separadas para facilitar el mantenimiento y las pruebas.

| Capa | Responsabilidad |
| --- | --- |
| **Modelos** | Validar productos y calcular filtros, estados de stock y contenido CSV. |
| **Almacenamiento** | Leer, normalizar y guardar productos en `localStorage`. |
| **Servicio** | Coordinar las operaciones del inventario y sus estadísticas. |
| **Interfaz** | Renderizar datos y gestionar el formulario y la descarga CSV. |
| **Servidor** | Servir los archivos estáticos mediante APIs nativas de Node.js. |

### Estructura del proyecto

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

### Tecnologías

- **Frontend:** HTML5 semántico, CSS3 y JavaScript con ES Modules.
- **Persistencia:** API `localStorage` del navegador.
- **Servidor:** Node.js y su módulo nativo `node:http`.
- **Pruebas:** `node:test` y `node:assert/strict`.
