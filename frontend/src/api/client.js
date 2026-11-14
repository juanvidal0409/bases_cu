// Cliente HTTP único de la aplicación.
// Todas las llamadas al backend pasan por aquí: añade el token, serializa JSON
// y convierte las respuestas de error en ApiError con un mensaje legible.
//
// Con VITE_USE_MOCK=true las peticiones se resuelven en memoria (src/api/mock),
// con el mismo contrato que debe implementar el backend (docs/API.md).

import { mockRequest } from './mock/server.js';
import { ApiError } from './errors.js';

export { ApiError };

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const TOKEN_KEY = 'gia.token';

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return memoryToken; }
  },
  set(token) {
    memoryToken = token;
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* almacenamiento no disponible */ }
  },
  clear() {
    memoryToken = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* almacenamiento no disponible */ }
  },
};
let memoryToken = null;

// Permite que AuthContext cierre la sesión cuando el backend responde 401.
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

function buildQuery(params) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries).toString();
}

const DEFAULT_MESSAGES = {
  0: 'No hay conexión con el servidor. Revisa que el backend esté encendido.',
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión expiró. Inicia sesión de nuevo.',
  403: 'Tu rol no tiene permiso para esta acción.',
  404: 'El registro no existe.',
  409: 'La operación entra en conflicto con datos existentes.',
  500: 'El servidor tuvo un error. Intenta de nuevo.',
};

async function request(method, path, { body, params } = {}) {
  const token = tokenStore.get();

  if (USE_MOCK) {
    try {
      return await mockRequest(method, path, { body, params, token });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && path !== '/auth/login') onUnauthorized();
      throw err;
    }
  }

  let response;
  try {
    response = await fetch(API_URL + path + buildQuery(params), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, DEFAULT_MESSAGES[0]);
  }

  if (response.status === 204) return null;

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') onUnauthorized();
    const message = data?.message || DEFAULT_MESSAGES[response.status] || DEFAULT_MESSAGES[500];
    throw new ApiError(response.status, message, data?.errors);
  }
  return data;
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
};
