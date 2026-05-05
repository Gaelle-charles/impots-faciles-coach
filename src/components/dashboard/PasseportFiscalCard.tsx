import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import type { Passeport } from "@/hooks/usePasseportFiscal";
import { renderSectionContent } from "@/lib/sanitizeHtml";

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
        <div className="space-y-5">
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
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: renderSectionContent(section) }}
                />
              </div>
            ))}
          {sections.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Contenu en préparation.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
