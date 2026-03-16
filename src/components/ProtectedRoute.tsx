import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(adminOnly);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOnboardingLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role, onboarding_done')
        .eq('id', user.id)
        .single();

      if (adminOnly) {
        setRole(data?.role ?? 'client');
        setRoleLoading(false);
      }
      setOnboardingDone(data?.onboarding_done ?? false);
      setOnboardingLoading(false);
    };

    fetchProfile();
  }, [user, adminOnly]);

  if (loading || (adminOnly && roleLoading) || onboardingLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-heading text-xl text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    if (adminOnly) {
      return <Navigate to="/admin/login" replace />;
    }
    const redirectPath = location.pathname + location.search + location.hash;
    return <Navigate to={`/connexion?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  if (adminOnly && role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  // Redirect to onboarding if not completed (skip for admin routes and onboarding itself)
  if (
    !adminOnly &&
    onboardingDone === false &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
