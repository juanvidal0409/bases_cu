import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { cajasService, clientesService, ventasService } from '../../services/index.js';
import { useResource } from '../../hooks/useResource.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate, formatMoney, todayISO } from '../../utils/format.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Input, Select } from '../../components/ui/Field.jsx';
import { Loading } from '../../components/ui/States.jsx';

// Gestor de ventas: "Crear nueva venta de caja fuerte" y "Desplegar lista de ventas" (RF06, RF08, RN10, RN11).
// Contador: "Desplegar lista de ventas" en modo consulta.
export default function Ventas({ readOnly = false }) {
  const { data, loading, error, reload } = useResource(() => ventasService.list());
  const [open, setOpen] = useState(false);
  const total = useMemo(() => (data || []).reduce((s, v) => s + v.total, 0), [data]);

  const columns = [
    { key: 'id', header: 'N.º', width: 70, render: (r) => <span className="num">#{r.id}</span> },
    { key: 'fecha', header: 'Fecha', render: (r) => formatDate(r.fecha) },
    { key: 'cliente_nombre', header: 'Cliente', className: 'td-strong' },
    {
      key: 'cajas', header: 'Cajas vendidas', sortable: false, searchValue: (r) => r.cajas.map((c) => `${c.serial} ${c.referencia}`).join(' '),
      render: (r) => <ul className="cell-list">{r.cajas.map((c) => <li key={c.serial}>{c.serial} <span className="muted">· {c.referencia}</span></li>)}</ul>,
    },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="num td-strong">{formatMoney(r.total)}</span> },
  ];

  return (
    <>
      <PageHeader title="Ventas"
        description={data?.length ? `${data.length} ventas por ${formatMoney(total)} en total.` : 'Ventas de cajas fuertes a clientes.'}
        actions={!readOnly && <Button icon={Plus} onClick={() => setOpen(true)}>Nueva venta</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload}
        searchPlaceholder="Buscar por cliente o serial" initialSort={{ key: 'fecha', dir: 'desc' }}
        emptyTitle="Todavía no hay ventas" emptyText={readOnly ? undefined : 'Registra la primera con el botón Nueva venta.'} />
      {!readOnly && <NuevaVenta open={open} onClose={() => setOpen(false)} onSaved={reload} />}
    </>
  );
}

function NuevaVenta({ open, onClose, onSaved }) {
  const toast = useToast();
  const [cat, setCat] = useState(null);
  const [idCliente, setIdCliente] = useState('');
  const [fecha, setFecha] = useState(todayISO());
  const [seriales, setSeriales] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIdCliente(''); setFecha(todayISO()); setSeriales([]); setErrors({}); setFormError(null); setCat(null);
    // RN10: solo se ofrecen cajas en estado "Disponible".
    Promise.all([clientesService.list(), cajasService.list({ estado: 'Disponible' })])
      .then(([clientes, cajas]) => setCat({ clientes, cajas }))
      .catch((err) => setFormError(err.message));
  }, [open]);

  const total = useMemo(() => (cat?.cajas || []).filter((c) => seriales.includes(c.serial)).reduce((s, c) => s + Number(c.precio), 0), [cat, seriales]);
  const toggle = (s) => { setSeriales((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s])); setErrors((e) => ({ ...e, seriales: null })); };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!idCliente) errs.id_cliente = 'Elige el cliente.';
    if (!seriales.length) errs.seriales = 'Selecciona al menos una caja fuerte.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setFormError(null);
    try {
      const v = await ventasService.create({ id_cliente: Number(idCliente), fecha, seriales });
      toast.success(`Venta #${v.id} registrada por ${formatMoney(v.total)}.`);
      onSaved();
      onClose();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Nueva venta"
      description="Solo aparecen las cajas disponibles. Al registrar la venta pasan a estado vendida."
      footer={<>
        <span className="modal__total">Total <strong className="num">{formatMoney(total)}</strong></span>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="venta-form" loading={saving} disabled={!cat}>Registrar venta</Button>
      </>}>
      {!cat ? (formError ? <p className="alert alert--error">{formError}</p> : <Loading />) : (
        <form id="venta-form" onSubmit={submit} noValidate>
          <div className="grid-2">
            <Select label="Cliente" required placeholder="Elige un cliente" error={errors.id_cliente}
              options={cat.clientes.map((c) => ({ value: String(c.id), label: c.nombre }))}
              value={idCliente} onChange={(e) => { setIdCliente(e.target.value); setErrors((x) => ({ ...x, id_cliente: null })); }}
              hint="¿Cliente nuevo? Regístralo primero en Clientes." />
            <Input label="Fecha" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <fieldset className="form-section">
            <legend>Cajas fuertes disponibles</legend>
            {errors.seriales && <p className="field__error">{errors.seriales}</p>}
            {cat.cajas.length ? (
              <div className="pick-list">
                {cat.cajas.map((c) => (
                  <label key={c.serial} className={`pick ${seriales.includes(c.serial) ? 'is-selected' : ''}`}>
                    <input type="checkbox" checked={seriales.includes(c.serial)} onChange={() => toggle(c.serial)} />
                    <span className="pick__main"><strong>{c.serial}</strong> <span className="muted">{c.referencia} · {c.modelo_descripcion}</span></span>
                    <span className="num">{formatMoney(c.precio)}</span>
                  </label>
                ))}
              </div>
            ) : <p className="muted">No hay cajas disponibles para vender. Producción debe marcarlas como disponibles.</p>}
          </fieldset>
          {formError && <p className="alert alert--error" role="alert">{formError}</p>}
        </form>
      )}
    </Modal>
  );
}
