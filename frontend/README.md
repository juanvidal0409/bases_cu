# GIA · Frontend

Interfaz web de **GIA, Gestor de Inventario de Almacén**, para la empresa fabricante de cajas fuertes.

- **Proyecto:** Bases de Datos, Universidad Distrital.
- **Tecnologías:** React 18 + Vite, con React Router e íconos de Lucide. No usa librerías de UI: los componentes y estilos son propios (`src/components/ui`, `src/styles/global.css`).

## Requisitos

- Node.js 18 o superior (recomendado 20+).

## Cómo ejecutarlo

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run dev               # abre http://localhost:5173
```

Por defecto arranca en **modo de prueba** (`VITE_USE_MOCK=true`): funciona sin backend, con los datos de los INSERT del proyecto.

Cuentas de prueba (contraseña `gia123`):

| Rol | Correo |
|---|---|
| Administrador | admin@empresa.com |
| Gestor de almacén | jorge.medina@empresa.com |
| Gestor de producción | laura.gomez@empresa.com |
| Gestor de ventas | maria.fernandez@empresa.com |
| Contador | sofia.rojas@empresa.com |

Los cambios del modo de prueba se guardan mientras la pestaña esté abierta. Para volver a los datos iniciales, cierra la pestaña.

## Conectar con el backend

1. El backend implementa las rutas de **`docs/API.md`**: mismas rutas, mismos JSON y mismos códigos de error.
2. En `.env`:
   ```
   VITE_API_URL=http://localhost:8080/api
   VITE_USE_MOCK=false
   ```
3. Reinicia `npm run dev`. Vite solo lee el `.env` al arrancar.
4. El backend debe permitir CORS desde `http://localhost:5173`.

No hay que tocar ninguna página. Todas las llamadas pasan por dos archivos:

| Archivo | Qué hace |
|---|---|
| `src/api/client.js` | `fetch`, token `Bearer`, manejo de errores y cierre de sesión con 401 |
| `src/services/index.js` | Una función por endpoint. Si una ruta del backend cambia, se ajusta aquí |

`src/api/mock/server.js` es un backend simulado con las mismas reglas de negocio. Sirve como referencia de cómo debe responder el backend real a cada caso.

## Estructura

```
src/
├── api/
│   ├── client.js          Cliente HTTP (único punto de conexión con el backend)
│   ├── errors.js          ApiError
│   └── mock/              Backend simulado y datos de prueba
├── services/index.js      Endpoints agrupados por recurso
├── config/roles.js        Roles, módulos y menú de cada actor
├── context/               Sesión (AuthContext) y avisos (ToastContext)
├── hooks/                 useResource (cargar listas), useForm (formularios con validación)
├── components/
│   ├── layout/            Menú lateral, barra superior, protección de rutas
│   └── ui/                Botón, campos, tabla, modal, estados vacíos y de error
├── pages/                 Una carpeta por módulo del diagrama de casos de uso
│   ├── acceso/  almacen/  produccion/  ventas/  admin/  (contabilidad reutiliza páginas en modo lectura)
├── utils/                 Formatos (pesos, fechas) y validaciones
└── styles/global.css      Estilos y paleta
docs/
├── API.md                 Contrato para el backend
└── CASOS_DE_USO.md        Qué pantalla implementa cada caso de uso
```

## Compilar para producción

```bash
npm run build      # genera dist/
npm run preview    # sirve dist/ para revisarlo
```

- **Rutas sin `#`:** el servidor que publique `dist/` debe redirigir cualquier ruta a `index.html`, porque es una SPA.
- **Hosting sin redirecciones:** usa `VITE_ROUTER_MODE=hash` y las rutas quedan con `#` (`/#/almacen/materiales`).
