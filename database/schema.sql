CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  input_json JSONB NOT NULL,
  analysis_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS architectures (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  architecture_json JSONB NOT NULL,
  generation_metadata JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_project_architecture UNIQUE (project_id)
);

CREATE TABLE IF NOT EXISTS architecture_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  architecture_json JSONB NOT NULL,
  generation_metadata JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai_generation',
  change_description TEXT NOT NULL DEFAULT 'Initial architecture',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_project_version UNIQUE (project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_arch_versions_project ON architecture_versions(project_id, version DESC);
