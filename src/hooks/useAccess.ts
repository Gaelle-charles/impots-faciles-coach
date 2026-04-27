import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useOrgRole } from '@/hooks/useOrgRole';

export type Plan = 'nouveau' | 'starter' | 'expert' | 'premium';
export type Role = 'client' | 'admin';

export interface AccessProfile {
  id: string;
  plan: Plan;
  role: Role;
  metier_id: string | null;
}

interface ModuleLike {
  accessibilite?: string[] | null;
}

const PAID_FULL_ACCESS: Plan[] = ['expert', 'premium'];

export function useAccess() {
  const { user, loading: authLoading } = useAuth();
  const { isOrgAdmin, isOrgAdminPreview, loading: orgLoading } = useOrgRole();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['access-profile', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AccessProfile | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, plan, role, metier_id')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as AccessProfile | null;
    },
  });

  const isLoading = authLoading || orgLoading || (!!user && profileLoading);
  const isAuthenticated = !!user;
  const plan = (profile?.plan ?? 'nouveau') as Plan;
  const role = (profile?.role ?? 'client') as Role;
  const isAdmin = role === 'admin';

  const hasModuleAccess = (module: ModuleLike | null | undefined): boolean => {
    if (!profile || !module) return false;
    if (isAdmin) return true;
    // Admin orga (avec ou sans licence) : aperçu/accès de tous les modules
    if (isOrgAdmin) return true;
    return Array.isArray(module.accessibilite) && module.accessibilite.includes(plan);
  };

  const hasFicheMetierAccess = (): boolean => {
    if (!profile) return false;
    if (isAdmin) return true;
    if (isOrgAdmin) return true;
    return PAID_FULL_ACCESS.includes(plan);
  };

  const hasSimulateurCompletAccess = (): boolean => {
    if (!profile) return false;
    if (isAdmin) return true;
    if (isOrgAdmin) return true;
    return PAID_FULL_ACCESS.includes(plan);
  };

  const hasAdminAccess = (): boolean => {
    if (!profile) return false;
    return isAdmin;
  };

  return {
    user,
    profile: profile ?? null,
    plan,
    role,
    isLoading,
    isAuthenticated,
    isOrgAdminPreview, // admin orga sans licence perso → mode aperçu (pas de sauvegarde)
    hasModuleAccess,
    hasFicheMetierAccess,
    hasSimulateurCompletAccess,
    hasAdminAccess,
  };
}
