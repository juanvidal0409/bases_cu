import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Diálogo modal: cierra con Escape o clic fuera, devuelve el foco al cerrar.
export default function Modal({ open, title, description, onClose, children, footer, size = 'md' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const first = ref.current?.querySelector('input:not([type=hidden]), select, textarea, button:not(.modal__close)');
      (first || ref.current)?.focus();
    }, 20);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal--${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref} tabIndex={-1}>
        <header className="modal__header">
          <div>
            <h2 id="modal-title" className="modal__title">{title}</h2>
            {description && <p className="modal__desc">{description}</p>}
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
