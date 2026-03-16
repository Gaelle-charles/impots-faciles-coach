import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BookOpen, Target, Clock, Trophy } from 'lucide-react';

/* ───── Mock Data ───── */

const MOCK_MODULES = [
  { id: 1, titre: 'Les bases de l\'impôt sur le revenu', progress: 100, steps: 6, stepsTotal: 6, quizScore: 80 },
  { id: 2, titre: 'Le prélèvement à la source', progress: 66, steps: 4, stepsTotal: 6, quizScore: null },
  { id: 3, titre: 'Les revenus fonciers', progress: 33, steps: 2, stepsTotal: 6, quizScore: null },
  { id: 4, titre: 'Les charges déductibles', progress: 0, steps: 0, stepsTotal: 5, quizScore: null },
  { id: 5, titre: 'La déclaration en ligne', progress: 0, steps: 0, stepsTotal: 7, quizScore: null },
  { id: 6, titre: 'Les crédits et réductions d\'impôt', progress: 0, steps: 0, stepsTotal: 5, quizScore: null },
  { id: 7, titre: 'Le quotient familial', progress: 0, steps: 0, stepsTotal: 4, quizScore: null },
  { id: 8, titre: 'Micro-entreprise et impôts', progress: 0, steps: 0, stepsTotal: 6, quizScore: null },
];

const MOCK_QUIZ_RESULTS = [
  { module: 'Les bases de l\'impôt sur le revenu', score: 80, date: '2025-03-10', status: 'Réussi' },
  { module: 'Le prélèvement à la source', score: 60, date: '2025-03-08', status: 'À améliorer' },
  { module: 'Les revenus fonciers', score: 90, date: '2025-03-05', status: 'Réussi' },
  { module: 'Les charges déductibles', score: 40, date: '2025-03-02', status: 'Échoué' },
  { module: 'La déclaration en ligne', score: 100, date: '2025-02-28', status: 'Réussi' },
];

function getModuleStatus(progress: number) {
  if (progress === 100) return { label: 'Terminé ✓', variant: 'default' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  if (progress > 0) return { label: 'En cours', variant: 'secondary' as const, color: 'bg-primary/10 text-primary' };
  return { label: 'Non commencé', variant: 'outline' as const, color: 'bg-muted text-muted-foreground' };
}

function getModuleButton(progress: number) {
  if (progress === 100) return 'Revoir';
  if (progress > 0) return 'Continuer';
  return 'Commencer';
}

function getLevel(avgScore: number) {
  if (avgScore >= 80) return 'Expert';
  if (avgScore >= 50) return 'Intermédiaire';
  return 'Débutant';
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const completedCount = MOCK_MODULES.filter((m) => m.progress === 100).length;
  const avgScore = Math.round(
    MOCK_QUIZ_RESULTS.reduce((acc, r) => acc + r.score, 0) / MOCK_QUIZ_RESULTS.length,
  );
  const remainingModules = MOCK_MODULES.filter((m) => m.progress < 100).length;
  const estimatedHours = remainingModules * 2;

  const stats = [
    { label: 'Modules complétés', value: `${completedCount}/${MOCK_MODULES.length}`, icon: BookOpen },
    { label: 'Score moyen', value: `${avgScore}%`, icon: Target },
    { label: 'Temps estimé restant', value: `${estimatedHours}h`, icon: Clock },
    { label: 'Niveau actuel', value: getLevel(avgScore), icon: Trophy },
  ];

  return (
    <div className="space-y-10">
      {/* Section 1 — Welcome */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {prenom ? `Bonjour ${prenom} 👋` : 'Tableau de bord'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Voici où tu en es dans ta formation fiscale.
        </p>
      </div>

      {/* Section 2 — Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border bg-background shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="font-heading text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section 3 — Modules */}
      <section id="modules">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-5">Mes modules</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {MOCK_MODULES.map((mod) => {
            const status = getModuleStatus(mod.progress);
            return (
              <Card key={mod.id} className="border-border bg-background shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-base font-semibold text-foreground leading-snug">
                      <span className="text-muted-foreground mr-1">{mod.id}.</span>
                      {mod.titre}
                    </h3>
                    <Badge className={`shrink-0 text-xs ${status.color}`}>
                      {status.label}
                    </Badge>
                  </div>

                  <Progress value={mod.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {mod.steps}/{mod.stepsTotal} étapes complétées
                  </p>

                  {mod.quizScore !== null && (
                    <p className="text-xs text-muted-foreground">
                      🎯 Quiz : <span className="font-semibold text-foreground">{mod.quizScore}%</span>
                    </p>
                  )}

                  <Button
                    size="sm"
                    className="w-full"
                    variant={mod.progress === 100 ? 'outline' : 'default'}
                    onClick={() => navigate(`/module/module-${mod.id}`)}
                  >
                    {getModuleButton(mod.progress)}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 4 — Quiz results */}
      <section id="resultats">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-5">Mes quiz</h2>
        <Card className="border-border bg-background shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_QUIZ_RESULTS.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-sm">{r.module}</TableCell>
                  <TableCell className="text-center font-heading font-bold text-primary">{r.score}%</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {new Date(r.date).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={
                        r.status === 'Réussi'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : r.status === 'Échoué'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-primary/10 text-primary'
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;
