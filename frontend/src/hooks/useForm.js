import { useCallback, useState } from 'react';
import { validate } from '../utils/validators.js';
import { useToast } from '../context/ToastContext.jsx';

// Estado de formulario con validación local y manejo de errores del backend.
// onSubmit recibe los valores; si lanza un ApiError con details, se pintan por campo.
export function useForm(initial, schema, onSubmit) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const toast = useToast();

  const set = useCallback((field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => (e[field] ? { ...e, [field]: null } : e));
  }, []);

  const bind = (field) => ({
    name: field,
    value: values[field] ?? '',
    onChange: (e) => set(field, e.target.type === 'checkbox' ? e.target.checked : e.target.value),
    error: errors[field],
  });

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setFormError(null);
    const found = schema ? validate(values, typeof schema === 'function' ? schema(values) : schema) : {};
    if (Object.keys(found).length) {
      setErrors(found);
      const first = Object.keys(found)[0];
      document.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err?.details && typeof err.details === 'object') setErrors(err.details);
      setFormError(err?.message || 'No se pudo guardar.');
      if (err?.status === 0) toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return { values, setValues, set, bind, errors, setErrors, submitting, formError, handleSubmit };
}
