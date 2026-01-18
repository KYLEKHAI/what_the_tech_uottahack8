-- RLS Policies for repo_artifacts table
-- These policies allow users to insert and read artifacts for their own projects

-- Enable RLS on repo_artifacts table (if not already enabled)
ALTER TABLE repo_artifacts ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own artifacts
-- Users can only insert artifacts for projects they own
CREATE POLICY "Users can insert their own artifacts"
ON repo_artifacts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = repo_artifacts.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Allow users to read their own artifacts
-- Users can only read artifacts for projects they own
CREATE POLICY "Users can read their own artifacts"
ON repo_artifacts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = repo_artifacts.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Allow users to update their own artifacts (optional, for future use)
CREATE POLICY "Users can update their own artifacts"
ON repo_artifacts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = repo_artifacts.project_id
    AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = repo_artifacts.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Allow users to delete their own artifacts (optional, for future use)
CREATE POLICY "Users can delete their own artifacts"
ON repo_artifacts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = repo_artifacts.project_id
    AND projects.user_id = auth.uid()
  )
);
