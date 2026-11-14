import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { modulesForRole } from '../../config/roles.js';
import Icon from '../../components/ui/Icon.jsx';

// Caso de uso "Desplegar interfaz web": muestra las opciones del módulo del usuario.
export default function Inicio() {
  const { user } = useAuth();
  const modules = modulesForRole(user.rol);
  const hour = new Date().getHours();
  const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="home">
      <h1 className="home__title">{saludo}, {user.nombre.split(' ')[0]}</h1>
      {modules.map((m) => (
        <section key={m.key} className="home__module">
          <div className="home__module-head">
            <h2>{m.title}</h2>
            <p>{m.description}</p>
          </div>
          <ul className="home__options">
            {m.options.map((o) => (
              <li key={o.to}>
                <Link to={o.to} className="home__option">
                  <Icon name={o.icon} size={20} />
                  <span>{o.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
