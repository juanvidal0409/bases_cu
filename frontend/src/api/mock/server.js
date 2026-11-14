// Backend simulado en memoria.
// Implementa el mismo contrato descrito en docs/API.md y aplica las reglas de negocio
// del proyecto para que la interfaz se pueda probar sin el backend real.
// Los cambios se guardan en sessionStorage: sobreviven a recargar la página y se
// pierden al cerrar la pestaña. Para volver a los datos iniciales, cierra la pestaña.

import { ApiError } from '../errors.js';
import { createSeed } from './seed.js';

const STORE_KEY = 'gia.mockdb.v1';
const db = loadDb();

function loadDb() {
  try {
    const saved = sessionStorage.getItem(STORE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* almacenamiento no disponible */ }
  return createSeed();
}
function saveDb() {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch { /* almacenamiento no disponible */ }
}
const MOCK_PASSWORD = 'gia123';
const LATENCY_MS = 250;
const R = {
  ADMIN: 'ADMINISTRADOR',
  ALM: 'GESTOR_ALMACEN',
  PROD: 'GESTOR_PRODUCCION',
  VEN: 'GESTOR_VENTAS',
  CONT: 'CONTADOR',
};
const ESTADOS_CAJA = ['En producción', 'Disponible', 'Vendida', 'Defectuosa'];

// ---------- utilidades ----------
const clone = (x) => JSON.parse(JSON.stringify(x));
const nextId = (rows) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
const today = () => new Date().toISOString().slice(0, 10);
const norm = (s) => String(s ?? '').trim().toLowerCase();
const fail = (status, message, errors) => { throw new ApiError(status, message, errors); };

function required(body, fields) {
  const errors = {};
  for (const f of fields) {
    const v = body?.[f];
    if (v === undefined || v === null || String(v).trim() === '') errors[f] = 'Este campo es obligatorio.';
  }
  if (Object.keys(errors).length) fail(400, 'Faltan campos obligatorios.', errors);
}
function positiveInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) fail(400, `La cantidad debe ser un entero mayor que cero.`, { [field]: 'Debe ser mayor que cero.' });
  return n;
}
function positiveNumber(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) fail(400, `El valor de ${field} debe ser mayor que cero.`, { [field]: 'Debe ser mayor que cero.' });
  return n;
}
function email(value, field = 'email') {
  if (value && !String(value).includes('@')) fail(400, 'El correo no tiene un formato válido.', { [field]: 'Correo no válido.' });
}
function unique(rows, field, value, exceptId, message) {
  if (!value) return;
  if (rows.some((r) => norm(r[field]) === norm(value) && r.id !== exceptId)) fail(409, message, { [field]: message });
}
function find(rows, pred, message = 'El registro no existe.') {
  const row = rows.find(pred);
  if (!row) fail(404, message);
  return row;
}

// ---------- vistas (joins que debe devolver el backend) ----------
const empleadoPublic = (e) => ({ id: e.id, nombre: e.nombre, telefono: e.telefono, email: e.email, cargo: e.cargo, rol: e.rol });

function herramientaView(h) {
  const prestadas = db.prestamos.filter((p) => p.id_herramienta === h.id && !p.fecha_devolucion).length;
  return { ...h, prestadas, disponibles: h.cantidad - prestadas };
}
function modeloView(m) {
  return {
    ...m,
    materiales: db.lista_material.filter((l) => l.id_modelo === m.referencia).map((l) => ({
      id_material: l.id_material,
      nombre: db.materiales.find((x) => x.id === l.id_material)?.nombre,
      cantidad: l.cantidad,
    })),
    herramientas: db.lista_herramienta.filter((l) => l.id_modelo === m.referencia).map((l) => ({
      id_herramienta: l.id_herramienta,
      nombre: db.herramientas.find((x) => x.id === l.id_herramienta)?.nombre,
      cantidad: l.cantidad,
    })),
    unidades_producidas: db.cajas.filter((c) => c.referencia === m.referencia).length,
  };
}
function cajaView(c) {
  return {
    ...c,
    modelo_descripcion: db.modelos.find((m) => m.referencia === c.referencia)?.descripcion,
    encargados: db.encargados.filter((e) => e.serial_caja_fuerte === c.serial).map((e) => {
      const emp = db.empleados.find((x) => x.id === e.id_empleado);
      return { id: emp.id, nombre: emp.nombre };
    }),
  };
}
function prestamoView(p) {
  return {
    ...p,
    empleado_nombre: db.empleados.find((e) => e.id === p.id_empleado)?.nombre,
    herramienta_nombre: db.herramientas.find((h) => h.id === p.id_herramienta)?.nombre,
  };
}
function ventaView(v) {
  const cajas = db.detalle_venta.filter((d) => d.id_venta === v.id).map((d) => {
    const c = db.cajas.find((x) => x.serial === d.serial_caja_fuerte);
    return { serial: c.serial, referencia: c.referencia, precio: c.precio };
  });
  return {
    ...v,
    cliente_nombre: db.clientes.find((c) => c.id === v.id_cliente)?.nombre,
    cajas,
    total: cajas.reduce((s, c) => s + Number(c.precio), 0),
  };
}
function solicitudView(s) {
  const compra = db.compras.find((c) => c.id_solicitud_compra === s.id);
  return {
    ...s,
    detalles: db.detalle_solicitud.filter((d) => d.id_solicitud_compra === s.id).map(({ id, nombre_articulo, cantidad, tipo }) => ({ id, nombre_articulo, cantidad, tipo })),
    id_compra: compra ? compra.id : null,
  };
}
function compraView(c) {
  return {
    ...c,
    proveedor_nombre: db.proveedores.find((p) => p.id === c.proveedor)?.nombre,
    detalles: db.detalle_compra.filter((d) => d.id_compra === c.id).map(({ id, nombre, cantidad }) => ({ id, nombre, cantidad })),
  };
}
const byDateDesc = (a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id);

// ---------- rutas ----------
// [método, patrón, roles permitidos (null = cualquier usuario autenticado, 'public' = sin token), manejador]
const routes = [
  // Control de acceso
  ['POST', '/auth/login', 'public', ({ body }) => {
    required(body, ['email', 'password']);
    const emp = db.empleados.find((e) => norm(e.email) === norm(body.email));
    if (!emp || !emp.rol || body.password !== (emp.password || MOCK_PASSWORD)) fail(401, 'Correo o contraseña incorrectos.');
    return { token: `mock-token-${emp.id}`, usuario: empleadoPublic(emp) };
  }],
  ['GET', '/auth/me', null, ({ user }) => empleadoPublic(user)],
  ['PUT', '/auth/me', null, ({ body, user }) => {
    required(body, ['nombre', 'email']);
    email(body.email);
    unique(db.empleados, 'email', body.email, user.id, 'Ya existe un empleado con ese correo.');
    if (body.password_nueva) {
      if (body.password_actual !== (user.password || MOCK_PASSWORD)) fail(400, 'La contraseña actual no es correcta.', { password_actual: 'No coincide.' });
      if (String(body.password_nueva).length < 6) fail(400, 'La contraseña nueva debe tener al menos 6 caracteres.', { password_nueva: 'Mínimo 6 caracteres.' });
      user.password = body.password_nueva;
    }
    Object.assign(user, { nombre: body.nombre, email: body.email, telefono: body.telefono || null });
    return empleadoPublic(user);
  }],

  // Inventario: materiales y herramientas
  ['GET', '/materiales', [R.ALM, R.PROD], () => clone(db.materiales)],
  ['GET', '/herramientas', [R.ALM, R.PROD], () => db.herramientas.map(herramientaView)],

  // Modelos de cajas fuertes
  ['GET', '/modelos', [R.ALM, R.PROD], () => db.modelos.map(modeloView)],
  ['POST', '/modelos', [R.PROD], ({ body }) => {
    required(body, ['referencia', 'capacidad', 'peso', 'alto', 'ancho']);
    if (db.modelos.some((m) => norm(m.referencia) === norm(body.referencia))) fail(409, 'Ya existe un modelo con esa referencia.', { referencia: 'Referencia repetida.' });
    const m = saveModelo({ referencia: String(body.referencia).trim().toUpperCase() }, body);
    return modeloView(m);
  }],
  ['PUT', '/modelos/:ref', [R.PROD], ({ params, body }) => {
    const m = find(db.modelos, (x) => x.referencia === params.ref, 'El modelo no existe.');
    required(body, ['capacidad', 'peso', 'alto', 'ancho']);
    saveModelo(m, body);
    return modeloView(m);
  }],

  // Cajas fuertes
  ['GET', '/cajas-fuertes', [R.PROD, R.VEN], ({ query }) => db.cajas
    .filter((c) => !query.estado || c.estado === query.estado)
    .filter((c) => !query.referencia || c.referencia === query.referencia)
    .map(cajaView)],
  ['POST', '/cajas-fuertes', [R.PROD], ({ body }) => {
    required(body, ['serial', 'precio', 'referencia']);
    const serial = String(body.serial).trim().toUpperCase();
    if (db.cajas.some((c) => c.serial === serial)) fail(409, 'Ya existe una caja fuerte con ese serial (RN08).', { serial: 'Serial repetido.' });
    const modelo = find(db.modelos, (m) => m.referencia === body.referencia, 'El modelo no existe.');
    const precio = Number(body.precio);
    if (!(precio >= 0)) fail(400, 'El precio no puede ser negativo.', { precio: 'No puede ser negativo.' });
    const estado = body.estado || 'En producción';
    if (!['En producción', 'Disponible', 'Defectuosa'].includes(estado)) fail(400, 'Estado no válido para una caja nueva (RN09).', { estado: 'Estado no válido.' });
    // RF12: verificar stock de todos los materiales de la receta
    const receta = db.lista_material.filter((l) => l.id_modelo === modelo.referencia);
    const faltantes = receta.map((l) => ({ l, mat: db.materiales.find((x) => x.id === l.id_material) }))
      .filter(({ l, mat }) => mat.cantidad < l.cantidad);
    if (faltantes.length) {
      fail(409, 'No hay stock suficiente para producir esta caja: ' +
        faltantes.map(({ l, mat }) => `${mat.nombre} (requiere ${l.cantidad}, hay ${mat.cantidad})`).join('; ') + '.');
    }
    // RF07: descontar materiales consumidos
    receta.forEach((l) => { db.materiales.find((x) => x.id === l.id_material).cantidad -= l.cantidad; });
    const caja = { serial, precio, estado, observaciones: body.observaciones || '', referencia: modelo.referencia };
    db.cajas.push(caja);
    setEncargados(serial, body.encargados);
    return cajaView(caja);
  }],
  ['PUT', '/cajas-fuertes/:serial', [R.PROD], ({ params, body }) => {
    const caja = find(db.cajas, (c) => c.serial === params.serial, 'La caja fuerte no existe.');
    if (body.estado && !ESTADOS_CAJA.includes(body.estado)) fail(400, 'Estado no válido (RN09).');
    if (caja.estado === 'Vendida' && body.estado && body.estado !== 'Vendida') fail(409, 'Una caja vendida no puede cambiar de estado.');
    if (caja.estado !== 'Vendida' && body.estado === 'Vendida') fail(409, 'El estado "Vendida" solo se asigna al registrar una venta (RN11).');
    if (body.precio !== undefined && !(Number(body.precio) >= 0)) fail(400, 'El precio no puede ser negativo.', { precio: 'No puede ser negativo.' });
    Object.assign(caja, {
      precio: body.precio !== undefined ? Number(body.precio) : caja.precio,
      estado: body.estado || caja.estado,
      observaciones: body.observaciones ?? caja.observaciones,
    });
    if (Array.isArray(body.encargados)) setEncargados(caja.serial, body.encargados);
    return cajaView(caja);
  }],

  // Empleados
  ['GET', '/empleados', [R.ADMIN, R.PROD, R.ALM, R.CONT], () => db.empleados.map(empleadoPublic)],
  ['POST', '/empleados', [R.ADMIN, R.PROD], ({ body, user }) => {
    required(body, ['nombre', 'email', 'cargo']);
    email(body.email);
    unique(db.empleados, 'email', body.email, null, 'Ya existe un empleado con ese correo.');
    const emp = {
      id: nextId(db.empleados), nombre: body.nombre.trim(), telefono: body.telefono || null,
      email: body.email.trim(), cargo: body.cargo.trim(),
      rol: user.rol === R.ADMIN ? body.rol || null : null, // RN02: solo el administrador asigna roles
    };
    if (emp.rol && body.password) emp.password = body.password;
    db.empleados.push(emp);
    return empleadoPublic(emp);
  }],
  ['PUT', '/empleados/:id', [R.ADMIN, R.PROD], ({ params, body, user }) => {
    const emp = find(db.empleados, (e) => e.id === Number(params.id), 'El empleado no existe.');
    required(body, ['nombre', 'email', 'cargo']);
    email(body.email);
    unique(db.empleados, 'email', body.email, emp.id, 'Ya existe un empleado con ese correo.');
    Object.assign(emp, { nombre: body.nombre.trim(), telefono: body.telefono || null, email: body.email.trim(), cargo: body.cargo.trim() });
    if (user.rol === R.ADMIN && 'rol' in body) {
      if (emp.id === user.id && body.rol !== R.ADMIN) fail(409, 'No puedes quitarte tu propio rol de administrador.');
      emp.rol = body.rol || null;
      if (body.password) emp.password = body.password;
    }
    return empleadoPublic(emp);
  }],
  ['DELETE', '/empleados/:id', [R.PROD], ({ params, user }) => {
    const id = Number(params.id);
    const emp = find(db.empleados, (e) => e.id === id, 'El empleado no existe.');
    if (emp.id === user.id) fail(409, 'No puedes eliminar tu propio usuario.');
    // ON DELETE RESTRICT: fk_encargado_empleado y fk_prestamo_empleado
    if (db.encargados.some((e) => e.id_empleado === id)) fail(409, `No se puede eliminar a ${emp.nombre}: está asignado a la producción de cajas fuertes.`);
    if (db.prestamos.some((p) => p.id_empleado === id)) fail(409, `No se puede eliminar a ${emp.nombre}: tiene préstamos de herramientas registrados.`);
    db.empleados = db.empleados.filter((e) => e.id !== id);
    return null;
  }],

  // Préstamos de herramientas
  ['GET', '/prestamos', [R.ALM], ({ query }) => db.prestamos
    .filter((p) => !query.estado || (query.estado === 'activos' ? !p.fecha_devolucion : !!p.fecha_devolucion))
    .map(prestamoView)
    .sort((a, b) => (a.fecha_prestamo < b.fecha_prestamo ? 1 : -1))],
  ['POST', '/prestamos', [R.ALM], ({ body }) => {
    required(body, ['id_empleado', 'id_herramienta']);
    find(db.empleados, (e) => e.id === Number(body.id_empleado), 'El empleado no existe.');
    const h = find(db.herramientas, (x) => x.id === Number(body.id_herramienta), 'La herramienta no existe.');
    if (herramientaView(h).disponibles <= 0) fail(409, `No hay unidades disponibles de ${h.nombre}: todas están prestadas.`);
    const p = { id: nextId(db.prestamos), id_empleado: Number(body.id_empleado), id_herramienta: h.id, fecha_prestamo: body.fecha_prestamo || today(), fecha_devolucion: null, observaciones: body.observaciones || '' };
    db.prestamos.push(p);
    return prestamoView(p);
  }],
  ['PATCH', '/prestamos/:id/devolucion', [R.ALM], ({ params, body }) => {
    const p = find(db.prestamos, (x) => x.id === Number(params.id), 'El préstamo no existe.');
    if (p.fecha_devolucion) fail(409, 'Este préstamo ya fue devuelto.');
    const fecha = body?.fecha_devolucion || today();
    if (fecha < p.fecha_prestamo) fail(400, 'La devolución no puede ser anterior al préstamo.', { fecha_devolucion: 'Anterior a la fecha de préstamo.' });
    Object.assign(p, { fecha_devolucion: fecha, observaciones: body?.observaciones ?? p.observaciones });
    return prestamoView(p);
  }],

  // Clientes
  ['GET', '/clientes', [R.VEN], () => db.clientes.map((c) => ({ ...c, compras: db.ventas.filter((v) => v.id_cliente === c.id).length }))],
  ['POST', '/clientes', [R.VEN], ({ body }) => {
    required(body, ['nombre']);
    email(body.email);
    unique(db.clientes, 'email', body.email, null, 'Ya existe un cliente con ese correo.');
    const c = { id: nextId(db.clientes), nombre: body.nombre.trim(), email: body.email || null, telefono: body.telefono || null };
    db.clientes.push(c);
    return { ...c, compras: 0 };
  }],
  ['PUT', '/clientes/:id', [R.VEN], ({ params, body }) => {
    const c = find(db.clientes, (x) => x.id === Number(params.id), 'El cliente no existe.');
    required(body, ['nombre']);
    email(body.email);
    unique(db.clientes, 'email', body.email, c.id, 'Ya existe un cliente con ese correo.');
    Object.assign(c, { nombre: body.nombre.trim(), email: body.email || null, telefono: body.telefono || null });
    return { ...c, compras: db.ventas.filter((v) => v.id_cliente === c.id).length };
  }],

  // Ventas
  ['GET', '/ventas', [R.VEN, R.CONT], () => db.ventas.map(ventaView).sort(byDateDesc)],
  ['POST', '/ventas', [R.VEN], ({ body }) => {
    required(body, ['id_cliente']);
    find(db.clientes, (c) => c.id === Number(body.id_cliente), 'El cliente no existe.');
    const seriales = Array.isArray(body.seriales) ? [...new Set(body.seriales)] : [];
    if (!seriales.length) fail(400, 'Selecciona al menos una caja fuerte.', { seriales: 'Obligatorio.' });
    const cajas = seriales.map((s) => find(db.cajas, (c) => c.serial === s, `La caja ${s} no existe.`));
    const noDisp = cajas.filter((c) => c.estado !== 'Disponible');
    if (noDisp.length) fail(409, `Solo se pueden vender cajas disponibles (RN10): ${noDisp.map((c) => `${c.serial} está ${c.estado.toLowerCase()}`).join(', ')}.`);
    const v = { id: nextId(db.ventas), fecha: body.fecha || today(), id_cliente: Number(body.id_cliente) };
    db.ventas.push(v);
    cajas.forEach((c) => {
      db.detalle_venta.push({ id: nextId(db.detalle_venta), id_venta: v.id, serial_caja_fuerte: c.serial });
      c.estado = 'Vendida'; // RN11
    });
    return ventaView(v);
  }],

  // Proveedores
  ['GET', '/proveedores', [R.ADMIN, R.ALM], () => db.proveedores.map((p) => ({ ...p, compras: db.compras.filter((c) => c.proveedor === p.id).length }))],
  ['POST', '/proveedores', [R.ADMIN], ({ body }) => {
    required(body, ['nombre', 'email']);
    email(body.email);
    unique(db.proveedores, 'nombre', body.nombre, null, 'Ya existe un proveedor con ese nombre.');
    unique(db.proveedores, 'email', body.email, null, 'Ya existe un proveedor con ese correo.');
    const p = { id: nextId(db.proveedores), nombre: body.nombre.trim(), email: body.email.trim(), telefono: body.telefono || null };
    db.proveedores.push(p);
    return { ...p, compras: 0 };
  }],
  ['PUT', '/proveedores/:id', [R.ADMIN], ({ params, body }) => {
    const p = find(db.proveedores, (x) => x.id === Number(params.id), 'El proveedor no existe.');
    required(body, ['nombre', 'email']);
    email(body.email);
    unique(db.proveedores, 'nombre', body.nombre, p.id, 'Ya existe un proveedor con ese nombre.');
    unique(db.proveedores, 'email', body.email, p.id, 'Ya existe un proveedor con ese correo.');
    Object.assign(p, { nombre: body.nombre.trim(), email: body.email.trim(), telefono: body.telefono || null });
    return { ...p, compras: db.compras.filter((c) => c.proveedor === p.id).length };
  }],

  // Solicitudes de compra
  ['GET', '/solicitudes-compra', [R.ALM], () => db.solicitudes.map(solicitudView).sort(byDateDesc)],
  ['POST', '/solicitudes-compra', [R.ALM], ({ body }) => {
    const detalles = Array.isArray(body?.detalles) ? body.detalles : [];
    if (!detalles.length) fail(400, 'Agrega al menos un artículo a la solicitud.');
    const nombres = new Set();
    detalles.forEach((d, i) => {
      required(d, ['nombre_articulo', 'cantidad', 'tipo']);
      positiveInt(d.cantidad, `detalles.${i}.cantidad`);
      if (!['Material', 'Herramienta'].includes(d.tipo)) fail(400, 'El tipo debe ser Material o Herramienta.');
      const k = norm(d.nombre_articulo);
      if (nombres.has(k)) fail(409, `"${d.nombre_articulo}" aparece dos veces en la solicitud.`);
      nombres.add(k);
    });
    const s = { id: nextId(db.solicitudes), fecha: body.fecha || today() };
    db.solicitudes.push(s);
    detalles.forEach((d) => db.detalle_solicitud.push({ id: nextId(db.detalle_solicitud), id_solicitud_compra: s.id, nombre_articulo: d.nombre_articulo.trim(), cantidad: Number(d.cantidad), tipo: d.tipo }));
    return solicitudView(s);
  }],

  // Compras
  ['GET', '/compras', [R.ALM, R.CONT], () => db.compras.map(compraView).sort(byDateDesc)],
  ['POST', '/compras', [R.ALM], ({ body }) => {
    required(body, ['id_solicitud_compra', 'proveedor']);
    find(db.solicitudes, (s) => s.id === Number(body.id_solicitud_compra), 'La solicitud de compra no existe.');
    if (db.compras.some((c) => c.id_solicitud_compra === Number(body.id_solicitud_compra))) fail(409, 'Esta solicitud ya tiene una compra registrada.');
    find(db.proveedores, (p) => p.id === Number(body.proveedor), 'El proveedor no existe.');
    const detalles = Array.isArray(body.detalles) ? body.detalles : [];
    if (!detalles.length) fail(400, 'Agrega al menos un artículo comprado.');
    const nombres = new Set();
    detalles.forEach((d, i) => {
      required(d, ['nombre', 'cantidad', 'tipo']);
      positiveInt(d.cantidad, `detalles.${i}.cantidad`); // RN07
      const k = norm(d.nombre);
      if (nombres.has(k)) fail(409, `"${d.nombre}" aparece dos veces en la compra (RN06).`);
      nombres.add(k);
    });
    const c = { id: nextId(db.compras), fecha: body.fecha || today(), observaciones: body.observaciones || '', id_solicitud_compra: Number(body.id_solicitud_compra), proveedor: Number(body.proveedor) };
    db.compras.push(c);
    detalles.forEach((d) => {
      db.detalle_compra.push({ id: nextId(db.detalle_compra), id_compra: c.id, nombre: d.nombre.trim(), cantidad: Number(d.cantidad) });
      // Caso de uso incluido: "Registro de material o herramienta en el inventario" (RN03)
      const tabla = d.tipo === 'Herramienta' ? db.herramientas : db.materiales;
      const existente = tabla.find((x) => norm(x.nombre) === norm(d.nombre));
      if (existente) existente.cantidad += Number(d.cantidad);
      else tabla.push({ id: nextId(tabla), nombre: d.nombre.trim(), cantidad: Number(d.cantidad), tipo: d.categoria || 'Sin categoría' });
    });
    return compraView(c);
  }],
];

function saveModelo(m, body) {
  const datos = {
    descripcion: body.descripcion || null,
    capacidad: positiveNumber(body.capacidad, 'capacidad'),
    peso: positiveNumber(body.peso, 'peso'),
    alto: positiveNumber(body.alto, 'alto'),
    ancho: positiveNumber(body.ancho, 'ancho'),
  };
  const mats = Array.isArray(body.materiales) ? body.materiales : [];
  const hers = Array.isArray(body.herramientas) ? body.herramientas : [];
  const dup = (arr, k) => new Set(arr.map((x) => Number(x[k]))).size !== arr.length;
  if (dup(mats, 'id_material')) fail(409, 'Un material no puede repetirse en la receta del modelo.');
  if (dup(hers, 'id_herramienta')) fail(409, 'Una herramienta no puede repetirse en el mismo modelo.');
  mats.forEach((x) => { find(db.materiales, (y) => y.id === Number(x.id_material), 'Material no encontrado.'); positiveInt(x.cantidad, 'cantidad'); });
  hers.forEach((x) => { find(db.herramientas, (y) => y.id === Number(x.id_herramienta), 'Herramienta no encontrada.'); positiveInt(x.cantidad, 'cantidad'); });
  Object.assign(m, datos);
  if (!db.modelos.includes(m)) db.modelos.push(m);
  db.lista_material = db.lista_material.filter((l) => l.id_modelo !== m.referencia);
  mats.forEach((x) => db.lista_material.push({ id: nextId(db.lista_material), id_modelo: m.referencia, id_material: Number(x.id_material), cantidad: Number(x.cantidad) }));
  db.lista_herramienta = db.lista_herramienta.filter((l) => l.id_modelo !== m.referencia);
  hers.forEach((x) => db.lista_herramienta.push({ id: nextId(db.lista_herramienta), id_modelo: m.referencia, id_herramienta: Number(x.id_herramienta), cantidad: Number(x.cantidad) }));
  return m;
}

function setEncargados(serial, ids) {
  db.encargados = db.encargados.filter((e) => e.serial_caja_fuerte !== serial);
  [...new Set((ids || []).map(Number))].forEach((id) => {
    find(db.empleados, (e) => e.id === id, 'Uno de los encargados no existe.');
    db.encargados.push({ serial_caja_fuerte: serial, id_empleado: id });
  });
}

function match(pattern, path) {
  const p = pattern.split('/');
  const a = path.split('/');
  if (p.length !== a.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

export async function mockRequest(method, fullPath, { body, params: query = {}, token }) {
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  const path = fullPath.split('?')[0];
  for (const [m, pattern, roles, handler] of routes) {
    if (m !== method) continue;
    const params = match(pattern, path);
    if (!params) continue;
    let user = null;
    if (roles !== 'public') {
      const id = Number(String(token || '').replace('mock-token-', ''));
      user = db.empleados.find((e) => e.id === id && e.rol);
      if (!user) fail(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
      if (Array.isArray(roles) && !roles.includes(user.rol)) fail(403, 'Tu rol no tiene permiso para esta acción.');
    }
    const result = handler({ params, query, body: body ? clone(body) : {}, user });
    if (method !== 'GET') saveDb();
    return result === null ? null : clone(result);
  }
  fail(404, `Ruta no encontrada en el mock: ${method} ${path}`);
}
