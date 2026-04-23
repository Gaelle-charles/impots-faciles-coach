import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import logo from '@/assets/logo.png';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Calculator,
  User,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mes-modules', label: 'Mes modules', icon: BookOpen },
  { to: '/dashboard#resultats', label: 'Mes résultats', icon: BarChart3 },
  { to: '/simulateur', label: 'Simulateur', icon: Calculator },
  { to: '/profil', label: 'Mon profil', icon: User },
];

export function AppSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<{ prenom: string | null; nom: string | null; plan: string } | null>(null);

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
      <div className="flex h-16 items-center gap-2 px-6">
        <img src={logo} alt="Impôts Facile" className="h-8 w-8" />
        <h1 className="font-heading text-xl font-bold">Impôts Facile</h1>
      </div>

      {/* User info */}
      {profile && (
        <div className="mx-4 mb-4 rounded-lg bg-sidebar-muted p-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-heading font-bold text-sm">
            {(profile.prenom?.[0] ?? '').toUpperCase()}{(profile.nom?.[0] ?? '').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {profile.prenom ?? ''} {profile.nom ?? ''}
            </p>
            <Badge className="mt-0.5 bg-sidebar-primary text-sidebar-primary-foreground text-xs capitalize">
              {profile.plan === 'nouveau' ? 'Gratuit' : profile.plan}
            </Badge>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink key={item.to} to={item.to}>
              <Button
                variant="sidebar-item"
                className={`gap-3 px-3 py-2.5 text-sm ${
                  active ? 'bg-sidebar-muted font-semibold' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-accent" />
                )}
              </Button>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <Button
          variant="sidebar-item"
          onClick={signOut}
          className="gap-3 px-3 py-2.5 text-sm text-rose-dynamic hover:text-rose-dynamic"
        >
          <LogOut className="h-5 w-5" />
          <span>Se déconnecter</span>
        </Button>
        <p className="px-3 text-xs opacity-40">v1.0</p>
      </div>
    </aside>
  );
}
