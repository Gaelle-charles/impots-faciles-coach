import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Simulateur {
  id: string;
  slug: string;
  nom: string;
  description: string;
  plan_minimum: 'starter' | 'expert' | 'premium';
  ordre: number;
  is_active: boolean;
  highlight_si_salarie: boolean;
  highlight_si_independant: boolean;
  highlight_si_dirigeant: boolean;
  highlight_si_couple: boolean;
  highlight_si_revenus_fonciers: boolean;
  highlight_si_placements: boolean;
  highlight_si_revenus_eleves: boolean;
  nb_utilisations: number;
  created_at: string;
  updated_at: string;
}

/**
 * Hook : liste des simulateurs actifs (triés par ordre).
 * `includeInactive` permet aux pages admin de tout récupérer.
 */
export function useSimulateurs(opts: { includeInactive?: boolean } = {}) {
  const [data, setData] = useState<Simulateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    let query = supabase.from('simulateurs').select('*').order('ordre', { ascending: true });
    if (!opts.includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) setError(error.message);
    else setData((data ?? []) as Simulateur[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.includeInactive]);

  return { data, loading, error, refetch: fetchAll };
}

/**
 * Récupère un simulateur par slug et incrémente son compteur d'utilisations.
 * À appeler dans le useEffect de chaque page simulateur.
 */
export function useSimulateurMeta(slug: string) {
  const [meta, setMeta] = useState<Simulateur | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('simulateurs')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (!cancelled && data) setMeta(data as Simulateur);
      // Incrément atomique (best-effort, on ignore les erreurs)
      await supabase.rpc('increment_simulateur_usage', { p_slug: slug });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return meta;
}
