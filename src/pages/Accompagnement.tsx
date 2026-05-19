import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Compass, MessageCircle, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CalEmbed } from '@/components/booking/CalEmbed';
import { CAL_EVENT_LINK, ACCOMPAGNANT_NAME } from '@/lib/cal-config';
import { Seo } from '@/components/Seo';

const bentoItems = [
  {
    icon: BookOpen,
    title: 'Explication pédagogique',
    text: 'Comprenez les règles fiscales applicables à votre situation.',
  },
  {
    icon: Compass,
    title: 'Orientation sur la plateforme',
    text: 'Identifiez les modules, fiches et simulateurs pertinents pour vous.',
  },
  {
    icon: MessageCircle,
    title: 'Réponses à vos questions',
    text: "Posez toutes vos questions sur le fonctionnement de l'impôt.",
  },
  {
    icon: FileText,
    title: "Décryptage avis d'imposition",
    text: 'Comprenez les lignes de votre avis d\'imposition.',
  },
];

const faq = [
  {
    q: "Comment se déroule l'appel ?",
    a: "L'appel se déroule en visioconférence (Google Meet). Le lien est envoyé par email à la confirmation et rappelé 24h avant.",
  },
  {
    q: 'Puis-je annuler ou reprogrammer ?',
    a: "Jusqu'à 24h avant le rendez-vous : annulation avec remboursement intégral ou reprogrammation gratuite. Passé ce délai, l'appel reste dû.",
  },
  {
    q: "Que se passe-t-il si je n'arrive pas à me connecter ?",
    a: "L'accompagnant vous attend 15 minutes. Sans connexion de votre part, l'appel est un no-show et n'est pas remboursé.",
  },
  {
    q: "Puis-je enregistrer l'appel ?",
    a: "Sur demande explicite et avec l'accord de l'accompagnant uniquement.",
  },
  {
    q: 'Cet appel remplace-t-il un avocat fiscaliste ou un expert-comptable ?',
    a: "Non. Pour un conseil fiscal personnalisé, consultez un avocat, un expert-comptable ou un notaire inscrit à son ordre.",
  },
];

export default function Accompagnement() {
  const { user } = useAuth();
  const { plan, isLoading } = useAccess();
  const [profile, setProfile] = useState<{ prenom: string | null; nom: string | null; email: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('prenom, nom, email')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => data && setProfile(data));
  }, [user]);

  const isFreemium = plan === 'nouveau';
  const isPaidB2C = ['starter', 'expert', 'premium'].includes(plan);
  const fullName = profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() : '';

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <Seo
        title="Prendre rendez-vous avec un accompagnant pédagogique"
        description="60 minutes en visio avec Laure pour comprendre votre situation et utiliser au mieux Impôts Facile."
        path="/accompagnement"
      />

      {/* Hero */}
      <section className="mb-12 text-center">
        <h1 className="font-display text-3xl leading-tight md:text-5xl">
          Prenez rendez-vous avec un{' '}
          <span className="font-display italic" style={{ background: 'linear-gradient(transparent 60%, #F9E900 60%)' }}>
            accompagnant pédagogique
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          60 minutes en visio pour comprendre votre situation fiscale et utiliser au mieux Impôts Facile.
        </p>
      </section>

      {/* Card profil accompagnant */}
      <section className="mb-12">
        <Card className="flex flex-col items-center gap-6 rounded-3xl border-0 bg-primary p-8 text-primary-foreground md:flex-row md:p-10">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-accent text-3xl font-bold text-accent-foreground">
            L
          </div>
          <div className="text-center md:text-left">
            <h2 className="font-display text-2xl">{ACCOMPAGNANT_NAME}</h2>
            <p className="mt-1 text-sm uppercase tracking-wider opacity-70">
              Accompagnante fiscale pédagogique
            </p>
            <p className="mt-3 text-sm leading-relaxed opacity-90">
              Spécialiste de l'accompagnement fiscal pédagogique, {ACCOMPAGNANT_NAME} aide les
              particuliers et indépendants à comprendre leur fiscalité et à utiliser au mieux
              les ressources d'Impôts Facile.
            </p>
          </div>
        </Card>
      </section>

      {/* Bento "Ce que vous obtenez en 60 minutes" */}
      <section className="mb-12">
        <h2 className="mb-6 font-display text-2xl md:text-3xl">Ce que vous obtenez en 60 minutes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {bentoItems.map((item) => (
            <Card key={item.title} className="rounded-2xl p-6">
              <item.icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="mb-2 font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Cadre légal */}
      <section className="mb-12">
        <Card className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-700" />
            <h3 className="font-semibold text-yellow-900">Cadre légal de l'accompagnement</h3>
          </div>
          <p className="text-sm leading-relaxed text-yellow-900/90">
            Cet appel est un accompagnement pédagogique. Il ne constitue ni un conseil fiscal
            personnalisé, ni une assistance à la déclaration. Conformément à l'ordonnance
            n° 45-2138 du 19 septembre 1945, le conseil fiscal contre rémunération est réservé
            aux avocats, experts-comptables et notaires. Pour ces besoins spécifiques, nous vous
            invitons à consulter un professionnel inscrit auprès de l'ordre concerné. Pour toute
            question technique sur votre déclaration, contactez votre service des impôts via
            impots.gouv.fr.
          </p>
        </Card>
      </section>

      {/* Réservez votre créneau */}
      <section className="mb-12" id="reserver">
        <h2 className="mb-6 font-display text-2xl md:text-3xl">Réservez votre créneau</h2>

        {!user || isLoading ? (
          <Card className="rounded-2xl p-8 text-center text-muted-foreground">
            Chargement…
          </Card>
        ) : isPaidB2C ? (
          <CalEmbed
            calLink={CAL_EVENT_LINK}
            prefillEmail={profile?.email ?? user.email ?? undefined}
            prefillName={fullName || undefined}
          />
        ) : (
          <div className="relative">
            <div className="pointer-events-none rounded-2xl border border-border bg-muted/40 p-12 blur-sm">
              <div className="h-[400px]" />
            </div>
            <Dialog open>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {isFreemium
                      ? 'Réservez votre accompagnement avec un abonnement payant'
                      : 'Accompagnement réservé aux abonnements individuels'}
                  </DialogTitle>
                  <DialogDescription>
                    {isFreemium
                      ? "L'accompagnement fiscal pédagogique est inclus à partir du plan Starter (49 €/an)."
                      : "Cet accompagnement est réservé aux abonnements individuels en V1. Prenez un abonnement Starter pour réserver."}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button asChild variant="cta" className="w-full">
                    <Link to="/tarifs?recommended=starter">Voir les abonnements</Link>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="mb-6 font-display text-2xl md:text-3xl">Questions fréquentes</h2>
        <Accordion type="single" collapsible className="w-full">
          {faq.map((item, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        Impôts Facile édité par ANNUL IMPOTS (SARL, SIREN 895 319 226).
        L'accompagnement fiscal pédagogique est un service d'information et d'éducation.
        Il ne constitue pas un conseil fiscal au sens réglementaire.
      </p>
    </div>
  );
}
