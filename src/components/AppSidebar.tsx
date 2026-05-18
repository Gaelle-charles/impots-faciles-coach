import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgRole } from '@/hooks/useOrgRole';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpaceSwitcher } from '@/components/SpaceSwitcher';
import logo from '@/assets/logo.png';
import {
  Home,
  LayoutDashboard,
  BookOpen,
  
  Calculator,
  Heart,
  User,
  Lightbulb,
  LogOut,
  BookMarked,
  FileText,
  Calendar,
  CalendarDays,
} from 'lucide-react';
import { SuggestionDialog } from '@/components/SuggestionDialog';
import type { Plan } from '@/hooks/useAccess';

interface SidebarNavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  requiredPlans?: Plan[];
}

const baseNavItems: SidebarNavItem[] = [
  { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { to: '/mes-modules', label: 'Mes formations', icon: BookOpen },
  { to: '/fiches-personnalisees', label: 'Mon parcours déclaration', icon: FileText },
  
  { to: '/mes-simulateurs', label: 'Mes simulateurs', icon: Calculator },
  { to: '/recommandations', label: 'Recommandations', icon: Heart },
  { to: '/profil', label: 'Mon profil', icon: User },
];

const accompagnementItem: SidebarNavItem = {
  to: '/accompagnement',
  label: 'Prendre rendez-vous',
  icon: Calendar,
  requiredPlans: ['starter', 'expert', 'premium'],
};

const mesRdvItem: SidebarNavItem = {
  to: '/mes-rendez-vous',
  label: 'Mes rendez-vous',
  icon: CalendarDays,
  requiredPlans: ['starter', 'expert', 'premium'],
};

const passeportItem = { to: '/passeport-fiscal', label: 'Passeport fiscal', icon: BookMarked };

export function AppSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<{ prenom: string | null; nom: string | null; plan: string } | null>(null);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const { isOrgAdmin, hasLicense } = useOrgRole();
  const hasB2CPlan = !!profile?.plan && profile.plan !== 'nouveau';
  const showSwitcher = isOrgAdmin && (hasLicense || hasB2CPlan);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('prenom, nom, plan')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user, location.pathname]);

  if (collapsed) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-[20px] bg-primary" />
    );
  }

  const isActive = (to: string) => {
    if (to.includes('#')) {
      return location.pathname + location.hash === to;
    }
    return location.pathname === to;
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-sidebar flex-col bg-primary text-primary-foreground">
      {/* Logo */}
      <Link
        to="/"
        className="flex h-20 items-center gap-3 px-6 cursor-pointer transition-opacity hover:opacity-80"
        aria-label="Retour à l'accueil"
      >
        <img src={logo} alt="Impôts Facile" className="h-9 w-9" />
        <h1 className="font-display text-xl tracking-tight">Impôts Facile</h1>
      </Link>

      {/* User info */}
      {profile && (
        <div className="mx-4 mb-6 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-display text-sm">
            {(profile.prenom?.[0] ?? '').toUpperCase()}{(profile.nom?.[0] ?? '').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {profile.prenom ?? ''} {profile.nom ?? ''}
            </p>
            <p className="text-xs capitalize opacity-60">
              {profile.plan === 'nouveau' ? 'Gratuit' : profile.plan}
            </p>
          </div>
        </div>
      )}

      {/* Switcher Espace équipe / Mon espace perso (admin org avec accès B2C) */}
      {showSwitcher && <SpaceSwitcher />}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {(profile?.plan === 'premium'
          ? [...baseNavItems.slice(0, 4), passeportItem, ...baseNavItems.slice(4)]
          : baseNavItems
        ).map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink key={item.to} to={item.to}>
              <Button
                variant="sidebar-item"
                className={`gap-3 rounded-full px-4 py-2.5 text-sm transition-all ${
                  active
                    ? 'bg-white/10 font-medium'
                    : 'opacity-70 hover:bg-white/5 hover:opacity-100'
                }`}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Button>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="space-y-1 p-3 pt-4">
        <Button
          variant="sidebar-item"
          onClick={() => setSuggestionOpen(true)}
          className="gap-3 rounded-full px-4 py-2.5 text-sm opacity-70 hover:bg-white/5 hover:opacity-100"
        >
          <Lightbulb className="h-[18px] w-[18px]" />
          <span>Suggestion</span>
        </Button>
        <Button
          variant="sidebar-item"
          onClick={signOut}
          className="gap-3 rounded-full px-4 py-2.5 text-sm opacity-70 hover:bg-white/5 hover:opacity-100"
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span>Se déconnecter</span>
        </Button>
        <p className="px-4 pt-2 text-[10px] uppercase tracking-wider opacity-30">v1.0</p>
      </div>
      <SuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
    </aside>
  );
}
