import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft, ShieldAlert } from 'lucide-react';

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

const AdminLogin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if already logged in as admin
  useEffect(() => {
    if (!user) {
      setCheckingAuth(false);
      return;
    }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          setCheckingAuth(false);
        }
      });
  }, [user, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!lockUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockUntil(null);
        setCountdown(0);
        setAttempts(0);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  const isLocked = lockUntil !== null && Date.now() < lockUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setLockUntil(Date.now() + LOCKOUT_SECONDS * 1000);
        setCountdown(LOCKOUT_SECONDS);
        setError(`Trop de tentatives. Réessaie dans ${LOCKOUT_SECONDS} secondes.`);
      } else {
        setError('Email ou mot de passe incorrect.');
      }
      setLoading(false);
      return;
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setError("Ce compte n'a pas les droits administrateur.");
      setLoading(false);
      return;
    }

    // Success — redirect to admin
    navigate('/admin', { replace: true });
    setLoading(false);
  };

  if (checkingAuth) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: 'hsl(222 47% 11%)' }}
      >
        <p className="text-white/60 font-heading">Chargement…</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: 'hsl(222 47% 11%)' }}
    >
      <div className="w-full max-w-[440px] rounded-xl bg-background p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="h-7 w-7 text-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Accès Administrateur
          </h1>
          <p className="text-sm text-muted-foreground">
            Espace réservé à l'équipe Impôts Facile
          </p>
          <div
            className="mx-auto mt-3 rounded-md py-1.5 px-4 text-xs font-semibold tracking-wide"
            style={{ backgroundColor: 'hsl(0 67% 95%)', color: 'hsl(0 67% 35%)' }}
          >
            Zone sécurisée — Accès restreint
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email administrateur"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full font-heading font-bold"
            style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}
            disabled={loading || isLocked}
          >
            {isLocked
              ? `Réessayer dans ${countdown}s`
              : loading
                ? 'Connexion…'
                : 'Se connecter →'}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la page d'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
