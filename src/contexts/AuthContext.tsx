import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User, Session, RealtimeChannel } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const deletionChannelRef = useRef<RealtimeChannel | null>(null);

  const handleAccountDeleted = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    toast.error('Votre compte a été supprimé.', {
      description: 'Vous avez été déconnecté. Vous pouvez créer un nouveau compte.',
    });
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Welcome email — déclenché à chaque SIGNED_IN, l'edge function gère l'idempotence
      // (ne renvoie pas si welcome_email_sent_at est déjà rempli)
      if (event === 'SIGNED_IN' && session) {
        // setTimeout pour ne pas bloquer le callback auth (anti-deadlock Supabase)
        setTimeout(() => {
          supabase.functions.invoke('send-welcome-email').catch((e) => {
            console.warn('[welcome-email] invoke failed:', e);
          });
        }, 0);
      }

      // Handle pending admin login from Google OAuth
      if (event === 'SIGNED_IN' && session && sessionStorage.getItem('pendingAdminLogin')) {
        sessionStorage.removeItem('pendingAdminLogin');
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          await supabase.auth.signOut();
          navigate('/admin/login', { replace: true });
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Realtime: detect if the current user's profile is deleted (account deletion by admin)
  useEffect(() => {
    if (!user) {
      if (deletionChannelRef.current) {
        supabase.removeChannel(deletionChannelRef.current);
        deletionChannelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`profile-deletion-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          handleAccountDeleted();
        }
      )
      .subscribe();

    deletionChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      deletionChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
