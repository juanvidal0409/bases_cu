import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useForm } from '../../hooks/useForm.js';
import { rules } from '../../utils/validators.js';
import { authService } from '../../services/index.js';
import { ROLE_LABELS } from '../../config/roles.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { Input } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';

// Caso de uso "Actualizar información usuario" (extiende Iniciar sesión).
export default function Perfil() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const form = useForm(
    { nombre: user.nombre, email: user.email, telefono: user.telefono || '', password_actual: '', password_nueva: '', password_confirmar: '' },
    (v) => ({
      nombre: [rules.required],
      email: [rules.required, rules.email],
      telefono: [rules.phone],
      password_actual: v.password_nueva ? [rules.required] : [],
      password_nueva: [rules.minLength(6)],
      password_confirmar: [(c) => (v.password_nueva && c !== v.password_nueva ? 'Las contraseñas no coinciden.' : null)],
    }),
    async (v) => {
      const payload = { nombre: v.nombre.trim(), email: v.email.trim(), telefono: v.telefono.trim() || null };
      if (v.password_nueva) Object.assign(payload, { password_actual: v.password_actual, password_nueva: v.password_nueva });
      const updated = await authService.updateMe(payload);
      setUser(updated);
      form.setValues((x) => ({ ...x, password_actual: '', password_nueva: '', password_confirmar: '' }));
      toast.success('Datos actualizados.');
    },
  );

  return (
    <>
      <PageHeader title="Mi cuenta" description={`${ROLE_LABELS[user.rol]} · ${user.cargo}`} />
      <form className="panel form-panel" onSubmit={form.handleSubmit} noValidate>
        <fieldset className="form-section">
          <legend>Datos personales</legend>
          <div className="grid-2">
            <Input label="Nombre completo" required {...form.bind('nombre')} />
            <Input label="Teléfono" inputMode="tel" {...form.bind('telefono')} />
            <Input label="Correo" type="email" required className="span-2" {...form.bind('email')} hint="Es el usuario con el que inicias sesión." />
          </div>
        </fieldset>
        <fieldset className="form-section">
          <legend>Cambiar contraseña</legend>
          <p className="form-section__hint">Déjalo en blanco si no quieres cambiarla.</p>
          <div className="grid-3">
            <Input label="Contraseña actual" type="password" autoComplete="current-password" {...form.bind('password_actual')} />
            <Input label="Contraseña nueva" type="password" autoComplete="new-password" {...form.bind('password_nueva')} />
            <Input label="Confirmar contraseña" type="password" autoComplete="new-password" {...form.bind('password_confirmar')} />
          </div>
        </fieldset>
        {form.formError && <p className="alert alert--error" role="alert">{form.formError}</p>}
        <div className="form-actions">
          <Button type="submit" loading={form.submitting}>Guardar cambios</Button>
        </div>
      </form>
    </>
  );
}
