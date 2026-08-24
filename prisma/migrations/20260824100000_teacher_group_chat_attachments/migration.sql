ALTER TABLE "teacher_group_announcements"
  ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]';

-- Group-chat documents and images are private. The API issues short-lived,
-- authenticated URLs after confirming school/group membership.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('teacher-group-attachments', 'teacher-group-attachments', false, 41943040)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;
