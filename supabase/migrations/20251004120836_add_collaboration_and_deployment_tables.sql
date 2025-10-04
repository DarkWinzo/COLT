/*
  # Add Collaboration and Deployment Features

  1. New Tables
    - `project_collaborators`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, references auth.users)
      - `role` (text) - Collaborator role: 'owner', 'editor', 'viewer'
      - `created_at` (timestamptz)
    
    - `project_deployments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `url` (text) - Deployment URL
      - `status` (text) - Deployment status: 'pending', 'building', 'live', 'failed'
      - `provider` (text) - Deployment provider: 'vercel', 'netlify', 'custom'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `ai_generations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `prompt` (text) - User's natural language prompt
      - `project_id` (uuid, references projects)
      - `tokens_used` (integer) - Tokens consumed for this generation
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Collaborators can access projects based on their role
    - Only project owners can manage deployments
    - Users can view their own AI generation history
*/

CREATE TABLE IF NOT EXISTS project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id),
  CHECK (role IN ('owner', 'editor', 'viewer'))
);

CREATE TABLE IF NOT EXISTS project_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'custom',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (status IN ('pending', 'building', 'live', 'failed')),
  CHECK (provider IN ('vercel', 'netlify', 'custom'))
);

CREATE TABLE IF NOT EXISTS ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt text NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_id ON project_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_project_deployments_project_id ON project_deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);

ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collaborators of their projects"
  ON project_collaborators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Project owners can add collaborators"
  ON project_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can remove collaborators"
  ON project_collaborators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view deployments of own projects"
  ON project_deployments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_deployments.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create deployments for own projects"
  ON project_deployments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_deployments.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update deployments of own projects"
  ON project_deployments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_deployments.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_deployments.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own AI generations"
  ON ai_generations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create AI generations"
  ON ai_generations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_project_deployments_updated_at BEFORE UPDATE ON project_deployments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();