-- Bucket pour les logos de recommandations (public read, admin only write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recommandations-logos', 'recommandations-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture publique
DROP POLICY IF EXISTS "reco_logos_public_read" ON storage.objects;
CREATE POLICY "reco_logos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'recommandations-logos');

-- Insertion admin uniquement
DROP POLICY IF EXISTS "reco_logos_admin_insert" ON storage.objects;
CREATE POLICY "reco_logos_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recommandations-logos' AND public.is_admin());

-- Mise à jour admin uniquement
DROP POLICY IF EXISTS "reco_logos_admin_update" ON storage.objects;
CREATE POLICY "reco_logos_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'recommandations-logos' AND public.is_admin())
WITH CHECK (bucket_id = 'recommandations-logos' AND public.is_admin());

-- Suppression admin uniquement
DROP POLICY IF EXISTS "reco_logos_admin_delete" ON storage.objects;
CREATE POLICY "reco_logos_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recommandations-logos' AND public.is_admin());