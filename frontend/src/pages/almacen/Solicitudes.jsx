import { useState } from 'react';
import { Plus, PackageCheck } from 'lucide-react';
import { solicitudesService } from '../../services/index.js';
import { useResource } from '../../hooks/useResource.js';
import { formatDate, formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import SolicitudModal from './SolicitudModal.jsx';
import CompraModal from './CompraModal.jsx';

export default function Solicitudes() {
  const { data, loading, error, reload } = useResource(() => solicitudesService.list());
  const [nueva, setNueva] = useState(false);
  const [comprar, setComprar] = useState(null);

  const columns = [
    { key: 'id', header: 'N.º', width: 70, render: (r) => <span className="num">#{r.id}</span> },
    { key: 'fecha', header: 'Fecha', render: (r) => formatDate(r.fecha) },
    {
      key: 'detalles', header: 'Artículos', sortable: false,
      searchValue: (r) => r.detalles.map((d) => d.nombre_articulo).join(' '),
      render: (r) => (
        <ul className="cell-list">
          {r.detalles.map((d) => <li key={d.id}>{d.nombre_articulo} <span className="muted">· {formatNumber(d.cantidad)} · {d.tipo.toLowerCase()}</span></li>)}
        </ul>
      ),
    },
    {
      key: 'estado', header: 'Estado', sortValue: (r) => (r.id_compra ? 1 : 0), searchValue: (r) => (r.id_compra ? 'comprada' : 'pendiente'),
      render: (r) => (r.id_compra ? <Badge>Comprada</Badge> : <Badge>Pendiente</Badge>),
    },
    {
      key: 'acciones', header: '', actions: true, align: 'right',
      render: (r) => (r.id_compra
        ? <span className="muted small">Compra #{r.id_compra}</span>
        : <Button size="sm" variant="ghost" icon={PackageCheck} onClick={() => setComprar(r.id)}>Registrar compra</Button>),
    },
  ];

  return (
    <>
      <PageHeader title="Solicitudes de compra"
        description="Artículos que el almacén necesita reabastecer. Cada compra se registra a partir de una solicitud."
        actions={<Button icon={Plus} onClick={() => setNueva(true)}>Nueva solicitud</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload}
        searchPlaceholder="Buscar por artículo o estado" initialSort={{ key: 'fecha', dir: 'desc' }}
        emptyTitle="No hay solicitudes de compra" emptyText="Crea una cuando un material o herramienta necesite reabastecerse." />
      <SolicitudModal open={nueva} onClose={() => setNueva(false)} onSaved={reload} />
      <CompraModal open={comprar !== null} solicitudId={comprar} onClose={() => setComprar(null)} onSaved={reload} />
    </>
  );
}
