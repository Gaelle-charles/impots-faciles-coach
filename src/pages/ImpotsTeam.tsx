import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Users, GraduationCap, Sparkles, Lightbulb, AlertTriangle } from 'lucide-react';
import type { B2BPlan } from '@/lib/plans';

const TEAM_PLANS: Record<B2BPlan, { label: string; individuel: number; team: number; desc: string }> = {
  premium: { label: 'Premium', individuel: 159, team: 143, desc: 'Tout Expert + accompagnement complet' },
};

type TeamPlan = B2BPlan;

export default function ImpotsTeam() {
  const navigate = useNavigate();
  const [plan] = useState<TeamPlan>('premium');
  const [nbLicences, setNbLicences] = useState(10);

  const calc = useMemo(() => {
    const p = TEAM_PLANS[plan];
    const totalTeam = p.team * nbLicences;
    const totalIndividuel = p.individuel * nbLicences;
    const economie = totalIndividuel - totalTeam;
    return { ...p, totalTeam, totalIndividuel, economie };
  }, [plan, nbLicences]);

  const goSouscription = () => {
    navigate(`/impots-team/souscription?plan=${plan}&nb=${nbLicences}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* HERO */}
      <section className="bg-gradient-to-b from-primary to-primary/90 px-6 py-20 text-primary-foreground">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">Impôts Team</h1>
          <p className="mt-6 text-lg text-primary-foreground/80 sm:text-xl">
            Offrez à vos collaborateurs la formation la plus claire pour comprendre
            leurs impôts personnels. Un vrai avantage RH, concret et renouvelable
            chaque année.
          </p>
          <Button variant="cta" size="lg" className="mt-8" onClick={() => {
            document.getElementById('simulateur')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            Calculer mon offre
          </Button>
        </div>
      </section>

      {/* POURQUOI */}
      <section className="bg-background px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-heading text-3xl font-bold">Pourquoi Impôts Team ?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { icon: GraduationCap, title: 'Vos collaborateurs autonomes sur leurs impôts personnels' },
              { icon: Users, title: 'Moins de sollicitations RH au printemps fiscal' },
              { icon: Sparkles, title: 'Un avantage salarial différenciant, utile toute la vie' },
            ].map(({ icon: Icon, title }) => (
              <Card key={title}>
                <CardContent className="p-6 text-center">
                  <Icon className="mx-auto h-10 w-10 text-primary" />
                  <p className="mt-4 font-medium">{title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-heading text-3xl font-bold">Comment ça marche ?</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              'Choisissez votre plan et le nombre de licences',
              'Invitez vos collaborateurs par email',
              'Votre équipe se forme à son rythme',
            ].map((step, i) => (
              <li key={step} className="rounded-lg border bg-background p-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="mt-4 font-medium">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SIMULATEUR */}
      <section id="simulateur" className="bg-background px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-heading text-3xl font-bold">Calculez votre offre</h2>
          <p className="mt-2 text-center text-muted-foreground">
            -10% par licence par rapport au tarif individuel
          </p>

          <Card className="mt-8">
            <CardContent className="p-6 space-y-6">
              <div>
                <Label>Plan</Label>
                <div className="mt-2 rounded-md border bg-muted/30 px-4 py-3 text-sm">
                  <div className="font-semibold">{TEAM_PLANS.premium.label}</div>
                  <div className="text-muted-foreground">{TEAM_PLANS.premium.desc}</div>
                </div>
              </div>

              <div>
                <Label htmlFor="nbLic">Nombre de licences (min 2, max 500)</Label>
                <Input
                  id="nbLic"
                  type="number"
                  min={2}
                  max={500}
                  value={nbLicences}
                  onChange={(e) => {
                    const v = Math.max(2, Math.min(500, parseInt(e.target.value || '2', 10)));
                    setNbLicences(Number.isFinite(v) ? v : 2);
                  }}
                  className="mt-2"
                />
              </div>

              <div className="rounded-lg border border-yellow-vivid/50 bg-yellow-vivid/10 p-4 text-sm flex items-start gap-2">
                <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-yellow-vivid" />
                <span>L'admin qui gère les licences (vous-même ou un autre collaborateur) est <strong>gratuit</strong> et bénéficie d'un accès aperçu à la plateforme. Si vous souhaitez suivre le parcours complet certifiant, vous pourrez activer une licence personnelle après souscription (elle occupera alors 1 licence).</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-5">
                <div className="flex justify-between text-sm">
                  <span>Prix unitaire remisé</span>
                  <span className="font-medium">{calc.team} € / licence / an</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>Nombre de licences</span>
                  <span className="font-medium">{nbLicences}</span>
                </div>
                <div className="mt-4 flex items-end justify-between border-t pt-4">
                  <span className="font-semibold">Total annuel TTC</span>
                  <span className="font-heading text-2xl font-bold text-primary">
                    {calc.totalTeam.toLocaleString('fr-FR')} €
                  </span>
                </div>
                <p className="mt-2 text-xs text-emerald-700">
                  Soit une économie de {calc.economie.toLocaleString('fr-FR')} € par
                  rapport au tarif individuel.
                </p>
              </div>

              <Button size="lg" className="w-full" onClick={goSouscription}>
                Souscrire maintenant
              </Button>
              <p className="text-center text-xs text-muted-foreground inline-flex items-center gap-1 justify-center">
                <AlertTriangle className="h-3 w-3" /> Le passage à un plan inférieur n'est pas possible en cours d'abonnement.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-heading text-3xl font-bold">Questions fréquentes</h2>
          <Accordion type="single" collapsible className="mt-8">
            <AccordionItem value="q1">
              <AccordionTrigger>À partir de combien de collaborateurs ?</AccordionTrigger>
              <AccordionContent>Minimum 2 licences.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Puis-je ajouter des licences en cours d'abonnement ?</AccordionTrigger>
              <AccordionContent>Oui, avec calcul au prorata via votre dashboard.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Que se passe-t-il si un collaborateur quitte l'entreprise ?</AccordionTrigger>
              <AccordionContent>
                L'admin peut retirer son accès. La licence libérée peut être réattribuée
                à un nouveau collaborateur.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>Quels moyens de paiement ?</AccordionTrigger>
              <AccordionContent>
                Carte bancaire uniquement, facturation annuelle. D'autres moyens de paiement seront proposés prochainement.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>Les données des collaborateurs sont-elles confidentielles ?</AccordionTrigger>
              <AccordionContent>
                Oui. L'administrateur voit uniquement qui a un accès actif, jamais
                leurs simulations ou leurs réponses (RGPD).
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={goSouscription}>Souscrire maintenant</Button>
            <a href="mailto:contact@annulimpots.fr?subject=Question%20Imp%C3%B4ts%20Team">
              <Button size="lg" variant="outline">Poser une question</Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
