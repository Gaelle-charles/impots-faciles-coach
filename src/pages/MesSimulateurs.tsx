import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Calculator, Users, Briefcase, Gift, ArrowRight, Clock, Sparkles } from "lucide-react";
import { useSimulateurs } from "@/hooks/useSimulateurs";

// Habillage visuel (emoji / couleur / badge) par slug — la BDD ne porte que les
// métadonnées textuelles. Tout simulateur dont le slug n'est pas mappé reçoit
// un visuel par défaut.
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

const MesSimulateurs = () => {
  const { data, loading } = useSimulateurs({ includeInactive: true });

  const actifs = data.filter((s) => s.is_active);
  const aVenir = data.filter((s) => !s.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">🧮 Mes simulateurs</h1>
        <p className="mt-2 text-muted-foreground">
          Tous les outils pour estimer vos impôts 2026 (sur revenus 2025) — pédagogique, gratuit, conforme PLF 2026.
        </p>
      </div>

      <div className="rounded-lg bg-yellow-vivid/15 border border-yellow-vivid/30 p-4 text-sm text-foreground">
        <span className="font-semibold">⚠️ Estimations pédagogiques.</span>{" "}
        Non opposables à la DGFIP. Pour votre déclaration officielle, rendez-vous sur impots.gouv.fr.
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {actifs.map((s) => {
              const v = VISUALS[s.slug] ?? DEFAULT_VISUAL;
              return (
                <Link key={s.id} to={`/simulateur/${s.slug}`} className="group">
                  <Card className="h-full p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 hover:border-primary/50">
                    <div className="flex gap-4">
                      <div className={`shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br ${v.color} flex items-center justify-center text-2xl shadow-md`}>
                        {v.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                            {s.nom}
                          </h3>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                            {v.badge}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                        <div className="flex items-center gap-1 mt-3 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Lancer <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {aVenir.length > 0 && (
            <Card className="p-5 bg-secondary/40 border-dashed">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-heading text-base font-bold text-foreground">📅 Bientôt disponibles</h3>
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
