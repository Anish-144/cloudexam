import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { authAPI } from '../api/client';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('access_token'),
    isAuthenticated: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI.getMe()
        .then((res) => setState({ user: res.data, token, isAuthenticated: true }))
        .catch(() => {
          localStorage.removeItem('access_token');
          setState({ user: null, token: null, isAuthenticated: false });
        });
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authAPI.login(username, password);
    const token = res.data.access_token;
    localStorage.setItem('access_token', token);
    const me = await authAPI.getMe();
    setState({ user: me.data, token, isAuthenticated: true });
  };

  const register = async (username: string, email: string, password: string) => {
    await authAPI.register({ username, email, password });
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setState({ user: null, token: null, isAuthenticated: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
