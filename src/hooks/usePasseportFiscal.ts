import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Operator =
  | "equals" | "not_equals"
  | "in" | "contains"
  | "less_than" | "greater_than"
  | "less_than_or_equal" | "greater_than_or_equal";

export interface MatchRule {
  field: string;
  operator: Operator;
  value: unknown;
}

export interface MatchingConditions {
  match_all?: MatchRule[];
  match_any?: MatchRule[];
}

export interface PasseportSection {
  key: string;
  title: string;
  content_md: string;
}

export interface Passeport {
  id: string;
  slug: string;
  numero: number;
  nom: string;
  description: string;
  regime_fiscal: string;
  regime_social: string;
  plan_minimum: string;
  passeport_card_md: string;
  contenu_sections: { sections: PasseportSection[] };
  conditions_matching: MatchingConditions;
}

/**
 * Adapte un profil utilisateur (table profiles, colonnes flat) vers un objet
 * indexable par les conditions_matching, en supportant à la fois les noms
 * legacy (statut, metier, ca_annuel, revenus_complementaires…) et les noms
 * réels stockés en base.
 */
export function buildMatchingProfile(profile: Record<string, any> | null | undefined): Record<string, unknown> {
  if (!profile) return {};
  const tranche = profile.tranche_revenus as string | undefined;
  // Approximation numérique de la tranche pour les opérateurs less_than/greater_than
  const trancheToNumber: Record<string, number> = {
    "moins_20k": 15000,
    "20_40k": 30000,
    "40_60k": 50000,
    "60_100k": 80000,
    "80k_150k": 115000,
    "100_150k": 125000,
    "plus_150k": 200000,
  };
  const revenusComp: string[] = [];
  if (profile.a_revenus_lmnp) revenusComp.push("lmnp");
  if (profile.a_revenus_fonciers_nus) revenusComp.push("revenus_fonciers_nus");
  if (profile.a_placements) revenusComp.push("placements");
  if (profile.a_revenus_etrangers) revenusComp.push("revenus_etrangers");
  if (profile.a_activite_secondaire) revenusComp.push("activite_secondaire");
  if (profile.a_investissements_defisc) revenusComp.push("defiscalisants");

  // Normalisation forme_juridique : l'onboarding stocke en minuscules ('sasu', 'eurl',
  // 'sarl_sas', 'portage_salarial'…) alors que les conditions_matching attendent
  // 'SASU', 'EURL', 'SARL', 'SAS', 'portage_salarial'…
  const formeRaw = (profile.forme_juridique as string | null | undefined) ?? '';
  const formeMap: Record<string, string> = {
    sasu: 'SASU',
    eurl: 'EURL',
    sarl: 'SARL',
    sas: 'SAS',
    sarl_sas: 'SARL', // un seul match prioritaire ; "in [SARL, SAS]" matchera
  };
  const formeNormalized = formeMap[formeRaw.toLowerCase()] ?? formeRaw;

  return {
    // Champs natifs (passthrough)
    ...profile,
    forme_juridique: formeNormalized,
    // Alias legacy attendus par les conditions_matching de la spec
    statut: profile.situation_principale,
    metier: profile.metier_precis,
    ca_annuel: tranche ? trancheToNumber[tranche] ?? undefined : undefined,
    revenus_complementaires: revenusComp,
  };
}

export function matchPasseport(
  profile: Record<string, unknown>,
  conditions: MatchingConditions
): boolean {
  if (!conditions) return false;
  const all = conditions.match_all ?? [];
  const any = conditions.match_any ?? [];
  if (all.length === 0 && any.length === 0) return false;
  const allOk = all.length === 0 || all.every((rule) => evaluateRule(profile, rule));
  const anyOk = any.length === 0 || any.some((rule) => evaluateRule(profile, rule));
  return allOk && anyOk;
}

function evaluateRule(profile: Record<string, unknown>, rule: MatchRule): boolean {
  const v = profile[rule.field];
  switch (rule.operator) {
    case "equals":
      return v === rule.value;
    case "not_equals":
      return v !== rule.value;
    case "in":
      return Array.isArray(rule.value) && (rule.value as unknown[]).includes(v as unknown);
    case "contains":
      return Array.isArray(v) && (v as unknown[]).includes(rule.value);
    case "less_than":
      return v != null && Number(v) < Number(rule.value);
    case "greater_than":
      return v != null && Number(v) > Number(rule.value);
    case "less_than_or_equal":
      return v != null && Number(v) <= Number(rule.value);
    case "greater_than_or_equal":
      return v != null && Number(v) >= Number(rule.value);
    default:
      return false;
  }
}

export function usePasseportFiscal(
  userPlan: string | undefined,
  profile: Record<string, any> | undefined | null
) {
  const [passeport, setPasseport] = useState<Passeport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const profileKey = profile ? JSON.stringify(profile) : "";

  useEffect(() => {
    let cancelled = false;
    if (userPlan !== "premium" || !profile) {
      setPasseport(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("passeports_fiscaux")
        .select("*")
        .eq("is_active", true)
        .order("ordre", { ascending: true });

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setPasseport(null);
        setLoading(false);
        return;
      }
      const matchingProfile = buildMatchingProfile(profile);
      const matched = (data as Passeport[]).find((p) =>
        matchPasseport(matchingProfile, p.conditions_matching)
      );
      setPasseport(matched ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userPlan, profileKey]);

  return { passeport, loading, error };
}
