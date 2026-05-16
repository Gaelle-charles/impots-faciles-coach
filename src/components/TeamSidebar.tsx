import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import logo from '@/assets/logo.png';
import {
  Home,
  Building2,
  CreditCard,
  Users,
  Palette,
  BookOpen,
  Calculator,
  BarChart3,
  Heart,
  Eye,
  ArrowLeft,
  Lightbulb,
  LogOut,
} from 'lucide-react';
import { SuggestionDialog } from '@/components/SuggestionDialog';
import { SpaceSwitcher } from '@/components/SpaceSwitcher';

interface TeamSidebarProps {
  orgName: string;
  orgLogoUrl: string | null;
  adminInitials: string;
  hasLicense: boolean;
  /** L'admin a-t-il un plan B2C actif (Starter/Expert/Premium) ? */
  hasB2CPlan?: boolean;
  /** Active tab du dashboard de gestion (abonnement / membres / branding). */
  activeTeamTab?: 'abonnement' | 'membres' | 'branding';
  onTeamTabChange?: (tab: 'abonnement' | 'membres' | 'branding') => void;
  /** Rendu dans un drawer (Sheet) plutôt qu'en sidebar fixe. */
  embedded?: boolean;
  /** Callback appelé quand l'utilisateur clique un lien (utile pour fermer le drawer). */
  onNavigate?: () => void;
}

export function TeamSidebar({
  orgName,
  orgLogoUrl,
  adminInitials,
  hasLicense,
  hasB2CPlan = false,
  activeTeamTab,
  onTeamTabChange,
  embedded = false,
  onNavigate,
}: TeamSidebarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isOnDashboard = location.pathname === '/impots-team/dashboard';
  const [b2cPlan, setB2cPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) { setB2cPlan(null); return; }
    let cancelled = false;
    supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setB2cPlan(data?.plan ?? null); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const hasB2CPlanResolved = hasB2CPlan || (!!b2cPlan && b2cPlan !== 'nouveau');
  const showSwitcher = hasLicense || hasB2CPlanResolved;
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  const teamTabs: Array<{ key: 'abonnement' | 'membres' | 'branding'; label: string; icon: typeof CreditCard }> = [
    { key: 'abonnement', label: 'Mon abonnement', icon: CreditCard },
    { key: 'membres', label: 'Mes collaborateurs', icon: Users },
    { key: 'branding', label: 'Personnalisation', icon: Palette },
  ];

  const learnerItems = [
    { to: '/mes-modules', label: 'Mes modules', icon: BookOpen },
    { to: '/mes-simulateurs', label: 'Mes simulateurs', icon: Calculator },
    { to: '/dashboard', label: 'Mes progressions', icon: BarChart3 },
    { to: '/recommandations', label: 'Recommandations', icon: Heart },
  ];

  const asideClass = embedded
    ? 'flex h-full w-full flex-col bg-primary text-primary-foreground'
    : 'fixed left-0 top-0 z-40 flex h-screen w-sidebar flex-col bg-primary text-primary-foreground';

  return (
    <aside className={asideClass}>
      {/* Logo + nom orga */}
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-2 px-6 pt-5 pb-3 cursor-pointer transition-opacity hover:opacity-80"
        aria-label="Retour à l'accueil"
      >
        <img src={logo} alt="Impôts Facile" className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide opacity-60">Impôts Team</p>
          <h1 className="font-heading text-sm font-bold truncate">{orgName}</h1>
        </div>
      </Link>

      {/* Avatar admin */}
      <div className="mx-4 mb-4 rounded-lg bg-sidebar-muted p-3 flex items-center gap-3">
        {orgLogoUrl ? (
          <img src={orgLogoUrl} alt={orgName} className="h-9 w-9 shrink-0 rounded object-contain bg-background" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-heading font-bold text-sm">
            {adminInitials || <Building2 className="h-4 w-4" />}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">Administrateur</p>
          <Badge className="mt-0.5 bg-sidebar-primary text-sidebar-primary-foreground text-xs">
            {hasLicense ? 'Licence active' : 'Aperçu'}
          </Badge>
        </div>
      </div>

      {/* Switcher Espace équipe / Mon espace perso (si licence ou plan B2C) */}
      {showSwitcher && <SpaceSwitcher />}

      <nav className="flex-1 space-y-5 px-3 overflow-y-auto pb-4">
        {/* Accueil */}
        <div>
          <NavLink to="/" onClick={onNavigate}>
            <Button
              variant="sidebar-item"
              className="gap-3 px-3 py-2.5 text-sm w-full justify-start opacity-80 hover:opacity-100"
            >
              <Home className="h-5 w-5" />
              <span>Accueil</span>
            </Button>
          </NavLink>
        </div>

        {/* Section : Gestion équipe */}
        <div>
          <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-50">
            Gestion équipe
          </p>
          {teamTabs.map((t) => {
            const Icon = t.icon;
            const active = isOnDashboard && activeTeamTab === t.key;
            const content = (
              <Button
                variant="sidebar-item"
                className={`gap-3 px-3 py-2.5 text-sm w-full justify-start ${
                  active ? 'bg-sidebar-muted font-semibold' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{t.label}</span>
                {active && <span className="ml-auto h-2 w-2 rounded-full bg-accent" />}
              </Button>
            );
            // Si on est déjà sur le dashboard → simple changement de tab interne
            if (isOnDashboard && onTeamTabChange) {
              return (
                <button key={t.key} type="button" onClick={() => { onTeamTabChange(t.key); onNavigate?.(); }} className="block w-full text-left">
                  {content}
                </button>
              );
            }
            // Sinon (sur /dashboard, /simulateur etc) → on revient au dashboard sur le bon tab
            return (
              <Link key={t.key} to={`/impots-team/dashboard?tab=${t.key}`} onClick={onNavigate}>
                {content}
              </Link>
            );
          })}
        </div>

        {/* Section : Mon parcours (si licence active) */}
        {hasLicense && (
          <div>
            <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-50">
              Mon parcours
            </p>
            {learnerItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <NavLink key={item.to} to={item.to}>
                  <Button
                    variant="sidebar-item"
                    className={`gap-3 px-3 py-2.5 text-sm w-full justify-start ${
                      active ? 'bg-sidebar-muted font-semibold' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {active && <span className="ml-auto h-2 w-2 rounded-full bg-accent" />}
                  </Button>
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Link to="/">
          <Button
            variant="sidebar-item"
            className="gap-3 px-3 py-2.5 text-sm w-full justify-start opacity-80 hover:opacity-100"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Retour vers Impôts Facile</span>
          </Button>
        </Link>
        <Button
          variant="sidebar-item"
          onClick={() => setSuggestionOpen(true)}
          className="gap-3 px-3 py-2.5 text-sm w-full justify-start opacity-80 hover:opacity-100"
        >
          <Lightbulb className="h-5 w-5" />
          <span>Suggestion</span>
        </Button>
        <Button
          variant="sidebar-item"
          onClick={signOut}
          className="gap-3 px-3 py-2.5 text-sm w-full justify-start text-rose-dynamic hover:text-rose-dynamic"
        >
          <LogOut className="h-5 w-5" />
          <span>Se déconnecter</span>
        </Button>
        <p className="px-3 text-xs opacity-40">v1.0</p>
      </div>
      <SuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
    </aside>
  );
}
