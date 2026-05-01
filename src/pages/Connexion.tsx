import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { getPostLoginRedirect } from '@/lib/auth-redirect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';

const Connexion = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    else if (signInData.user) {
      const path = await getPostLoginRedirect(signInData.user.id);
      navigate(path);
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Bon retour 👋"
      subtitle="Connectez-vous pour reprendre votre parcours fiscal."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-foreground">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.fr"
            required
            className="mt-1.5 h-11"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">
              Mot de passe
            </label>
            <Link
              to="/mot-de-passe-oublie"
              className="text-xs font-medium text-accent hover:underline"
            >
              Oublié&nbsp;?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Masquer' : 'Afficher'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="cta"
          className="h-11 w-full text-base"
          disabled={loading}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">ou</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError('');
          const { error } = await lovable.auth.signInWithOAuth('google', {
            redirect_uri: window.location.origin,
          });
          if (error) setError(error.message);
          setLoading(false);
        }}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continuer avec Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte&nbsp;?{' '}
        <Link to="/inscription" className="font-semibold text-accent hover:underline">
          Créer un compte
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Connexion;
