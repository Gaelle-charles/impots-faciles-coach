import { AccessGuard } from '@/components/AccessGuard';

const SimulateurFraisContent = () => {
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-foreground">Simulateur de frais</h1>
      <p className="mt-2 text-muted-foreground">Calculez vos frais réels vs abattement forfaitaire.</p>
    </div>
  );
};

const SimulateurFrais = () => (
  <AccessGuard requires="starter">
    <SimulateurFraisContent />
  </AccessGuard>
);

export default SimulateurFrais;
