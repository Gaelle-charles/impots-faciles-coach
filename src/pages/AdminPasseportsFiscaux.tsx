import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { BookMarked, Plus, Pencil, Trash2, Search, Eye, Info } from 'lucide-react';
import { marked } from 'marked';
import {
  SectionsEditor, type EditableSection,
} from '@/components/admin/passeports/SectionsEditor';
import {
  MatchingBuilder, type MatchRule,
} from '@/components/admin/passeports/MatchingBuilder';
import { PasseportFiscalCard } from '@/components/dashboard/PasseportFiscalCard';

interface PasseportRow {
  id: string;
  numero: number;
  nom: string;
  slug: string;
  description: string | null;
  regime_fiscal: string;
  regime_social: string;
  plan_minimum: string;
  passeport_card_md: string;
  ordre: number;
  is_active: boolean;
  contenu_sections: unknown;
  conditions_matching: unknown;
}

const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);

const KEY_REGEX = /^[a-z0-9_]+$/;

function parseSections(raw: unknown): EditableSection[] {
  const obj = (raw ?? {}) as { sections?: Array<{ key?: string; title?: string; content_html?: string; content_md?: string }> };
  const list = Array.isArray(obj.sections) ? obj.sections : [];
  return list.map((s) => {
    let html = s.content_html ?? '';
    if (!html && s.content_md && s.content_md.trim()) {
      html = marked.parse(s.content_md, { async: false }) as string;
    }
    return {
      id: crypto.randomUUID(),
      key: s.key ?? '',
      title: s.title ?? '',
      content_html: html,
    };
  });
}

function parseConditions(raw: unknown): { all: MatchRule[]; any: MatchRule[] } {
  const obj = (raw ?? {}) as { match_all?: MatchRule[]; match_any?: MatchRule[] };
  return {
    all: Array.isArray(obj.match_all) ? obj.match_all : [],
    any: Array.isArray(obj.match_any) ? obj.match_any : [],
  };
}

function isHtmlEmpty(html: string): boolean {
  if (!html) return true;
  const stripped = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
  return stripped.length === 0;
}

const AdminPasseportsFiscaux = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PasseportRow[]>([]);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [isAdd, setIsAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const newPasseportIdRef = useRef<string>(crypto.randomUUID());

  const [form, setForm] = useState({
    numero: '', nom: '', slug: '', description: '',
    regime_fiscal: '', regime_social: '', plan_minimum: 'premium',
    passeport_card_md: '', ordre: '', is_active: true,
  });
  const [sections, setSections] = useState<EditableSection[]>([]);
  const [matchAll, setMatchAll] = useState<MatchRule[]>([]);
  const [matchAny, setMatchAny] = useState<MatchRule[]>([]);
  const [sectionErrors, setSectionErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [emptyMatchingWarn, setEmptyMatchingWarn] = useState(false);

  const [toDelete, setToDelete] = useState<PasseportRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('passeports_fiscaux').select('*').order('ordre', { ascending: true });
    if (error) toast({ title: 'Erreur de chargement', description: error.message, variant: 'destructive' });
    else setRows((data ?? []) as PasseportRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      r.nom.toLowerCase().includes(s) ||
      (r.slug ?? '').toLowerCase().includes(s) ||
      (r.regime_fiscal ?? '').toLowerCase().includes(s),
    );
  }, [rows, search]);

  const openAdd = () => {
    setIsAdd(true);
    setEditingId(null);
    newPasseportIdRef.current = crypto.randomUUID();
    const maxOrdre = rows.reduce((acc, r) => Math.max(acc, r.ordre ?? 0), 0);
    const maxNum = rows.reduce((acc, r) => Math.max(acc, r.numero ?? 0), 0);
    setForm({
      numero: String(maxNum + 1), nom: '', slug: '', description: '',
      regime_fiscal: '', regime_social: '', plan_minimum: 'premium',
      passeport_card_md: '', ordre: String(maxOrdre + 1), is_active: true,
    });
    setSections([]);
    setMatchAll([]); setMatchAny([]);
    setSectionErrors({});
    setOpen(true);
  };

  const openEdit = (r: PasseportRow) => {
    setIsAdd(false);
    setEditingId(r.id);
    setForm({
      numero: String(r.numero ?? ''), nom: r.nom, slug: r.slug,
      description: r.description ?? '',
      regime_fiscal: r.regime_fiscal ?? '', regime_social: r.regime_social ?? '',
      plan_minimum: r.plan_minimum ?? 'premium',
      passeport_card_md: r.passeport_card_md ?? '',
      ordre: String(r.ordre ?? 0), is_active: !!r.is_active,
    });
    setSections(parseSections(r.contenu_sections));
    const c = parseConditions(r.conditions_matching);
    setMatchAll(c.all); setMatchAny(c.any);
    setSectionErrors({});
    setOpen(true);
  };

  const handleNomChange = (value: string) => {
    setForm((f) => {
      if (isAdd && (f.slug === '' || f.slug === slugify(f.nom))) {
        return { ...f, nom: value, slug: slugify(value) };
      }
      return { ...f, nom: value };
    });
  };

  const validateSections = (): { ok: boolean; errors: Record<number, string> } => {
    const errors: Record<number, string> = {};
    if (sections.length === 0) {
      return { ok: false, errors: { 0: 'Au moins une section requise.' } };
    }
    const seenKeys = new Set<string>();
    sections.forEach((s, i) => {
      if (!s.key.trim()) errors[i] = 'L’identifiant technique est requis.';
      else if (!KEY_REGEX.test(s.key)) errors[i] = 'Identifiant invalide (minuscules, chiffres, underscores).';
      else if (seenKeys.has(s.key)) errors[i] = `Identifiant en doublon : "${s.key}".`;
      else if (!s.title.trim()) errors[i] = 'Le titre est requis.';
      else if (isHtmlEmpty(s.content_html)) errors[i] = 'Le contenu est vide.';
      seenKeys.add(s.key);
    });
    return { ok: Object.keys(errors).length === 0, errors };
  };

  const doSave = async (skipMatchingWarn = false) => {
    if (!form.nom.trim() || !form.slug.trim() || !form.numero.trim()) {
      toast({ title: 'Champs requis', description: 'Numéro, nom et slug sont obligatoires.', variant: 'destructive' });
      return;
    }
    if (!form.regime_fiscal.trim() || !form.regime_social.trim()) {
      toast({ title: 'Champs requis', description: 'Régimes fiscal et social sont obligatoires.', variant: 'destructive' });
      return;
    }

    const { ok, errors } = validateSections();
    if (!ok) {
      setSectionErrors(errors);
      toast({ title: 'Sections invalides', description: 'Corrigez les erreurs en surbrillance.', variant: 'destructive' });
      // scroll to first
      const first = Math.min(...Object.keys(errors).map(Number));
      const el = document.querySelector(`[data-section-index="${first}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSectionErrors({});

    if (!skipMatchingWarn && matchAll.length === 0 && matchAny.length === 0) {
      setEmptyMatchingWarn(true);
      return;
    }

    setSaving(true);
    const contenu_sections = {
      sections: sections.map(({ id, ...rest }) => rest),
    };
    const conditions_matching = {
      match_all: matchAll,
      match_any: matchAny,
    };

    const basePayload: any = {
      numero: Number(form.numero),
      nom: form.nom.trim(),
      description: form.description || null,
      regime_fiscal: form.regime_fiscal.trim(),
      regime_social: form.regime_social.trim(),
      plan_minimum: form.plan_minimum,
      passeport_card_md: form.passeport_card_md ?? '',
      ordre: Number(form.ordre) || 0,
      is_active: form.is_active,
      contenu_sections,
      conditions_matching,
    };

    if (isAdd) {
      const { error } = await (supabase as any)
        .from('passeports_fiscaux')
        .insert({ ...basePayload, slug: form.slug.trim() });
      setSaving(false);
      if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Passeport créé', description: form.nom });
    } else {
      const { error } = await (supabase as any)
        .from('passeports_fiscaux').update(basePayload).eq('id', editingId!);
      setSaving(false);
      if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Passeport mis à jour' });
    }
    setOpen(false);
    fetchData();
  };

  const handleSave = () => doSave(false);

  const handleToggleActive = async (r: PasseportRow, value: boolean) => {
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: value } : x)));
    const { error } = await (supabase as any)
      .from('passeports_fiscaux').update({ is_active: value }).eq('id', r.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      fetchData();
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await (supabase as any).from('passeports_fiscaux').delete().eq('id', toDelete.id);
    setDeleting(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Passeport supprimé', description: toDelete.nom });
    setToDelete(null);
    fetchData();
  };

  // Live preview passeport
  const previewPasseport = useMemo(() => ({
    id: editingId ?? newPasseportIdRef.current,
    slug: form.slug,
    numero: Number(form.numero) || 0,
    nom: form.nom,
    description: form.description,
    regime_fiscal: form.regime_fiscal,
    regime_social: form.regime_social,
    plan_minimum: form.plan_minimum,
    passeport_card_md: form.passeport_card_md,
    contenu_sections: { sections: sections.map(({ id, ...rest }) => rest) },
    conditions_matching: { match_all: matchAll, match_any: matchAny },
  }), [form, sections, matchAll, matchAny, editingId]);

  const passeportIdForUpload = editingId ?? newPasseportIdRef.current;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookMarked className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-heading font-bold">Passeports fiscaux</h1>
            <p className="text-sm text-muted-foreground">
              Gérez les fiches passeport fiscal Premium (matching profil utilisateur).
            </p>
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau passeport
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, slug ou régime…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">N°</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="hidden md:table-cell">Régime fiscal</TableHead>
              <TableHead className="hidden lg:table-cell">Régime social</TableHead>
              <TableHead className="w-24">Plan min</TableHead>
              <TableHead className="w-24">Actif</TableHead>
              <TableHead className="w-20 text-center">Ordre</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Aucun passeport.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.numero}</TableCell>
                  <TableCell className="font-medium">{r.nom}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{r.slug}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{r.regime_fiscal}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{r.regime_social}</TableCell>
                  <TableCell className="text-xs capitalize">{r.plan_minimum}</TableCell>
                  <TableCell>
                    <Switch checked={!!r.is_active} onCheckedChange={(v) => handleToggleActive(r, v)} />
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{r.ordre ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEdit(r)} title="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(r)} title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[1100px] w-[95vw] max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <DialogTitle className="font-heading">
                {isAdd ? 'Nouveau passeport fiscal' : 'Modifier le passeport fiscal'}
              </DialogTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="gap-1.5">
                <Eye className="h-4 w-4" /> Aperçu
              </Button>
            </div>
          </DialogHeader>

          <div className="px-6 py-4 space-y-5">
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200 flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Cette interface vous permet d’éditer le contenu et les conditions de matching du passeport.
                Le contenu est organisé en <strong>sections</strong> (en-tête, identité, déclaration, etc.) que vous pouvez réorganiser, ajouter ou supprimer.
                Les <strong>conditions de matching</strong> déterminent quels utilisateurs verront ce passeport.
              </p>
            </div>

            {/* Métadonnées */}
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Numéro *</Label>
                  <Input type="number" value={form.numero}
                    onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
                </div>
                <div>
                  <Label>Ordre d'affichage</Label>
                  <Input type="number" value={form.ordre}
                    onChange={(e) => setForm((f) => ({ ...f, ordre: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>Nom *</Label>
                <Input value={form.nom} onChange={(e) => handleNomChange(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Slug * {!isAdd && <span className="text-xs text-muted-foreground">(non modifiable)</span>}</Label>
                  <Input value={form.slug} disabled={!isAdd}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                </div>
                <div>
                  <Label>Plan minimum</Label>
                  <Select value={form.plan_minimum} onValueChange={(v) => setForm((f) => ({ ...f, plan_minimum: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Régime fiscal *</Label>
                  <Input value={form.regime_fiscal}
                    onChange={(e) => setForm((f) => ({ ...f, regime_fiscal: e.target.value }))} />
                </div>
                <div>
                  <Label>Régime social *</Label>
                  <Input value={form.regime_social}
                    onChange={(e) => setForm((f) => ({ ...f, regime_social: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>Description courte</Label>
                <Textarea rows={2} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>

              <div>
                <Label>Carte passeport (markdown)</Label>
                <Textarea rows={4} value={form.passeport_card_md}
                  onChange={(e) => setForm((f) => ({ ...f, passeport_card_md: e.target.value }))} />
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                <Label>Actif (visible côté Premium)</Label>
              </div>
            </div>

            <Tabs defaultValue="sections" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sections">
                  Contenu des sections
                  {sections.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">{sections.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="matching">
                  Conditions de matching
                  {(matchAll.length + matchAny.length) > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">{matchAll.length + matchAny.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="sections" className="mt-4">
                <SectionsEditor
                  sections={sections}
                  onChange={setSections}
                  passeportId={passeportIdForUpload}
                  errorsByIndex={sectionErrors}
                />
              </TabsContent>
              <TabsContent value="matching" className="mt-4">
                <MatchingBuilder
                  matchAll={matchAll}
                  matchAny={matchAny}
                  onChangeAll={setMatchAll}
                  onChangeAny={setMatchAny}
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="px-6 py-4 border-t sticky bottom-0 bg-background">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview drawer */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Aperçu — non publié
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <PasseportFiscalCard passeport={previewPasseport as any} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Empty matching warning */}
      <AlertDialog open={emptyMatchingWarn} onOpenChange={setEmptyMatchingWarn}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aucune condition de matching</AlertDialogTitle>
            <AlertDialogDescription>
              Ce passeport n'a aucune condition de matching et ne sera proposé à aucun utilisateur.
              Voulez-vous quand même enregistrer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setEmptyMatchingWarn(false); doSave(true); }}>
              Enregistrer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce passeport fiscal ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez supprimer <strong>{toDelete?.nom}</strong>. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPasseportsFiscaux;
