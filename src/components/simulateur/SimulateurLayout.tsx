import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface Props {
  emoji: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function SimulateurLayout({ emoji, title, subtitle, children }: Props) {
  return (
    <div className="space-y-6">
      <Link
        to="/mes-simulateurs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Tous les simulateurs
      </Link>

      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {emoji} {title}
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
