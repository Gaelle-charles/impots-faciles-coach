import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  BookOpen,
  Calculator,
  Receipt,
  Briefcase,
  LogOut,
  ArrowRight,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/simulateur', label: 'Simulateur', icon: Calculator },
  { to: '/simulateur-de-frais', label: 'Simulateur de frais', icon: Receipt },
];

export function AppSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { signOut } = useAuth();
  const location = useLocation();

  if (collapsed) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-[20px] bg-primary" />
    );
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-sidebar flex-col bg-primary text-primary-foreground">
      {/* Logo */}
      <div className="flex h-20 items-center px-6">
        <h1 className="font-heading text-xl font-bold">Impôts Facile</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink key={item.to} to={item.to}>
              <Button
                variant="sidebar-item"
                className={`gap-3 px-3 py-2.5 text-sm ${
                  isActive ? 'bg-sidebar-muted text-sidebar-foreground' : ''
                }`}
              >
                <item.icon className="h-5 w-5" />
                {!collapsed && <span>{item.label}</span>}
                {isActive && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-accent" />
                )}
              </Button>
            </NavLink>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="sidebar-item"
          onClick={signOut}
          className="gap-3 px-3 py-2.5 text-sm"
        >
          <LogOut className="h-5 w-5" />
          <span>Déconnexion</span>
        </Button>
      </div>
    </aside>
  );
}
