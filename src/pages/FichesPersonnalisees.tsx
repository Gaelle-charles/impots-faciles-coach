import PersonalizedFiches from '@/components/dashboard/PersonalizedFiches';

const FichesPersonnalisees = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl md:text-5xl text-foreground">
          Fiches <em className="accent-serif">personnalisées</em>
        </h1>
        <p className="mt-1 text-muted-foreground">
          Tes fiches recommandées en fonction de ta formule.
        </p>
      </div>
      <PersonalizedFiches />
    </div>
  );
};

export default FichesPersonnalisees;
