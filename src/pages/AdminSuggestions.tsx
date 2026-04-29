import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { Bug, Lightbulb, MessageSquare, Mail, Calendar, ExternalLink, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useUnreadSuggestions } from '@/hooks/useUnreadSuggestions';

type Categorie = 'bug' | 'idee' | 'autre';

interface Suggestion {
  id: string;
  user_id: string | null;
  user_email: string;
  categorie: Categorie;
  message: string;
  page_url: string | null;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
}

const CAT_LABEL: Record<Categorie, string> = {
  bug: 'Bug',
  idee: 'Idée',
  autre: 'Autre',
};

const CAT_ICON: Record<Categorie, typeof Bug> = {
  bug: Bug,
  idee: Lightbulb,
  autre: MessageSquare,
};

const CAT_BADGE_CLASS: Record<Categorie, string> = {
  bug: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  idee: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  autre: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function excerpt(s: string, n = 60) {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + '…';
}

export default function AdminSuggestions() {
  const unreadCount = useUnreadSuggestions();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<'all' | Categorie>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'archived'>('all');
  const [selected, setSelected] = useState<Suggestion | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Erreur de chargement');
    } else {
      setItems((data as Suggestion[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Realtime refresh on any change
  useEffect(() => {
    const channel = supabase
      .channel('admin-suggestions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suggestions' },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = items.filter((s) => {
    if (filterCat !== 'all' && s.categorie !== filterCat) return false;
    if (filterStatus === 'unread' && (s.is_read || s.is_archived)) return false;
    if (filterStatus === 'archived' && !s.is_archived) return false;
    if (filterStatus === 'all' && s.is_archived) return false; // par défaut on cache les archivées
    return true;
  });

  const openSuggestion = async (s: Suggestion) => {
    setSelected(s);
    if (!s.is_read) {
      const { error } = await supabase
        .from('suggestions')
        .update({ is_read: true })
        .eq('id', s.id);
      if (!error) {
        setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_read: true } : x)));
        setSelected({ ...s, is_read: true });
      }
    }
  };

  const markAsRead = async (s: Suggestion) => {
    const { error } = await supabase
      .from('suggestions')
      .update({ is_read: true })
      .eq('id', s.id);
    if (error) { toast.error('Erreur'); return; }
    toast.success('Marquée comme lue');
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_read: true } : x)));
    setSelected((prev) => (prev?.id === s.id ? { ...prev, is_read: true } : prev));
  };

  const markAsUnread = async (s: Suggestion) => {
    const { error } = await supabase
      .from('suggestions')
      .update({ is_read: false })
      .eq('id', s.id);
    if (error) { toast.error('Erreur'); return; }
    toast.success('Marquée comme non lue');
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_read: false } : x)));
    setSelected((prev) => (prev?.id === s.id ? { ...prev, is_read: false } : prev));
  };

  const archive = async (s: Suggestion) => {
    const { error } = await supabase
      .from('suggestions')
      .update({ is_archived: true, is_read: true })
      .eq('id', s.id);
    if (error) { toast.error('Erreur'); return; }
    toast.success('Archivée');
    setItems((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, is_archived: true, is_read: true } : x)),
    );
    setSelected(null);
  };

  const unarchive = async (s: Suggestion) => {
    const { error } = await supabase
      .from('suggestions')
      .update({ is_archived: false })
      .eq('id', s.id);
    if (error) { toast.error('Erreur'); return; }
    toast.success('Désarchivée');
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_archived: false } : x)));
    setSelected((prev) => (prev?.id === s.id ? { ...prev, is_archived: false } : prev));
  };

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Suggestions utilisateurs</h1>
        <p className="text-sm text-muted-foreground">
          Bugs, idées et retours envoyés depuis l'application.
        </p>
      </header>

      {/* Compteur */}
      <Card className="border-2" style={{ borderColor: unreadCount > 0 ? '#EF4444' : undefined }}>
        <CardContent className="p-6 flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: unreadCount > 0 ? '#FEE2E2' : '#F1F5F9',
              color: unreadCount > 0 ? '#DC2626' : '#64748B',
            }}
          >
            <Inbox className="h-7 w-7" />
          </div>
          <div>
            <p className="text-3xl font-heading font-bold">{unreadCount}</p>
            <p className="text-sm text-muted-foreground">
              {unreadCount === 0 ? 'Aucune suggestion non lue' : unreadCount === 1
                ? 'suggestion non lue'
                : 'suggestions non lues'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Catégorie</span>
          <Select value={filterCat} onValueChange={(v) => setFilterCat(v as 'all' | Categorie)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="idee">Idée</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
          <TabsList>
            <TabsTrigger value="all">Toutes (actives)</TabsTrigger>
            <TabsTrigger value="unread">Non lues</TabsTrigger>
            <TabsTrigger value="archived">Archivées</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{filtered.length} suggestion(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucune suggestion à afficher avec ces filtres.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Catégorie</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-40">Date</TableHead>
                  <TableHead className="w-24">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const Icon = CAT_ICON[s.categorie];
                  return (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openSuggestion(s)}
                    >
                      <TableCell>
                        <Badge variant="outline" className={CAT_BADGE_CLASS[s.categorie]}>
                          <Icon className="h-3 w-3 mr-1" />
                          {CAT_LABEL[s.categorie]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{s.user_email}</TableCell>
                      <TableCell className="text-sm">{excerpt(s.message)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(s.created_at)}
                      </TableCell>
                      <TableCell>
                        {!s.is_read && !s.is_archived && (
                          <Badge className="bg-red-500 text-white">Non lue</Badge>
                        )}
                        {s.is_archived && (
                          <Badge variant="secondary">Archivée</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Panneau latéral détail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={CAT_BADGE_CLASS[selected.categorie]}>
                    {CAT_LABEL[selected.categorie]}
                  </Badge>
                  {!selected.is_read && !selected.is_archived && (
                    <Badge className="bg-red-500 text-white">Non lue</Badge>
                  )}
                  {selected.is_archived && <Badge variant="secondary">Archivée</Badge>}
                </div>
                <SheetTitle>Détail de la suggestion</SheetTitle>
                <SheetDescription>
                  Reçue le {formatDate(selected.created_at)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <section className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    Message
                  </p>
                  <p className="text-sm whitespace-pre-wrap rounded-md border bg-muted/30 p-3">
                    {selected.message}
                  </p>
                </section>

                <section className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${selected.user_email}`}
                      className="text-primary hover:underline"
                    >
                      {selected.user_email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selected.created_at)}
                  </div>
                  {selected.page_url && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ExternalLink className="h-4 w-4" />
                      <Link to={selected.page_url} className="hover:underline">
                        {selected.page_url}
                      </Link>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-2">
                    User ID :{' '}
                    <span className="font-mono">
                      {selected.user_id ?? 'compte supprimé'}
                    </span>
                  </div>
                </section>
              </div>

              <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
                {selected.is_read ? (
                  <Button variant="outline" onClick={() => markAsUnread(selected)}>
                    Marquer comme non lue
                  </Button>
                ) : (
                  <Button onClick={() => markAsRead(selected)}>
                    Marquer comme lue
                  </Button>
                )}
                {selected.is_archived ? (
                  <Button variant="outline" onClick={() => unarchive(selected)}>
                    Désarchiver
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => archive(selected)}>
                    Archiver
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
