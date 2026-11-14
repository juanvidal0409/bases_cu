import { Link } from 'react-router-dom';

export function SinPermiso() {
  return (
    <div className="message-page">
      <h1>Esta sección no está en tu módulo</h1>
      <p>Tu rol no tiene acceso a esta página. Si lo necesitas, pídele al administrador que revise tu rol.</p>
      <Link className="btn btn--secondary" to="/">Volver al inicio</Link>
    </div>
  );
}

export function NoEncontrada() {
  return (
    <div className="message-page">
      <h1>Página no encontrada</h1>
      <p>La dirección no corresponde a ninguna sección de GIA.</p>
      <Link className="btn btn--secondary" to="/">Volver al inicio</Link>
    </div>
  );
}
