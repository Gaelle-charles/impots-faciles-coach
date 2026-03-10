import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [prenom, setPrenom] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('prenom')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.prenom) setPrenom(data.prenom);
      });
  }, [user]);

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-foreground">
        {prenom ? `Bonjour ${prenom} 👋` : 'Tableau de bord'}
      </h1>
      <p className="mt-2 text-muted-foreground">Bienvenue sur votre espace de formation fiscale.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {['Modules', 'Quizz', 'Simulateurs'].map((title) => (
          <div key={title} className="rounded-lg bg-card p-6">
            <h3 className="font-heading text-lg font-semibold text-card-foreground">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Accédez à vos {title.toLowerCase()}.</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
