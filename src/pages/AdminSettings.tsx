import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Settings, Shield, Database, Globe, Bell, Palette } from 'lucide-react';

const AdminSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalModules: 0,
    totalQuestions: 0,
    totalContenus: 0,
  });
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [adminForm, setAdminForm] = useState({ prenom: '', nom: '', email: '' });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const [pRes, mRes, qRes, cRes, profRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('modules').select('id', { count: 'exact', head: true }),
        supabase.from('quizz').select('id', { count: 'exact', head: true }),
        supabase.from('contenus').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('prenom, nom, email').eq('id', user.id).maybeSingle(),
      ]);
      setStats({
        totalUsers: pRes.count ?? 0,
        totalModules: mRes.count ?? 0,
        totalQuestions: qRes.count ?? 0,
        totalContenus: cRes.count ?? 0,
      });
      if (profRes.data) {
        setProfile(profRes.data);
        setAdminForm({
          prenom: profRes.data.prenom ?? '',
          nom: profRes.data.nom ?? '',
          email: profRes.data.email ?? '',
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      prenom: adminForm.prenom || null,
      nom: adminForm.nom || null,
    } as any).eq('id', user.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profil admin mis à jour ✓' });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-96 rounded-lg" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6" /> Paramètres
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Configuration de la plateforme Impôts Facile.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Admin profile */}
        <Card className="border-border bg-background shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" /> Profil administrateur
            </CardTitle>
            <CardDescription>Modifiez vos informations personnelles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prénom</Label>
                <Input value={adminForm.prenom} onChange={e => setAdminForm(p => ({ ...p, prenom: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input value={adminForm.nom} onChange={e => setAdminForm(p => ({ ...p, nom: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={adminForm.email} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié ici.</p>
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              size="sm"
              style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}
            >
              {saving ? 'Enregistrement…' : '💾 Enregistrer'}
            </Button>
          </CardContent>
        </Card>

        {/* Platform stats */}
        <Card className="border-border bg-background shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Database className="h-5 w-5" /> État de la base de données
            </CardTitle>
            <CardDescription>Aperçu rapide du contenu de la plateforme.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Utilisateurs', value: stats.totalUsers },
                { label: 'Modules', value: stats.totalModules },
                { label: 'Questions quiz', value: stats.totalQuestions },
                { label: 'Contenus', value: stats.totalContenus },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-border p-3 text-center">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="font-heading text-2xl font-bold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-border bg-background shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" /> Sécurité
            </CardTitle>
            <CardDescription>Paramètres de sécurité de l'espace admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Protection par rôle</p>
                <p className="text-xs text-muted-foreground">Seuls les admins peuvent accéder à /admin/*</p>
              </div>
              <Badge className="bg-green-100 text-green-800 text-xs">Activé</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Verrouillage après 3 tentatives</p>
                <p className="text-xs text-muted-foreground">Bloque la connexion 30s après 3 échecs</p>
              </div>
              <Badge className="bg-green-100 text-green-800 text-xs">Activé</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">RLS (Row Level Security)</p>
                <p className="text-xs text-muted-foreground">Toutes les tables sont protégées</p>
              </div>
              <Badge className="bg-green-100 text-green-800 text-xs">Activé</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Platform info */}
        <Card className="border-border bg-background shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" /> Informations plateforme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Nom</span>
              <span className="font-medium text-foreground">Impôts Facile</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <Badge variant="outline" className="text-xs">v1.0</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Backend</span>
              <Badge className="bg-green-100 text-green-800 text-xs">Lovable Cloud</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Authentification</span>
              <span className="font-medium text-foreground">Email + Google OAuth</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
