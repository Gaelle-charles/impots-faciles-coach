import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPostLoginRedirect } from '@/lib/auth-redirect';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Vérification en cours…');

  useEffect(() => {
    // 1. Détecter immédiatement un flow de recovery (mot de passe oublié)
    //    via le hash de l'URL, AVANT que onAuthStateChange ne déclenche
    //    un SIGNED_IN qui nous enverrait vers le dashboard.
    const hash = window.location.hash || '';
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const type = hashParams.get('type');
    const queryType = new URLSearchParams(window.location.search).get('type');

    if (type === 'recovery' || queryType === 'recovery') {
      // Laisser Supabase établir la session de recovery puis router
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          subscription.unsubscribe();
          navigate('/reset-password', { replace: true });
        }
      });
      // Filet de sécurité : si aucun event ne tombe, on route quand même
      const t = setTimeout(() => {
        subscription.unsubscribe();
        navigate('/reset-password', { replace: true });
      }, 2000);
      return () => {
        subscription.unsubscribe();
        clearTimeout(t);
      };
    }

    // 2. Flow standard (signup confirm, magic link, OAuth…)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          navigate('/reset-password', { replace: true });
        } else if (event === 'SIGNED_IN' && session) {
          const path = await getPostLoginRedirect(session.user.id);
          navigate(path, { replace: true });
        }
      }
    );

    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('Session invalide. Redirection…');
        setTimeout(() => navigate('/connexion', { replace: true }), 1500);
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="font-heading text-lg text-muted-foreground">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
