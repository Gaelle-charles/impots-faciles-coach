/**
 * Types centralisés des plans d'abonnement.
 *
 * - B2CPlan : plans individuels (parcours grand public)
 * - B2BPlan : plans entreprise (Impôts Team). Seul "premium" est commercialisé.
 *
 * Les plans Team Starter et Team Expert ont été abandonnés (décision produit).
 * Garde-fou TypeScript : toute tentative de typer un plan B2B autre que
 * "premium" doit échouer à la compilation.
 */

export type B2CPlan = 'nouveau' | 'starter' | 'expert' | 'premium';

export type B2BPlan = 'premium';
