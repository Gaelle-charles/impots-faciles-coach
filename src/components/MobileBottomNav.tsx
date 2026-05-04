import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calculator, FileText, User } from 'lucide-react';

const items = [
  { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { to: '/mes-modules', label: 'Mon parcours', icon: BookOpen },
  { to: '/fiches-personnalisees', label: 'Fiches', icon: FileText },
  { to: '/mes-simulateurs', label: 'Simulateurs', icon: Calculator },
  { to: '/profil', label: 'Profil', icon: User },
];

export function MobileBottomNav() {
  const location = useLocation();

  const isActive = (to: string) => {
    if (to.includes('#')) return location.pathname + location.hash === to;
    return location.pathname === to && !location.hash;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background lg:hidden">
      {items.map((item) => {
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
    </nav>
  );
}
