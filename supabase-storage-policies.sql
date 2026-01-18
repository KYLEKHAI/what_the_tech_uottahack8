-- Storage Policies for repo-artifacts bucket
-- These need to be set up in Supabase Dashboard > Storage > Policies
-- Or via SQL (if your Supabase version supports it)

-- Note: Storage policies are typically set up via the Dashboard UI
-- Go to: Storage > repo-artifacts bucket > Policies > New Policy

-- Policy 1: Allow authenticated users to upload files to their project folders
-- Name: "Users can upload to their project folders"
-- Target roles: authenticated
-- Policy definition:
--   (bucket_id = 'repo-artifacts'::text) 
--   AND (auth.uid()::text = (storage.foldername(name))[1])

-- Policy 2: Allow authenticated users to read files from their project folders
-- Name: "Users can read from their project folders"
-- Target roles: authenticated
-- Policy definition:
--   (bucket_id = 'repo-artifacts'::text) 
--   AND (auth.uid()::text = (storage.foldername(name))[1])

-- Alternative: If you want to check project ownership via database:
-- For INSERT:
--   (bucket_id = 'repo-artifacts'::text)
--   AND EXISTS (
--     SELECT 1 FROM projects
--     WHERE projects.id::text = (storage.foldername(name))[1]
--     AND projects.user_id = auth.uid()
--   )

-- For SELECT:
--   (bucket_id = 'repo-artifacts'::text)
--   AND EXISTS (
--     SELECT 1 FROM projects
--     WHERE projects.id::text = (storage.foldername(name))[1]
--     AND projects.user_id = auth.uid()
--   )
