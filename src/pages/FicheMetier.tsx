import { useParams } from 'react-router-dom';

const FicheMetier = () => {
  const { id } = useParams();

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-foreground">Fiche métier</h1>
      <p className="mt-2 text-muted-foreground">Informations fiscales pour le métier {id}.</p>
    </div>
  );
};

export default FicheMetier;
