-- Create public bucket for organization logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helper: check if current user is admin of a given organization (by id in path)
CREATE OR REPLACE FUNCTION public.is_admin_of_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = p_org_id AND admin_user_id = auth.uid()
  );
$$;

-- Public read (bucket is public, but explicit policy for clarity)
DROP POLICY IF EXISTS "org_logos_public_read" ON storage.objects;
CREATE POLICY "org_logos_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-logos');

-- Insert: only org admin can upload to {organization_id}/...
DROP POLICY IF EXISTS "org_logos_admin_insert" ON storage.objects;
CREATE POLICY "org_logos_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-logos'
  AND public.is_admin_of_org(((storage.foldername(name))[1])::uuid)
);

-- Update: only org admin
DROP POLICY IF EXISTS "org_logos_admin_update" ON storage.objects;
CREATE POLICY "org_logos_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND public.is_admin_of_org(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'org-logos'
  AND public.is_admin_of_org(((storage.foldername(name))[1])::uuid)
);

-- Delete: only org admin
DROP POLICY IF EXISTS "org_logos_admin_delete" ON storage.objects;
CREATE POLICY "org_logos_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND public.is_admin_of_org(((storage.foldername(name))[1])::uuid)
);