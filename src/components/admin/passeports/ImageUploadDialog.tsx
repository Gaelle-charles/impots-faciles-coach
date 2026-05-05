import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_BYTES = 2 * 1024 * 1024;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  passeportId: string;
  onInsert: (url: string, alt: string) => void;
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .slice(0, 80);
}

export function ImageUploadDialog({ open, onOpenChange, passeportId, onInsert }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setAlt('');
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const validateAndSet = (f: File) => {
    if (!ACCEPT.includes(f.type)) {
      toast({ title: 'Format non supporté', description: 'PNG, JPG, WEBP ou GIF uniquement.', variant: 'destructive' });
      return;
    }
    if (f.size > MAX_BYTES) {
      toast({ title: 'Fichier trop lourd', description: 'Maximum 2 Mo.', variant: 'destructive' });
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSet(f);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    if (!alt.trim()) {
      toast({ title: 'Texte alternatif requis', description: 'Pour l’accessibilité.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const filename = `${passeportId}/${Date.now()}-${sanitizeFilename(file.name)}`;
    const { error } = await supabase.storage
      .from('passeports-images')
      .upload(filename, file, { cacheControl: '3600', upsert: false });
    if (error) {
      setUploading(false);
      toast({ title: 'Erreur d’upload', description: error.message, variant: 'destructive' });
      return;
    }
    const { data } = supabase.storage.from('passeports-images').getPublicUrl(filename);
    onInsert(data.publicUrl, alt.trim());
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Insérer une image</DialogTitle>
        </DialogHeader>

        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Glissez une image ou cliquez pour parcourir</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP, GIF — 2 Mo max</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT.join(',')}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) validateAndSet(f);
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-md border bg-muted/30 p-2">
              {previewUrl && (
                <img src={previewUrl} alt="Aperçu" className="mx-auto max-h-48 rounded" />
              )}
              <Button
                size="icon"
                variant="outline"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={reset}
                title="Retirer"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <ImageIcon className="h-3 w-3" />
                {file.name} — {(file.size / 1024).toFixed(0)} Ko
              </p>
            </div>
            <div>
              <Label>Texte alternatif (alt) *</Label>
              <Input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Décrivez brièvement l’image"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Affiché si l’image ne charge pas. Important pour l’accessibilité.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={uploading}>
            Annuler
          </Button>
          <Button onClick={handleUpload} disabled={!file || !alt.trim() || uploading}>
            {uploading ? 'Téléversement…' : 'Insérer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImageUploadDialog;
