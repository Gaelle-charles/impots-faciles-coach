import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MailCheck, RefreshCw } from 'lucide-react';
import { getPostLoginRedirect } from '@/lib/auth-redirect';

const VerifierEmail = () => {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const checkConfirmedUser = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!sessionData.session) {
      return false;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!userData.user?.email_confirmed_at) {
      return false;
    }

    const redirectPath = await getPostLoginRedirect(userData.user.id);
    navigate(redirectPath, { replace: true });
    return true;
  };

  useEffect(() => {
    checkConfirmedUser().catch(() => undefined);
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    setError('');

    try {
      const confirmed = await checkConfirmedUser();

      if (!confirmed) {
        setError("Votre email n'est pas encore confirmé. Si vous l'avez validé dans un autre navigateur, reconnectez-vous.");
      }
    } catch {
      setError('Erreur lors de la vérification. Réessayez.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md rounded-lg bg-background p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
          <MailCheck className="h-8 w-8 text-accent" />
        </div>

        <h1 className="font-heading text-2xl font-bold text-foreground">
          Vérifiez votre email
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Un email de confirmation vous a été envoyé. Cliquez sur le lien dans votre boîte mail pour activer votre compte.
        </p>

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}

        <Button
          onClick={handleCheck}
          variant="cta"
          className="mt-6 w-full"
          disabled={checking}
        >
          {checking ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {checking ? 'Vérification...' : 'J\'ai confirmé mon email'}
        </Button>

        <p className="mt-4 text-xs text-muted-foreground">
          Vous n'avez pas reçu l'email ? Vérifiez vos spams.
        </p>
      </div>
    </div>
  );
};

export default VerifierEmail;
