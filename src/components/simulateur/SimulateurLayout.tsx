import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  emoji: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function SimulateurLayout({ emoji, title, subtitle, children }: Props) {
  const location = useLocation();

  // Incrément atomique du compteur d'utilisations dès qu'une page simulateur est ouverte.
  // Le slug est dérivé de l'URL : /simulateur/<slug>. Best-effort, erreurs ignorées.
  // Si ?preview=1 (mode aperçu admin), on n'incrémente PAS le compteur.
  useEffect(() => {
    const isPreview = new URLSearchParams(location.search).get("preview") === "1";
    if (isPreview) return;
    const match = location.pathname.match(/^\/simulateur\/([a-z0-9-]+)/i);
    const slug = match?.[1];
    if (!slug) return;
    supabase.rpc("increment_simulateur_usage", { p_slug: slug });
  }, [location.pathname, location.search]);

  return (
    <div className="space-y-6">
      <Link
        to="/mes-simulateurs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Tous les simulateurs
      </Link>

      <div>
        <h1 className="font-display text-4xl md:text-5xl text-foreground">
          <em className="accent-serif">{title}</em>
        </h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      </div>

      <div className="rounded-lg bg-yellow-vivid/15 border border-yellow-vivid/30 p-4 text-sm text-foreground">
        <span className="font-semibold">Estimation pédagogique.</span>{" "}
        Non opposable à la DGFIP. Pour votre situation personnelle, consultez un
        expert-comptable ou un avocat fiscaliste, ou rendez-vous sur{" "}
        <a
          href="https://www.impots.gouv.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium text-primary"
        >
          impots.gouv.fr
        </a>.
      </div>

      {children}
    </div>
  );
}
