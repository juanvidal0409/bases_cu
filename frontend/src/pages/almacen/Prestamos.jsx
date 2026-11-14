import { useEffect, useState } from 'react';
import { Plus, Undo2 } from 'lucide-react';
import { empleadosService, herramientasService, prestamosService } from '../../services/index.js';
import { useResource } from '../../hooks/useResource.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/ToastContext.jsx';
import { rules } from '../../utils/validators.js';
import { formatDate, todayISO } from '../../utils/format.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { Loading } from '../../components/ui/States.jsx';

const FILTROS = [['activos', 'Prestadas'], ['devueltos', 'Devueltas'], ['', 'Todas']];

// Caso de uso "Generar nuevo préstamo de herramienta" (RF14, RN04, RN05).
export default function Prestamos() {
  const [estado, setEstado] = useState('activos');
  const { data, loading, error, reload } = useResource(() => prestamosService.list(estado), [estado]);
  const [nuevo, setNuevo] = useState(false);
  const [devolver, setDevolver] = useState(null);

  const columns = [
    { key: 'herramienta_nombre', header: 'Herramienta', className: 'td-strong' },
    { key: 'empleado_nombre', header: 'Empleado' },
    { key: 'fecha_prestamo', header: 'Prestada', render: (r) => formatDate(r.fecha_prestamo) },
    { key: 'fecha_devolucion', header: 'Devuelta', render: (r) => (r.fecha_devolucion ? formatDate(r.fecha_devolucion) : <Badge tone="warn">En uso</Badge>) },
    { key: 'observaciones', header: 'Observaciones', render: (r) => r.observaciones || <span className="muted">—</span> },
    {
      key: 'acciones', header: '', actions: true, align: 'right',
      render: (r) => !r.fecha_devolucion && <Button size="sm" variant="ghost" icon={Undo2} onClick={() => setDevolver(r)}>Registrar devolución</Button>,
    },
  ];

  return (
    <>
      <PageHeader title="Préstamos de herramientas"
        description="Las herramientas no se consumen en la producción: se prestan a un empleado y deben volver al almacén."
        actions={<Button icon={Plus} onClick={() => setNuevo(true)}>Nuevo préstamo</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload}
        searchPlaceholder="Buscar por herramienta o empleado" initialSort={{ key: 'fecha_prestamo', dir: 'desc' }}
        toolbar={(
          <div className="segmented" role="group" aria-label="Filtrar préstamos">
            {FILTROS.map(([v, l]) => (
              <button key={v} type="button" className={estado === v ? 'is-active' : ''} aria-pressed={estado === v} onClick={() => setEstado(v)}>{l}</button>
            ))}
          </div>
        )}
        emptyTitle={estado === 'activos' ? 'No hay herramientas prestadas' : 'No hay préstamos en esta vista'}
        emptyText={estado === 'activos' ? 'Todas las herramientas están en el almacén.' : undefined} />
      <NuevoPrestamo open={nuevo} onClose={() => setNuevo(false)} onSaved={reload} />
      <Devolucion prestamo={devolver} onClose={() => setDevolver(null)} onSaved={reload} />
    </>
  );
}

function NuevoPrestamo({ open, onClose, onSaved }) {
  const toast = useToast();
  const [cat, setCat] = useState(null);
  const form = useForm({ id_herramienta: '', id_empleado: '', fecha_prestamo: todayISO(), observaciones: '' },
    { id_herramienta: [rules.required], id_empleado: [rules.required], fecha_prestamo: [rules.required] },
    async (v) => {
      const p = await prestamosService.create({ ...v, id_herramienta: Number(v.id_herramienta), id_empleado: Number(v.id_empleado), observaciones: v.observaciones.trim() || null });
      toast.success(`${p.herramienta_nombre} prestada a ${p.empleado_nombre}.`);
      onSaved();
      onClose();
    });

  useEffect(() => {
    if (!open) return;
    form.setValues({ id_herramienta: '', id_empleado: '', fecha_prestamo: todayISO(), observaciones: '' });
    form.setErrors({});
    setCat(null);
    Promise.all([herramientasService.list(), empleadosService.list()]).then(([herramientas, empleados]) => setCat({ herramientas, empleados }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Nuevo préstamo"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="prestamo-form" loading={form.submitting} disabled={!cat}>Registrar préstamo</Button></>}>
      {!cat ? <Loading /> : (
        <form id="prestamo-form" onSubmit={form.handleSubmit} noValidate>
          <Select label="Herramienta" required placeholder="Elige una herramienta"
            options={cat.herramientas.map((h) => ({ value: String(h.id), label: `${h.nombre} — ${h.disponibles} de ${h.cantidad} disponibles`, disabled: h.disponibles <= 0 }))}
            hint="Las herramientas sin unidades disponibles aparecen deshabilitadas." {...form.bind('id_herramienta')} />
          <Select label="Empleado" required placeholder="¿Quién la recibe?"
            options={cat.empleados.map((e) => ({ value: String(e.id), label: `${e.nombre} · ${e.cargo}` }))} {...form.bind('id_empleado')} />
          <Input label="Fecha del préstamo" type="date" required className="w-date" {...form.bind('fecha_prestamo')} />
          <Textarea label="Observaciones" placeholder="Estado en que sale la herramienta" {...form.bind('observaciones')} />
          {form.formError && <p className="alert alert--error" role="alert">{form.formError}</p>}
        </form>
      )}
    </Modal>
  );
}

function Devolucion({ prestamo, onClose, onSaved }) {
  const toast = useToast();
  const form = useForm({ fecha_devolucion: todayISO(), observaciones: '' },
    (v) => ({ fecha_devolucion: [rules.required, (d) => (prestamo && d < prestamo.fecha_prestamo ? 'No puede ser anterior a la fecha del préstamo.' : null)] }),
    async (v) => {
      await prestamosService.devolver(prestamo.id, { fecha_devolucion: v.fecha_devolucion, observaciones: v.observaciones.trim() || prestamo.observaciones || null });
      toast.success(`${prestamo.herramienta_nombre} devuelta al almacén.`);
      onSaved();
      onClose();
    });

  useEffect(() => {
    if (prestamo) { form.setValues({ fecha_devolucion: todayISO(), observaciones: prestamo.observaciones || '' }); form.setErrors({}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestamo]);

  return (
    <Modal open={!!prestamo} onClose={onClose} size="sm" title="Registrar devolución"
      description={prestamo && `${prestamo.herramienta_nombre}, prestada a ${prestamo.empleado_nombre} el ${formatDate(prestamo.fecha_prestamo)}.`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="devolucion-form" loading={form.submitting}>Registrar devolución</Button></>}>
      <form id="devolucion-form" onSubmit={form.handleSubmit} noValidate>
        <Input label="Fecha de devolución" type="date" required {...form.bind('fecha_devolucion')} />
        <Textarea label="Observaciones" placeholder="Estado en que regresa" {...form.bind('observaciones')} />
        {form.formError && <p className="alert alert--error" role="alert">{form.formError}</p>}
      </form>
    </Modal>
  );
}
