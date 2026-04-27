import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Tarifs', to: '/tarifs' },
  { label: 'Comment ça marche', to: '/comment-ca-marche' },
  { label: 'Pour les entreprises', to: '/impots-team' },
];

interface HeaderProps {
  variant?: 'light' | 'dark';
}

export function Header({ variant = 'light' }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { hasAdminAccess } = useAccess();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = variant === 'dark';
  const isAdmin = hasAdminAccess();

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b',
        isDark
          ? 'border-sidebar-border bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground'
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Impôts Facile" className="h-9 w-9" />
          <span className="font-heading text-lg font-bold">Impôts Facile</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                'text-sm font-medium transition-colors',
                isDark
                  ? 'text-primary-foreground/80 hover:text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                'text-sm font-semibold transition-colors',
                isDark
                  ? 'text-yellow-vivid hover:text-yellow-vivid/80'
                  : 'text-primary hover:text-primary/80'
              )}
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant={isDark ? 'cta' : 'default'} size="sm">
                  Mon compte
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className={isDark ? 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-sidebar-muted' : ''}
              >
                Se déconnecter
              </Button>
            </>
          ) : (
            <>
              <Link to="/connexion">
                <Button
                  variant="ghost"
                  size="sm"
                  className={isDark ? 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-sidebar-muted' : ''}
                >
                  Connexion
                </Button>
              </Link>
              <Link to="/inscription">
                <Button variant={isDark ? 'cta' : 'default'} size="sm">
                  S'inscrire
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className={cn(
            'border-t px-6 py-4 md:hidden',
            isDark ? 'border-sidebar-border bg-primary' : 'border-border bg-background'
          )}
        >
          <nav className="flex flex-col gap-3">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-primary-foreground/80' : 'text-muted-foreground'
                )}
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'text-sm font-semibold',
                  isDark ? 'text-yellow-vivid' : 'text-primary'
                )}
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button variant={isDark ? 'cta' : 'default'} size="sm" className="w-full">
                    Mon compte
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className={cn('w-full', isDark ? 'text-primary-foreground/80' : '')}
                >
                  Se déconnecter
                </Button>
              </>
            ) : (
              <>
                <Link to="/connexion" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className={cn('w-full', isDark ? 'text-primary-foreground/80' : '')}>
                    Connexion
                  </Button>
                </Link>
                <Link to="/inscription" onClick={() => setMobileOpen(false)}>
                  <Button variant={isDark ? 'cta' : 'default'} size="sm" className="w-full">
                    S'inscrire
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function HeaderDark() {
  return <Header variant="dark" />;
}
