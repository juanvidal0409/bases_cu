import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { empleadosService } from '../../services/index.js';
import { useResource } from '../../hooks/useResource.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { rules } from '../../utils/validators.js';
import { ROLE_LABELS, ROLES } from '../../config/roles.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { Input, Select } from '../../components/ui/Field.jsx';

// Un mismo listado de empleados con permisos distintos según el módulo:
// - Administración: crear, consultar, modificar y asignar rol de acceso (RF01, RN01, RN02).
// - Producción: crear, consultar, modificar y eliminar.
// - Contabilidad: solo consultar.
export default function EmpleadosPage({ canCreate, canEdit, canDelete, canAssignRole, description }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useResource(() => empleadosService.list());
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const columns = [
    { key: 'nombre', header: 'Nombre', className: 'td-strong' },
    { key: 'cargo', header: 'Cargo' },
    { key: 'email', header: 'Correo' },
    { key: 'telefono', header: 'Teléfono', render: (r) => r.telefono || <span className="muted">—</span> },
    ...(canAssignRole ? [{
      key: 'rol', header: 'Acceso', searchValue: (r) => ROLE_LABELS[r.rol] || 'sin acceso',
      render: (r) => (r.rol ? <Badge tone="info">{ROLE_LABELS[r.rol]}</Badge> : <span className="muted">Sin acceso</span>),
    }] : []),
    ...(canEdit || canDelete ? [{
      key: 'acciones', header: '', actions: true, align: 'right',
      render: (r) => (
        <div className="row-actions">
          {canEdit && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(r)} aria-label={`Modificar a ${r.nombre}`} />}
          {canDelete && r.id !== user.id && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleting(r)} aria-label={`Eliminar a ${r.nombre}`} />}
        </div>
      ),
    }] : []),
  ];

  return (
    <>
      <PageHeader title="Empleados" description={description}
        actions={canCreate && <Button icon={Plus} onClick={() => setEditing('new')}>Crear empleado</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload}
        searchPlaceholder="Buscar por nombre, cargo o correo" initialSort={{ key: 'nombre', dir: 'asc' }}
        emptyTitle="No hay empleados registrados" />
      {(canCreate || canEdit) && <EmpleadoForm empleado={editing} canAssignRole={canAssignRole} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog open={!!deleting} danger title="Eliminar empleado" confirmLabel="Eliminar"
        message={deleting && `¿Eliminar a ${deleting.nombre}? Si participó en la producción de cajas o tiene préstamos registrados, el sistema no lo permitirá para conservar el historial.`}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await empleadosService.remove(deleting.id); toast.success(`${deleting.nombre} eliminado.`); reload(); }} />
    </>
  );
}

const ROL_OPTIONS = [{ value: '', label: 'Sin acceso al sistema' }, ...Object.values(ROLES).map((r) => ({ value: r, label: ROLE_LABELS[r] }))];
const empty = { nombre: '', cargo: '', email: '', telefono: '', rol: '', password: '' };

function EmpleadoForm({ empleado, canAssignRole, onClose, onSaved }) {
  const toast = useToast();
  const isNew = empleado === 'new';
  const form = useForm(empty, (v) => ({
    nombre: [rules.required], cargo: [rules.required], email: [rules.required, rules.email], telefono: [rules.phone],
    password: canAssignRole && v.rol && isNew ? [rules.required, rules.minLength(6)] : [rules.minLength(6)],
  }), async (v) => {
    const payload = { nombre: v.nombre.trim(), cargo: v.cargo.trim(), email: v.email.trim(), telefono: v.telefono.trim() || null };
    if (canAssignRole) {
      payload.rol = v.rol || null;
      if (v.rol && v.password) payload.password = v.password;
    }
    const e = isNew ? await empleadosService.create(payload) : await empleadosService.update(empleado.id, payload);
    toast.success(isNew ? `${e.nombre} registrado.` : `Datos de ${e.nombre} actualizados.`);
    onSaved();
    onClose();
  });

  useEffect(() => {
    if (!empleado) return;
    form.setErrors({});
    form.setValues(isNew ? empty : { ...empty, ...empleado, telefono: empleado.telefono || '', rol: empleado.rol || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleado]);

  return (
    <Modal open={!!empleado} onClose={onClose} title={isNew ? 'Crear empleado' : 'Modificar empleado'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="empleado-form" loading={form.submitting}>{isNew ? 'Crear empleado' : 'Guardar cambios'}</Button></>}>
      <form id="empleado-form" onSubmit={form.handleSubmit} noValidate>
        <div className="grid-2">
          <Input label="Nombre completo" required className="span-2" {...form.bind('nombre')} />
          <Input label="Cargo" required placeholder="Soldador, Ensamblador…" {...form.bind('cargo')} />
          <Input label="Teléfono" inputMode="tel" {...form.bind('telefono')} />
          <Input label="Correo" type="email" required className="span-2" {...form.bind('email')} />
        </div>
        {canAssignRole && (
          <fieldset className="form-section">
            <legend>Acceso a GIA</legend>
            <p className="form-section__hint">Cada usuario tiene un solo rol y solo ve el módulo de ese rol.</p>
            <div className="grid-2">
              <Select label="Rol" options={ROL_OPTIONS} {...form.bind('rol')} />
              {form.values.rol && (
                <Input label={isNew || !empleado?.rol ? 'Contraseña inicial' : 'Nueva contraseña'} type="password" autoComplete="new-password"
                  required={isNew || !empleado?.rol} hint={!isNew && empleado?.rol ? 'Déjala en blanco para no cambiarla.' : 'Mínimo 6 caracteres.'} {...form.bind('password')} />
              )}
            </div>
          </fieldset>
        )}
        {form.formError && <p className="alert alert--error" role="alert">{form.formError}</p>}
      </form>
    </Modal>
  );
}
