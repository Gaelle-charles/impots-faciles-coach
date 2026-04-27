import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type OrgRole = 'admin' | 'admin_with_license' | 'member';

export interface OrgInfo {
  org_id: string;
  raison_sociale: string;
  plan: string;
  logo_url: string | null;
  role: OrgRole;
}

/**
 * Renvoie l'organisation de l'utilisateur connecté (s'il en a une).
 * - role='admin'              : admin orga sans licence perso → mode aperçu lecture seule
 * - role='admin_with_license' : admin orga avec licence perso → parcours complet
 * - role='member'             : collaborateur → parcours complet selon plan de l'orga
 */
export function useOrgRole() {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['org-role', user?.id],
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<OrgInfo | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc('get_user_organization', { p_user_id: user.id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.org_id) return null;
      return row as OrgInfo;
    },
  });

  const loading = authLoading || (!!user && isLoading);
  const org = data ?? null;
  const isOrgAdmin = org?.role === 'admin' || org?.role === 'admin_with_license';
  // Aperçu = admin orga SANS licence perso : peut voir mais pas sauvegarder
  const isOrgAdminPreview = org?.role === 'admin';
  const isOrgMember = org?.role === 'member';
  const hasLicense = org?.role === 'admin_with_license' || org?.role === 'member';

  return { org, loading, isOrgAdmin, isOrgAdminPreview, isOrgMember, hasLicense };
}
