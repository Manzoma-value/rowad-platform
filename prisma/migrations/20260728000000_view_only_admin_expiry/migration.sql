ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "view_only_expires_at" TIMESTAMP(3);

-- Storage requests go directly from the browser to Supabase and do not pass
-- through Next.js middleware. Restrictive policies keep view-only school
-- admins from creating, replacing, or deleting files even with a valid token.
DROP POLICY IF EXISTS "block_view_only_school_admin_inserts" ON storage.objects;
CREATE POLICY "block_view_only_school_admin_inserts"
ON storage.objects AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role::text = 'SCHOOL_ADMIN'
      AND profile.is_view_only = TRUE
  )
);

DROP POLICY IF EXISTS "block_view_only_school_admin_updates" ON storage.objects;
CREATE POLICY "block_view_only_school_admin_updates"
ON storage.objects AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (
  NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role::text = 'SCHOOL_ADMIN'
      AND profile.is_view_only = TRUE
  )
)
WITH CHECK (
  NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role::text = 'SCHOOL_ADMIN'
      AND profile.is_view_only = TRUE
  )
);

DROP POLICY IF EXISTS "block_view_only_school_admin_deletes" ON storage.objects;
CREATE POLICY "block_view_only_school_admin_deletes"
ON storage.objects AS RESTRICTIVE
FOR DELETE TO authenticated
USING (
  NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role::text = 'SCHOOL_ADMIN'
      AND profile.is_view_only = TRUE
  )
);
