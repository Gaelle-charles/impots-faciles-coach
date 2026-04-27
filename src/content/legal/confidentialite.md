> Document conforme au Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 (RGPD) et à la loi n° 78-17 du 6 janvier 1978 modifiée relative à l'informatique, aux fichiers et aux libertés.

---

## 1. Responsable du traitement

Le responsable du traitement des données personnelles collectées sur la plateforme Impôts Facile est :

| Champ | Valeur |
|---|---|
| Dénomination | **ANNUL IMPOTS** |
| Forme juridique | SARL au capital de 500 € |
| SIRET | 89531922600018 |
| Adresse | 340 Route de la Bouaye, 97190 Le Gosier, Guadeloupe |
| Représentante légale | Madame Laure CHANTEUR |
| Email contact RGPD | `info@impotsfacile.com` |
| Délégué à la Protection des Données (DPO interne) | Madame Laure CHANTEUR — `info@impotsfacile.com` |

---

## 2. Données collectées

### 2.1 Données d'identification

| Donnée | Source | Obligatoire |
|---|---|---|
| Prénom | Formulaire d'inscription | Oui |
| Nom de famille | Formulaire de facturation | Oui |
| Adresse email | Formulaire d'inscription | Oui |
| Adresse postale | Formulaire de facturation | Oui (B2C) |
| Numéro de téléphone | Optionnel à l'inscription | Non |

Pour les souscriptions B2B, des informations complémentaires sont collectées sur l'entreprise souscriptrice : raison sociale, SIRET, adresse de facturation, TVA intracommunautaire.

### 2.2 Données de situation fiscale — Traitement spécifique

Les informations relatives à la situation fiscale (revenus, charges déductibles, composition du foyer fiscal, etc.) saisies dans les simulateurs sont des **données personnelles à caractère sensible** au regard de leur nature confidentielle. Elles font l'objet de mesures de protection renforcées.

| Donnée | Source | Traitement |
|---|---|---|
| Revenus déclarés (estimatifs) | Simulateurs | Stockage chiffré, non transmis à des tiers |
| Situation familiale fiscale | Simulateurs / Onboarding | Utilisé exclusivement pour la prestation pédagogique |
| Type de revenus (salaires, BIC, BNC, etc.) | Simulateurs | Traitement confidentiel |
| Profil contribuable détecté | Onboarding 7 étapes | Personnalisation du parcours pédagogique |

### 2.3 Données de navigation

| Donnée | Source |
|---|---|
| Adresse IP | Logs serveur automatiques |
| Navigateur et appareil | Logs serveur / cookies techniques |
| Pages visitées et durée de navigation | Analytics (avec consentement) |
| Cookies de session | Navigateur |

### 2.4 Données de paiement

Les données bancaires (numéro de carte, date d'expiration, CVV) sont collectées et traitées **directement par Stripe Inc.** conformément à sa propre politique de confidentialité certifiée PCI-DSS. ANNUL IMPOTS ne stocke, ne traite et n'a jamais accès aux données bancaires complètes des clients.

Seules les informations de confirmation de transaction (montant, date, référence) sont conservées par ANNUL IMPOTS à des fins de facturation et de comptabilité.

---

## 3. Finalités du traitement

| Finalité | Description | Base légale |
|---|---|---|
| Exécution du contrat | Création et gestion du compte, accès à la plateforme, envoi des factures | Article 6.1.b RGPD — Exécution du contrat |
| Gestion des paiements | Traitement des transactions via Stripe | Article 6.1.b RGPD — Exécution du contrat |
| Communication transactionnelle | Emails de confirmation, accès, rappels d'abonnement | Article 6.1.b RGPD — Exécution du contrat |
| Personnalisation du parcours | Adaptation des contenus pédagogiques au profil contribuable | Article 6.1.b RGPD — Exécution du contrat |
| Marketing et newsletter | Envoi d'emails commerciaux, promotions, nouveaux contenus | Article 6.1.a RGPD — Consentement |
| Amélioration du service | Analyse anonymisée des usages pour optimiser la plateforme | Article 6.1.f RGPD — Intérêt légitime |
| Sécurité de la plateforme | Détection des fraudes, protection contre les attaques | Article 6.1.f RGPD — Intérêt légitime |
| Obligations comptables et légales | Conservation des factures, gestion des litiges | Article 6.1.c RGPD — Obligation légale |

---

## 4. Bases légales des traitements

Conformément à l'article 6 du RGPD, chaque traitement repose sur l'une des bases légales suivantes :

- **Consentement** (art. 6.1.a) : pour les communications marketing, l'utilisation des cookies non essentiels. Le consentement peut être retiré à tout moment.
- **Exécution du contrat** (art. 6.1.b) : pour le traitement nécessaire à la fourniture des services commandés.
- **Intérêt légitime** (art. 6.1.f) : pour l'amélioration des services et la sécurité de la plateforme, sous réserve des droits et libertés des personnes concernées.
- **Obligation légale** (art. 6.1.c) : pour la conservation des données comptables et la réponse aux réquisitions légales.

---

## 5. Durée de conservation des données

| Catégorie de données | Durée de conservation |
|---|---|
| Données de compte client actif | Durée de la relation contractuelle + 3 ans (délai de prescription de droit commun) |
| Données de facturation et comptables | 10 ans à compter de la clôture de l'exercice (art. L123-22 du Code de commerce) |
| Données marketing (newsletter) | Jusqu'au retrait du consentement ou 3 ans d'inactivité |
| Données de navigation (logs) | 13 mois maximum (recommandation CNIL) |
| Données de situation fiscale (simulateurs) | Durée de l'abonnement + 1 an pour traçabilité du parcours |
| Cookies de mesure d'audience | 13 mois maximum |
| Cookies de personnalisation | 13 mois maximum |

À l'expiration des délais de conservation, les données sont supprimées de manière sécurisée ou anonymisées.

---

## 6. Destinataires des données

Les données personnelles sont susceptibles d'être transmises aux prestataires techniques suivants, dans le cadre strict de leur mission :

| Prestataire | Rôle | Pays |
|---|---|---|
| **Stripe Inc.** | Traitement des paiements | États-Unis (CCT — Clauses Contractuelles Types) |
| **Lovable Inc.** | Hébergement de la plateforme et infrastructure cloud | États-Unis (CCT) |
| **Resend** | Envoi des emails transactionnels (invitations B2B, confirmations) | États-Unis (CCT) |
| **Supabase** | Base de données et authentification | États-Unis (CCT) |

ANNUL IMPOTS s'engage formellement à **ne jamais vendre, louer ou céder les données personnelles de ses clients à des tiers** à des fins commerciales ou publicitaires.

---

## 7. Transferts de données hors Union Européenne

Certains prestataires (Stripe, Lovable, Resend, Supabase) sont établis aux États-Unis. Ces transferts hors UE sont encadrés par les **Clauses Contractuelles Types (CCT)** adoptées par la Commission européenne conformément à la décision d'exécution 2021/914 du 4 juin 2021, garantissant un niveau de protection adéquat des données personnelles.

L'utilisateur peut obtenir une copie de ces clauses sur demande à `info@impotsfacile.com`.

---

## 8. Droits des personnes concernées

Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants sur vos données personnelles :

| Droit | Description |
|---|---|
| Droit d'accès (art. 15 RGPD) | Obtenir confirmation du traitement et recevoir une copie de vos données |
| Droit de rectification (art. 16 RGPD) | Corriger des données inexactes ou incomplètes |
| Droit à l'effacement (art. 17 RGPD) | Demander la suppression (sous réserve des obligations légales de conservation) |
| Droit à la limitation (art. 18 RGPD) | Limiter le traitement dans certains cas |
| Droit à la portabilité (art. 20 RGPD) | Recevoir vos données dans un format structuré et lisible |
| Droit d'opposition (art. 21 RGPD) | Vous opposer au traitement basé sur l'intérêt légitime ou marketing direct |
| Retrait du consentement | Retirer à tout moment votre consentement pour les traitements fondés sur celui-ci |

**Comment exercer vos droits :**

Adressez votre demande par email à `info@impotsfacile.com` en précisant :

- Votre nom, prénom et adresse email associés à votre compte
- Le droit que vous souhaitez exercer
- Le cas échéant, une copie d'un justificatif d'identité

ANNUL IMPOTS s'engage à répondre dans un délai maximum d'**un mois** à compter de la réception de la demande (délai pouvant être prorogé de 2 mois supplémentaires en cas de complexité, avec notification préalable).

**Droit de réclamation :**

Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :

- Site web : `www.cnil.fr`
- Adresse : 3 Place de Fontenoy — TSA 80715 — 75334 PARIS CEDEX 07

---

## 9. Politique en matière de cookies

### 9.1 Qu'est-ce qu'un cookie ?

Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site web. Il permet au site de mémoriser vos préférences et d'analyser votre navigation.

### 9.2 Types de cookies utilisés

| Catégorie | Description | Base légale | Durée |
|---|---|---|---|
| Cookies essentiels | Fonctionnement du site (authentification, session) | Intérêt légitime — Pas de consentement requis | Session / 13 mois max |
| Cookies analytiques | Mesure d'audience (Google Analytics ou équivalent) | Consentement | 13 mois |
| Cookies marketing | Publicité ciblée, remarketing | Consentement | 13 mois |
| Cookies fonctionnels | Préférences utilisateur (langue, thème) | Consentement ou intérêt légitime | 13 mois |

### 9.3 Gestion du consentement

Lors de votre première visite, un bandeau de gestion des cookies vous est présenté conformément aux recommandations de la CNIL. Vous pouvez à tout moment :

- Accepter l'ensemble des cookies
- Refuser les cookies non essentiels
- Personnaliser vos préférences par catégorie

Vous pouvez également paramétrer votre navigateur pour bloquer ou supprimer les cookies. Le blocage des cookies essentiels peut altérer le fonctionnement de la plateforme.

---

## 10. Sécurité des données

ANNUL IMPOTS met en œuvre des mesures techniques et organisationnelles appropriées pour assurer un niveau de sécurité adapté au risque, notamment :

- Chiffrement des données en transit (HTTPS/TLS) et au repos
- Authentification forte des comptes administrateurs
- Sauvegarde régulière des données
- Politique de gestion des incidents de sécurité
- Sensibilisation des intervenants à la confidentialité des données

En cas de violation de données susceptible d'engendrer un risque pour les droits et libertés des personnes concernées, ANNUL IMPOTS notifie la CNIL dans un délai de 72 heures et informe les personnes concernées dans les meilleurs délais.

---

## 11. Modification de la politique de confidentialité

ANNUL IMPOTS se réserve le droit de modifier la présente politique pour tenir compte des évolutions législatives, réglementaires ou techniques.

En cas de modification substantielle, les utilisateurs sont informés par email ou notification dans la plateforme avec un préavis raisonnable.

---

**Politique de Confidentialité — Version 1.0 — Avril 2026**
