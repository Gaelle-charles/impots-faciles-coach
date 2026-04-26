## Ajout étape "Acceptation CGV/CGU" avant paiement B2B

Insérer une 3e étape dans le tunnel de souscription `ImpotsTeamSouscription.tsx` qui force l'utilisateur à cocher l'acceptation des CGV et CGU avant la redirection Stripe.

### Modifications dans `src/pages/ImpotsTeamSouscription.tsx`

1. **State** : étendre le type d'étape à `'entreprise' | 'compte' | 'acceptation'` + ajouter `acceptCgv` et `acceptCgu` (booléens).

2. **Étape compte → bouton "Continuer"** au lieu de "Procéder au paiement" : passe à l'étape `acceptation` (au lieu d'appeler `handleSubmit` directement).

3. **Nouvelle étape `acceptation`** :
   - Récap commande (plan, nb licences, total annuel TTC).
   - 2 cases à cocher (composant `Checkbox` shadcn déjà présent) :
     - ☐ « J'ai lu et j'accepte les [Conditions Générales de Vente](/legal/cgv) »
     - ☐ « J'ai lu et j'accepte les [Conditions Générales d'Utilisation](/legal/cgu) »
   - Liens ouverts dans un nouvel onglet (`target="_blank" rel="noopener noreferrer"`).
   - Bouton « Procéder au paiement sécurisé » **désactivé** tant que les deux cases ne sont pas cochées.
   - Bouton « Retour » vers l'étape `compte`.
   - `handleSubmit` n'est appelé qu'ici, et vérifie en garde-fou `acceptCgv && acceptCgu` (toast destructif sinon).

4. **Indicateur de progression léger** (optionnel mais utile) : petit fil d'Ariane texte « Étape 3 / 3 — Conditions » au-dessus du contenu pour situer l'utilisateur.

5. **Traçabilité (côté client uniquement, simple)** : passer `cgv_accepted_at` et `cgu_accepted_at` (ISO timestamps) dans le `body` de `supabase.functions.invoke('create-team-checkout-session', ...)`. L'edge function actuelle ignore ces champs (pas bloquant), ils seront simplement disponibles si on veut les persister plus tard.

### Hors scope (peut être fait plus tard)
- Persistance serveur de l'acceptation (colonne `cgv_accepted_at` sur `organizations` + écriture dans l'edge function).
- Acceptation également sur le tunnel B2C (`create-checkout-session`).

Dites-moi si vous voulez inclure la persistance serveur dès maintenant ou rester sur l'UI seule.
