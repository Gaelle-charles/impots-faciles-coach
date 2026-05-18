/**
 * Configuration Cal.com pour l'accompagnement fiscal pédagogique.
 *
 * VITE_CAL_EVENT_LINK : slug Cal.com de l'event type "Accompagnement 60 min".
 * VITE_CAL_BRAND_COLOR : couleur de marque utilisée par l'embed (violet Impôts Facile).
 *
 * Modifier ici si Cal.com renomme l'event ou si l'accompagnant change.
 */
export const CAL_EVENT_LINK =
  import.meta.env.VITE_CAL_EVENT_LINK ||
  'laure-impotsfacile/accompagnement-60min';

export const CAL_BRAND_COLOR =
  import.meta.env.VITE_CAL_BRAND_COLOR || '#2C1338';

export const ACCOMPAGNANT_NAME = 'Laure';
export const APPOINTMENT_PRICE_EUR = 100;
export const APPOINTMENT_DURATION_MIN = 60;
