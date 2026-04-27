import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Calculator, Briefcase, Home, BedDouble, Building2, ArrowRight } from "lucide-react";

const simulateurs = [
  {
    to: "/simulateur",
    emoji: "🧮",
    icon: Calculator,
    title: "Impôt sur le revenu",
    description: "Estimation complète : barème, parts, abattements, réductions et crédits.",
    badge: "Simulateur complet",
    color: "from-violet-500 to-purple-600",
  },
  {
    to: "/simulateur/pas",
    emoji: "💼",
    icon: Briefcase,
    title: "Prélèvement à la source",
    description: "Calculez votre taux PAS (neutre, personnalisé, individualisé).",
    badge: "Nouveau",
    color: "from-blue-500 to-cyan-600",
  },
  {
    to: "/simulateur/plus-value-immo",
    emoji: "🏠",
    icon: Home,
    title: "Plus-value immobilière",
    description: "Cession d'un bien : abattements selon la durée de détention.",
    badge: "Nouveau",
    color: "from-emerald-500 to-teal-600",
  },
  {
    to: "/simulateur/lmnp",
    emoji: "🛏️",
    icon: BedDouble,
    title: "LMNP micro-BIC",
    description: "Impôt sur vos revenus de location meublée non professionnelle.",
    badge: "Nouveau",
    color: "from-amber-500 to-orange-600",
  },
  {
    to: "/simulateur/pinel",
    emoji: "🏗️",
    icon: Building2,
    title: "Pinel / Pinel+",
    description: "Réduction d'impôt liée à un investissement Pinel (engagement avant 2025).",
    badge: "Nouveau",
    color: "from-rose-500 to-pink-600",
  },
];

const MesSimulateurs = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">🧮 Mes simulateurs</h1>
        <p className="mt-2 text-muted-foreground">
          Tous les outils pour estimer vos impôts en quelques minutes — pédagogique et gratuit.
        </p>
      </div>

      <div className="rounded-lg bg-yellow-vivid/15 border border-yellow-vivid/30 p-4 text-sm text-foreground">
        <span className="font-semibold">⚠️ Estimations pédagogiques.</span>{" "}
        Non opposables à la DGFIP. Pour votre situation personnelle, consultez un professionnel agréé.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {simulateurs.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.to} to={s.to} className="group">
              <Card className="h-full p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 hover:border-primary/50">
                <div className="flex gap-4">
                  <div className={`shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl shadow-md`}>
                    {s.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        {s.title}
                      </h3>
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

      <Card className="p-5 bg-secondary/40 border-dashed">
        <h3 className="font-heading text-base font-bold text-foreground">📅 Bientôt disponibles</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Frais réels, donations & succession, IFI, comparateur micro-BIC vs réel… Restez connecté !
        </p>
      </Card>
    </div>
  );
};

export default MesSimulateurs;
