import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import Button from './Button.jsx';

export function Loading({ label = 'Cargando…' }) {
  return <div className="state" role="status"><Loader2 className="spin" size={22} aria-hidden /><span>{label}</span></div>;
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <AlertTriangle size={22} aria-hidden />
      <p>{error?.message || 'No se pudieron cargar los datos.'}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Reintentar</Button>}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="state">
      <Inbox size={22} aria-hidden />
      <p className="state__title">{title}</p>
      {children && <p className="state__text">{children}</p>}
      {action}
    </div>
  );
}
