# Casos de uso → pantallas

Relación entre los casos de uso del modelo de Enterprise Architect (`BasesCU.xml`) y lo implementado en el front.

Los casos de uso «Desplegar opciones de …» corresponden al menú lateral y a la página de inicio. Cada actor ve solo las opciones de su módulo.

## Jerarquía de actores

`Contador`, `Administrador`, `Gestor de Producción`, `Gestor de ventas` y `Gestor de Almacén` heredan de `Usuario`.

- **Pantallas comunes:** todos usan `/login`, `/` (inicio) y `/perfil`.
- **Rutas restringidas:** el resto de rutas se protege por rol con `ProtectedRoute` (`src/App.jsx`).

## Módulo de control de acceso (Usuario)

| Caso de uso | Pantalla | Archivo |
|---|---|---|
| Desplegar interfaz web | `/` | `pages/acceso/Inicio.jsx` |
| Iniciar sesión | `/login` | `pages/acceso/Login.jsx` |
| Actualizar información usuario | `/perfil` | `pages/acceso/Perfil.jsx` |

## Módulo de gestión de almacén (Gestor de Almacén)

| Caso de uso | Pantalla | Archivo |
|---|---|---|
| Desplegar opciones de gestión | Menú lateral e inicio | `config/roles.js` |
| Desplegar menú de consulta | Grupo Almacén del menú | `config/roles.js` |
| Consultar lista de materiales | `/almacen/materiales` | `pages/almacen/InventarioPage.jsx` |
| Consultar lista de herramientas | `/almacen/herramientas` | `pages/almacen/InventarioPage.jsx` |
| Consultar modelos de cajas fuertes | `/almacen/modelos` (solo lectura) | `pages/produccion/Modelos.jsx` |
| Solicitar compra de material o herramienta | Botón «Solicitar compra» en cada fila del inventario, y `/almacen/solicitudes` | `pages/almacen/SolicitudModal.jsx` |
| Registrar compra de material o herramienta | `/almacen/compras` y desde una solicitud pendiente | `pages/almacen/CompraModal.jsx` |
| ↳ «include» Registro de material o herramienta en el inventario | Opción «+ Registrar artículo nuevo» en cada línea de la compra | `pages/almacen/CompraModal.jsx` |
| Generar nuevo préstamo de herramienta | `/almacen/prestamos` | `pages/almacen/Prestamos.jsx` |

**Notas del diagrama que se aplicaron:**
- **Tablas:** materiales y herramientas se muestran en una tabla donde cada columna es un atributo y cada fila un registro.
- **Solicitar compra por fila:** la opción aparece en cada entrada de material o herramienta, y el formulario solo pregunta la cantidad del objeto recibido.
- **Elegir o registrar artículo al comprar:** se puede escoger un objeto registrado o registrar uno nuevo. Sigue el diagrama de actividad *Registrar compra*.

## Módulo de gestión de producción (Gestor de Producción)

| Caso de uso | Pantalla |
|---|---|
| Desplegar opciones de gestión de cajas fuertes | `/produccion/cajas` |
| Registrar nueva caja fuerte | Botón «Registrar caja fuerte». Verifica stock (RF12) y muestra lo que se descontará (RF07) |
| Consultar lista de cajas fuertes | Tabla con filtro por estado |
| Modificar información de caja fuerte | Ícono de lápiz en cada fila |
| Desplegar opciones de gestión de modelos de cajas fuertes | `/produccion/modelos` |
| Registrar nuevo modelo de caja fuerte | Botón «Registrar modelo», con la receta de materiales y herramientas (RF11) |
| Consultar modelos de cajas fuertes | Tabla, más «Ver receta» |
| Modificar modelo de caja fuerte | Ícono de lápiz |
| Desplegar opciones de gestión de empleados | `/produccion/empleados` |
| Crear nuevo empleado / Desplegar lista de empleados / Modificar información de empleado / Eliminar empleado | Botones de la tabla. Eliminar respeta las FK RESTRICT |

## Módulo de ventas (Gestor de ventas)

| Caso de uso | Pantalla |
|---|---|
| Desplegar opciones de gestión de ventas | `/ventas/ventas` |
| Crear nueva venta de caja fuerte | Botón «Nueva venta». Solo ofrece cajas disponibles (RN10) |
| Desplegar lista de ventas de cajas fuertes | Tabla de ventas |
| Desplegar opciones gestión de clientes | `/ventas/clientes` |
| Registrar nuevo cliente / Desplegar lista de clientes / Modificar información de cliente | Botones de la tabla |

## Módulo de administración (Administrador)

| Caso de uso | Pantalla |
|---|---|
| Desplegar opciones gestión de empleados | `/admin/empleados` |
| Crear nuevo empleado / Consultar lista de empleados / Modificar información empleado | Incluye la asignación de rol y contraseña (RF01, RN01, RN02) |
| Desplegar opciones gestión de proveedores | `/admin/proveedores` |
| Crear nuevo proveedor / Consultar lista de proveedores / Modificar información proveedor | Botones de la tabla |

## Módulo de contabilidad (Contador)

| Caso de uso | Pantalla |
|---|---|
| Desplegar opciones de consulta | Grupo «Consultas» del menú |
| Desplegar lista de empleados | `/contabilidad/empleados` (solo lectura) |
| Desplegar lista de ventas | `/contabilidad/ventas` (solo lectura) |
| Desplegar lista de compras | `/contabilidad/compras` (solo lectura) |
