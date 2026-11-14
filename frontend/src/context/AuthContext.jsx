import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/index.js';
import { setUnauthorizedHandler, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Al cargar la app, recupera la sesión si hay un token guardado.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) { setLoading(false); return; }
    authService.me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { token, usuario } = await authService.login(email, password);
    tokenStore.set(token);
    setUser(usuario);
    return usuario;
  }, []);

  const value = useMemo(() => ({ user, setUser, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
