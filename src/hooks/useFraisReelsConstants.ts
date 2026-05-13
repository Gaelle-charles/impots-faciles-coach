import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FraisReelsConstants } from "@/lib/calculs-frais-reels";

export function useFraisReelsConstants(fiscalYear = 2025) {
  const [constants, setConstants] = useState<FraisReelsConstants | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("simulator_constants")
        .select("constant_key, value")
        .eq("simulator_key", "frais_reels")
        .eq("fiscal_year", fiscalYear);

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const map: FraisReelsConstants = {};
      (data ?? []).forEach((row: { constant_key: string; value: number | string }) => {
        map[row.constant_key] = Number(row.value);
      });
      setConstants(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fiscalYear]);

  return { constants, loading, error };
}
