import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react';
import { normalize } from '../../utils/format.js';
import { EmptyState, ErrorState, Loading } from './States.jsx';

// Tabla de datos: cada columna es un atributo y cada fila un registro de la BD
// (nota del diagrama de casos de uso de almacén). Incluye búsqueda y orden.
//
// columns: [{ key, header, render?(row), sortValue?(row), align?, width?, searchable? }]
export default function DataTable({
  columns, rows, rowKey = 'id', loading, error, onRetry,
  searchPlaceholder = 'Buscar…', emptyTitle = 'Sin registros', emptyText, emptyAction,
  toolbar, initialSort, rowClassName,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort || null);

  const visible = useMemo(() => {
    if (!rows) return [];
    const q = normalize(query.trim());
    let out = q
      ? rows.filter((r) => columns.some((c) => c.searchable !== false &&
          normalize(c.searchValue ? c.searchValue(r) : r[c.key]).includes(q)))
      : rows;
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      const val = (r) => (col?.sortValue ? col.sortValue(r) : r[sort.key]);
      out = [...out].sort((a, b) => {
        const x = val(a); const y = val(b);
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'es', { numeric: true });
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, query, sort, columns]);

  const toggleSort = (key) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <label className="search">
          <Search size={16} aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
        </label>
        {toolbar}
        {rows && !loading && <span className="table-count">{visible.length} de {rows.length}</span>}
      </div>

      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={onRetry} /> : !rows?.length ? (
        <EmptyState title={emptyTitle} action={emptyAction}>{emptyText}</EmptyState>
      ) : !visible.length ? (
        <EmptyState title="Ningún registro coincide con la búsqueda">Prueba con otro término o borra el filtro.</EmptyState>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                {columns.map((c) => {
                  const sortable = c.sortable !== false && !c.actions;
                  const active = sort?.key === c.key;
                  return (
                    <th key={c.key} style={{ width: c.width, textAlign: c.align }} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {sortable ? (
                        <button className={`th-sort ${active ? 'is-active' : ''}`} onClick={() => toggleSort(c.key)}>
                          {c.header}
                          {active ? (sort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} className="th-sort__idle" />}
                        </button>
                      ) : <span className="th-plain">{c.header}</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r[rowKey]} className={rowClassName?.(r)}>
                  {columns.map((c) => (
                    <td key={c.key} style={{ textAlign: c.align }} className={c.actions ? 'td-actions' : c.className}>
                      {c.render ? c.render(r) : r[c.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
