// @ts-nocheck
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import CodeBlock from '@tiptap/extension-code-block';
import History from '@tiptap/extension-history';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  RowsIcon,
  ColumnsIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Commencez à écrire…',
  minHeight = 300,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Strike,
      Underline,
      Heading.configure({ levels: [2, 3, 4] }),
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
      CodeBlock,
      History,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
      }),
      Image.configure({ HTMLAttributes: { class: 'rounded-md max-w-full' } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'border-collapse w-full' } }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-4 py-3 text-foreground',
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL du lien :');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL de l'image :");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const insertSeparator = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent('<p>──────────</p>').run();
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-7 w-7 p-0 ${active ? 'bg-accent text-accent-foreground' : ''}`}
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  );

  return (
    <div className="rounded-md border border-border overflow-hidden bg-background">
      <div className="flex flex-wrap gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
        <ToolBtn title="Annuler" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Rétablir" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-3.5 w-3.5" />
        </ToolBtn>

        <div className="mx-1 h-5 w-px self-center bg-border" />

        <ToolBtn title="Gras" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <BoldIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Italique" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <ItalicIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Souligné" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Barré" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>

        <div className="mx-1 h-5 w-px self-center bg-border" />

        <ToolBtn title="Titre H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Titre H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-3.5 w-3.5" />
        </ToolBtn>

        <div className="mx-1 h-5 w-px self-center bg-border" />

        <ToolBtn title="Liste à puces" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Liste numérotée" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Citation" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Code" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code className="h-3.5 w-3.5" />
        </ToolBtn>

        <div className="mx-1 h-5 w-px self-center bg-border" />

        <ToolBtn title="Aligner à gauche" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Centrer" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Aligner à droite" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>

        <div className="mx-1 h-5 w-px self-center bg-border" />

        <ToolBtn title="Lien" active={editor.isActive('link')} onClick={addLink}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Image" onClick={addImage}>
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Séparateur" onClick={insertSeparator}>
          <span className="text-xs font-bold text-foreground">—</span>
        </ToolBtn>

        <div className="mx-1 h-5 w-px self-center bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-7 gap-1 px-1.5 text-xs ${editor.isActive('table') ? 'bg-accent text-accent-foreground' : ''}`}
              title="Tableau"
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tableau</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Insérer un tableau 3×3
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run()}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Insérer un tableau 4×4
            </DropdownMenuItem>
            {editor.isActive('table') && (
              <>
                <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                  <ColumnsIcon className="mr-2 h-3.5 w-3.5" /> Ajouter une colonne
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                  <RowsIcon className="mr-2 h-3.5 w-3.5" /> Ajouter une ligne
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer la colonne
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer la ligne
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} className="text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer le tableau
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditorContent editor={editor} />

      <style>{`
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .ProseMirror th,
        .ProseMirror td {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem 0.75rem;
          text-align: left;
          vertical-align: top;
          min-width: 80px;
        }
        .ProseMirror th {
          background: hsl(var(--muted));
          font-weight: 600;
        }
        .ProseMirror .selectedCell {
          background: hsl(var(--accent) / 0.3);
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: hsl(var(--primary));
          cursor: col-resize;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
