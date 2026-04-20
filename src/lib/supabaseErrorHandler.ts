import { useState, useCallback } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

/**
 * Transforme une erreur Supabase / Postgrest en toast utilisateur.
 * Retourne true si l'erreur a été gérée (toujours true ici, helper de commodité).
 */
export function handleSupabaseError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;

  const code = error.code ?? '';
  const message = error.message ?? '';

  // 1. Privilèges insuffisants (RLS / triggers raise 42501)
  if (code === '42501') {
    toast({
      title: 'Action non autorisée',
      description: "Cette action n'est pas autorisée avec votre plan actuel",
      variant: 'destructive',
    });
    return true;
  }

  // 2. Foreign key violation
  if (code === '23503') {
    toast({
      title: 'Données invalides',
      description: 'Données manquantes ou invalides',
      variant: 'destructive',
    });
    return true;
  }

  // 3. Message RLS générique
  if (message.toLowerCase().includes('row-level security')) {
    toast({
      title: 'Accès refusé',
      description: "Vous n'avez pas accès à cette ressource",
      variant: 'destructive',
    });
    return true;
  }

  // 4. Messages de nos triggers en français ("Modification du role interdite", etc.)
  if (message.includes('Modification du') || message.includes('Modification de')) {
    toast({
      title: 'Action non autorisée',
      description: message,
      variant: 'destructive',
    });
    return true;
  }

  // 5. Fallback générique
  console.error('[Supabase error]', error);
  toast({
    title: 'Erreur',
    description: 'Une erreur est survenue, veuillez réessayer',
    variant: 'destructive',
  });
  return true;
}

interface MutationResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Hook qui wrappe une mutation Supabase, gère le loading, et transforme
 * les erreurs en toasts utilisateurs via handleSupabaseError.
 *
 * Exemple :
 *   const { mutate, loading } = useSupabaseMutation(async (id: string) =>
 *     supabase.from('progressions').update({ step: 1 }).eq('id', id).select().single()
 *   );
 *   await mutate('abc-123');
 */
export function useSupabaseMutation<TArgs extends unknown[], TData>(
  mutationFn: (...args: TArgs) => Promise<MutationResult<TData>>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(
    async (...args: TArgs): Promise<TData | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await mutationFn(...args);
        if (result.error) {
          setError(result.error);
          handleSupabaseError(result.error);
          return null;
        }
        setData(result.data);
        return result.data;
      } catch (err) {
        const pgErr = err as PostgrestError;
        setError(pgErr);
        handleSupabaseError(pgErr);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [mutationFn],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, loading, error, data, reset };
}
