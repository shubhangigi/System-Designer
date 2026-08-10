import crypto from 'node:crypto';
import type { ArchitectureChange, ArchitectureModel, ProjectInput, RequirementAnalysis } from '@archspace/shared';
import { query, withTransaction } from '../../database/db.js';
import type { GenerationMetadata } from '../../ai/orchestration/architectureOrchestrator.js';

export class VersionConflictError extends Error {
  constructor(public readonly expectedVersion: number, public readonly currentVersion: number) {
    super(`Version conflict: client expected version ${expectedVersion}, but current database version is ${currentVersion}.`);
    this.name = 'VersionConflictError';
  }
}

export interface ArchitectureVersionRecord {
  id: string;
  projectId: string;
  version: number;
  architecture: ArchitectureModel;
  metadata: GenerationMetadata;
  source: 'ai_generation' | 'user_edit' | 'regeneration' | 'import' | 'heuristic';
  changeDescription: string;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  input: ProjectInput;
  analysis: RequirementAnalysis;
  architecture: ArchitectureModel;
  metadata: GenerationMetadata;
  pendingChange?: ArchitectureChange;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// In-Memory Fallback Storage (Used when PostgreSQL database is unreachable)
// ---------------------------------------------------------------------------

const memProjects = new Map<string, ProjectRecord>();
const memVersions = new Map<string, ArchitectureVersionRecord[]>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToProjectRecord(row: any): ProjectRecord {
  return {
    id: row.id,
    input: typeof row.input_json === 'string' ? JSON.parse(row.input_json) : row.input_json,
    analysis: typeof row.analysis_json === 'string' ? JSON.parse(row.analysis_json) : row.analysis_json,
    architecture: typeof row.architecture_json === 'string' ? JSON.parse(row.architecture_json) : row.architecture_json,
    metadata: typeof row.generation_metadata === 'string' ? JSON.parse(row.generation_metadata) : row.generation_metadata,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function rowToVersionRecord(row: any): ArchitectureVersionRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    version: Number(row.version),
    architecture: typeof row.architecture_json === 'string' ? JSON.parse(row.architecture_json) : row.architecture_json,
    metadata: typeof row.generation_metadata === 'string' ? JSON.parse(row.generation_metadata) : row.generation_metadata,
    source: row.source,
    changeDescription: row.change_description,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Repository Implementation
// ---------------------------------------------------------------------------

export async function listProjects() {
  try {
    const result = await query(`
      SELECT p.id, p.name, p.description, p.updated_at, a.status,
             COALESCE((SELECT MAX(version) FROM architecture_versions v WHERE v.project_id = p.id), 1) as current_version
      FROM projects p
      LEFT JOIN architectures a ON p.id = a.project_id
      ORDER BY p.updated_at DESC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      updatedAt: new Date(row.updated_at).toISOString(),
      status: row.status || 'draft',
      version: Number(row.current_version),
    }));
  } catch (dbErr: any) {
    // Fallback to memory
    return Array.from(memProjects.values()).map((p) => ({
      id: p.id,
      name: p.input.name,
      description: p.input.description,
      updatedAt: p.updatedAt,
      status: p.architecture.status || 'draft',
      version: (memVersions.get(p.id)?.length ?? 1),
    }));
  }
}

export async function createProjectRecord(params: {
  id?: string;
  input: ProjectInput;
  analysis: RequirementAnalysis;
  architecture: ArchitectureModel;
  metadata: GenerationMetadata;
}): Promise<ProjectRecord> {
  const projectId = params.id || params.architecture.id;
  const now = new Date();

  try {
    return await withTransaction(async (client) => {
      // 1. Insert project
      await client.query(
        `INSERT INTO projects (id, name, description, requirements, input_json, analysis_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           requirements = EXCLUDED.requirements,
           input_json = EXCLUDED.input_json,
           analysis_json = EXCLUDED.analysis_json,
           updated_at = EXCLUDED.updated_at`,
        [
          projectId,
          params.input.name,
          params.input.description,
          params.input.requirements,
          JSON.stringify(params.input),
          JSON.stringify(params.analysis),
          now,
          now,
        ],
      );

      // 2. Insert architecture
      const archId = `arch-${projectId}`;
      await client.query(
        `INSERT INTO architectures (id, project_id, architecture_json, generation_metadata, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (project_id) DO UPDATE SET
           architecture_json = EXCLUDED.architecture_json,
           generation_metadata = EXCLUDED.generation_metadata,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at`,
        [
          archId,
          projectId,
          JSON.stringify(params.architecture),
          JSON.stringify(params.metadata),
          params.architecture.status || 'draft',
          now,
          now,
        ],
      );

      // 3. Insert initial version
      const versionId = crypto.randomUUID();
      const source = params.metadata.generatedBy === 'ai' ? 'ai_generation' : 'heuristic';
      await client.query(
        `INSERT INTO architecture_versions (id, project_id, version, architecture_json, generation_metadata, source, change_description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (project_id, version) DO UPDATE SET
           architecture_json = EXCLUDED.architecture_json,
           generation_metadata = EXCLUDED.generation_metadata`,
        [
          versionId,
          projectId,
          1,
          JSON.stringify(params.architecture),
          JSON.stringify(params.metadata),
          source,
          'Initial architecture generation',
          now,
        ],
      );

      const record: ProjectRecord = {
        id: projectId,
        input: params.input,
        analysis: params.analysis,
        architecture: params.architecture,
        metadata: params.metadata,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      memProjects.set(projectId, record);
      return record;
    });
  } catch (dbErr: any) {
    // Fallback in-memory
    const record: ProjectRecord = {
      id: projectId,
      input: params.input,
      analysis: params.analysis,
      architecture: params.architecture,
      metadata: params.metadata,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    memProjects.set(projectId, record);

    const versionRecord: ArchitectureVersionRecord = {
      id: crypto.randomUUID(),
      projectId,
      version: 1,
      architecture: params.architecture,
      metadata: params.metadata,
      source: params.metadata.generatedBy === 'ai' ? 'ai_generation' : 'heuristic',
      changeDescription: 'Initial architecture generation',
      createdAt: now.toISOString(),
    };
    memVersions.set(projectId, [versionRecord]);

    return record;
  }
}

export async function saveProject(project: ProjectRecord) {
  return createProjectRecord({
    id: project.id,
    input: project.input,
    analysis: project.analysis,
    architecture: project.architecture,
    metadata: project.metadata || { generatedBy: 'heuristic', generatedAt: new Date().toISOString(), version: 1 },
  });
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  try {
    const result = await query(
      `SELECT p.*, a.architecture_json, a.generation_metadata
       FROM projects p
       LEFT JOIN architectures a ON p.id = a.project_id
       WHERE p.id = $1`,
      [id],
    );

    if (result.rows.length === 0) return memProjects.get(id) ?? null;
    return rowToProjectRecord(result.rows[0]);
  } catch (dbErr: any) {
    return memProjects.get(id) ?? null;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  let dbDeleted = false;
  try {
    const result = await query(`DELETE FROM projects WHERE id = $1`, [id]);
    dbDeleted = (result.rowCount ?? 0) > 0;
  } catch (dbErr: any) {
    // Ignore DB error for in-memory fallback
  }

  const memDeleted = memProjects.delete(id);
  memVersions.delete(id);
  return dbDeleted || memDeleted;
}

export async function saveArchitecture(
  projectId: string,
  architecture: ArchitectureModel,
  metadata?: GenerationMetadata,
  source: 'ai_generation' | 'user_edit' | 'regeneration' | 'import' | 'heuristic' = 'user_edit',
  changeDescription: string = 'Architecture updated',
  expectedVersion?: number,
): Promise<{ architecture: ArchitectureModel; version: number; metadata: GenerationMetadata }> {
  try {
    return await withTransaction(async (client) => {
      const versionRes = await client.query(
        `SELECT COALESCE(MAX(version), 0) as max_version FROM architecture_versions WHERE project_id = $1`,
        [projectId],
      );
      const currentVersion = Number(versionRes.rows[0]?.max_version ?? 0);

      if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
        throw new VersionConflictError(expectedVersion, currentVersion);
      }

      const nextVersion = currentVersion + 1;
      const now = new Date();
      const effectiveMetadata: GenerationMetadata = metadata ?? {
        generatedBy: source === 'user_edit' ? 'heuristic' : 'ai',
        generatedAt: now.toISOString(),
        version: nextVersion,
      };

      await client.query(
        `UPDATE architectures
         SET architecture_json = $1, generation_metadata = $2, status = $3, updated_at = $4
         WHERE project_id = $5`,
        [JSON.stringify(architecture), JSON.stringify(effectiveMetadata), architecture.status || 'draft', now, projectId],
      );

      await client.query(`UPDATE projects SET updated_at = $1 WHERE id = $2`, [now, projectId]);

      const versionId = crypto.randomUUID();
      await client.query(
        `INSERT INTO architecture_versions (id, project_id, version, architecture_json, generation_metadata, source, change_description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          versionId,
          projectId,
          nextVersion,
          JSON.stringify(architecture),
          JSON.stringify(effectiveMetadata),
          source,
          changeDescription,
          now,
        ],
      );

      return {
        architecture,
        version: nextVersion,
        metadata: effectiveMetadata,
      };
    });
  } catch (error) {
    if (error instanceof VersionConflictError) throw error;

    // Fallback to memory
    const existingVersions = memVersions.get(projectId) ?? [];
    const currentVersion = existingVersions.length;

    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new VersionConflictError(expectedVersion, currentVersion);
    }

    const nextVersion = currentVersion + 1;
    const now = new Date().toISOString();
    const effectiveMetadata: GenerationMetadata = metadata ?? {
      generatedBy: source === 'user_edit' ? 'heuristic' : 'ai',
      generatedAt: now,
      version: nextVersion,
    };

    const project = memProjects.get(projectId);
    if (project) {
      project.architecture = architecture;
      project.metadata = effectiveMetadata;
      project.updatedAt = now;
      memProjects.set(projectId, project);
    }

    const newVerRecord: ArchitectureVersionRecord = {
      id: crypto.randomUUID(),
      projectId,
      version: nextVersion,
      architecture,
      metadata: effectiveMetadata,
      source,
      changeDescription,
      createdAt: now,
    };

    memVersions.set(projectId, [...existingVersions, newVerRecord]);

    return {
      architecture,
      version: nextVersion,
      metadata: effectiveMetadata,
    };
  }
}

export async function upsertArchitecture(id: string, architecture: ArchitectureModel) {
  await saveArchitecture(id, architecture, undefined, 'user_edit', 'Architecture updated');
  return getProject(id);
}

export async function getArchitectureVersions(projectId: string): Promise<ArchitectureVersionRecord[]> {
  try {
    const result = await query(
      `SELECT * FROM architecture_versions WHERE project_id = $1 ORDER BY version ASC`,
      [projectId],
    );
    if (result.rows.length > 0) return result.rows.map(rowToVersionRecord);
  } catch (dbErr: any) {
    // Ignore and fallback
  }

  return memVersions.get(projectId) ?? [];
}

export async function getArchitectureVersion(projectId: string, version: number): Promise<ArchitectureVersionRecord | null> {
  try {
    const result = await query(
      `SELECT * FROM architecture_versions WHERE project_id = $1 AND version = $2`,
      [projectId, version],
    );
    if (result.rows.length > 0) return rowToVersionRecord(result.rows[0]);
  } catch (dbErr: any) {
    // Ignore and fallback
  }

  const versions = memVersions.get(projectId) ?? [];
  return versions.find((v) => v.version === version) ?? null;
}
