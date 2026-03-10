import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    if (!user || !adminOnly) return;
    setRoleLoading(true);
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setRole(data?.role ?? 'client');
        setRoleLoading(false);
      });
  }, [user, adminOnly]);

  if (loading || (adminOnly && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-heading text-xl text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" replace />;
  }

  if (adminOnly && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
