'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        fetchCurrentUser(storedToken);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const fetchCurrentUser = async (authToken) => {
    try {
      const data = await apiFetch('/auth/me', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      setUser(data);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.access_token);
    }
    setToken(data.access_token);

    const userProfile = await apiFetch('/auth/me', {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });
    setUser(userProfile);
    return userProfile;
  };

  const setupInitialAdmin = async (adminData) => {
    const data = await apiFetch('/auth/setup-initial-admin', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
    return data;
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, setupInitialAdmin, logout, refreshUser: () => fetchCurrentUser(token) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
