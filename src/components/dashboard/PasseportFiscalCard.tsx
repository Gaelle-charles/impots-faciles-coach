import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Crown, FileText, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Passeport } from "@/hooks/usePasseportFiscal";

interface Props {
  passeport: Passeport;
}

export function PasseportFiscalCard({ passeport }: Props) {
  const sections = passeport.contenu_sections?.sections ?? [];

  return (
    <Card className="border-2 border-amber-400/60 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-orange-950/10 shadow-md overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Badge className="bg-amber-500 text-white hover:bg-amber-600 gap-1">
              <Crown className="h-3.5 w-3.5" />
              Premium · Passeport Fiscal personnalisé
            </Badge>
            <h2 className="font-heading text-2xl font-bold text-foreground">
              {passeport.nom}
            </h2>
            {passeport.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">
                {passeport.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {passeport.regime_fiscal && (
            <Badge variant="secondary" className="font-normal">
              📊 {passeport.regime_fiscal}
            </Badge>
          )}
          {passeport.regime_social && (
            <Badge variant="secondary" className="font-normal">
              🏥 {passeport.regime_social}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="moderne" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="moderne" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Vue moderne
            </TabsTrigger>
            <TabsTrigger value="carte" className="gap-2">
              <FileText className="h-4 w-4" />
              Carte officielle
            </TabsTrigger>
          </TabsList>

          <TabsContent value="moderne" className="space-y-5">
            {sections
              .filter((s) => s.key !== "entete")
              .map((section) => (
                <div
                  key={section.key}
                  className="rounded-lg border border-border bg-background/70 p-4 space-y-2"
                >
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {section.title}
                  </h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    <ReactMarkdown>{section.content_md}</ReactMarkdown>
                  </div>
                </div>
              ))}
            {sections.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                Contenu en préparation.
              </p>
            )}
          </TabsContent>

          <TabsContent value="carte">
            <div className="rounded-lg border border-border bg-background/80 p-4 overflow-x-auto">
              <pre className="text-[11px] sm:text-xs leading-snug font-mono whitespace-pre text-foreground">
                {passeport.passeport_card_md}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
