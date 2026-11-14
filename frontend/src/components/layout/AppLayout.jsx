import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { House, LogOut, Menu, UserRound, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { modulesForRole, ROLE_LABELS } from '../../config/roles.js';
import { USE_MOCK } from '../../api/client.js';
import Icon from '../ui/Icon.jsx';
import Brand from './Brand.jsx';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const modules = modulesForRole(user.rol);

  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  const initials = user.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <div className={`shell ${navOpen ? 'shell--nav-open' : ''}`}>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>

      <aside className="sidebar" aria-label="Navegación principal">
        <div className="sidebar__top">
          <Brand />
          <button className="sidebar__close" onClick={() => setNavOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>

        <nav className="nav">
          <NavLink to="/" end className="nav__link"><House size={18} aria-hidden />Inicio</NavLink>
          {modules.map((m) => (
            <div key={m.key} className="nav__group">
              <p className="nav__title">{m.title}</p>
              {m.options.map((o) => (
                <NavLink key={o.to} to={o.to} className="nav__link">
                  <Icon name={o.icon} />{o.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {USE_MOCK && <p className="sidebar__mock" title="VITE_USE_MOCK=true">Datos de prueba: sin conexión al backend</p>}
      </aside>
      <div className="sidebar-scrim" onClick={() => setNavOpen(false)} aria-hidden />

      <div className="main">
        <header className="topbar">
          <button className="topbar__menu" onClick={() => setNavOpen(true)} aria-label="Abrir menú"><Menu size={20} /></button>
          <div className="topbar__spacer" />
          <NavLink to="/perfil" className="user-chip" title="Mi cuenta">
            <span className="user-chip__avatar" aria-hidden>{initials}</span>
            <span className="user-chip__text">
              <span className="user-chip__name">{user.nombre}</span>
              <span className="user-chip__role">{ROLE_LABELS[user.rol]}</span>
            </span>
            <UserRound size={16} className="user-chip__icon" aria-hidden />
          </NavLink>
          <button className="btn btn--ghost btn--icon" onClick={() => { logout(); navigate('/login'); }} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </header>

        <main id="contenido" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
