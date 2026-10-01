'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('user');
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Helper to fetch user profile from public.profiles table using authenticated user UUID
  const fetchUserProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) return null;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (error) {
        console.warn('Could not retrieve profile from profiles table:', error.message);
      }

      const rawRole = profile?.role || sessionUser.user_metadata?.role || 'student';
      const isAdmin = String(rawRole).trim().toLowerCase() === 'admin';
      const role = isAdmin ? 'admin' : rawRole;
      const approvalStatus = sessionUser.user_metadata?.approval_status || (isAdmin ? 'approved' : 'pending');

      return {
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: profile?.full_name || sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Resident',
        role,
        approval_status: approvalStatus,
        mobile: sessionUser.user_metadata?.mobile || '',
        whatsapp_number: sessionUser.user_metadata?.whatsapp_number || sessionUser.user_metadata?.mobile || '',
      };
    } catch (err) {
      console.error('Error fetching user profile:', err);
      const rawRole = sessionUser.user_metadata?.role || 'student';
      const isAdmin = String(rawRole).trim().toLowerCase() === 'admin';
      const role = isAdmin ? 'admin' : rawRole;
      return {
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Resident',
        role,
        approval_status: sessionUser.user_metadata?.approval_status || (isAdmin ? 'approved' : 'pending'),
        mobile: sessionUser.user_metadata?.mobile || '',
        whatsapp_number: sessionUser.user_metadata?.whatsapp_number || sessionUser.user_metadata?.mobile || '',
      };
    }
  }, []);

  // Sync Supabase session state, access token, and user profile
  const syncSession = useCallback(async (session) => {
    if (session?.user) {
      const accessToken = session.access_token;
      setToken(accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', accessToken);
      }
      const profileUser = await fetchUserProfile(session.user);
      if (profileUser) {
        setUser(profileUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(profileUser));
        }
      }
      return profileUser;
    } else {
      setToken(null);
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      return null;
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: Ensure loading never hangs indefinitely in private browsing or slow storage
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 1500);

    // Initial session restoration
    const initAuth = async () => {
      try {
        // Fetch session with timeout race guard
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 1200)
        );

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        if (error) {
          console.warn('Error fetching Supabase session:', error.message);
        }

        if (mounted) {
          if (session?.user) {
            await syncSession(session);
          } else {
            // No active session in storage
            const hasCachedUser = typeof window !== 'undefined' && localStorage.getItem('user');
            const hasCachedToken = typeof window !== 'undefined' && localStorage.getItem('token');
            if (!hasCachedToken || !hasCachedUser) {
              await syncSession(null);
            }
          }
        }
      } catch (err) {
        console.error('Error during auth initialization:', err);
        if (mounted) {
          await syncSession(null);
        }
      } finally {
        if (mounted) {
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes without blocking the event loop
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      setTimeout(async () => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            await syncSession(session);
          }
        } else if (event === 'SIGNED_OUT') {
          await syncSession(null);
        } else if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            await syncSession(session);
          } else {
            const hasToken = typeof window !== 'undefined' && localStorage.getItem('token');
            if (!hasToken) {
              await syncSession(null);
            }
          }
        }

        if (mounted) {
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription?.unsubscribe();
    };
  }, [syncSession]);

  /**
   * Login using Mobile Number or Email + Password.
   * Checks approval status before granting access.
   */
  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = new Error(data.error || 'Login failed.');
        err.isPending = data.isPending;
        throw err;
      }

      if (data.session) {
        // Set session into client-side Supabase client
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        const profile = await syncSession(data.session);
        return profile || data.user;
      }

      return data.user;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Student / Resident self-registration.
   * Account is created in PENDING state awaiting Admin approval.
   */
  const signup = async (studentData) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Failed to submit registration request.');
    }

    return result;
  };

  // Secure initial admin setup
  const setupInitialAdmin = async (adminData) => {
    const res = await fetch('/api/auth/setup-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminData),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Failed to register admin account');
    }

    return result;
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during Supabase signOut:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      setToken(null);
      setUser(null);
      setLoading(false);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  // Refresh user
  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return await syncSession(session);
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        setupInitialAdmin,
        logout,
        refreshUser,
      }}
    >
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
