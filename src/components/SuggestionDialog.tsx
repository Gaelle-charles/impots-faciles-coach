import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type Categorie = 'bug' | 'idee' | 'autre' | '';
const MAX_LEN = 1500;
const MIN_LEN = 10;

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestionDialog({ open, onOpenChange }: SuggestionDialogProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [categorie, setCategorie] = useState<Categorie>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setUserEmail(data?.email ?? user.email ?? '');
      });
  }, [user]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setCategorie('');
      setMessage('');
      setSubmitting(false);
    }
  }, [open]);

  const trimmed = message.trim();
  const canSend =
    !!categorie && trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN && !submitting;

  const handleSend = async () => {
    if (!user || !canSend) return;
    setSubmitting(true);
    const { error } = await supabase.from('suggestions').insert({
      user_id: user.id,
      user_email: userEmail || user.email || '',
      categorie,
      message: trimmed,
      page_url: location.pathname,
    });
    setSubmitting(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
      return;
    }
    toast.success('Merci ! Votre suggestion a bien été envoyée.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Votre suggestion</DialogTitle>
          <DialogDescription>
            Aidez-nous à améliorer Impôts Facile en partageant un bug ou une idée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={categorie} onValueChange={(v) => setCategorie(v as Categorie)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une catégorie…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">🐛 Signaler un bug</SelectItem>
                <SelectItem value="idee">💡 Proposer une idée</SelectItem>
                <SelectItem value="autre">💬 Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Votre message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
              placeholder="Décrivez votre suggestion en quelques lignes..."
              rows={6}
              maxLength={MAX_LEN}
            />
            <p className="text-xs text-muted-foreground text-right">
              {trimmed.length}/{MAX_LEN}
              {trimmed.length > 0 && trimmed.length < MIN_LEN && (
                <span className="text-destructive ml-2">(minimum {MIN_LEN} caractères)</span>
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {submitting ? 'Envoi…' : 'Envoyer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
