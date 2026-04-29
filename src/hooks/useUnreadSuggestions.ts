import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Suit en temps réel le nombre de suggestions non lues et non archivées.
 * Réservé aux admins (RLS bloque les autres → renvoie 0).
 */
export function useUnreadSuggestions() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const { count: c } = await supabase
        .from('suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('is_archived', false);
      if (!cancelled) setCount(c ?? 0);
    };

    refresh();

    const channel = supabase
      .channel('suggestions-unread')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suggestions' },
        () => refresh(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
