-- Normalise bonne_reponse: trim et collapse des espaces multiples
UPDATE public.quizz
SET bonne_reponse = regexp_replace(btrim(bonne_reponse), '\s+', ' ', 'g')
WHERE bonne_reponse IS NOT NULL
  AND bonne_reponse <> regexp_replace(btrim(bonne_reponse), '\s+', ' ', 'g');

-- Normalise chaque option du tableau options[]
UPDATE public.quizz q
SET options = sub.new_options
FROM (
  SELECT id,
         array_agg(regexp_replace(btrim(opt), '\s+', ' ', 'g') ORDER BY ord) AS new_options
  FROM public.quizz, unnest(options) WITH ORDINALITY AS t(opt, ord)
  GROUP BY id
) sub
WHERE q.id = sub.id
  AND q.options IS DISTINCT FROM sub.new_options;