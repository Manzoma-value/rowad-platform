-- Enable Row Level Security on the 11 tables that were created by earlier
-- raw-SQL migrations without it. Supabase's advisor flagged these as
-- "RLS Disabled in Public" (CRITICAL) because the public anon key could
-- reach them through PostgREST.
--
-- Why enabling RLS with NO policies is correct here:
--   * The app NEVER reads these tables through the Supabase data API
--     (PostgREST / anon key). All access is via Prisma.
--   * Prisma connects as the `postgres` role, which has rolbypassrls = true
--     and therefore ignores RLS entirely — the app keeps working untouched.
--   * With RLS enabled and no permissive policy, the anon and authenticated
--     PostgREST roles are denied by default. That closes the hole.
--
-- This mirrors how the other 44 public tables in this database already work.

ALTER TABLE "assessment_ratings"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group_assessments"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "owner_reports"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rowad_game_submissions"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_applications"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_group_announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_group_members"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_groups"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workshop_attendance"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workshop_attendance_codes"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workshops"                   ENABLE ROW LEVEL SECURITY;
