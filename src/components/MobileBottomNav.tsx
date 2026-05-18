import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calculator, FileText, User, Briefcase, Calendar } from 'lucide-react';
import { useOrgRole } from '@/hooks/useOrgRole';
import { useAccess, type Plan } from '@/hooks/useAccess';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  requiredPlans?: Plan[];
}

const items: NavItem[] = [
  { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { to: '/mes-modules', label: 'Formations', icon: BookOpen },
  { to: '/fiches-personnalisees', label: 'Parcours', icon: FileText },
  { to: '/mes-simulateurs', label: 'Simulateurs', icon: Calculator },
  { to: '/accompagnement', label: 'RDV', icon: Calendar, requiredPlans: ['starter', 'expert', 'premium'] },
  { to: '/profil', label: 'Profil', icon: User },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOrgAdmin } = useOrgRole();
  const { plan } = useAccess();

  const isActive = (to: string) => {
    if (to.includes('#')) return location.pathname + location.hash === to;
    return location.pathname === to && !location.hash;
  };

  const visibleItems = items.filter(
    (item) => !item.requiredPlans || item.requiredPlans.includes(plan),
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background lg:hidden">
      {visibleItems.map((item) => {
        const active = isActive(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 text-[11px] transition-colors ${
              active ? 'text-primary font-semibold' : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="max-w-full truncate">{item.label}</span>
          </NavLink>
        );
      })}
      {isOrgAdmin && (
        <button
          type="button"
          onClick={() => navigate('/impots-team/dashboard')}
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 text-[11px] transition-colors ${
            location.pathname.startsWith('/impots-team') ? 'text-primary font-semibold' : 'text-muted-foreground'
          }`}
        >
          <Briefcase className="h-5 w-5 shrink-0" />
          <span className="max-w-full truncate">Équipe</span>
        </button>
      )}
    </nav>
  );
}
