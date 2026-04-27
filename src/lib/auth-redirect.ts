import { supabase } from '@/integrations/supabase/client';

/**
 * Determines the correct redirect path after login based on profile data.
 */
export async function getPostLoginRedirect(userId: string): Promise<string> {
  const [{ data: profile }, { data: orgData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, onboarding_done')
      .eq('id', userId)
      .maybeSingle(),
    supabase.rpc('get_user_organization', { p_user_id: userId }),
  ]);

  const org = Array.isArray(orgData) ? orgData[0] : orgData;

  if (profile?.role === 'admin') return '/admin';
  if (org?.org_id) return '/impots-team/dashboard';
  if (profile?.onboarding_done === false) return '/onboarding';
  return '/dashboard';
}
