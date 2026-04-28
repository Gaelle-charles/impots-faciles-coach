-- Supprimer le trigger en doublon sur resultat_quiz
-- Deux triggers pointaient sur la même fonction validate_resultat_quiz,
-- ce qui faisait double-incrémenter tentative_numero et cassait la limite des 3 tentatives.
DROP TRIGGER IF EXISTS validate_resultat_quiz_trigger ON public.resultat_quiz;