import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { cajasService, empleadosService, materialesService, modelosService } from '../../services/index.js';
import { useResource } from '../../hooks/useResource.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/ToastContext.jsx';
import { rules } from '../../utils/validators.js';
import { formatMoney } from '../../utils/format.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { Loading } from '../../components/ui/States.jsx';

const ESTADOS = ['En producción', 'Disponible', 'Vendida', 'Defectuosa'];
const ESTADOS_EDITABLES = ['En producción', 'Disponible', 'Defectuosa'];
const FILTROS = [['', 'Todas'], ...ESTADOS.map((e) => [e, e])];

// Casos de uso "Registrar nueva caja fuerte", "Consultar lista de cajas fuertes"
// y "Modificar información de caja fuerte" (RF05, RF07, RF12, RF15, RN08, RN09).
export default function CajasFuertes() {
  const [estado, setEstado] = useState('');
  const { data, loading, error, reload } = useResource(() => cajasService.list(), []);
  const [form, setForm] = useState(null); // null | 'new' | caja

  const rows = useMemo(() => (data || []).filter((c) => !estado || c.estado === estado), [data, estado]);
  const counts = useMemo(() => Object.fromEntries(ESTADOS.map((e) => [e, (data || []).filter((c) => c.estado === e).length])), [data]);

  const columns = [
    { key: 'serial', header: 'Serial', className: 'td-strong', width: 110 },
    { key: 'referencia', header: 'Modelo', searchValue: (r) => `${r.referencia} ${r.modelo_descripcion}`, render: (r) => <span>{r.referencia} <span className="muted">· {r.modelo_descripcion}</span></span> },
    { key: 'precio', header: 'Precio', align: 'right', render: (r) => <span className="num">{formatMoney(r.precio)}</span> },
    { key: 'estado', header: 'Estado', render: (r) => <Badge>{r.estado}</Badge> },
    { key: 'encargados', header: 'Encargados', sortable: false, searchValue: (r) => r.encargados.map((e) => e.nombre).join(' '), render: (r) => r.encargados.map((e) => e.nombre).join(', ') || <span className="muted">—</span> },
    {
      key: 'acciones', header: '', actions: true, align: 'right',
      render: (r) => <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm(r)} aria-label={`Modificar ${r.serial}`} />,
    },
  ];

  return (
    <>
      <PageHeader title="Cajas fuertes"
        description="Unidades fabricadas. Al registrar una caja se descuentan del inventario los materiales de su modelo."
        actions={<Button icon={Plus} onClick={() => setForm('new')}>Registrar caja fuerte</Button>} />
      <DataTable columns={columns} rows={data ? rows : null} rowKey="serial" loading={loading} error={error} onRetry={reload}
        searchPlaceholder="Buscar por serial, modelo o encargado" initialSort={{ key: 'serial', dir: 'asc' }}
        toolbar={(
          <div className="segmented" role="group" aria-label="Filtrar por estado">
            {FILTROS.map(([v, l]) => (
              <button key={v} type="button" className={estado === v ? 'is-active' : ''} aria-pressed={estado === v} onClick={() => setEstado(v)}>
                {l}{v && data ? <span className="segmented__count">{counts[v]}</span> : null}
              </button>
            ))}
          </div>
        )}
        emptyTitle={estado ? `No hay cajas en estado "${estado.toLowerCase()}"` : 'No hay cajas fuertes registradas'} />
      <CajaForm caja={form} onClose={() => setForm(null)} onSaved={reload} />
    </>
  );
}

function CajaForm({ caja, onClose, onSaved }) {
  const toast = useToast();
  const isNew = caja === 'new';
  const vendida = !isNew && caja?.estado === 'Vendida';
  const [cat, setCat] = useState(null);
  const [encargados, setEncargados] = useState([]);

  const form = useForm({ serial: '', referencia: '', precio: '', estado: 'En producción', observaciones: '' },
    { serial: isNew ? [rules.required] : [], referencia: isNew ? [rules.required] : [], precio: [rules.required, rules.nonNegative] },
    async (v) => {
      const base = { precio: Number(v.precio), observaciones: v.observaciones.trim() || null, encargados: encargados.map(Number) };
      if (isNew) {
        const c = await cajasService.create({ serial: v.serial.trim().toUpperCase(), referencia: v.referencia, estado: v.estado, ...base });
        toast.success(`Caja ${c.serial} registrada. Se descontaron sus materiales del inventario.`);
      } else {
        const c = await cajasService.update(caja.serial, { ...base, ...(vendida ? {} : { estado: v.estado }) });
        toast.success(`Caja ${c.serial} actualizada.`);
      }
      onSaved();
      onClose();
    });

  useEffect(() => {
    if (!caja) return;
    form.setErrors({});
    if (isNew) {
      form.setValues({ serial: '', referencia: '', precio: '', estado: 'En producción', observaciones: '' });
      setEncargados([]);
    } else {
      form.setValues({ serial: caja.serial, referencia: caja.referencia, precio: String(caja.precio), estado: caja.estado, observaciones: caja.observaciones || '' });
      setEncargados(caja.encargados.map((e) => String(e.id)));
    }
    setCat(null);
    Promise.all([modelosService.list(), materialesService.list(), empleadosService.list()])
      .then(([modelos, materiales, empleados]) => setCat({ modelos, materiales, empleados }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caja]);

  // RF12: comparar la receta del modelo con el stock actual antes de enviar.
  const receta = useMemo(() => {
    if (!isNew || !cat || !form.values.referencia) return null;
    const m = cat.modelos.find((x) => x.referencia === form.values.referencia);
    return m?.materiales.map((r) => {
      const stock = cat.materiales.find((x) => x.id === r.id_material)?.cantidad ?? 0;
      return { ...r, stock, ok: stock >= r.cantidad };
    });
  }, [cat, form.values.referencia, isNew]);
  const sinStock = receta?.some((r) => !r.ok);

  const toggle = (id) => setEncargados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Modal open={!!caja} onClose={onClose} size="lg"
      title={isNew ? 'Registrar caja fuerte' : `Modificar caja ${caja?.serial ?? ''}`}
      description={vendida ? 'Esta caja ya fue vendida: su estado no se puede cambiar.' : undefined}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="caja-form" loading={form.submitting} disabled={!cat || sinStock}>{isNew ? 'Registrar caja' : 'Guardar cambios'}</Button></>}>
      {!cat ? <Loading /> : (
        <form id="caja-form" onSubmit={form.handleSubmit} noValidate>
          <div className="grid-2">
            <Input label="Serial" required placeholder="SN-0008" disabled={!isNew} {...form.bind('serial')} hint={isNew ? 'Identificador único de la unidad.' : undefined} />
            <Select label="Modelo" required placeholder="Elige un modelo" disabled={!isNew}
              options={cat.modelos.map((m) => ({ value: m.referencia, label: `${m.referencia} · ${m.descripcion || ''}` }))} {...form.bind('referencia')} />
            <Input label="Precio de venta" type="number" min="0" step="1000" required suffix="COP" {...form.bind('precio')} />
            <Select label="Estado" required disabled={vendida}
              options={(vendida ? ESTADOS : ESTADOS_EDITABLES).map((e) => ({ value: e, label: e }))}
              hint={vendida ? undefined : 'El estado "Vendida" se asigna al registrar la venta.'} {...form.bind('estado')} />
          </div>

          {receta && (
            <div className={`stock-check ${sinStock ? 'stock-check--bad' : ''}`}>
              <p className="stock-check__title">{sinStock ? 'No hay stock suficiente para fabricar esta caja' : 'Materiales que se descontarán del inventario'}</p>
              {receta.length ? (
                <ul className="kv-list">
                  {receta.map((r) => (
                    <li key={r.id_material} className={r.ok ? '' : 'is-short'}>
                      <span>{r.nombre}</span>
                      <span className="num">{r.cantidad} de {r.stock} disponibles</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">Este modelo no tiene materiales definidos.</p>}
            </div>
          )}

          <fieldset className="form-section">
            <legend>Empleados encargados</legend>
            <div className="check-grid">
              {cat.empleados.map((e) => (
                <label key={e.id} className="check">
                  <input type="checkbox" checked={encargados.includes(String(e.id))} onChange={() => toggle(String(e.id))} />
                  <span>{e.nombre}<span className="muted"> · {e.cargo}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <Textarea label="Observaciones" {...form.bind('observaciones')} />
          {form.formError && <p className="alert alert--error" role="alert">{form.formError}</p>}
        </form>
      )}
    </Modal>
  );
}
