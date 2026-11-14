import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { clientesService } from '../../services/index.js';
import { useResource } from '../../hooks/useResource.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import { ContactoForm } from '../admin/Proveedores.jsx';

// Casos de uso "Registrar nuevo cliente", "Desplegar lista de clientes" y "Modificar información de cliente".
export default function Clientes() {
  const { data, loading, error, reload } = useResource(() => clientesService.list());
  const [editing, setEditing] = useState(null);
  const columns = [
    { key: 'nombre', header: 'Cliente', className: 'td-strong' },
    { key: 'email', header: 'Correo', render: (r) => r.email || <span className="muted">—</span> },
    { key: 'telefono', header: 'Teléfono', render: (r) => r.telefono || <span className="muted">—</span> },
    { key: 'compras', header: 'Compras', align: 'right', render: (r) => <span className="num">{r.compras}</span> },
    { key: 'acciones', header: '', actions: true, align: 'right', render: (r) => <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(r)} aria-label={`Modificar ${r.nombre}`} /> },
  ];
  return (
    <>
      <PageHeader title="Clientes" description="Personas y empresas que compran cajas fuertes."
        actions={<Button icon={Plus} onClick={() => setEditing('new')}>Registrar cliente</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload}
        searchPlaceholder="Buscar cliente" initialSort={{ key: 'nombre', dir: 'asc' }} emptyTitle="No hay clientes registrados" />
      <ContactoForm entidad="cliente" registro={editing} onClose={() => setEditing(null)} onSaved={reload}
        save={(id, d) => (id ? clientesService.update(id, d) : clientesService.create(d))} />
    </>
  );
}
