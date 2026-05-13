-- Insert missing official tax constants for frais_reels simulator, fiscal year 2025
INSERT INTO simulator_constants (simulator_key, fiscal_year, constant_key, value, unit, label, source) VALUES
  -- Voiture tranche 2 (5001-20000 km): formule d × coef + cst
  ('frais_reels', 2025, 'km_voiture_3cv_seuil2_coef', 0.316, '€/km', 'Coef tranche 5001-20000 km, 3 CV', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_4cv_seuil2_coef', 0.340, '€/km', 'Coef tranche 5001-20000 km, 4 CV', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_5cv_seuil2_coef', 0.357, '€/km', 'Coef tranche 5001-20000 km, 5 CV', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_6cv_seuil2_coef', 0.374, '€/km', 'Coef tranche 5001-20000 km, 6 CV', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_7cv_seuil2_coef', 0.394, '€/km', 'Coef tranche 5001-20000 km, 7 CV', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_3cv_seuil2_cst',  1065, '€',   'Constante tranche 2, 3 CV',         'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_4cv_seuil2_cst',  1330, '€',   'Constante tranche 2, 4 CV',         'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_5cv_seuil2_cst',  1395, '€',   'Constante tranche 2, 5 CV',         'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_6cv_seuil2_cst',  1457, '€',   'Constante tranche 2, 6 CV',         'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_7cv_seuil2_cst',  1515, '€',   'Constante tranche 2, 7 CV',         'Arrêté 27/03/2023'),
  -- Voiture tranche 3 (>20000 km): formule d × coef
  ('frais_reels', 2025, 'km_voiture_3cv_seuil3_coef', 0.370, '€/km', 'Coef tranche >20000 km, 3 CV', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_4cv_seuil3_coef', 0.407, '€/km', 'Coef tranche >20000 km, 4 CV', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_5cv_seuil3_coef', 0.427, '€/km', 'Coef tranche >20000 km, 5 CV', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_6cv_seuil3_coef', 0.447, '€/km', 'Coef tranche >20000 km, 6 CV', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_voiture_7cv_seuil3_coef', 0.470, '€/km', 'Coef tranche >20000 km, 7 CV', 'Arrêté 27/03/2023'),
  -- Plafonds et règles
  ('frais_reels', 2025, 'km_cv_plafond_voiture',     7,  'CV', 'Plafond CV voiture',                  'Brochure pratique 2026'),
  ('frais_reels', 2025, 'km_cv_plafond_deux_roues',  5,  'CV', 'Plafond CV deux-roues',               'Brochure pratique 2026'),
  ('frais_reels', 2025, 'km_plafond_distance_jour',  40, 'km', 'Plafond distance/jour sauf justif',  'BOI-RSA-BASE-30-50-30-20'),
  -- Repas
  ('frais_reels', 2025, 'repas_deduction_max_par_repas', 15.65, '€', 'Déduction max par repas justifié (21,10 - 5,45)', 'BOI-BNC-BASE-40-60-60'),
  -- Abattement 10%
  ('frais_reels', 2025, 'abattement_10_min', 495,   '€', 'Plancher abattement 10%', 'Art. 83-3° CGI'),
  ('frais_reels', 2025, 'abattement_10_max', 14171, '€', 'Plafond abattement 10%',  'Brochure pratique 2026 DGFiP'),
  -- Amortissement matériel
  ('frais_reels', 2025, 'materiel_seuil_amortissement', 500, '€', 'Seuil HT au-dessus duquel amortissement', 'BOFIP'),
  ('frais_reels', 2025, 'materiel_duree_ordinateur',    3,   'années', 'Durée amortissement ordinateur/smartphone', 'BOFIP'),
  ('frais_reels', 2025, 'materiel_duree_mobilier',      10,  'années', 'Durée amortissement mobilier',              'BOFIP'),
  ('frais_reels', 2025, 'materiel_duree_autre',         5,   'années', 'Durée amortissement autres biens',          'BOFIP'),
  -- Motocyclette (>50 cm³), 3 catégories CV × 3 tranches
  ('frais_reels', 2025, 'km_moto_1-2cv_seuil1_coef', 0.395, '€/km', 'Moto 1-2 CV, ≤3000 km',     'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_moto_1-2cv_seuil2_coef', 0.099, '€/km', 'Moto 1-2 CV, 3001-6000 km', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_moto_1-2cv_seuil2_cst',  891,   '€',    'Cst moto 1-2 CV',            'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_moto_1-2cv_seuil3_coef', 0.248, '€/km', 'Moto 1-2 CV, >6000 km',     'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_moto_3-5cv_seuil1_coef', 0.468, '€/km', 'Moto 3-5 CV, ≤3000 km',     'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_moto_3-5cv_seuil2_coef', 0.082, '€/km', 'Moto 3-5 CV, 3001-6000 km', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_moto_3-5cv_seuil2_cst',  1158,  '€',    'Cst moto 3-5 CV',            'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_moto_3-5cv_seuil3_coef', 0.275, '€/km', 'Moto 3-5 CV, >6000 km',     'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_moto_5cv+_seuil1_coef',  0.606, '€/km', 'Moto >5 CV, ≤3000 km',      'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_moto_5cv+_seuil2_coef',  0.079, '€/km', 'Moto >5 CV, 3001-6000 km',  'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_moto_5cv+_seuil2_cst',   1583,  '€',    'Cst moto >5 CV',             'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_moto_5cv+_seuil3_coef',  0.343, '€/km', 'Moto >5 CV, >6000 km',      'Arrêté 27/03/2023'),
  -- Cyclomoteur (≤50 cm³), 3 tranches uniques
  ('frais_reels', 2025, 'km_cyclo_seuil1_coef', 0.315, '€/km', 'Cyclo ≤3000 km',     'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_cyclo_seuil2_coef', 0.079, '€/km', 'Cyclo 3001-6000 km', 'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_cyclo_seuil2_cst',  711,   '€',    'Cst cyclo',           'Arrêté 27/03/2023'),
  ('frais_reels', 2025, 'km_cyclo_seuil3_coef', 0.198, '€/km', 'Cyclo >6000 km',     'Arrêté 27/03/2023')
ON CONFLICT (simulator_key, fiscal_year, constant_key) DO UPDATE 
  SET value = EXCLUDED.value, label = EXCLUDED.label, source = EXCLUDED.source, updated_at = NOW();