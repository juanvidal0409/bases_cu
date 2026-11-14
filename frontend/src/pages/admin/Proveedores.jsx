import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { proveedoresService } from '../../services/index.js';
import { useResource } from '../../hooks/useResource.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/ToastContext.jsx';
import { rules } from '../../utils/validators.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Field.jsx';

// Casos de uso "Crear nuevo proveedor", "Consultar lista de proveedores" y "Modificar información proveedor".
export default function Proveedores() {
  const { data, loading, error, reload } = useResource(() => proveedoresService.list());
  const [editing, setEditing] = useState(null);
  const columns = [
    { key: 'nombre', header: 'Proveedor', className: 'td-strong' },
    { key: 'email', header: 'Correo' },
    { key: 'telefono', header: 'Teléfono', render: (r) => r.telefono || <span className="muted">—</span> },
    { key: 'compras', header: 'Compras', align: 'right', render: (r) => <span className="num">{r.compras}</span> },
    { key: 'acciones', header: '', actions: true, align: 'right', render: (r) => <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(r)} aria-label={`Modificar ${r.nombre}`} /> },
  ];
  return (
    <>
      <PageHeader title="Proveedores" description="Empresas a las que se compran materiales y herramientas."
        actions={<Button icon={Plus} onClick={() => setEditing('new')}>Crear proveedor</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload}
        searchPlaceholder="Buscar proveedor" initialSort={{ key: 'nombre', dir: 'asc' }} emptyTitle="No hay proveedores registrados" />
      <ContactoForm entidad="proveedor" registro={editing} onClose={() => setEditing(null)} onSaved={reload}
        save={(id, data) => (id ? proveedoresService.update(id, data) : proveedoresService.create(data))} emailRequired />
    </>
  );
}

// Formulario compartido por proveedores y clientes (nombre, correo, teléfono).
export function ContactoForm({ entidad, registro, onClose, onSaved, save, emailRequired }) {
  const toast = useToast();
  const isNew = registro === 'new';
  const form = useForm({ nombre: '', email: '', telefono: '' },
    { nombre: [rules.required], email: emailRequired ? [rules.required, rules.email] : [rules.email], telefono: [rules.phone] },
    async (v) => {
      const r = await save(isNew ? null : registro.id, { nombre: v.nombre.trim(), email: v.email.trim() || null, telefono: v.telefono.trim() || null });
      toast.success(isNew ? `${r.nombre} registrado.` : `Datos de ${r.nombre} actualizados.`);
      onSaved();
      onClose();
    });
  useEffect(() => {
    if (!registro) return;
    form.setErrors({});
    form.setValues(isNew ? { nombre: '', email: '', telefono: '' } : { nombre: registro.nombre, email: registro.email || '', telefono: registro.telefono || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registro]);
  const titulo = isNew ? (entidad === 'cliente' ? 'Registrar cliente' : 'Crear proveedor') : `Modificar ${entidad}`;
  return (
    <Modal open={!!registro} onClose={onClose} title={titulo} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="contacto-form" loading={form.submitting}>{isNew ? titulo : 'Guardar cambios'}</Button></>}>
      <form id="contacto-form" onSubmit={form.handleSubmit} noValidate>
        <Input label={entidad === 'cliente' ? 'Nombre o razón social' : 'Nombre del proveedor'} required {...form.bind('nombre')} />
        <Input label="Correo" type="email" required={emailRequired} {...form.bind('email')} />
        <Input label="Teléfono" inputMode="tel" {...form.bind('telefono')} />
        {form.formError && <p className="alert alert--error" role="alert">{form.formError}</p>}
      </form>
    </Modal>
  );
}
