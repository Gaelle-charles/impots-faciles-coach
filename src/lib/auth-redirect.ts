import { supabase } from '@/integrations/supabase/client';

/**
 * Returns a stable origin for email links (signup confirm, password reset, etc.).
 *
 * In Lovable preview (`*.lovable.app`), email links go through an auth-bridge
 * that requires logging in to lovable.dev — which breaks the flow for end-users.
 * We always use the production custom domain so the link works in real emails,
 * regardless of where the request was triggered from.
 */
export function getEmailRedirectOrigin(): string {
  if (typeof window === 'undefined') return 'https://impotsfacile.com';
  const host = window.location.hostname;
  // Force production domain for any preview / lovable.app host
  if (host.endsWith('.lovable.app') || host === 'lovable.dev') {
    return 'https://impotsfacile.com';
  }
  return window.location.origin;
}

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
  if (org?.org_id && org?.role === 'admin') return '/impots-team/dashboard';
  if (profile?.onboarding_done === false) return '/onboarding';
  return '/dashboard';
}
