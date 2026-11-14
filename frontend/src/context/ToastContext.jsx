import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 7000 : 3500);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            {t.type === 'success' ? <CheckCircle2 size={18} aria-hidden /> : <AlertCircle size={18} aria-hidden />}
            <span>{t.message}</span>
            <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso"><X size={16} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
