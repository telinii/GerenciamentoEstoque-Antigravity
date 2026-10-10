import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore, type Role } from '../store/auth.store';

const LoadingScreen = () => (
  <div className="min-h-screen bg-[#090a0c] flex items-center justify-center">
    <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
  </div>
);

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <LoadingScreen />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <LoadingScreen />;
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

export const RoleGuard = ({ minimumRole, children }: { minimumRole: Role; children: React.ReactNode }) => {
  const hasRole = useAuthStore((s) => s.hasRole);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasRole(minimumRole)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};
