import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ArrowRight, Clock, Lock } from "lucide-react";
import { AccentText } from "@/components/ui/accent-text";
import { useSimulateurs } from "@/hooks/useSimulateurs";
import { useAccess, type Plan } from "@/hooks/useAccess";

const VISUALS: Record<string, { emoji: string; color: string; badge: string }> = {
  "ir-bareme":           { emoji: "🧮", color: "from-violet-500 to-purple-600",  badge: "Le plus complet" },
  "quotient-familial":   { emoji: "👪", color: "from-pink-500 to-rose-600",      badge: "Familles" },
  "pas":                 { emoji: "💼", color: "from-blue-500 to-cyan-600",      badge: "Mensuel" },
  "credits-reductions":  { emoji: "🎁", color: "from-emerald-500 to-teal-600",   badge: "Optimisation" },
  "frais-reels":         { emoji: "🧾", color: "from-amber-500 to-orange-600",   badge: "Salariés" },
  "tmi-taux-effectif":   { emoji: "📊", color: "from-sky-500 to-indigo-600",     badge: "Comprendre" },
  "per":                 { emoji: "🏦", color: "from-purple-500 to-fuchsia-600", badge: "Épargne" },
  "micro-vs-reel":       { emoji: "⚖️", color: "from-teal-500 to-emerald-600",   badge: "Indépendants" },
  "revenus-fonciers":    { emoji: "🏠", color: "from-red-500 to-rose-600",       badge: "Bailleurs" },
  "plus-values":         { emoji: "📈", color: "from-cyan-500 to-blue-600",      badge: "Placements" },
  "optimisation-couple": { emoji: "💑", color: "from-pink-500 to-purple-600",    badge: "Couple" },
  "cdhr":                { emoji: "💎", color: "from-yellow-500 to-amber-600",   badge: "Hauts revenus" },
};

const DEFAULT_VISUAL = { emoji: "🧮", color: "from-slate-500 to-slate-700", badge: "Outil" };

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
          <div className="grid gap-4 md:grid-cols-2">
            {actifs.map((s) => {
              const v = VISUALS[s.slug] ?? DEFAULT_VISUAL;
              const requiredRank = PLAN_RANK[s.plan_minimum as Plan] ?? 1;
              const isLocked = !isAdmin && userRank < requiredRank;
              const planLabel = PLAN_LABEL[s.plan_minimum] ?? s.plan_minimum;

              const cardInner = (
                <Card className={`h-full p-5 rounded-3xl transition-all ${isLocked ? "opacity-70 hover:opacity-100" : "hover:shadow-xl hover:-translate-y-1 hover:border-primary/50"}`}>
                  <div className="flex gap-4">
                    <div className={`shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br ${v.color} flex items-center justify-center text-2xl shadow-md relative`}>
                      {v.emoji}
                      {isLocked && (
                        <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                          <Lock className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-heading text-lg font-bold ${isLocked ? "text-muted-foreground" : "text-foreground group-hover:text-primary"} transition-colors`}>
                          {s.nom}
                        </h3>
                        {isLocked ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-vivid/30 text-foreground uppercase tracking-wide">
                            {planLabel} requis
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                            {v.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                      <div className={`flex items-center gap-1 mt-3 text-sm font-medium ${isLocked ? "text-yellow-vivid" : "text-primary opacity-0 group-hover:opacity-100"} transition-opacity`}>
                        {isLocked ? <>Passer en {planLabel} <ArrowRight className="h-4 w-4" /></> : <>Lancer <ArrowRight className="h-4 w-4" /></>}
                      </div>
                    </div>
                  </div>
                </Card>
              );

              return isLocked ? (
                <Link key={s.id} to={`/tarifs?recommended=${s.plan_minimum}`} className="group">
                  {cardInner}
                </Link>
              ) : (
                <Link key={s.id} to={`/simulateur/${s.slug}`} className="group">
                  {cardInner}
                </Link>
              );
            })}
          </div>

          {aVenir.length > 0 && (
            <Card className="p-5 rounded-3xl bg-secondary/40 border-dashed">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-heading text-base font-bold text-foreground">Bientôt disponibles</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                {aVenir.map((s) => <li key={s.id}>{s.nom}</li>)}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default MesSimulateurs;
