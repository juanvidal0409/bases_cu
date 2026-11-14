// Capa de servicios: un objeto por recurso con todas las llamadas al backend.
// Las páginas nunca llaman a fetch directamente; si cambia una ruta del backend,
// solo se modifica este archivo. El contrato completo está en docs/API.md.

import { api } from '../api/client.js';

const enc = encodeURIComponent;

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
};

export const materialesService = {
  list: () => api.get('/materiales'),
};

export const herramientasService = {
  list: () => api.get('/herramientas'),
};

export const modelosService = {
  list: () => api.get('/modelos'),
  create: (data) => api.post('/modelos', data),
  update: (referencia, data) => api.put(`/modelos/${enc(referencia)}`, data),
};

export const cajasService = {
  list: (filtros) => api.get('/cajas-fuertes', filtros),
  create: (data) => api.post('/cajas-fuertes', data),
  update: (serial, data) => api.put(`/cajas-fuertes/${enc(serial)}`, data),
};

export const empleadosService = {
  list: () => api.get('/empleados'),
  create: (data) => api.post('/empleados', data),
  update: (id, data) => api.put(`/empleados/${id}`, data),
  remove: (id) => api.del(`/empleados/${id}`),
};

export const prestamosService = {
  list: (estado) => api.get('/prestamos', { estado }),
  create: (data) => api.post('/prestamos', data),
  devolver: (id, data) => api.patch(`/prestamos/${id}/devolucion`, data),
};

export const clientesService = {
  list: () => api.get('/clientes'),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
};

export const ventasService = {
  list: () => api.get('/ventas'),
  create: (data) => api.post('/ventas', data),
};

export const proveedoresService = {
  list: () => api.get('/proveedores'),
  create: (data) => api.post('/proveedores', data),
  update: (id, data) => api.put(`/proveedores/${id}`, data),
};

export const solicitudesService = {
  list: () => api.get('/solicitudes-compra'),
  create: (data) => api.post('/solicitudes-compra', data),
};

export const comprasService = {
  list: () => api.get('/compras'),
  create: (data) => api.post('/compras', data),
};
