# TODO avant ouverture publique du 30 avril 2026

- [ ] Retirer la meta noindex,nofollow de index.html
- [ ] Vider robots.txt (laisser User-agent: * + Allow: /)
- [ ] Vérifier que Stripe est en mode LIVE
- [ ] Tester paiement réel B2C 49€

## V1.1 — Améliorations post-lancement (semaine du 5 mai)

- [ ] Onboarding : ajouter case "Je réside en Outre-Mer (DROM/COM)" 
      à l'écran 5. Conditionner l'affichage de l'écran 6 sur ce 
      critère + adapter la fiche profil 14 (Résident DROM). 
      +1 point au scoring. Cible : marché Antilles/Réunion 
      (cohérent avec localisation de Laure CHANTEUR en Guadeloupe).

- [ ] Garde-fou suppression admin orga : bloquer le soft-delete 
      d'un admin_with_license tant qu'un autre admin n'a pas été 
      désigné OU que l'orga n'a pas été résiliée. Inclure 
      annulation de l'abonnement orga Stripe.

- [ ] Job hebdo de réconciliation Stripe : détecter les users 
      soft-deleted (deleted_at IS NOT NULL) qui ont encore un 
      abonnement Stripe actif, et tenter de l'annuler à nouveau 
      (best-effort).
