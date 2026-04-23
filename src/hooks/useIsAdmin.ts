import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns whether the current user has profiles.role === 'admin'.
 * Front-side flag only — server-side mutations must remain protected by RLS.
 */
export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }
      setIsLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setIsAdmin(data?.role === 'admin');
        setIsLoading(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, isLoading };
}
