const TONES = {
  'Disponible': 'ok',
  'En producción': 'info',
  'Vendida': 'neutral',
  'Defectuosa': 'danger',
  'Activo': 'warn',
  'Devuelto': 'neutral',
  'Pendiente': 'warn',
  'Comprada': 'ok',
};

export default function Badge({ children, tone }) {
  const t = tone || TONES[children] || 'neutral';
  return <span className={`badge badge--${t}`}>{children}</span>;
}
