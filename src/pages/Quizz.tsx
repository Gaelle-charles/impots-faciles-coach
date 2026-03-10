import { useParams } from 'react-router-dom';
import { QuizzLayout } from '@/components/QuizzLayout';

const Quizz = () => {
  const { id } = useParams();

  return (
    <QuizzLayout>
      <div className="text-center">
        <h1 className="font-heading text-4xl font-bold text-foreground">Question 1</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Quizz {id} — Les questions apparaîtront ici.
        </p>
      </div>
    </QuizzLayout>
  );
};

export default Quizz;
