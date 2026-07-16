INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('workshop-materials', 'workshop-materials', true, 41943040)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;
