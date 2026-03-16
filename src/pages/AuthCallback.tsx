import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Vérification en cours…');

  useEffect(() => {
    // Listen for the auth state change triggered by hash token exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.role === 'admin') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else if (event === 'PASSWORD_RECOVERY') {
          // User clicked a password reset link
          navigate('/reset-password', { replace: true });
        }
      }
    );

    // Fallback: if no event fires within 5s, check session manually
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
