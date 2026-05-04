import PersonalizedFiches from '@/components/dashboard/PersonalizedFiches';
import { AccentText } from '@/components/ui/accent-text';

const FichesPersonnalisees = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl md:text-5xl text-foreground leading-tight">
          Fiches <AccentText>personnalisées</AccentText>
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Vos fiches recommandées en fonction de votre formule.
        </p>
      </div>
      <PersonalizedFiches />
    </div>
  );
};

export default FichesPersonnalisees;
