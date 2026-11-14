// Marca de GIA: dial de combinación, el elemento que identifica una caja fuerte.
export function Dial({ size = 28, className = '' }) {
  const ticks = Array.from({ length: 40 }, (_, i) => i);
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="5" />
      {ticks.map((i) => {
        const a = (i / 40) * Math.PI * 2;
        const long = i % 5 === 0;
        const r1 = long ? 30 : 34;
        return <line key={i} x1={50 + Math.sin(a) * r1} y1={50 - Math.cos(a) * r1} x2={50 + Math.sin(a) * 39} y2={50 - Math.cos(a) * 39}
          stroke="currentColor" strokeWidth={long ? 3.2 : 1.6} strokeLinecap="round" />;
      })}
      <circle cx="50" cy="50" r="14" fill="currentColor" />
    </svg>
  );
}

export default function Brand() {
  return (
    <div className="brand">
      <Dial size={30} className="brand__dial" />
      <div>
        <span className="brand__name">GIA</span>
        <span className="brand__sub">Gestor de Inventario de Almacén</span>
      </div>
    </div>
  );
}

// Dial de combinación detallado para la pantalla de ingreso.
export function LoginDial({ className = '' }) {
  const ticks = Array.from({ length: 100 }, (_, i) => i);
  return (
    <svg className={className} viewBox="0 0 400 400" aria-hidden>
      <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="2" opacity=".35" />
      <circle cx="200" cy="200" r="172" fill="none" stroke="currentColor" strokeWidth="6" />
      {ticks.map((i) => {
        const a = (i / 100) * Math.PI * 2;
        const major = i % 10 === 0;
        const mid = i % 5 === 0;
        const r1 = major ? 136 : mid ? 146 : 152;
        return (
          <line key={i} x1={200 + Math.sin(a) * r1} y1={200 - Math.cos(a) * r1} x2={200 + Math.sin(a) * 162} y2={200 - Math.cos(a) * 162}
            stroke="currentColor" strokeWidth={major ? 3 : mid ? 2 : 1.2} strokeLinecap="round" />
        );
      })}
      {ticks.filter((i) => i % 10 === 0).map((i) => {
        const a = (i / 100) * Math.PI * 2;
        return (
          <text key={i} x={200 + Math.sin(a) * 116} y={200 - Math.cos(a) * 116 + 6} textAnchor="middle"
            fontSize="17" fontWeight="600" fill="currentColor" fontFamily="IBM Plex Sans, sans-serif">{i}</text>
        );
      })}
      <circle cx="200" cy="200" r="84" fill="none" stroke="currentColor" strokeWidth="2" opacity=".5" />
      <circle cx="200" cy="200" r="58" fill="currentColor" opacity=".16" />
      <circle cx="200" cy="200" r="58" fill="none" stroke="currentColor" strokeWidth="4" />
      <rect x="196" y="146" width="8" height="30" rx="4" fill="currentColor" />
    </svg>
  );
}
