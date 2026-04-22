import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';

const navLinks = [
  { label: 'Modules', to: '/modules' },
  { label: 'Tarifs', to: '/tarifs' },
  { label: 'Comment ça marche', to: '/comment-ca-marche' },
];

const legalLinks = [
  { label: 'Mentions légales', to: '/mentions-legales' },
  { label: 'Politique de confidentialité', to: '/confidentialite' },
  { label: 'CGU', to: '/cgu' },
  { label: 'CGV', to: '/cgv' },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Impôts Facile" className="h-9 w-9" />
              <span className="font-heading text-lg font-bold">Impôts Facile</span>
            </Link>
            <p className="mt-3 text-sm text-primary-foreground/70">
              L'outil parfait pour réduire ses impôts
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground/50">
              Navigation
            </h4>
            <ul className="mt-3 space-y-2">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground/50">
              Légal
            </h4>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-sidebar-border pt-6 text-center text-xs text-primary-foreground/60 space-y-3">
          <p className="mx-auto max-w-3xl leading-relaxed">
            Impôts Facile est une plateforme de formation et d'information pédagogique sur les impôts.
            Nos contenus, simulateurs et recommandations ont une vocation éducative et ne constituent
            ni un conseil fiscal personnalisé, ni une prestation réglementée. Pour toute décision
            engageante, consultez un professionnel agréé (avocat fiscaliste, expert-comptable).
          </p>
          <p>© {new Date().getFullYear()} Impôts Facile — Tous droits réservés</p>
        </div>
      </div>
    </footer>
  );
}
