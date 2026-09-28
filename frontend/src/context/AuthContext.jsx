import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/authApi';
import { authStorage } from '../lib/storage';
import { disconnectSockets } from '../lib/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => authStorage.getToken());
  const [user, setUser] = useState(() => authStorage.getUser());
  const [bootstrapping, setBootstrapping] = useState(Boolean(authStorage.getToken()));

  const clearSession = useCallback(() => {
    authStorage.clear();
    disconnectSockets();
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);

    authStorage.setToken(result.token);
    authStorage.setUser(result.user);
    setToken(result.token);
    setUser(result.user);

    return result.user;
  }, []);

  const register = useCallback(async (payload) => {
    const result = await authApi.register(payload);

    authStorage.setToken(result.token);
    authStorage.setUser(result.user);
    setToken(result.token);
    setUser(result.user);

    return result.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    window.location.assign('/login');
  }, [clearSession]);

  const refreshCurrentUser = useCallback(async () => {
    if (!token) {
      return null;
    }

    const currentUser = await authApi.currentUser();
    authStorage.setUser(currentUser);
    setUser(currentUser);
    return currentUser;
  }, [token]);

  useEffect(() => {
    if (!token) {
      setBootstrapping(false);
      return undefined;
    }

    let active = true;

    authApi
      .currentUser()
      .then((currentUser) => {
        if (!active) {
          return;
        }

        authStorage.setUser(currentUser);
        setUser(currentUser);
      })
      .catch(() => {
        if (active) {
          clearSession();
        }
      })
      .finally(() => {
        if (active) {
          setBootstrapping(false);
        }
      });

    return () => {
      active = false;
    };
  }, [clearSession, token]);

  useEffect(() => {
    window.addEventListener('coopsave:unauthorized', clearSession);
    return () => window.removeEventListener('coopsave:unauthorized', clearSession);
  }, [clearSession]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      bootstrapping,
      login,
      register,
      refreshCurrentUser,
      logout
    }),
    [bootstrapping, login, logout, refreshCurrentUser, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
};
