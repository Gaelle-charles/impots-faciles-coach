import { useRef, useCallback, useMemo } from 'react';
import { marked } from 'marked';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Bold, Italic, Heading2, Heading3, List, Quote, Code, Link2, Minus,
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

interface ToolbarAction {
  icon: React.ReactNode;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { icon: <Bold className="h-3.5 w-3.5" />, label: 'Gras', prefix: '**', suffix: '**' },
  { icon: <Italic className="h-3.5 w-3.5" />, label: 'Italique', prefix: '*', suffix: '*' },
  { icon: <Heading2 className="h-3.5 w-3.5" />, label: 'H2', prefix: '## ', suffix: '', block: true },
  { icon: <Heading3 className="h-3.5 w-3.5" />, label: 'H3', prefix: '### ', suffix: '', block: true },
  { icon: <List className="h-3.5 w-3.5" />, label: 'Liste', prefix: '- ', suffix: '', block: true },
  { icon: <Quote className="h-3.5 w-3.5" />, label: 'Citation', prefix: '> ', suffix: '', block: true },
  { icon: <Code className="h-3.5 w-3.5" />, label: 'Code', prefix: '`', suffix: '`' },
  { icon: <Link2 className="h-3.5 w-3.5" />, label: 'Lien', prefix: '[', suffix: '](url)' },
  { icon: <Minus className="h-3.5 w-3.5" />, label: 'Séparateur', prefix: '\n---\n', suffix: '', block: true },
];

export function MarkdownEditor({ value, onChange, placeholder, minHeight = 300 }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  const insertMarkdown = useCallback((action: ToolbarAction) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || (action.block ? '' : 'texte');
    const before = value.slice(0, start);
    const after = value.slice(end);
    const needsNewline = action.block && before.length > 0 && !before.endsWith('\n');
    const insert = (needsNewline ? '\n' : '') + action.prefix + selected + action.suffix;
    const newValue = before + insert + after;
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos = start + (needsNewline ? 1 : 0) + action.prefix.length + selected.length;
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }, [value, onChange]);

  const renderedHtml = useMemo(() => {
    if (!value) return '';
    return marked.parse(value, { async: false }) as string;
  }, [value]);

  // Line numbers
  const lineCount = value ? value.split('\n').length : 1;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  const toolbar = (
    <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 px-2 py-1.5 rounded-t-md">
      {TOOLBAR_ACTIONS.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title={action.label}
          onClick={() => insertMarkdown(action)}
        >
          {action.icon}
        </Button>
      ))}
    </div>
  );

  const editorPane = (
    <div className="relative flex rounded-b-md border border-t-0 border-border overflow-hidden" style={{ minHeight }}>
      {/* Line numbers */}
      <div
        className="select-none bg-muted/50 text-muted-foreground text-xs font-mono text-right px-2 py-2 border-r border-border overflow-hidden"
        style={{ minWidth: 36 }}
        aria-hidden
      >
        {lineNumbers.map(n => (
          <div key={n} className="leading-[1.625rem]">{n}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 resize-none bg-background px-3 py-2 font-mono text-sm leading-[1.625rem] focus:outline-none placeholder:text-muted-foreground"
        placeholder={placeholder}
        style={{ minHeight }}
        spellCheck={false}
      />
    </div>
  );

  const previewPane = (
    <div
      className="rounded-md border border-border p-4 prose prose-sm max-w-none bg-muted/30 overflow-y-auto text-foreground"
      style={{ minHeight }}
    >
      {renderedHtml ? (
        <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      ) : (
        <p className="text-muted-foreground italic">Aperçu Markdown…</p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div>
        {toolbar}
        <Tabs defaultValue="edit">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="edit">✏️ Éditer</TabsTrigger>
            <TabsTrigger value="preview">👁️ Aperçu</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">{editorPane}</TabsContent>
          <TabsContent value="preview">{previewPane}</TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div>
      {toolbar}
      <ResizablePanelGroup direction="horizontal" className="rounded-b-md border border-t-0 border-border">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="relative flex overflow-hidden" style={{ minHeight }}>
            <div
              className="select-none bg-muted/50 text-muted-foreground text-xs font-mono text-right px-2 py-2 border-r border-border overflow-hidden"
              style={{ minWidth: 36 }}
              aria-hidden
            >
              {lineNumbers.map(n => (
                <div key={n} className="leading-[1.625rem]">{n}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 resize-none bg-background px-3 py-2 font-mono text-sm leading-[1.625rem] focus:outline-none placeholder:text-muted-foreground"
              placeholder={placeholder}
              style={{ minHeight }}
              spellCheck={false}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={25}>
          <div
            className="h-full p-4 prose prose-sm max-w-none bg-muted/30 overflow-y-auto text-foreground"
            style={{ minHeight }}
          >
            {renderedHtml ? (
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            ) : (
              <p className="text-muted-foreground italic">Aperçu Markdown…</p>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
