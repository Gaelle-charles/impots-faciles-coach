import { Link } from "react-router-dom";
import { ArrowRight, Clock, Lock, Calculator, Users, Briefcase, Gift, Receipt, BarChart3, PiggyBank, Scale, Home, TrendingUp, Heart, Gem } from "lucide-react";
import { AccentText } from "@/components/ui/accent-text";
import { useSimulateurs } from "@/hooks/useSimulateurs";
import { useAccess, type Plan } from "@/hooks/useAccess";
import type { LucideIcon } from "lucide-react";

type Tone = "rose" | "yellow" | "violet" | "neutral";

const VISUALS: Record<string, { icon: LucideIcon; tone: Tone; badge: string }> = {
  "ir-bareme":           { icon: Calculator, tone: "violet",  badge: "Le plus complet" },
  "quotient-familial":   { icon: Users,      tone: "rose",    badge: "Familles" },
  "pas":                 { icon: Briefcase,  tone: "violet",  badge: "Mensuel" },
  "credits-reductions":  { icon: Gift,       tone: "yellow",  badge: "Optimisation" },
  "frais-reels":         { icon: Receipt,    tone: "rose",    badge: "Salariés" },
  "tmi-taux-effectif":   { icon: BarChart3,  tone: "violet",  badge: "Comprendre" },
  "per":                 { icon: PiggyBank,  tone: "yellow",  badge: "Épargne" },
  "micro-vs-reel":       { icon: Scale,      tone: "neutral", badge: "Indépendants" },
  "revenus-fonciers":    { icon: Home,       tone: "rose",    badge: "Bailleurs" },
  "plus-values":         { icon: TrendingUp, tone: "violet",  badge: "Placements" },
  "optimisation-couple": { icon: Heart,      tone: "rose",    badge: "Couple" },
  "cdhr":                { icon: Gem,        tone: "yellow",  badge: "Hauts revenus" },
};

const DEFAULT_VISUAL = { icon: Calculator, tone: "neutral" as Tone, badge: "Outil" };

const TONE_ICON: Record<Tone, string> = {
  rose: "bg-rose-light text-rose-dynamic",
  yellow: "bg-yellow-vivid/25 text-violet-deep",
  violet: "bg-primary/10 text-primary",
  neutral: "bg-muted text-foreground",
};

const PLAN_RANK: Record<Plan, number> = { nouveau: 0, starter: 1, expert: 2, premium: 3 };
const PLAN_LABEL: Record<string, string> = { starter: "Starter", expert: "Expert", premium: "Premium" };

const MesSimulateurs = () => {
  const { data, loading } = useSimulateurs({ includeInactive: true });
  const { plan, hasAdminAccess } = useAccess();
  const isAdmin = hasAdminAccess();

  const actifs = data.filter((s) => s.is_active);
  const aVenir = data.filter((s) => !s.is_active);

  const userRank = PLAN_RANK[plan] ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl md:text-5xl text-foreground leading-tight">
          Mes <AccentText>simulateurs</AccentText>
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Tous les outils pour estimer vos impôts 2026 (sur revenus 2025) — pédagogique, gratuit, conforme PLF 2026.
        </p>
      </div>

      <div className="rounded-2xl bg-yellow-vivid/15 border border-yellow-vivid/30 p-4 text-sm text-foreground">
        <span className="font-semibold">Estimations pédagogiques.</span>{" "}
        Non opposables à la DGFIP. Pour votre déclaration officielle, rendez-vous sur impots.gouv.fr.
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            {actifs.map((s) => {
              const v = VISUALS[s.slug] ?? DEFAULT_VISUAL;
              const Icon = v.icon;
              const requiredRank = PLAN_RANK[s.plan_minimum as Plan] ?? 1;
              const isLocked = !isAdmin && userRank < requiredRank;
              const planLabel = PLAN_LABEL[s.plan_minimum] ?? s.plan_minimum;

              const cardInner = (
                <div
                  className={`group relative h-full rounded-3xl border border-border bg-background p-7 transition-all ${
                    isLocked ? "opacity-80" : "hover:-translate-y-1 hover:shadow-xl"
                  }`}
                >
                  <div className={`relative inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-5 ${TONE_ICON[v.tone]}`}>
                    <Icon className="h-5 w-5" />
                    {isLocked && (
                      <div className="absolute inset-0 rounded-2xl bg-foreground/60 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-background" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-display text-2xl text-foreground leading-tight">
                      {s.nom}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>

                  <div className="mt-5 flex items-center justify-between">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                      isLocked ? "bg-yellow-vivid/30 text-violet-deep" : "bg-rose-light text-rose-dynamic"
                    }`}>
                      {isLocked ? `${planLabel} requis` : v.badge}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${
                      isLocked ? "text-violet-deep" : "text-primary"
                    } group-hover:gap-2 transition-all`}>
                      {isLocked ? <>Débloquer</> : <>Lancer</>}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              );

              return isLocked ? (
                <Link key={s.id} to={`/tarifs?recommended=${s.plan_minimum}`} className="block">
                  {cardInner}
                </Link>
              ) : (
                <Link key={s.id} to={`/simulateur/${s.slug}`} className="block">
                  {cardInner}
                </Link>
              );
            })}
          </div>

          {aVenir.length > 0 && (
            <div className="rounded-3xl border-2 border-dashed border-border bg-background p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-light text-rose-dynamic">
                  <Clock className="h-4 w-4" />
                </div>
                <h3 className="font-display text-xl text-foreground">Bientôt disponibles</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-11 list-disc">
                {aVenir.map((s) => <li key={s.id}>{s.nom}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MesSimulateurs;
