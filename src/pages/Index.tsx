import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-8 py-4">
        <h1 className="font-heading text-xl font-bold text-primary">Impôts Facile</h1>
        <nav className="flex items-center gap-6">
          <Link to="/tarifs" className="text-sm text-muted-foreground hover:text-foreground">
            Tarifs
          </Link>
          <Link to="/connexion">
            <Button variant="outline" size="sm">Se connecter</Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center px-4 py-24 text-center">
        <h2 className="max-w-2xl font-heading text-5xl font-bold leading-tight text-foreground">
          La fiscalité, enfin accessible.
        </h2>
        <p className="mt-6 max-w-lg text-lg text-muted-foreground">
          Maîtrisez l'impôt sur le revenu, la TVA, les régimes fiscaux et bien plus
          grâce à des modules clairs et des simulateurs pratiques.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link to="/connexion">
            <Button variant="cta" size="lg" className="gap-2">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-heading text-sm font-semibold text-foreground">Commencer gratuitement</span>
        </div>
      </section>

      {/* Features */}
      <section className="bg-secondary px-4 py-20">
        <div className="mx-auto max-w-content">
          <h3 className="text-center font-heading text-3xl font-bold text-foreground">
            Tout ce qu'il faut pour comprendre vos impôts
          </h3>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { title: 'Modules de formation', desc: 'Des cours structurés, du débutant à l\'expert.' },
              { title: 'Quizz interactifs', desc: 'Testez vos connaissances à chaque étape.' },
              { title: 'Simulateurs', desc: 'Estimez votre imposition en quelques clics.' },
            ].map((f) => (
              <div key={f.title} className="rounded-lg bg-background p-6">
                <h4 className="font-heading text-lg font-bold text-foreground">{f.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary px-8 py-10 text-primary-foreground">
        <div className="mx-auto flex max-w-content items-center justify-between">
          <span className="font-heading text-sm font-semibold">Impôts Facile</span>
          <span className="text-xs opacity-70">© 2026 Tous droits réservés</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
