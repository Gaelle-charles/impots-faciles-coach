import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Calculator, Users, Briefcase, Gift, ArrowRight, Clock } from "lucide-react";

const simulateurs = [
  {
    to: "/simulateur/ir-bareme",
    emoji: "🧮",
    icon: Calculator,
    title: "Impôt sur le revenu — Barème 2026",
    description: "Calcul complet pas à pas : barème PLF 2026, parts, plafonnement QF, décote.",
    badge: "Le plus complet",
    color: "from-violet-500 to-purple-600",
  },
  {
    to: "/simulateur/quotient-familial",
    emoji: "👪",
    icon: Users,
    title: "Quotient familial",
    description: "Calculez vos parts fiscales et le gain réel apporté par votre foyer (avec plafonnement).",
    badge: "Familles",
    color: "from-pink-500 to-rose-600",
  },
  {
    to: "/simulateur/pas",
    emoji: "💼",
    icon: Briefcase,
    title: "Prélèvement à la source",
    description: "Taux neutre, personnalisé, individualisé (par défaut couples depuis 09/2025) + acomptes.",
    badge: "Mensuel",
    color: "from-blue-500 to-cyan-600",
  },
  {
    to: "/simulateur/credits-reductions",
    emoji: "🎁",
    icon: Gift,
    title: "Crédits & Réductions d'impôt",
    description: "Emploi à domicile, garde d'enfants, dons, PME, PER, syndicats — 6 dispositifs grand public.",
    badge: "Optimisation",
    color: "from-emerald-500 to-teal-600",
  },
];

const venirBientot = [
  "PER avancé & choix de régime micro vs réel",
  "Plus-values mobilières & immobilières",
  "Revenus fonciers & LMNP",
  "Frais réels (déduction salariale)",
  "Hauts revenus (CDHR) & optimisation couple",
];

const MesSimulateurs = () => {
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

      <div className="grid gap-4 md:grid-cols-2">
        {simulateurs.map((s) => (
          <Link key={s.to} to={s.to} className="group">
            <Card className="h-full p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 hover:border-primary/50">
              <div className="flex gap-4">
                <div className={`shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl shadow-md`}>
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {s.title}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                      {s.badge}
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
        ))}
      </div>

      <Card className="p-5 bg-secondary/40 border-dashed">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-heading text-base font-bold text-foreground">📅 Bientôt disponibles</h3>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
          {venirBientot.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </Card>
    </div>
  );
};

export default MesSimulateurs;
