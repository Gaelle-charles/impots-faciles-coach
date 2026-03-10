import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, Link } from 'react-router-dom';

const Connexion = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setError(error.message);
      else navigate('/verifier-email');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate('/dashboard');
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Entrez votre email d\'abord.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setMessage('Un email de réinitialisation a été envoyé.');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md rounded-lg bg-background p-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {isSignUp ? 'Créer un compte' : 'Connexion'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignUp ? 'Rejoignez Impôts Facile' : 'Accédez à votre espace formation'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              required
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Mot de passe</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-accent">{message}</p>}

          <Button type="submit" variant="cta" className="w-full" disabled={loading}>
            {loading ? 'Chargement...' : isSignUp ? 'Créer mon compte' : 'Se connecter'}
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-center text-sm">
          {!isSignUp && (
            <button
              onClick={handleForgotPassword}
              className="text-accent hover:underline"
            >
              Mot de passe oublié ?
            </button>
          )}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
            className="text-muted-foreground hover:underline"
          >
            {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? S\'inscrire'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Connexion;
