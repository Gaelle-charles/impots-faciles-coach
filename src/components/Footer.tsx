import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';

const navLinks = [
  { label: 'Modules', to: '/modules' },
  { label: 'Tarifs', to: '/tarifs' },
  { label: 'Comment ça marche', to: '/comment-ca-marche' },
  { label: 'Impôts Team', to: '/impots-team' },
];

const legalLinks = [
  { label: 'CGV', to: '/cgv' },
  { label: 'CGU', to: '/cgu' },
  { label: 'Politique de confidentialité', to: '/politique-confidentialite' },
  { label: 'Mentions légales', to: '/mentions-legales' },
  { label: 'Disclaimer fiscal', to: '/disclaimer-fiscal' },
  { label: 'Renonciation rétractation', to: '/renonciation-retractation' },
  { label: 'Politique de remboursement', to: '/politique-remboursement' },
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
              <span className="font-display text-2xl">Impôts Facile</span>
            </Link>
            <p className="mt-3 text-sm text-primary-foreground/70 leading-relaxed">
              Plateforme pédagogique pour comprendre votre fiscalité personnelle.
              <br />
              Édité par ANNUL IMPOTS.
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
            Impôts Facile est une plateforme de formation et d'information pédagogique sur les
            impôts des particuliers en France. Les contenus proposés ont une valeur informative
            et éducative. Ils ne constituent en aucun cas un conseil fiscal, juridique ou
            patrimonial personnalisé au sens des professions réglementées (avocats,
            experts-comptables, notaires). Pour toute situation nécessitant un avis professionnel,
            nous vous invitons à consulter un avocat fiscaliste ou un expert-comptable.
          </p>
          <p className="mx-auto max-w-3xl leading-relaxed font-medium text-primary-foreground/75">
            Plateforme dédiée aux particuliers — ne traite pas les obligations fiscales des
            structures professionnelles (SAS, SARL, SCI, IS, BIC professionnel, etc.).
          </p>
          <p className="mx-auto max-w-3xl leading-relaxed text-primary-foreground/70 italic">
            Estimation pédagogique — Non opposable à la DGFIP. Pour votre situation personnelle,
            consultez un expert-comptable ou un avocat fiscaliste.
          </p>
          <p className="mx-auto max-w-3xl leading-relaxed text-primary-foreground/60">
            Médiateur de la consommation :{' '}
            <a
              href="https://sasmediationsolution-conso.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary-foreground"
            >
              SAS Médiation Solution
            </a>{' '}
            — agréée CECMC.
          </p>
          <p>© {new Date().getFullYear()} Impôts Facile — Édité par ANNUL IMPOTS — Tous droits réservés</p>
          <p>
            Site réalisé avec ❤︎ par{' '}
            <a
              href="https://gaellecode.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary-foreground"
            >
              Gaelle code
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
