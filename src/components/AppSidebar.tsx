import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { SuggestionDialog } from '@/components/SuggestionDialog';

const baseNavItems = [
  { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { to: '/mes-modules', label: 'Mes formations', icon: BookOpen },
  { to: '/fiches-personnalisees', label: 'Mon parcours déclaration', icon: FileText },
  
  { to: '/mes-simulateurs', label: 'Mes simulateurs', icon: Calculator },
  { to: '/recommandations', label: 'Recommandations', icon: Heart },
  { to: '/profil', label: 'Mon profil', icon: User },
];

const passeportItem = { to: '/passeport-fiscal', label: 'Passeport fiscal', icon: BookMarked };

export function AppSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<{ prenom: string | null; nom: string | null; plan: string } | null>(null);
  const [suggestionOpen, setSuggestionOpen] = useState(false);

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
      <aside className="fixed left-0 top-0 z-40 h-screen w-[20px] bg-background border-r border-border" />
    );
  }

  const isActive = (to: string) => {
    if (to.includes('#')) {
      return location.pathname + location.hash === to;
    }
    return location.pathname === to;
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-sidebar flex-col bg-background border-r border-border text-foreground">
      {/* Logo */}
      <Link
        to="/"
        className="flex h-20 items-center gap-2.5 px-6 cursor-pointer transition-opacity hover:opacity-80"
        aria-label="Retour à l'accueil"
      >
        <img src={logo} alt="Impôts Facile" className="h-9 w-9" />
        <h1 className="font-display text-2xl text-foreground leading-none">Impôts Facile</h1>
      </Link>

      {/* User info */}
      {profile && (
        <div className="mx-4 mb-6 rounded-2xl bg-rose-light/40 p-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-light text-rose-dynamic font-display text-base">
            {(profile.prenom?.[0] ?? '').toUpperCase()}{(profile.nom?.[0] ?? '').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">
              {profile.prenom ?? ''} {profile.nom ?? ''}
            </p>
            <Badge className="mt-0.5 bg-background border border-border text-foreground hover:bg-background text-xs capitalize font-normal">
              {profile.plan === 'nouveau' ? 'Gratuit' : profile.plan}
            </Badge>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {(profile?.plan === 'premium'
          ? [...baseNavItems.slice(0, 4), passeportItem, ...baseNavItems.slice(4)]
          : baseNavItems
        ).map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
                active
                  ? 'bg-rose-light/60 text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  active ? 'bg-background text-rose-dynamic' : 'text-muted-foreground group-hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3 space-y-1">
        <button
          onClick={() => setSuggestionOpen(true)}
          className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
            <Lightbulb className="h-4 w-4" />
          </span>
          <span>Suggestion</span>
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-rose-dynamic hover:bg-rose-light/40 transition-all"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
            <LogOut className="h-4 w-4" />
          </span>
          <span>Se déconnecter</span>
        </button>
        <p className="px-3 pt-1 text-xs text-muted-foreground/60">v1.0</p>
      </div>
      <SuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
    </aside>
  );
}
