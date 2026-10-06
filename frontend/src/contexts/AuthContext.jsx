import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/api/auth/me')
      .then(({ data }) => {
        if (active) {
          setUser(data.user);
          setProfile(data.profile);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setProfile(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const establishSession = ({ data }) => {
    setUser(data.user);
    setProfile(data.profile);
    return data;
  };

  const login = async (credentials) => establishSession(await api.post('/api/auth/login', credentials));
  const register = async (details) => establishSession(await api.post('/api/auth/register', details));

  const logout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
    setProfile(null);
  };

  const updateProfile = (nextProfile) => setProfile(nextProfile);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}