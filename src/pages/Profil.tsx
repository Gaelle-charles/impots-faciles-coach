import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { User, Mail, Briefcase, CreditCard, Save } from 'lucide-react';

interface ProfileData {
  prenom: string | null;
  nom: string | null;
  email: string | null;
  plan: string;
  metier_id: string | null;
  created_at: string;
}

interface Metier {
  id: string;
  nom: string;
}

const Profil = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [metiers, setMetiers] = useState<Metier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [metierId, setMetierId] = useState<string>('none');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      const [profRes, metiersRes] = await Promise.all([
        supabase.from('profiles').select('prenom, nom, email, plan, metier_id, created_at').eq('id', user.id).maybeSingle(),
        supabase.from('metiers').select('id, nom').order('nom', { ascending: true }),
      ]);

      if (profRes.data) {
        setProfile(profRes.data);
        setPrenom(profRes.data.prenom ?? '');
        setNom(profRes.data.nom ?? '');
        setMetierId(profRes.data.metier_id ?? 'none');
      }
      setMetiers(metiersRes.data ?? []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    const trimmedPrenom = prenom.trim();
    const trimmedNom = nom.trim();

    if (!trimmedPrenom || !trimmedNom) {
      toast({ title: 'Erreur', description: 'Le prénom et le nom sont obligatoires.', variant: 'destructive' });
      return;
    }

    if (trimmedPrenom.length > 100 || trimmedNom.length > 100) {
      toast({ title: 'Erreur', description: 'Le nom et le prénom ne doivent pas dépasser 100 caractères.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        prenom: trimmedPrenom,
        nom: trimmedNom,
        metier_id: metierId === 'none' ? null : metierId,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder les modifications.', variant: 'destructive' });
    } else {
      setProfile((prev) => prev ? { ...prev, prenom: trimmedPrenom, nom: trimmedNom, metier_id: metierId === 'none' ? null : metierId } : prev);
      toast({ title: 'Profil mis à jour', description: 'Tes informations ont été sauvegardées.' });
    }
  };

  const planLabels: Record<string, string> = {
    nouveau: 'Nouveau',
    starter: 'Starter',
    expert: 'Expert',
    premium: 'Premium',
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-5 w-72" />
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Mon profil</h1>
        <p className="mt-1 text-muted-foreground">Gère tes informations personnelles.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Info card (read-only) */}
        <Card className="border-border bg-background shadow-sm md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground truncate">{profile?.email ?? user?.email ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <Badge className="bg-primary/10 text-primary capitalize">
                {planLabels[profile?.plan ?? 'nouveau'] ?? profile?.plan}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>
                Membre depuis{' '}
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                  : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card className="border-border bg-background shadow-sm md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg">Modifier mes informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Ton prénom"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ton nom"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metier">Métier</Label>
              <Select value={metierId} onValueChange={setMetierId}>
                <SelectTrigger id="metier">
                  <SelectValue placeholder="Sélectionne ton métier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun —</SelectItem>
                  {metiers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {metierId !== 'none' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  Ton métier personnalise certains contenus de formation.
                </p>
              )}
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profil;
