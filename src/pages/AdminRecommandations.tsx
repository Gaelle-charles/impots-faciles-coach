import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, ExternalLink, Upload, X as XIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 Mo
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

type RecoType = 'association' | 'partenaire';

interface Reco {
  id: string;
  type: RecoType;
  nom: string;
  description: string;
  benefice_user: string;
  url: string;
  logo_url: string | null;
  is_active: boolean;
  ordre: number;
}

const emptyForm: Omit<Reco, 'id'> = {
  type: 'association',
  nom: '',
  description: '',
  benefice_user: '',
  url: '',
  logo_url: '',
  is_active: true,
  ordre: 0,
};

export default function AdminRecommandations() {
  const [items, setItems] = useState<Reco[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Reco, 'id'>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (file: File) => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error('Format non supporté. Utilisez PNG, JPG ou WebP.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Image trop lourde (max 2 Mo).');
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const baseId = editingId ?? 'new';
      const path = `${baseId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('recommandations-logos')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (upErr) {
        toast.error(`Upload échoué : ${upErr.message}`);
        return;
      }
      const { data } = supabase.storage.from('recommandations-logos').getPublicUrl(path);
      setForm((f) => ({ ...f, logo_url: data.publicUrl }));
      toast.success('Logo uploadé');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoRemove = async () => {
    const url = form.logo_url;
    setForm((f) => ({ ...f, logo_url: '' }));
    // Best-effort : supprimer l'objet du bucket si l'URL pointe vers notre bucket.
    if (url && url.includes('/recommandations-logos/')) {
      const path = url.split('/recommandations-logos/')[1]?.split('?')[0];
      if (path) {
        await supabase.storage.from('recommandations-logos').remove([path]);
      }
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recommandations')
      .select('*')
      .order('ordre', { ascending: true });
    if (error) {
      toast.error('Erreur de chargement');
    } else {
      setItems((data as Reco[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: Reco) => {
    setEditingId(r.id);
    setForm({
      type: r.type,
      nom: r.nom,
      description: r.description,
      benefice_user: r.benefice_user,
      url: r.url,
      logo_url: r.logo_url ?? '',
      is_active: r.is_active,
      ordre: r.ordre,
    });
    setDialogOpen(true);
  };

  const validate = (): string | null => {
    if (!form.nom.trim()) return 'Le nom est obligatoire.';
    if (!form.description.trim()) return 'La description est obligatoire.';
    if (!form.benefice_user.trim()) return 'Le bénéfice utilisateur est obligatoire.';
    if (!form.url.trim() || !/^https:\/\//i.test(form.url.trim())) {
      return 'L\'URL doit commencer par https://';
    }
    if (form.logo_url && form.logo_url.trim() && !/^https:\/\//i.test(form.logo_url.trim())) {
      return 'L\'URL du logo doit commencer par https://';
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    const payload = {
      type: form.type,
      nom: form.nom.trim(),
      description: form.description.trim(),
      benefice_user: form.benefice_user.trim(),
      url: form.url.trim(),
      logo_url: form.logo_url?.trim() || null,
      is_active: form.is_active,
      ordre: Number(form.ordre) || 0,
    };
    const { error } = editingId
      ? await supabase.from('recommandations').update(payload).eq('id', editingId)
      : await supabase.from('recommandations').insert(payload);
    setSaving(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
      return;
    }
    toast.success(editingId ? 'Recommandation mise à jour' : 'Recommandation créée');
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (r: Reco) => {
    const { error } = await supabase
      .from('recommandations')
      .update({ is_active: !r.is_active })
      .eq('id', r.id);
    if (error) {
      toast.error('Erreur lors du changement de statut');
      return;
    }
    toast.success(r.is_active ? 'Désactivée' : 'Activée');
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('recommandations').delete().eq('id', deleteId);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Recommandation supprimée');
      load();
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Recommandations</h1>
          <p className="text-sm text-muted-foreground">
            Associations et partenaires affichés dans le dashboard utilisateur.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter une recommandation
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune recommandation.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Ordre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-24">Actif</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.ordre}</TableCell>
                    <TableCell>
                      <Badge variant={r.type === 'association' ? 'secondary' : 'default'}>
                        {r.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{r.nom}</TableCell>
                    <TableCell>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate max-w-[180px]"
                      >
                        <span className="truncate">{r.url}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(r.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog create/edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Modifier la recommandation' : 'Nouvelle recommandation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as RecoType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="association">Association</SelectItem>
                  <SelectItem value="partenaire">Partenaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={500}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Ce que ça apporte à l'utilisateur *</Label>
              <Textarea
                value={form.benefice_user}
                onChange={(e) => setForm({ ...form, benefice_user: e.target.value })}
                maxLength={300}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>URL * (https://…)</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://exemple.org"
              />
            </div>
            <div className="space-y-2">
              <Label>URL du logo (optionnel, https://…)</Label>
              <Input
                value={form.logo_url ?? ''}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://exemple.org/logo.png"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordre</Label>
                <Input
                  type="number"
                  value={form.ordre}
                  onChange={(e) => setForm({ ...form, ordre: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Actif</Label>
                <div className="h-10 flex items-center">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette recommandation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive et ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
