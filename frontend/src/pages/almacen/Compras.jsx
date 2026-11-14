import { useState } from 'react';
import { Plus } from 'lucide-react';
import { comprasService } from '../../services/index.js';
import { useResource } from '../../hooks/useResource.js';
import { formatDate, formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import CompraModal from './CompraModal.jsx';

// Usado por el gestor de almacén (registrar) y el contador (solo consulta).
export default function Compras({ readOnly = false }) {
  const { data, loading, error, reload } = useResource(() => comprasService.list());
  const [open, setOpen] = useState(false);

  const columns = [
    { key: 'id', header: 'N.º', width: 70, render: (r) => <span className="num">#{r.id}</span> },
    { key: 'fecha', header: 'Fecha', render: (r) => formatDate(r.fecha) },
    { key: 'proveedor_nombre', header: 'Proveedor', className: 'td-strong' },
    {
      key: 'detalles', header: 'Artículos', sortable: false,
      searchValue: (r) => r.detalles.map((d) => d.nombre).join(' '),
      render: (r) => (
        <ul className="cell-list">
          {r.detalles.map((d) => <li key={d.id}>{d.nombre} <span className="muted">· {formatNumber(d.cantidad)}</span></li>)}
        </ul>
      ),
    },
    { key: 'id_solicitud_compra', header: 'Solicitud', render: (r) => <span className="num">#{r.id_solicitud_compra}</span> },
    { key: 'observaciones', header: 'Observaciones', render: (r) => r.observaciones || <span className="muted">—</span> },
  ];

  return (
    <>
      <PageHeader title="Compras"
        description={readOnly ? 'Compras de materiales y herramientas a proveedores.' : 'Compras registradas a proveedores. Al registrar una compra, sus artículos ingresan al inventario.'}
        actions={!readOnly && <Button icon={Plus} onClick={() => setOpen(true)}>Registrar compra</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload}
        searchPlaceholder="Buscar por proveedor o artículo" initialSort={{ key: 'fecha', dir: 'desc' }}
        emptyTitle="No hay compras registradas" />
      {!readOnly && <CompraModal open={open} onClose={() => setOpen(false)} onSaved={reload} />}
    </>
  );
}
