import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { ImageUploadDialog } from './ImageUploadDialog';

export interface EditableSection {
  id: string; // local
  key: string;
  title: string;
  content_html: string;
}

interface Props {
  sections: EditableSection[];
  onChange: (sections: EditableSection[]) => void;
  passeportId: string;
  errorsByIndex?: Record<number, string>;
}

const KEY_REGEX = /^[a-z0-9_]+$/;

function SortableSection({
  section,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onImageRequest,
  error,
}: {
  section: EditableSection;
  index: number;
  total: number;
  onUpdate: (patch: Partial<EditableSection>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onImageRequest: (insert: (url: string, alt?: string) => void) => void;
  error?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const keyValid = !section.key || KEY_REGEX.test(section.key);

  return (
    <Card ref={setNodeRef} style={style} className="p-4 space-y-3 border-2" data-section-index={index}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
            title="Réordonner"
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <span className="font-heading text-lg font-bold text-primary">
            Section {index + 1}
          </span>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={onMoveUp} disabled={index === 0} title="Monter">
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={onMoveDown} disabled={index === total - 1} title="Descendre">
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onRemove} title="Supprimer">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Identifiant technique (key) *</Label>
          <Input
            value={section.key}
            onChange={(e) => onUpdate({ key: e.target.value })}
            placeholder="ex: cotisations_sociales"
            className={!keyValid ? 'border-destructive' : ''}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Minuscules, chiffres et underscores uniquement. Non visible par l’utilisateur.
          </p>
        </div>
        <div>
          <Label className="text-xs">Titre de la section *</Label>
          <Input
            value={section.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="ex: 💰 VOS COTISATIONS SOCIALES"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Peut contenir des emojis.</p>
        </div>
      </div>

      <div>
        <Label className="text-xs">Contenu de la section *</Label>
        <RichTextEditor
          value={section.content_html}
          onChange={(html) => onUpdate({ content_html: html })}
          placeholder="Rédigez le contenu de la section…"
          minHeight={220}
          onImageRequest={onImageRequest}
        />
      </div>
    </Card>
  );
}

export function SectionsEditor({ sections, onChange, passeportId, errorsByIndex = {} }: Props) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const insertCallbackRef = useState<{ fn?: (url: string, alt?: string) => void }>({})[0];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateAt = (index: number, patch: Partial<EditableSection>) => {
    onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const removeAt = (index: number) => onChange(sections.filter((_, i) => i !== index));
  const moveUp = (index: number) => {
    if (index === 0) return;
    onChange(arrayMove(sections, index, index - 1));
  };
  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    onChange(arrayMove(sections, index, index + 1));
  };
  const addSection = () => {
    onChange([
      ...sections,
      { id: crypto.randomUUID(), key: '', title: '', content_html: '' },
    ]);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) onChange(arrayMove(sections, oldIdx, newIdx));
  };

  const requestImage = useCallback((insert: (url: string, alt?: string) => void) => {
    insertCallbackRef.fn = insert;
    setImageDialogOpen(true);
  }, [insertCallbackRef]);

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {sections.map((s, i) => (
              <SortableSection
                key={s.id}
                section={s}
                index={i}
                total={sections.length}
                onUpdate={(p) => updateAt(i, p)}
                onRemove={() => removeAt(i)}
                onMoveUp={() => moveUp(i)}
                onMoveDown={() => moveDown(i)}
                onImageRequest={requestImage}
                error={errorsByIndex[i]}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sections.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
          Aucune section pour le moment. Cliquez sur « Ajouter une section » pour commencer.
        </div>
      )}

      <Button type="button" variant="outline" onClick={addSection} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Ajouter une section
      </Button>

      <ImageUploadDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        passeportId={passeportId}
        onInsert={(url, alt) => insertCallbackRef.fn?.(url, alt)}
      />
    </div>
  );
}

export default SectionsEditor;
