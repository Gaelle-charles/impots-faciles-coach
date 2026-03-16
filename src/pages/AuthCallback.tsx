import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Vérification en cours…');

  useEffect(() => {
    const handleCallback = async () => {
      // Wait for Supabase to process the URL hash (token exchange)
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus('Session invalide. Redirection…');
        setTimeout(() => navigate('/connexion', { replace: true }), 1500);
        return;
      }

      // Check role to decide where to redirect
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
    };

    handleCallback();
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
