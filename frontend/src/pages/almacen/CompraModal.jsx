import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { Loading, ErrorState } from '../../components/ui/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  comprasService, herramientasService, materialesService, proveedoresService, solicitudesService,
} from '../../services/index.js';
import { formatDate, normalize, todayISO } from '../../utils/format.js';

const NUEVO = 'nuevo';
const TIPOS = [{ value: 'Material', label: 'Material' }, { value: 'Herramienta', label: 'Herramienta' }];
const newLine = (over = {}) => ({ key: Math.random(), tipo: 'Material', ref: '', nombre: '', categoria: '', cantidad: '', ...over });

// Caso de uso "Registrar compra de material o herramienta".
// Incluye "Registro de material o herramienta en el inventario": por cada artículo
// el usuario elige uno ya registrado o registra uno nuevo (diagrama de actividad).
export default function CompraModal({ open, solicitudId, onClose, onSaved }) {
  const toast = useToast();
  const [cat, setCat] = useState(null); // catálogos
  const [loadError, setLoadError] = useState(null);
  const [values, setValues] = useState({});
  const [lines, setLines] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadCatalogs = async () => {
    setLoadError(null);
    setCat(null);
    try {
      const [solicitudes, proveedores, materiales, herramientas] = await Promise.all([
        solicitudesService.list(), proveedoresService.list(), materialesService.list(), herramientasService.list(),
      ]);
      setCat({ solicitudes: solicitudes.filter((s) => !s.id_compra), proveedores, materiales, herramientas });
    } catch (err) {
      setLoadError(err);
    }
  };

  useEffect(() => {
    if (!open) return;
    setValues({ id_solicitud_compra: solicitudId ? String(solicitudId) : '', proveedor: '', fecha: todayISO(), observaciones: '' });
    setLines([]);
    setErrors({});
    setFormError(null);
    loadCatalogs();
  }, [open, solicitudId]);

  const inventario = (tipo) => (tipo === 'Herramienta' ? cat?.herramientas : cat?.materiales) || [];

  // Al elegir la solicitud, se precargan sus artículos y se asocian con el inventario.
  useEffect(() => {
    if (!cat || !values.id_solicitud_compra) return;
    const s = cat.solicitudes.find((x) => String(x.id) === String(values.id_solicitud_compra));
    if (!s) return;
    setLines(s.detalles.map((d) => {
      const match = inventario(d.tipo).find((x) => normalize(x.nombre) === normalize(d.nombre_articulo));
      return newLine({ tipo: d.tipo, ref: match ? String(match.id) : NUEVO, nombre: match ? '' : d.nombre_articulo, cantidad: String(d.cantidad) });
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, values.id_solicitud_compra]);

  const setField = (f, v) => { setValues((x) => ({ ...x, [f]: v })); setErrors((e) => ({ ...e, [f]: null })); };
  const setLine = (i, patch) => {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
    setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[`${i}.${k}`]); return n; });
  };

  const nombreDe = (l) => (l.ref === NUEVO ? l.nombre.trim() : inventario(l.tipo).find((x) => String(x.id) === l.ref)?.nombre);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!values.id_solicitud_compra) errs.id_solicitud_compra = 'Elige la solicitud que origina la compra.';
    if (!values.proveedor) errs.proveedor = 'Elige el proveedor.';
    if (!lines.length) errs.lines = 'Agrega al menos un artículo.';
    const seen = new Set();
    lines.forEach((l, i) => {
      if (!l.ref) errs[`${i}.ref`] = 'Elige un artículo.';
      if (l.ref === NUEVO && !l.nombre.trim()) errs[`${i}.nombre`] = 'Escribe el nombre.';
      if (l.ref === NUEVO && !l.categoria.trim()) errs[`${i}.categoria`] = 'Escribe la categoría.';
      if (!(Number(l.cantidad) > 0) || !Number.isInteger(Number(l.cantidad))) errs[`${i}.cantidad`] = 'Entero mayor que cero.';
      const n = normalize(nombreDe(l));
      if (n && seen.has(n)) errs[`${i}.ref`] = 'Este artículo ya está en la compra.';
      if (n) seen.add(n);
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setFormError(null);
    try {
      const c = await comprasService.create({
        fecha: values.fecha,
        observaciones: values.observaciones.trim() || null,
        id_solicitud_compra: Number(values.id_solicitud_compra),
        proveedor: Number(values.proveedor),
        detalles: lines.map((l) => ({
          tipo: l.tipo,
          nombre: nombreDe(l),
          cantidad: Number(l.cantidad),
          ...(l.ref === NUEVO ? { categoria: l.categoria.trim() } : {}),
        })),
      });
      toast.success(`Compra #${c.id} registrada. El inventario se actualizó.`);
      onSaved?.(c);
      onClose();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const solicitudOptions = useMemo(() => (cat?.solicitudes || []).map((s) => ({
    value: String(s.id),
    label: `#${s.id} · ${formatDate(s.fecha)} · ${s.detalles.map((d) => d.nombre_articulo).join(', ')}`,
  })), [cat]);

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Registrar compra"
      description="Los artículos comprados se suman al inventario. Si un artículo no existe, se registra como nuevo."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="compra-form" loading={saving} disabled={!cat}>Registrar compra</Button>
      </>}>
      {loadError ? <ErrorState error={loadError} onRetry={loadCatalogs} /> : !cat ? <Loading /> : (
        <form id="compra-form" onSubmit={submit} noValidate>
          {!cat.solicitudes.length && (
            <p className="alert alert--info">No hay solicitudes pendientes. Toda compra debe partir de una solicitud: créala primero en Solicitudes de compra.</p>
          )}
          <div className="grid-2">
            <Select label="Solicitud de compra" required placeholder="Elige una solicitud pendiente" options={solicitudOptions}
              value={values.id_solicitud_compra} onChange={(e) => setField('id_solicitud_compra', e.target.value)} error={errors.id_solicitud_compra} className="span-2" />
            <Select label="Proveedor" required placeholder="Elige un proveedor" options={cat.proveedores.map((p) => ({ value: String(p.id), label: p.nombre }))}
              value={values.proveedor} onChange={(e) => setField('proveedor', e.target.value)} error={errors.proveedor} />
            <Input label="Fecha de compra" type="date" required value={values.fecha} onChange={(e) => setField('fecha', e.target.value)} />
          </div>

          <fieldset className="form-section">
            <legend>Artículos comprados</legend>
            {errors.lines && <p className="field__error">{errors.lines}</p>}
            <div className="lines">
              {lines.map((l, i) => (
                <div key={l.key} className="line line--compra">
                  <Select label="Tipo" options={TIPOS} value={l.tipo} onChange={(e) => setLine(i, { tipo: e.target.value, ref: '' })} />
                  <Select label="Artículo" placeholder="Elige un artículo" error={errors[`${i}.ref`]}
                    options={[...inventario(l.tipo).map((x) => ({ value: String(x.id), label: `${x.nombre} (hay ${x.cantidad})` })), { value: NUEVO, label: '+ Registrar artículo nuevo' }]}
                    value={l.ref} onChange={(e) => setLine(i, { ref: e.target.value })} />
                  <Input label="Cantidad" type="number" min="1" step="1" inputMode="numeric" value={l.cantidad}
                    onChange={(e) => setLine(i, { cantidad: e.target.value })} error={errors[`${i}.cantidad`]} />
                  <Button type="button" variant="ghost" icon={Trash2} aria-label="Quitar artículo" className="line__remove"
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} />
                  {l.ref === NUEVO && (
                    <div className="line__nuevo">
                      <Input label={`Nombre del ${l.tipo === 'Material' ? 'material' : 'herramienta'} nuevo`} value={l.nombre}
                        onChange={(e) => setLine(i, { nombre: e.target.value })} error={errors[`${i}.nombre`]} />
                      <Input label="Categoría" placeholder={l.tipo === 'Material' ? 'Metal, Acabado, Herrajes…' : 'Eléctrica, Manual…'} value={l.categoria}
                        onChange={(e) => setLine(i, { categoria: e.target.value })} error={errors[`${i}.categoria`]} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={() => setLines((ls) => [...ls, newLine()])}>Agregar artículo</Button>
          </fieldset>

          <Textarea label="Observaciones" placeholder="Condiciones de pago, estado de la entrega…" value={values.observaciones} onChange={(e) => setField('observaciones', e.target.value)} />
          {formError && <p className="alert alert--error" role="alert">{formError}</p>}
        </form>
      )}
    </Modal>
  );
}
