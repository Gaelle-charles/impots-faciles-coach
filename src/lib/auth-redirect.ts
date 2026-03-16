import { supabase } from '@/integrations/supabase/client';

/**
 * Determines the correct redirect path after login based on profile data.
 */
export async function getPostLoginRedirect(userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('role, onboarding_done')
    .eq('id', userId)
    .maybeSingle();

  if (data?.role === 'admin') return '/admin';
  if (data?.onboarding_done === false) return '/onboarding';
  return '/dashboard';
}
