import { useState } from 'react';
import { ShoppingCart, Plus } from 'lucide-react';
import { materialesService, herramientasService } from '../../services/index.js';
import { useResource } from '../../hooks/useResource.js';
import { formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import SolicitudModal from './SolicitudModal.jsx';

// Casos de uso "Consultar lista de materiales" y "Consultar lista de herramientas".
// Cada fila tiene la opción "Solicitar compra" (nota del diagrama de almacén).
export default function InventarioPage({ tipo }) {
  const esMaterial = tipo === 'Material';
  const { data, loading, error, reload } = useResource(
    () => (esMaterial ? materialesService.list() : herramientasService.list()), [esMaterial]);
  const [solicitar, setSolicitar] = useState(null); // { articulo } | { articulo: null }

  const columns = [
    { key: 'nombre', header: 'Nombre', className: 'td-strong' },
    { key: 'tipo', header: 'Categoría' },
    {
      key: 'cantidad', header: esMaterial ? 'En inventario' : 'Unidades', align: 'right',
      render: (r) => (r.cantidad === 0 ? <Badge tone="danger">Agotado</Badge> : <span className="num">{formatNumber(r.cantidad)}</span>),
    },
    ...(!esMaterial ? [
      { key: 'prestadas', header: 'Prestadas', align: 'right', render: (r) => <span className="num">{r.prestadas}</span> },
      { key: 'disponibles', header: 'Disponibles', align: 'right', render: (r) => <span className="num">{r.disponibles}</span> },
    ] : []),
    {
      key: 'acciones', header: '', actions: true, align: 'right',
      render: (r) => <Button variant="ghost" size="sm" icon={ShoppingCart} onClick={() => setSolicitar({ articulo: { ...r, tipo } })}>Solicitar compra</Button>,
    },
  ];

  return (
    <>
      <PageHeader
        title={esMaterial ? 'Materiales' : 'Herramientas'}
        description={esMaterial
          ? 'Materiales disponibles para la fabricación. Las cantidades aumentan al registrar compras y disminuyen al producir cajas.'
          : 'Herramientas del almacén. Las disponibles son las unidades que no están prestadas.'}
        actions={<Button icon={Plus} variant="secondary" onClick={() => setSolicitar({ articulo: null })}>Solicitar artículo nuevo</Button>}
      />
      <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload}
        searchPlaceholder={`Buscar ${esMaterial ? 'material' : 'herramienta'} o categoría`}
        initialSort={{ key: 'nombre', dir: 'asc' }}
        emptyTitle={`No hay ${esMaterial ? 'materiales' : 'herramientas'} registrados`}
        emptyText="Se registran al ingresar una compra en el módulo de compras." />
      <SolicitudModal open={!!solicitar} articulo={solicitar?.articulo} onClose={() => setSolicitar(null)} />
    </>
  );
}
