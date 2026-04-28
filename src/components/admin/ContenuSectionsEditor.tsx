import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, FileJson } from 'lucide-react';

const TEMPLATES = {
  metier: [
    'comment_declarer',
    'erreurs_frequentes',
    'optimisations',
    'cotisations_sociales',
    'tva',
    'transmission',
    'cas_particuliers',
    'ressources',
  ],
  fiches_profils: [
    'votre_situation',
    'ce_que_vous_devez_savoir',
    'demarches_obligatoires',
    'optimisations_possibles',
    'erreurs_frequentes',
    'ressources',
  ],
  pays: [
    'convention_fiscale',
    'votre_situation_fiscale',
    'declaration_france',
    'optimisations',
    'cas_particuliers',
    'ressources',
  ],
} as const;

const TITLES: Record<string, string> = {
  comment_declarer: 'Comment déclarer',
  erreurs_frequentes: 'Erreurs fréquentes',
  optimisations: 'Optimisations',
  cotisations_sociales: 'Cotisations sociales',
  tva: 'TVA',
  transmission: 'Transmission',
  cas_particuliers: 'Cas particuliers',
  ressources: 'Ressources',
  votre_situation: 'Votre situation',
  ce_que_vous_devez_savoir: 'Ce que vous devez savoir',
  demarches_obligatoires: 'Démarches obligatoires',
  optimisations_possibles: 'Optimisations possibles',
  convention_fiscale: 'Convention fiscale',
  votre_situation_fiscale: 'Votre situation fiscale',
  declaration_france: 'Déclaration en France',
};

export type ContenuSectionsType = 'metier' | 'fiches_profils' | 'pays';

interface ContenuSectionsEditorProps {
  /** JSONB value as a JS object (or null) */
  value: unknown;
  /** Called with the parsed object when JSON is valid; called with `null` if cleared */
  onChange: (value: { sections: Array<{ key: string; title: string; content_md: string }> } | null) => void;
  /** Notifies parent of validity changes (true = empty or valid, false = parse/structure error) */
  onValidityChange?: (valid: boolean) => void;
  type: ContenuSectionsType;
}

const MAX_LENGTH = 200_000; // 200 KB safety cap

/**
 * Raw JSONB editor for `contenu_sections`.
 * Validates structure: { sections: [{ key, title, content_md }] }.
 * Surfaces parse/structure errors live; only fires onChange with valid payloads.
 */
export function ContenuSectionsEditor({ value, onChange, onValidityChange, type }: ContenuSectionsEditorProps) {
  const initialText = useMemo(() => {
    if (value && typeof value === 'object' && Object.keys(value as object).length > 0) {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return '';
      }
    }
    return '';
  }, [value]);

  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [sectionCount, setSectionCount] = useState<number | null>(null);

  // Re-sync when the parent loads a new fiche
  useEffect(() => {
    setText(initialText);
    setError(null);
    setSectionCount(null);
  }, [initialText]);

  const validate = (raw: string): boolean => {
    if (raw.trim() === '') {
      setError(null);
      setSectionCount(null);
      onChange(null);
      return true;
    }
    if (raw.length > MAX_LENGTH) {
      setError(`Contenu trop volumineux (${raw.length} caractères, max ${MAX_LENGTH}).`);
      return false;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      setError(`JSON invalide : ${(e as Error).message}`);
      setSectionCount(null);
      return false;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setError('Racine attendue : objet { "sections": [...] }');
      setSectionCount(null);
      return false;
    }
    const sections = (parsed as { sections?: unknown }).sections;
    if (!Array.isArray(sections)) {
      setError('La clé "sections" doit être un tableau.');
      setSectionCount(null);
      return false;
    }
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s || typeof s !== 'object') {
        setError(`Section #${i + 1} : objet invalide.`);
        setSectionCount(null);
        return false;
      }
      const obj = s as Record<string, unknown>;
      if (typeof obj.key !== 'string' || obj.key.trim() === '') {
        setError(`Section #${i + 1} : "key" manquant ou vide.`);
        setSectionCount(null);
        return false;
      }
      if (typeof obj.title !== 'string') {
        setError(`Section #${i + 1} (${obj.key}) : "title" manquant.`);
        setSectionCount(null);
        return false;
      }
      if (typeof obj.content_md !== 'string') {
        setError(`Section #${i + 1} (${obj.key}) : "content_md" manquant.`);
        setSectionCount(null);
        return false;
      }
    }
    setError(null);
    setSectionCount(sections.length);
    onChange({
      sections: sections.map((s) => {
        const o = s as Record<string, unknown>;
        return {
          key: (o.key as string).trim(),
          title: o.title as string,
          content_md: o.content_md as string,
        };
      }),
    });
    return true;
  };

  const handleChange = (raw: string) => {
    setText(raw);
    validate(raw);
  };

  const insertTemplate = () => {
    const keys = TEMPLATES[type];
    const tpl = {
      sections: keys.map((k) => ({
        key: k,
        title: TITLES[k] ?? k,
        content_md: '',
      })),
    };
    const formatted = JSON.stringify(tpl, null, 2);
    setText(formatted);
    validate(formatted);
  };

  const formatJson = () => {
    if (text.trim() === '') return;
    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      setText(formatted);
      validate(formatted);
    } catch {
      // ignore : already shown in error
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5">
          <FileJson className="h-4 w-4 text-muted-foreground" />
          Contenu structuré (JSONB)
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={insertTemplate}
            className="h-7 text-xs"
            disabled={text.trim().length > 0}
            title={text.trim().length > 0 ? 'Videz le champ pour insérer un modèle' : 'Insérer un modèle vierge'}
          >
            Insérer modèle
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={formatJson}
            className="h-7 text-xs"
            disabled={text.trim() === ''}
          >
            Formater
          </Button>
        </div>
      </div>

      <Textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder='{"sections": [{"key": "...", "title": "...", "content_md": "..."}]}'
        className="font-mono text-xs min-h-[260px] resize-y"
        spellCheck={false}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {!error && sectionCount !== null && sectionCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          {sectionCount} section{sectionCount > 1 ? 's' : ''} valides — sera enregistré au clic sur "Enregistrer".
        </div>
      )}
      {!error && text.trim() === '' && (
        <p className="text-[11px] text-muted-foreground italic">
          Vide = pas de contenu enrichi (le champ "Description" servira de fallback).
        </p>
      )}
    </div>
  );
}

export default ContenuSectionsEditor;
