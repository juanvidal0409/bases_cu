# Contrato de la API de GIA

Este documento es lo que el frontend espera del backend. El modo de prueba (`src/api/mock/server.js`) implementa exactamente este contrato. Si una respuesta no coincide, la interfaz no se va a ver bien.

## Convenciones generales

- **Base:** todas las rutas cuelgan de `VITE_API_URL`, por ejemplo `http://localhost:8080/api`.
- **Formato:** JSON en peticiones y respuestas, con `Content-Type: application/json`.
- **Fechas:** texto `YYYY-MM-DD`, por ejemplo `"2026-11-14"`.
- **Nombres de campos:** los mismos de las columnas del DDL (`id_cliente`, `fecha_prestamo`…). Los campos que vienen de un JOIN terminan en `_nombre` (`cliente_nombre`, `proveedor_nombre`…).
- **Autenticación:** el login devuelve un token. El front lo envía en cada petición como `Authorization: Bearer <token>`. Se recomienda JWT con el `id` del empleado y su `rol`.
- **CORS:** el backend debe aceptar el origen del front. En desarrollo es `http://localhost:5173`.

### Respuestas de error

Cualquier error debe responder con el código HTTP adecuado y este cuerpo:

```json
{
  "message": "Texto para mostrar al usuario.",
  "errors": { "email": "Ya existe un empleado con ese correo." }
}
```

`errors` es opcional. Si viene, el front pinta cada mensaje debajo de su campo.

| Código | Cuándo usarlo |
|---|---|
| 400 | Datos inválidos o faltantes. |
| 401 | No hay token, el token es inválido o expiró. El front cierra la sesión. |
| 403 | El rol del usuario no puede usar esa ruta. |
| 404 | El registro no existe. |
| 409 | Violación de una regla de negocio o de una restricción (UNIQUE, FK RESTRICT, stock insuficiente). |
| 500 | Error inesperado. |

Una buena práctica es traducir los errores de PostgreSQL a 409 con un mensaje claro. `23505` es unique_violation, `23503` es foreign_key_violation y `23514` es check_violation.

### Roles

Los valores exactos que espera el front son: `ADMINISTRADOR`, `GESTOR_ALMACEN`, `GESTOR_PRODUCCION`, `GESTOR_VENTAS` y `CONTADOR`. Un empleado sin acceso tiene `rol: null`.

> **Cambio necesario en la base de datos.** El DDL actual no guarda credenciales ni rol de acceso: `empleado.cargo` es texto libre. Para RN01, RNF03 y RNF04 se recomienda una de estas dos opciones:
> - Agregar a `empleado` las columnas `rol VARCHAR(30) NULL CHECK (rol IN (...))` y `password_hash VARCHAR(255)`.
> - Crear una tabla `usuario (id_empleado PK/FK, rol, password_hash)`.
>
> Las contraseñas se guardan con hash (bcrypt o argon2), nunca en texto plano.

En cada ruta, la columna **Roles** dice quién puede llamarla. Si otro rol la llama, se responde 403.

---

## Control de acceso

### `POST /auth/login` (pública)
```json
// petición
{ "email": "jorge.medina@empresa.com", "password": "gia123" }
// respuesta 200
{
  "token": "eyJhbGciOi...",
  "usuario": { "id": 5, "nombre": "Jorge Medina", "telefono": "3045556677",
               "email": "jorge.medina@empresa.com", "cargo": "Almacenista", "rol": "GESTOR_ALMACEN" }
}
```
Responde 401 con `"Correo o contraseña incorrectos."` si las credenciales no coinciden o si el empleado no tiene rol.

### `GET /auth/me` (cualquier rol)
Devuelve el objeto `usuario` del token. El front lo usa al recargar la página para recuperar la sesión.

### `PUT /auth/me` (cualquier rol)
Corresponde al caso de uso *Actualizar información usuario*.
```json
{ "nombre": "Jorge Medina", "email": "jorge.medina@empresa.com", "telefono": "3045556677",
  "password_actual": "gia123", "password_nueva": "nueva123" }
```
Los campos `password_*` son opcionales. Si viene `password_nueva`, hay que verificar `password_actual`. Responde con el `usuario` actualizado.

---

## Inventario

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/materiales` | Almacén, Producción | Lista de materiales |
| GET | `/herramientas` | Almacén, Producción | Lista de herramientas con su disponibilidad |

```json
// GET /materiales
[{ "id": 1, "nombre": "Lámina de acero 3mm", "cantidad": 120, "tipo": "Metal" }]

// GET /herramientas
[{ "id": 1, "nombre": "Soldadora MIG", "cantidad": 5, "tipo": "Eléctrica",
   "prestadas": 0, "disponibles": 5 }]
```
`prestadas` es el número de préstamos sin `fecha_devolucion` de esa herramienta. `disponibles` es `cantidad - prestadas`.

Los materiales y herramientas no se crean directamente: se crean o se incrementan al registrar una compra (ver `POST /compras`).

---

## Modelos de cajas fuertes

| Método | Ruta | Roles |
|---|---|---|
| GET | `/modelos` | Almacén, Producción |
| POST | `/modelos` | Producción |
| PUT | `/modelos/:referencia` | Producción |

```json
// GET /modelos (cada elemento)
{
  "referencia": "CF-100", "descripcion": "Caja fuerte compacta para el hogar",
  "capacidad": 20, "peso": 25.5, "alto": 35, "ancho": 40,
  "materiales":   [{ "id_material": 1, "nombre": "Lámina de acero 3mm", "cantidad": 4 }],
  "herramientas": [{ "id_herramienta": 1, "nombre": "Soldadora MIG", "cantidad": 1 }],
  "unidades_producidas": 3
}

// POST /modelos
{
  "referencia": "CF-600", "descripcion": "…", "capacidad": 60, "peso": 70, "alto": 60, "ancho": 50,
  "materiales":   [{ "id_material": 1, "cantidad": 8 }],
  "herramientas": [{ "id_herramienta": 2, "cantidad": 1 }]
}
```
`PUT` recibe lo mismo sin `referencia`, porque la referencia no se puede cambiar. El backend reemplaza por completo las filas de `lista_material` y `lista_herramienta` del modelo, dentro de una transacción. Si un material o herramienta se repite, responde 409.

---

## Cajas fuertes

| Método | Ruta | Roles |
|---|---|---|
| GET | `/cajas-fuertes?estado=&referencia=` | Producción, Ventas |
| POST | `/cajas-fuertes` | Producción |
| PUT | `/cajas-fuertes/:serial` | Producción |

```json
// GET (cada elemento)
{ "serial": "SN-0001", "precio": 350000, "estado": "Disponible", "observaciones": "Sin novedades",
  "referencia": "CF-100", "modelo_descripcion": "Caja fuerte compacta para el hogar",
  "encargados": [{ "id": 1, "nombre": "Carlos Ramírez" }] }

// POST
{ "serial": "SN-0008", "referencia": "CF-100", "precio": 380000, "estado": "En producción",
  "observaciones": null, "encargados": [1, 3] }

// PUT
{ "precio": 390000, "estado": "Disponible", "observaciones": "…", "encargados": [1] }
```

**Reglas que debe aplicar el backend en `POST`**, todo en una transacción:
1. El serial es único (RN08). Si se repite, responde 409.
2. **RF12:** por cada fila de `lista_material` del modelo, verifica que `material.cantidad >= lista_material.cantidad`. Si falta stock, responde 409 con un mensaje que nombre los materiales faltantes.
3. **RF07:** descuenta esas cantidades de `material`.
4. Inserta la caja y sus filas en `encargado_caja_fuerte` (RF15).

`estado` solo acepta `En producción`, `Disponible` o `Defectuosa` en el `POST`. El estado `Vendida` lo asigna únicamente `POST /ventas`. En `PUT`, una caja vendida no puede cambiar de estado.

---

## Empleados

| Método | Ruta | Roles |
|---|---|---|
| GET | `/empleados` | Administrador, Producción, Almacén, Contador |
| POST | `/empleados` | Administrador, Producción |
| PUT | `/empleados/:id` | Administrador, Producción |
| DELETE | `/empleados/:id` | Producción |

```json
// GET (cada elemento) — nunca devolver password_hash
{ "id": 1, "nombre": "Carlos Ramírez", "telefono": "3001112233",
  "email": "carlos.ramirez@empresa.com", "cargo": "Soldador", "rol": null }

// POST / PUT
{ "nombre": "…", "cargo": "…", "email": "…", "telefono": "…",
  "rol": "GESTOR_ALMACEN", "password": "inicial123" }
```
- **RN02:** `rol` y `password` solo se tienen en cuenta si quien llama es `ADMINISTRADOR`. Si llama Producción, se ignoran.
- En `PUT`, si `password` viene vacío o no viene, se conserva la contraseña actual.
- `DELETE` responde 409 si el empleado está en `encargado_caja_fuerte` o en `prestamo_herramienta`, porque son FK RESTRICT. Si sale bien, responde `204` sin cuerpo.

---

## Préstamos de herramientas

| Método | Ruta | Roles |
|---|---|---|
| GET | `/prestamos?estado=activos\|devueltos` | Almacén |
| POST | `/prestamos` | Almacén |
| PATCH | `/prestamos/:id/devolucion` | Almacén |

```json
// GET (cada elemento)
{ "id": 3, "id_empleado": 3, "empleado_nombre": "Andrés Torres",
  "id_herramienta": 3, "herramienta_nombre": "Amoladora angular",
  "fecha_prestamo": "2026-10-10", "fecha_devolucion": null, "observaciones": "Aún en uso" }

// POST
{ "id_herramienta": 2, "id_empleado": 4, "fecha_prestamo": "2026-11-14", "observaciones": null }

// PATCH /prestamos/3/devolucion
{ "fecha_devolucion": "2026-11-14", "observaciones": "Devuelta en buen estado" }
```
Sin `estado` en la consulta, se devuelven todos los préstamos. `POST` responde 409 si la herramienta no tiene unidades disponibles. `PATCH` responde 409 si el préstamo ya fue devuelto.

---

## Clientes

| Método | Ruta | Roles |
|---|---|---|
| GET | `/clientes` | Ventas |
| POST | `/clientes` | Ventas |
| PUT | `/clientes/:id` | Ventas |

```json
// GET (cada elemento) — "compras" = número de ventas del cliente
{ "id": 1, "nombre": "Ana Martínez", "email": "ana.martinez@correo.com", "telefono": "3101234567", "compras": 0 }
// POST / PUT
{ "nombre": "…", "email": "…", "telefono": "…" }
```

---

## Ventas

| Método | Ruta | Roles |
|---|---|---|
| GET | `/ventas` | Ventas, Contador |
| POST | `/ventas` | Ventas |

```json
// GET (cada elemento) — total = suma de caja_fuerte.precio
{ "id": 1, "fecha": "2026-09-18", "id_cliente": 2, "cliente_nombre": "Pedro Sánchez",
  "cajas": [{ "serial": "SN-0002", "referencia": "CF-200", "precio": 720000 }],
  "total": 720000 }

// POST
{ "id_cliente": 1, "fecha": "2026-11-14", "seriales": ["SN-0001", "SN-0003"] }
```
**Reglas, en una transacción:**
- **RN10:** si alguna caja no está en estado `Disponible`, responde 409.
- **RF08 y RN11:** inserta `venta` y una fila de `detalle_venta` por caja, y cambia el estado de cada caja a `Vendida`.

---

## Proveedores

| Método | Ruta | Roles |
|---|---|---|
| GET | `/proveedores` | Administrador, Almacén |
| POST | `/proveedores` | Administrador |
| PUT | `/proveedores/:id` | Administrador |

```json
// GET (cada elemento) — "compras" = número de compras al proveedor
{ "id": 1, "nombre": "Aceros del Norte", "email": "ventas@acerosnorte.com", "telefono": "6011112222", "compras": 1 }
```

---

## Solicitudes de compra

| Método | Ruta | Roles |
|---|---|---|
| GET | `/solicitudes-compra` | Almacén |
| POST | `/solicitudes-compra` | Almacén |

```json
// GET (cada elemento) — id_compra es null mientras la solicitud está pendiente
{ "id": 6, "fecha": "2026-11-10", "id_compra": null,
  "detalles": [{ "id": 6, "nombre_articulo": "Tornillo hexagonal 1/4\"", "cantidad": 500, "tipo": "Material" }] }

// POST
{ "fecha": "2026-11-14",
  "detalles": [{ "nombre_articulo": "Bisagra reforzada", "tipo": "Material", "cantidad": 100 }] }
```
`tipo` solo acepta `Material` o `Herramienta`. Si un artículo se repite en la misma solicitud, responde 409.

---

## Compras

| Método | Ruta | Roles |
|---|---|---|
| GET | `/compras` | Almacén, Contador |
| POST | `/compras` | Almacén |

```json
// GET (cada elemento)
{ "id": 1, "fecha": "2026-08-05", "observaciones": "Entrega completa",
  "id_solicitud_compra": 1, "proveedor": 1, "proveedor_nombre": "Aceros del Norte",
  "detalles": [{ "id": 1, "nombre": "Lámina de acero 3mm", "cantidad": 100 }] }

// POST
{
  "fecha": "2026-11-14", "observaciones": null, "id_solicitud_compra": 6, "proveedor": 4,
  "detalles": [
    { "tipo": "Material", "nombre": "Tornillo hexagonal 1/4\"", "cantidad": 500 },
    { "tipo": "Herramienta", "nombre": "Remachadora neumática", "cantidad": 2, "categoria": "Neumática" }
  ]
}
```
**Reglas, en una transacción:**
- La solicitud debe existir y no tener ya una compra. Si la tiene, responde 409.
- **RN06 y RN07:** ningún artículo se repite y todas las cantidades son mayores que cero.
- Inserta `compra` y `detalle_compra` (`nombre`, `cantidad`).
- **RN03, caso de uso incluido *Registro de material o herramienta en el inventario*:** por cada detalle, busca por `nombre` en `material` o `herramienta`, según `tipo`. Si existe, suma la cantidad. Si no existe, lo inserta con `tipo = categoria`.

`tipo` y `categoria` no se guardan en `detalle_compra`. Solo sirven para saber en qué tabla del inventario va cada artículo y con qué categoría se crea.
