import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SimulateurFormData } from "@/hooks/useSimulateurFiscal";
import { toast } from "sonner";

interface Simulation {
  id: string;
  nom: string;
  impot_net: number;
  taux_moyen: number;
  donnees: SimulateurFormData;
  created_at: string;
}

interface Props {
  onLoad: (data: SimulateurFormData) => void;
  refreshKey: number;
}

export default function MesSimulations({ onLoad, refreshKey }: Props) {
  const { user } = useAuth();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSimulations = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("simulations" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setSimulations(data as unknown as Simulation[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSimulations();
  }, [user, refreshKey]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("simulations" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Simulation supprimée");
      setSimulations((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const fmt = (n: number) =>
    n?.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) ?? "0";

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (!user || (simulations.length === 0 && !loading)) return null;

  return (
    <Card className="bg-background border border-border rounded-xl p-5 space-y-4">
      <h3 className="font-heading text-lg font-bold text-foreground">📂 Mes simulations</h3>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="space-y-3">
          {simulations.map((sim) => (
            <div
              key={sim.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground truncate">{sim.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(sim.impot_net)} € · Taux {sim.taux_moyen}% · {fmtDate(sim.created_at)}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onLoad(sim.donnees);
                    toast.success(`Simulation "${sim.nom}" chargée`);
                  }}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" /> Charger
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(sim.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
