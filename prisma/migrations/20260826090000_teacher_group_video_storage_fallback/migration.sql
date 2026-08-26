-- Keep group media private while allowing the same resilient video fallback
-- size already used by workshop videos when Drive OAuth is unavailable.
UPDATE storage.buckets
SET file_size_limit = 367001600,
    public = false
WHERE id = 'teacher-group-attachments';
