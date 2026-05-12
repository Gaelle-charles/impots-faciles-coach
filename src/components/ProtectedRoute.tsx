import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isB2BRoute = location.pathname.startsWith('/impots-team');
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(adminOnly);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState<boolean | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);

  useEffect(() => {
    if (!user) {
      setOnboardingLoading(false);
      setOrgLoading(false);
      return;
    }

    const fetchAll = async () => {
      const [{ data: profile }, { data: orgData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('role, onboarding_done, plan')
          .eq('id', user.id)
          .maybeSingle(),
        supabase.rpc('get_user_organization', { p_user_id: user.id }),
      ]);

      // Profile missing => account was deleted server-side. Sign out + go home.
      if (!profile) {
        setProfileMissing(true);
        setOnboardingLoading(false);
        setOrgLoading(false);
        try { await supabase.auth.signOut(); } catch { /* noop */ }
        return;
      }

      if (adminOnly) {
        setRole(profile?.role ?? 'client');
        setRoleLoading(false);
      }
      setOnboardingDone(profile?.onboarding_done ?? false);
      setUserPlan((profile as { plan?: string } | null)?.plan ?? null);
      setOnboardingLoading(false);

      const org = Array.isArray(orgData) ? orgData[0] : orgData;
      setIsOrgAdmin(!!(org?.org_id && org?.role === 'admin'));
      setOrgLoading(false);
    };

    fetchAll();
  }, [user, adminOnly]);

  if (profileMissing) {
    return <Navigate to="/" replace />;
  }

  if (loading || (adminOnly && roleLoading) || onboardingLoading || orgLoading) {
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

  // Modèle B : un admin d'orga sans licence est cantonné à son espace de gestion,
  // mais peut consulter les modules/simulateurs en mode aperçu.
  const previewAllowed = location.pathname.startsWith('/module/')
    || location.pathname.startsWith('/simulateur')
    || location.pathname.startsWith('/fiche-metier/')
    || location.pathname.startsWith('/fiches/')
    || location.pathname.startsWith('/quizz/');
  if (!adminOnly && isOrgAdmin && !isB2BRoute && !previewAllowed) {
    return <Navigate to="/impots-team/dashboard" replace />;
  }

  // Redirect to onboarding if not completed (skip for admin routes, B2B routes, and onboarding itself)
  if (
    !adminOnly &&
    onboardingDone === false &&
    location.pathname !== '/onboarding' &&
    !isB2BRoute
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
