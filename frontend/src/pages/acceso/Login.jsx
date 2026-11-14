import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useForm } from '../../hooks/useForm.js';
import { rules } from '../../utils/validators.js';
import { USE_MOCK } from '../../api/client.js';
import { ROLE_LABELS } from '../../config/roles.js';
import { Input } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { LoginDial } from '../../components/layout/Brand.jsx';

const DEMO = [
  ['admin@empresa.com', 'ADMINISTRADOR'],
  ['jorge.medina@empresa.com', 'GESTOR_ALMACEN'],
  ['laura.gomez@empresa.com', 'GESTOR_PRODUCCION'],
  ['maria.fernandez@empresa.com', 'GESTOR_VENTAS'],
  ['sofia.rojas@empresa.com', 'CONTADOR'],
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);

  const form = useForm({ email: '', password: '' },
    { email: [rules.required, rules.email], password: [rules.required] },
    async ({ email, password }) => {
      await login(email.trim(), password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    });

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="login">
      <section className="login__art" aria-hidden>
        <span className="login__index" />
        <div className="login__dial-wrap"><LoginDial className="login__dial" /></div>
        <div className="login__art-text">
          <p className="login__brand">GIA</p>
          <p>Inventario, producción y ventas de la planta en un solo lugar.</p>
        </div>
      </section>

      <section className="login__panel">
        <form className="login__form" onSubmit={form.handleSubmit} noValidate>
          <h1 className="login__title">Iniciar sesión</h1>
          <p className="login__lead">Usa el correo con el que te registró el administrador.</p>

          <Input label="Correo" type="email" autoComplete="username" required {...form.bind('email')} />
          <Input label="Contraseña" type={show ? 'text' : 'password'} autoComplete="current-password" required
            {...form.bind('password')}
            suffix={<button type="button" className="input-icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>} />

          {form.formError && <p className="alert alert--error" role="alert">{form.formError}</p>}

          <Button type="submit" loading={form.submitting} className="btn--block">Entrar</Button>
        </form>

        {USE_MOCK && (
          <div className="demo">
            <p className="demo__title">Cuentas de prueba (contraseña <strong>gia123</strong>)</p>
            <ul className="demo__list">
              {DEMO.map(([email, rol]) => (
                <li key={email}>
                  <button type="button" className="demo__item" onClick={() => form.setValues({ email, password: 'gia123' })}>
                    <span>{ROLE_LABELS[rol]}</span><span className="demo__email">{email}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
