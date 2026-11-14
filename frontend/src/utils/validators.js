// Validaciones del lado del cliente. El backend debe repetirlas: estas solo
// evitan viajes innecesarios y muestran el error junto al campo.

export const rules = {
  required: (v) => (v === undefined || v === null || String(v).trim() === '' ? 'Este campo es obligatorio.' : null),
  email: (v) => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Escribe un correo válido, como nombre@empresa.com.' : null),
  positive: (v) => (v !== '' && v !== null && v !== undefined && !(Number(v) > 0) ? 'Debe ser mayor que cero.' : null),
  nonNegative: (v) => (v !== '' && v !== null && v !== undefined && !(Number(v) >= 0) ? 'No puede ser negativo.' : null),
  integer: (v) => (v !== '' && v !== null && v !== undefined && !Number.isInteger(Number(v)) ? 'Debe ser un número entero.' : null),
  phone: (v) => (v && !/^[0-9+\s-]{7,20}$/.test(v) ? 'Usa solo números, entre 7 y 20 dígitos.' : null),
  minLength: (n) => (v) => (v && String(v).length < n ? `Debe tener al menos ${n} caracteres.` : null),
};

// schema: { campo: [regla, regla] } -> { campo: 'mensaje' }
export function validate(values, schema) {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(schema)) {
    for (const rule of fieldRules) {
      const msg = rule(values[field], values);
      if (msg) { errors[field] = msg; break; }
    }
  }
  return errors;
}
