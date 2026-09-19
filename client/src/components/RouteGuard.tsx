import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, type Role } from '../store/auth.store';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

export const RoleGuard = ({ minimumRole, children }: { minimumRole: Role; children: React.ReactNode }) => {
  const hasRole = useAuthStore((s) => s.hasRole);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(minimumRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
