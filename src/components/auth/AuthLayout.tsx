import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, ShieldCheck, GraduationCap } from 'lucide-react';
import logo from '@/assets/logo.png';
import authHero from '@/assets/auth-hero.jpg';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Form side */}
      <div className="relative flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:min-h-0 lg:py-12">
        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <img src={logo} alt="Impôts Facile" className="h-9 w-9" />
            <span className="font-heading text-base font-bold text-foreground">
              Impôts Facile
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
        </div>

        {/* Form card */}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground lg:text-left">
          © {new Date().getFullYear()} Impôts Facile · Plateforme éducative
        </p>
      </div>

      {/* Visual side */}
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <img
          src={authHero}
          alt="Une professionnelle en train de préparer sa déclaration d'impôts"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          width={1024}
          height={1280}
        />
        {/* Brand gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/30 to-transparent" />

        {/* Floating decorative blobs */}
        <div className="absolute -right-20 top-20 h-64 w-64 rounded-full bg-yellow-vivid/20 blur-3xl" />
        <div className="absolute -left-10 bottom-32 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />

        {/* Content overlay */}
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-yellow-vivid" />
            Comprendre ses impôts, enfin simple
          </div>

          <div className="space-y-8">
            <blockquote className="space-y-4">
              <p className="font-heading text-3xl font-bold leading-tight xl:text-4xl">
                « Reprenez le pouvoir sur votre{' '}
                <span className="bg-gradient-to-r from-yellow-vivid to-yellow-vivid/70 bg-clip-text text-transparent">
                  déclaration d'impôts
                </span>
                . »
              </p>
              <p className="text-base text-primary-foreground/80">
                Des modules clairs, des simulateurs précis, et un parcours pensé
                pour les indépendants, salariés et dirigeants.
              </p>
            </blockquote>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Feature
                icon={<GraduationCap className="h-5 w-5" />}
                label="8 modules"
                value="pédagogiques"
              />
              <Feature
                icon={<Sparkles className="h-5 w-5" />}
                label="Simulateurs"
                value="2025"
              />
              <Feature
                icon={<ShieldCheck className="h-5 w-5" />}
                label="100%"
                value="sécurisé"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-4 backdrop-blur-md">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-vivid/20 text-yellow-vivid">
        {icon}
      </div>
      <p className="font-heading text-lg font-bold leading-tight">{label}</p>
      <p className="text-xs text-primary-foreground/70">{value}</p>
    </div>
  );
}
