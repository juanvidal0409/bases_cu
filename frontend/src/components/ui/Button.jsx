import { Loader2 } from 'lucide-react';

export default function Button({ variant = 'primary', size, loading, icon: IconCmp, children, className = '', ...rest }) {
  const cls = ['btn', `btn--${variant}`, size && `btn--${size}`, !children && 'btn--icon', className].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Loader2 size={16} className="spin" aria-hidden /> : IconCmp ? <IconCmp size={16} aria-hidden /> : null}
      {children && <span>{children}</span>}
    </button>
  );
}
