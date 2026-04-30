import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Home,
  BarChart3,
  TrendingUp,
  Library,
  FileQuestion,
  FolderOpen,
  Users,
  CreditCard,
  Mail,
  Settings,
  LogOut,
  ArrowLeft,
  Briefcase,
  UserSquare2,
  Globe2,
  Heart,
  MessageSquareWarning,
  Calculator,
} from 'lucide-react';
import { useUnreadSuggestions } from '@/hooks/useUnreadSuggestions';

const navGroups = [
  {
    label: 'Navigation',
    items: [
      { to: '/', label: 'Accueil', icon: Home },
    ],
  },
  {
    label: 'Tableau de bord',
    items: [
      { to: '/admin', label: 'Vue d\'ensemble', icon: BarChart3 },
      { to: '/admin/stats', label: 'Statistiques', icon: TrendingUp },
    ],
  },
  {
    label: 'Contenu',
    items: [
      { to: '/admin/modules', label: 'Modules', icon: Library },
      { to: '/admin/quiz', label: 'Quiz', icon: FileQuestion },
      { to: '/admin/contenus', label: 'Contenus', icon: FolderOpen },
    ],
  },
  {
    label: 'Fiches éditoriales',
    items: [
      { to: '/admin/metiers', label: 'Fiches métiers', icon: Briefcase },
      { to: '/admin/fiches-profils', label: 'Fiches profils', icon: UserSquare2 },
      { to: '/admin/pays', label: 'Fiches pays', icon: Globe2 },
      { to: '/admin/recommandations', label: 'Recommandations', icon: Heart },
    ],
  },
  {
    label: 'Outils',
    items: [
      { to: '/admin/simulateurs', label: 'Simulateurs', icon: Calculator },
    ],
  },
  {
    label: 'Utilisateurs',
    items: [
      { to: '/admin/users', label: 'Tous les utilisateurs', icon: Users },
      { to: '/admin/subscriptions', label: 'Abonnements', icon: CreditCard },
      { to: '/admin/emails', label: 'Emails envoyés', icon: Mail },
    ],
  },
  {
    label: 'Retours utilisateurs',
    items: [
      { to: '/admin/suggestions', label: 'Suggestions', icon: MessageSquareWarning, badgeKey: 'suggestions' as const },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { to: '/admin/settings', label: 'Paramètres', icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ prenom: string | null; nom: string | null } | null>(null);
  const unreadSuggestions = useUnreadSuggestions();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('prenom, nom')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const isActive = (to: string) => location.pathname === to;

  const initials = profile
    ? `${(profile.prenom ?? '')[0] ?? ''}${(profile.nom ?? '')[0] ?? ''}`.toUpperCase()
    : 'A';

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col"
      style={{ backgroundColor: 'hsl(222 47% 11%)' }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <Link
          to="/"
          className="block cursor-pointer transition-opacity hover:opacity-80"
          aria-label="Retour à l'accueil"
        >
          <h1 className="font-heading text-lg font-bold text-white">Impôts Facile</h1>
        </Link>
        <div className="mt-3 rounded-md py-1.5 px-3 text-center"
          style={{ backgroundColor: 'hsl(0 67% 35%)' }}>
          <span className="text-[11px] font-bold tracking-widest text-white uppercase">
            Espace Administrateur
          </span>
        </div>
      </div>

      <div className="mx-5 border-t" style={{ borderColor: 'hsl(222 30% 22%)' }} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: 'hsl(222 15% 55%)' }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.to);
                const showBadge =
                  (item as { badgeKey?: string }).badgeKey === 'suggestions' && unreadSuggestions > 0;
                return (
                  <NavLink key={item.to} to={item.to}>
                    <div
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer ${
                        active ? 'font-semibold' : 'hover:opacity-100 opacity-70'
                      }`}
                      style={{
                        color: 'white',
                        backgroundColor: active ? 'hsl(0 67% 35%)' : 'transparent',
                      }}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                          {unreadSuggestions > 99 ? '99+' : unreadSuggestions}
                        </span>
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 pb-4 pt-2 space-y-3" style={{ borderTop: '1px solid hsl(222 30% 22%)' }}>
        {/* Admin profile */}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">
              {profile?.prenom ?? ''} {profile?.nom ?? ''}
            </p>
            <Badge className="mt-0.5 text-[10px] border-0" style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}>
              Admin
            </Badge>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à l'app
        </Button>

        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors rounded-md hover:opacity-100 opacity-70"
          style={{ color: 'hsl(0 70% 65%)' }}
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>

        <p className="px-2 text-[10px] opacity-30 text-white">v1.0</p>
      </div>
    </aside>
  );
}
