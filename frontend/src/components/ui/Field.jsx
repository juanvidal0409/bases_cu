import { useId } from 'react';

// Campo de formulario con etiqueta, ayuda y mensaje de error accesibles.
export function Field({ label, hint, error, required, children, className = '' }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="field__label">
          {label}{required && <span className="field__req" aria-hidden> *</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy, required })}
      {error ? <p id={`${id}-err`} className="field__error">{error}</p>
        : hint ? <p id={`${id}-hint`} className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function Input({ label, hint, error, required, className, suffix, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(a11y) => suffix
        ? <div className="input-wrap"><input className="input" {...a11y} {...rest} /><span className="input-suffix">{suffix}</span></div>
        : <input className="input" {...a11y} {...rest} />}
    </Field>
  );
}

export function Select({ label, hint, error, required, className, options = [], placeholder, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(a11y) => (
        <select className="input select" {...a11y} {...rest}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
        </select>
      )}
    </Field>
  );
}

export function Textarea({ label, hint, error, required, className, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(a11y) => <textarea className="input textarea" rows={3} {...a11y} {...rest} />}
    </Field>
  );
}
