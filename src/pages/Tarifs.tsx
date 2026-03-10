const Tarifs = () => {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-20">
      <h1 className="font-heading text-4xl font-bold text-foreground">Nos tarifs</h1>
      <p className="mt-4 max-w-xl text-center text-lg text-muted-foreground">
        Choisissez la formule qui vous convient pour maîtriser la fiscalité.
      </p>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { name: 'Découverte', price: 'Gratuit', features: ['1 module', '1 quizz', 'Simulateur basique'] },
          { name: 'Essentiel', price: '19€/mois', features: ['Tous les modules', 'Quizz illimités', 'Simulateurs avancés'] },
          { name: 'Expert', price: '39€/mois', features: ['Tout Essentiel', 'Fiches métier', 'Support prioritaire'] },
        ].map((plan) => (
          <div key={plan.name} className="rounded-lg border border-border bg-card p-8">
            <h3 className="font-heading text-xl font-bold text-card-foreground">{plan.name}</h3>
            <p className="mt-2 font-heading text-3xl font-bold text-foreground">{plan.price}</p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-muted-foreground">✓ {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tarifs;
