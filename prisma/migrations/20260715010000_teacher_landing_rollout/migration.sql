-- Existing schools enter the teacher-only rollout immediately. New schools
-- retain the application default (student) until an admin changes the mode.
UPDATE "schools"
SET "features" = jsonb_set(
  COALESCE("features", '{}'::jsonb),
  '{landing_flow}',
  '"teacher"'::jsonb,
  true
)
WHERE NOT (COALESCE("features", '{}'::jsonb) ? 'landing_flow');
