import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Suit en temps réel le nombre de suggestions non lues et non archivées.
 * Réservé aux admins (RLS bloque les autres → renvoie 0).
 *
 * NB : on génère un nom de channel unique par instance de hook pour éviter
 * que plusieurs consommateurs (cloche header + item sidebar) se partagent
 * la même souscription et provoquent des unsubscribe croisés.
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

    const channelName = `suggestions-unread-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'suggestions' },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'suggestions' },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'suggestions' },
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
