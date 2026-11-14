import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Input, Select } from '../../components/ui/Field.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { solicitudesService } from '../../services/index.js';
import { todayISO, normalize } from '../../utils/format.js';

const TIPOS = [{ value: 'Material', label: 'Material' }, { value: 'Herramienta', label: 'Herramienta' }];
const emptyLine = () => ({ key: Math.random(), nombre_articulo: '', tipo: 'Material', cantidad: '' });

// Caso de uso "Solicitar compra de material o herramienta".
// Si llega `articulo`, el formulario solo pregunta la cantidad para ese objeto.
// Sin artículo, permite armar una solicitud con varios artículos, incluso no registrados.
export default function SolicitudModal({ open, articulo, onClose, onSaved }) {
  const toast = useToast();
  const [fecha, setFecha] = useState(todayISO());
  const [lines, setLines] = useState([emptyLine()]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFecha(todayISO());
    setErrors({});
    setFormError(null);
    setLines([articulo ? { ...emptyLine(), nombre_articulo: articulo.nombre, tipo: articulo.tipo } : emptyLine()]);
  }, [open, articulo]);

  const update = (i, field, value) => {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [field]: value } : l)));
    setErrors((e) => ({ ...e, [`${i}.${field}`]: null }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    const seen = new Set();
    lines.forEach((l, i) => {
      if (!l.nombre_articulo.trim()) errs[`${i}.nombre_articulo`] = 'Escribe el nombre del artículo.';
      else if (seen.has(normalize(l.nombre_articulo.trim()))) errs[`${i}.nombre_articulo`] = 'Este artículo ya está en la solicitud.';
      seen.add(normalize(l.nombre_articulo.trim()));
      if (!(Number(l.cantidad) > 0) || !Number.isInteger(Number(l.cantidad))) errs[`${i}.cantidad`] = 'Entero mayor que cero.';
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setFormError(null);
    try {
      const s = await solicitudesService.create({
        fecha,
        detalles: lines.map((l) => ({ nombre_articulo: l.nombre_articulo.trim(), tipo: l.tipo, cantidad: Number(l.cantidad) })),
      });
      toast.success(`Solicitud #${s.id} creada.`);
      onSaved?.(s);
      onClose();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fixed = !!articulo;
  return (
    <Modal open={open} onClose={onClose} size={fixed ? 'sm' : 'lg'}
      title={fixed ? `Solicitar compra de ${articulo.nombre}` : 'Nueva solicitud de compra'}
      description={fixed ? `En inventario: ${articulo.cantidad} unidades.` : 'Agrega los artículos que se necesitan. Puedes incluir artículos que aún no están registrados.'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="solicitud-form" loading={saving}>Crear solicitud</Button>
      </>}>
      <form id="solicitud-form" onSubmit={submit} noValidate>
        {fixed ? (
          <Input label="Cantidad a solicitar" type="number" min="1" step="1" required inputMode="numeric"
            value={lines[0]?.cantidad ?? ''} onChange={(e) => update(0, 'cantidad', e.target.value)} error={errors['0.cantidad']} />
        ) : (
          <>
            <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-date" />
            <div className="lines">
              {lines.map((l, i) => (
                <div className="line line--solicitud" key={l.key}>
                  <Input label={i === 0 ? 'Artículo' : undefined} aria-label="Artículo" placeholder="Nombre del artículo" value={l.nombre_articulo}
                    onChange={(e) => update(i, 'nombre_articulo', e.target.value)} error={errors[`${i}.nombre_articulo`]} />
                  <Select label={i === 0 ? 'Tipo' : undefined} aria-label="Tipo" options={TIPOS} value={l.tipo} onChange={(e) => update(i, 'tipo', e.target.value)} />
                  <Input label={i === 0 ? 'Cantidad' : undefined} aria-label="Cantidad" type="number" min="1" step="1" inputMode="numeric" value={l.cantidad}
                    onChange={(e) => update(i, 'cantidad', e.target.value)} error={errors[`${i}.cantidad`]} />
                  <Button type="button" variant="ghost" icon={Trash2} aria-label="Quitar artículo" disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className={i === 0 ? 'line__remove--first' : ''} />
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={() => setLines((ls) => [...ls, emptyLine()])}>Agregar artículo</Button>
          </>
        )}
        {formError && <p className="alert alert--error" role="alert">{formError}</p>}
      </form>
    </Modal>
  );
}
