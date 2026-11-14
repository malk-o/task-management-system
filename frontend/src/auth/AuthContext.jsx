import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken, setToken, setUnauthorizedHandler } from '../api.js';

const AuthContext = createContext(null);

/** Holds who is signed in. Status is 'loading' (checking a saved session), 'anonymous' or 'authenticated'. */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: getToken() ? 'loading' : 'anonymous', user: null });

  const clearSession = useCallback(() => {
    clearToken();
    setState({ status: 'anonymous', user: null });
  }, []);

  // If any request comes back 401, return to the login page.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  // Restore a saved session when the page loads.
  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then((user) => setState({ status: 'authenticated', user }))
      .catch(clearSession);
  }, [clearSession]);

  const startSession = useCallback(async (result) => {
    setToken(result.token);
    const user = await api('/auth/me');
    setState({ status: 'authenticated', user });
  }, []);

  const value = useMemo(() => ({
    status: state.status,
    user: state.user,
    login: async (email, password) => {
      await startSession(await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) }));
    },
    register: async (name, email, password) => {
      await startSession(await api('/auth/register', null, { method: 'POST', body: JSON.stringify({ name, email, password }) }));
    },
    signOut: async () => {
      try {
        await api('/auth/logout', null, { method: 'POST' });
      } catch {
        // already signed out on the server; nothing to do
      }
      clearSession();
    },
  }), [state, startSession, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
