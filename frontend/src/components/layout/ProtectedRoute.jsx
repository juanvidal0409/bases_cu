import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loading } from '../ui/States.jsx';

// Exige sesión iniciada (RNF03) y, si se indican roles, que el usuario tenga uno de ellos (RNF04).
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="boot"><Loading label="Verificando sesión…" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/sin-permiso" replace />;
  return children || <Outlet />;
}
