# Sprint Accompagnement fiscal pédagogique (Cal.com)

Service RDV visio 100€/60min via Cal.com Free + Stripe natif, réservé B2C (Starter/Expert/Premium). Accompagnant unique : Laure (architecture scalable).

## Ordre d'exécution

### Étape 1 — Installation
- `bun add @calcom/embed-react`

### Étape 2 — Refactor email-templates (préalable aux 3 nouveaux emails)
- Créer `src/lib/email-templates.ts` (côté front, mais aussi utilisable côté edge functions via copie ou import)
- ⚠️ Les edge functions Deno ne peuvent pas importer depuis `src/`. **Décision** : créer plutôt `supabase/functions/_shared/email-templates.ts` (Deno) + une version frontend si besoin. On choisit la version Deno uniquement (les nouveaux emails sont dans edge functions).
- Exporte : `renderEmailLayout({title, bodyHtml, ctaButton?, signature?})`, `renderCtaButton(label, url)`, `renderDivider()`
- Styles inline, charte violet #2C1338 + jaune #F9E900, fallback Arial
- ⚠️ NE PAS toucher aux 5 emails existants

### Étape 3 — Refactor MobileBottomNav
- Ajouter champ `requiredPlans?: Plan[]` aux items
- Importer `useAccess`, filtrer items selon plan
- Items sans `requiredPlans` toujours visibles

### Étape 4 — Migration Supabase (via tool migration)
- Table `appointments` (cf. SQL fourni)
- Indexes + RLS `users_select_own_appointments`
- ⚠️ Ajouter aussi policy admin si besoin (à confirmer)

### Étape 5 — Secret Cal.com
- Demander `CAL_WEBHOOK_SECRET` via `add_secret` (pas dans la liste actuelle)

### Étape 6 — Edge function `cal-webhook`
- `verify_jwt = false` dans config.toml
- Vérif HMAC SHA256 (pattern repris de `track-free-simulation`)
- Switch sur `BOOKING_CREATED / CANCELLED / RESCHEDULED`, `MEETING_ENDED`
- Lookup user par email via `supabase.auth.admin.listUsers()`
- Toujours 200 OK même en erreur (sauf signature invalide → 401)

### Étape 7 — Composant `<CalEmbed />`
- `src/components/booking/CalEmbed.tsx`
- Wrapper `@calcom/embed-react` avec brand color + prefill

### Étape 8 — Page `/accompagnement`
- `src/pages/Accompagnement.tsx`
- Gating via `useAccess` : Freemium → overlay Dialog upgrade, B2B-only → message dédié, Starter+ → embed
- Sections : Hero, Card profil Laure, Bento 4 cards, Encadré cadre légal (ord. 1945), Embed Cal, FAQ 5 Accordion, Footer DGFiP
- Wording réglementaire strict (aucun terme interdit)
- Route ajoutée dans `App.tsx`

### Étape 9 — Page `/mes-rendez-vous`
- `src/pages/MesRendezVous.tsx`
- Liste appointments du user (RLS gère sécurité)
- Format date FR (date-fns/locale/fr déjà dispo), badges statut, CTA "Rejoindre" (window ±15min/+1h), "Annuler/Reprogrammer" (>24h)
- Empty state
- Route dans `App.tsx`

### Étape 10 — Navigation
- `AppSidebar` : ajouter "Prendre rendez-vous" (Calendar, requiredPlans starter+) + badge count scheduled, "Mes rendez-vous" (CalendarDays, visible si ≥1 appointment)
- `MobileBottomNav` : mêmes items après refactor étape 3
- ⚠️ Limite 5 items mobile : à arbitrer (probablement remplacer "Profil" ou regrouper)

### Étape 11 — 3 edge functions emails post-RDV
- `send-thank-you-email` — H+1 à H+2 après completed_at
- `send-resources-email` — J+7 à J+8 après scheduled_at
- `send-followup-email` — J+90 à J+91, skip si nouveau RDV existe
- Toutes utilisent `_shared/email-templates.ts`
- From: `Impôts Facile <noreply@impotsfacile.com>` (vérifier RESEND_FROM_EMAIL)

### Étape 12 — pg_cron (3 jobs horaires)
- Via `supabase--insert` (contient anon key spécifique projet)
- Hourly schedule pour les 3 fonctions

### Étape 13 — Variables d'env front
- ⚠️ `.env` est auto-géré, ne peut pas être édité
- **Décision** : utiliser des constantes en dur dans le code (`VITE_CAL_EVENT_LINK = "laure-impotsfacile/accompagnement-60min"`, `VITE_CAL_BRAND_COLOR = "#5B21B6"`) ou demander à l'utilisateur de les ajouter manuellement. Préférence : constantes dans `src/lib/cal-config.ts`.

## Points à clarifier avant implémentation

1. **CAL_WEBHOOK_SECRET** : confirmer que je le demande via add_secret maintenant.
2. **MobileBottomNav** déjà à 5 items + Équipe : ajouter "Prendre RDV" en feraient 6-7. Tu préfères :
   - (a) remplacer "Profil" sur mobile (accessible via menu)
   - (b) garder 5 + RDV remplace Simulateurs pour les payants
   - (c) accepter 6+ items quitte à scroller / réduire labels
3. **VITE_CAL_EVENT_LINK** : confirmer le slug exact `laure-impotsfacile/accompagnement-60min` ou j'utilise un placeholder à éditer.
4. **email-templates** : OK pour version Deno uniquement dans `supabase/functions/_shared/` (les 3 nouveaux emails sont tous côté edge function) ?
5. **From email** : utiliser le secret `RESEND_FROM_EMAIL` existant ou hardcoder `noreply@impotsfacile.com` ?

## Volume estimé
~15 fichiers créés/modifiés, 1 migration, 4 edge functions, 3 cron jobs. Sprint conséquent — je traite tout en séquence après tes réponses aux 5 points ci-dessus.