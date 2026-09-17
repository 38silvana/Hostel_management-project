'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isRoleAllowed = (role) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!role) return false;
    const lowerRole = String(role).trim().toLowerCase();
    return allowedRoles.some((r) => String(r).trim().toLowerCase() === lowerRole);
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (!isRoleAllowed(user.role)) {
        const isAdmin = String(user.role || '').trim().toLowerCase() === 'admin';
        router.replace(isAdmin ? '/admin' : '/student');
      }
    }
  }, [user, loading, allowedRoles, router]);

  if (loading || !user) {
    return <LoadingSpinner label="Authenticating session..." />;
  }

  if (!isRoleAllowed(user.role)) {
    return null;
  }

  return children;
}
