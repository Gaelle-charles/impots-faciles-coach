import { useParams } from 'react-router-dom';

const Module = () => {
  const { id } = useParams();

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-foreground">Module {id}</h1>
      <p className="mt-2 text-muted-foreground">Contenu du module de formation.</p>
    </div>
  );
};

export default Module;
