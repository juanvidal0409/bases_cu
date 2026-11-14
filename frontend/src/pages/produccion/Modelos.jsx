import { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { herramientasService, materialesService, modelosService } from '../../services/index.js';
import { useResource } from '../../hooks/useResource.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/ToastContext.jsx';
import { rules } from '../../utils/validators.js';
import { formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { Loading } from '../../components/ui/States.jsx';

// Producción: registrar, consultar y modificar modelos (con su lista de materiales, RF11).
// Almacén: "Consultar modelos de cajas fuertes" en modo solo lectura.
export default function Modelos({ readOnly = false }) {
  const { data, loading, error, reload } = useResource(() => modelosService.list());
  const [editing, setEditing] = useState(null); // null | 'new' | modelo
  const [viewing, setViewing] = useState(null);

  const columns = [
    { key: 'referencia', header: 'Referencia', className: 'td-strong', width: 110 },
    { key: 'descripcion', header: 'Descripción', render: (r) => r.descripcion || <span className="muted">—</span> },
    { key: 'dimensiones', header: 'Alto × ancho', sortValue: (r) => r.alto, searchable: false, render: (r) => <span className="num">{formatNumber(r.alto)} × {formatNumber(r.ancho)} cm</span> },
    { key: 'capacidad', header: 'Capacidad', align: 'right', render: (r) => <span className="num">{formatNumber(r.capacidad)} L</span> },
    { key: 'peso', header: 'Peso', align: 'right', render: (r) => <span className="num">{formatNumber(r.peso)} kg</span> },
    { key: 'unidades_producidas', header: 'Producidas', align: 'right', render: (r) => <span className="num">{r.unidades_producidas}</span> },
    {
      key: 'acciones', header: '', actions: true, align: 'right',
      render: (r) => (
        <div className="row-actions">
          <Button size="sm" variant="ghost" icon={Eye} onClick={() => setViewing(r)}>Ver receta</Button>
          {!readOnly && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(r)} aria-label={`Modificar ${r.referencia}`} />}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Modelos de cajas fuertes"
        description={readOnly
          ? 'Modelos que fabrica la empresa con los materiales y herramientas que requiere cada uno.'
          : 'Cada modelo define sus medidas y la receta: materiales y herramientas necesarios para fabricar una unidad.'}
        actions={!readOnly && <Button icon={Plus} onClick={() => setEditing('new')}>Registrar modelo</Button>} />
      <DataTable columns={columns} rows={data} rowKey="referencia" loading={loading} error={error} onRetry={reload}
        searchPlaceholder="Buscar por referencia o descripción" initialSort={{ key: 'referencia', dir: 'asc' }}
        emptyTitle="No hay modelos registrados" />
      <RecetaModal modelo={viewing} onClose={() => setViewing(null)} />
      {!readOnly && <ModeloForm modelo={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </>
  );
}

function RecetaModal({ modelo, onClose }) {
  return (
    <Modal open={!!modelo} onClose={onClose} title={modelo ? `Modelo ${modelo.referencia}` : ''} description={modelo?.descripcion}>
      {modelo && (
        <div className="receta">
          <dl className="specs">
            <div><dt>Alto</dt><dd>{formatNumber(modelo.alto)} cm</dd></div>
            <div><dt>Ancho</dt><dd>{formatNumber(modelo.ancho)} cm</dd></div>
            <div><dt>Capacidad</dt><dd>{formatNumber(modelo.capacidad)} L</dd></div>
            <div><dt>Peso</dt><dd>{formatNumber(modelo.peso)} kg</dd></div>
          </dl>
          <h3 className="subhead">Materiales por unidad</h3>
          {modelo.materiales.length ? (
            <ul className="kv-list">{modelo.materiales.map((m) => <li key={m.id_material}><span>{m.nombre}</span><span className="num">{m.cantidad}</span></li>)}</ul>
          ) : <p className="muted">Sin materiales definidos.</p>}
          <h3 className="subhead">Herramientas requeridas</h3>
          {modelo.herramientas.length ? (
            <ul className="kv-list">{modelo.herramientas.map((h) => <li key={h.id_herramienta}><span>{h.nombre}</span><span className="num">{h.cantidad}</span></li>)}</ul>
          ) : <p className="muted">Sin herramientas definidas.</p>}
        </div>
      )}
    </Modal>
  );
}

const emptyModelo = { referencia: '', descripcion: '', capacidad: '', peso: '', alto: '', ancho: '' };

function RecipeLines({ title, items, options, idKey, onChange, errors, prefix, addLabel }) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      {items.length > 0 && (
        <div className="lines">
          {items.map((it, i) => (
            <div className="line line--receta" key={it.key}>
              <Select aria-label={title} placeholder="Elige uno" options={options} value={it[idKey]}
                onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [idKey]: e.target.value } : x)))} error={errors[`${prefix}.${i}`]} />
              <Input aria-label="Cantidad" type="number" min="1" step="1" inputMode="numeric" placeholder="Cant." value={it.cantidad}
                onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, cantidad: e.target.value } : x)))} error={errors[`${prefix}.${i}.cantidad`]} />
              <Button type="button" variant="ghost" icon={Trash2} aria-label="Quitar" onClick={() => onChange(items.filter((_, j) => j !== i))} />
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={() => onChange([...items, { key: Math.random(), [idKey]: '', cantidad: '' }])}>{addLabel}</Button>
    </fieldset>
  );
}

function ModeloForm({ modelo, onClose, onSaved }) {
  const toast = useToast();
  const isNew = modelo === 'new';
  const [cat, setCat] = useState(null);
  const [mats, setMats] = useState([]);
  const [hers, setHers] = useState([]);
  const [lineErrors, setLineErrors] = useState({});

  const form = useForm(emptyModelo, {
    referencia: isNew ? [rules.required] : [],
    capacidad: [rules.required, rules.positive], peso: [rules.required, rules.positive],
    alto: [rules.required, rules.positive], ancho: [rules.required, rules.positive],
  }, async (v) => {
    const errs = {};
    const check = (arr, key, prefix) => {
      const seen = new Set();
      arr.forEach((x, i) => {
        if (!x[key]) errs[`${prefix}.${i}`] = 'Elige uno.';
        else if (seen.has(x[key])) errs[`${prefix}.${i}`] = 'Está repetido.';
        seen.add(x[key]);
        if (!(Number(x.cantidad) > 0) || !Number.isInteger(Number(x.cantidad))) errs[`${prefix}.${i}.cantidad`] = 'Entero > 0.';
      });
    };
    check(mats, 'id_material', 'm');
    check(hers, 'id_herramienta', 'h');
    setLineErrors(errs);
    if (Object.keys(errs).length) throw new Error('Revisa la receta del modelo.');
    const payload = {
      descripcion: v.descripcion.trim() || null,
      capacidad: Number(v.capacidad), peso: Number(v.peso), alto: Number(v.alto), ancho: Number(v.ancho),
      materiales: mats.map((m) => ({ id_material: Number(m.id_material), cantidad: Number(m.cantidad) })),
      herramientas: hers.map((h) => ({ id_herramienta: Number(h.id_herramienta), cantidad: Number(h.cantidad) })),
    };
    const saved = isNew
      ? await modelosService.create({ referencia: v.referencia.trim().toUpperCase(), ...payload })
      : await modelosService.update(modelo.referencia, payload);
    toast.success(isNew ? `Modelo ${saved.referencia} registrado.` : `Modelo ${saved.referencia} actualizado.`);
    onSaved();
    onClose();
  });

  useEffect(() => {
    if (!modelo) return;
    setLineErrors({});
    form.setErrors({});
    if (isNew) {
      form.setValues(emptyModelo); setMats([]); setHers([]);
    } else {
      form.setValues({ referencia: modelo.referencia, descripcion: modelo.descripcion || '', capacidad: String(modelo.capacidad), peso: String(modelo.peso), alto: String(modelo.alto), ancho: String(modelo.ancho) });
      setMats(modelo.materiales.map((m) => ({ key: Math.random(), id_material: String(m.id_material), cantidad: String(m.cantidad) })));
      setHers(modelo.herramientas.map((h) => ({ key: Math.random(), id_herramienta: String(h.id_herramienta), cantidad: String(h.cantidad) })));
    }
    if (!cat) Promise.all([materialesService.list(), herramientasService.list()]).then(([materiales, herramientas]) => setCat({ materiales, herramientas }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelo]);

  return (
    <Modal open={!!modelo} onClose={onClose} size="lg"
      title={isNew ? 'Registrar modelo de caja fuerte' : `Modificar modelo ${modelo?.referencia ?? ''}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="modelo-form" loading={form.submitting} disabled={!cat}>{isNew ? 'Registrar modelo' : 'Guardar cambios'}</Button></>}>
      {!cat ? <Loading /> : (
        <form id="modelo-form" onSubmit={form.handleSubmit} noValidate>
          <div className="grid-4">
            <Input label="Referencia" required placeholder="CF-600" disabled={!isNew} {...form.bind('referencia')} hint={isNew ? 'Código único del modelo.' : 'La referencia no se puede cambiar.'} />
            <Textarea label="Descripción" className="span-3" rows={2} {...form.bind('descripcion')} />
            <Input label="Alto" type="number" min="0" step="0.01" required suffix="cm" {...form.bind('alto')} />
            <Input label="Ancho" type="number" min="0" step="0.01" required suffix="cm" {...form.bind('ancho')} />
            <Input label="Capacidad" type="number" min="0" step="0.01" required suffix="L" {...form.bind('capacidad')} />
            <Input label="Peso" type="number" min="0" step="0.01" required suffix="kg" {...form.bind('peso')} />
          </div>
          <RecipeLines title="Materiales por unidad" addLabel="Agregar material" idKey="id_material" prefix="m" errors={lineErrors}
            items={mats} onChange={setMats} options={cat.materiales.map((m) => ({ value: String(m.id), label: m.nombre }))} />
          <RecipeLines title="Herramientas requeridas" addLabel="Agregar herramienta" idKey="id_herramienta" prefix="h" errors={lineErrors}
            items={hers} onChange={setHers} options={cat.herramientas.map((h) => ({ value: String(h.id), label: h.nombre }))} />
          {form.formError && <p className="alert alert--error" role="alert">{form.formError}</p>}
        </form>
      )}
    </Modal>
  );
}
