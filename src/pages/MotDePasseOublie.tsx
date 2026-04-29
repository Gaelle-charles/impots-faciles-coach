import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getEmailRedirectOrigin } from '@/lib/auth-redirect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logo from '@/assets/logo.png';
import { ArrowLeft, Mail } from 'lucide-react';

const MotDePasseOublie = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getEmailRedirectOrigin()}/auth/callback`,
    });

    setLoading(false);

    if (resetError) {
      const msg = resetError.message?.toLowerCase() ?? '';
      if (msg.includes('seconds') || msg.includes('rate') || msg.includes('after')) {
        setError(
          "Vous avez déjà demandé un lien récemment. Patientez quelques secondes avant de réessayer."
        );
        return;
      }
      // For any other error we still confirm to avoid revealing whether
      // the email exists. Log silently for debugging.
      console.error('[reset-password]', resetError);
    }

    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md rounded-lg bg-background p-8">
        <img src={logo} alt="Impôts Facile" className="mx-auto mb-6 h-10 w-auto" />

        {!sent ? (
          <>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Mot de passe oublié&nbsp;?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Saisissez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  required
                  autoFocus
                  className="mt-1"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" variant="cta" className="w-full" disabled={loading}>
                {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/connexion"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <Mail className="h-6 w-6 text-accent" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Email envoyé&nbsp;!
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation
              dans quelques instants. Pensez à vérifier vos spams.
            </p>
            <Button asChild variant="cta" className="mt-6 w-full">
              <Link to="/connexion">Retour à la connexion</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MotDePasseOublie;
