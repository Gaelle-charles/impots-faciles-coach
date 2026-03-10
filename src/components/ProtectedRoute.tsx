import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-heading text-xl text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" replace />;
  }

  return <>{children}</>;
}
