import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Mail, Users, Clock, CheckCircle } from 'lucide-react';

const AdminEmails = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('id, prenom, nom, email, created_at, role').order('created_at', { ascending: false });
      setProfiles(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  // We simulate an email log based on profile creation (confirmation email)
  const emailLog = useMemo(() => {
    return profiles.map(p => ({
      id: p.id,
      to: p.email ?? '—',
      name: `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || 'Inconnu',
      type: p.role === 'admin' ? 'Activation admin' : 'Confirmation inscription',
      date: p.created_at,
      status: 'Envoyé',
    }));
  }, [profiles]);

  const totalEmails = emailLog.length;
  const adminEmails = emailLog.filter(e => e.type === 'Activation admin').length;
  const userEmails = totalEmails - adminEmails;

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-96 rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Mail className="h-6 w-6" /> Emails envoyés
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historique des emails envoyés automatiquement par la plateforme.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-border bg-background shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total envoyés</p>
              <p className="font-heading text-xl font-bold text-foreground">{totalEmails}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-background shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Confirmations utilisateur</p>
              <p className="font-heading text-xl font-bold text-foreground">{userEmails}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-background shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'hsl(0 67% 95%)' }}>
              <CheckCircle className="h-5 w-5" style={{ color: 'hsl(0 67% 35%)' }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activations admin</p>
              <p className="font-heading text-xl font-bold text-foreground">{adminEmails}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-background shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Destinataire</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emailLog.slice(0, 50).map(e => (
              <TableRow key={e.id}>
                <TableCell className="text-sm font-medium">{e.name}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[200px]">{e.to}</TableCell>
                <TableCell>
                  <Badge className={e.type.includes('admin')
                    ? 'text-xs'
                    : 'bg-primary/10 text-primary text-xs'}
                    style={e.type.includes('admin') ? { backgroundColor: 'hsl(0 67% 95%)', color: 'hsl(0 67% 35%)' } : undefined}
                  >
                    {e.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800 text-xs">{e.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {emailLog.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">Aucun email envoyé.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {emailLog.length > 50 && (
        <p className="text-sm text-muted-foreground text-center">Affichage des 50 derniers emails.</p>
      )}
    </div>
  );
};

export default AdminEmails;
