import archiver from 'archiver';
import { Router } from 'express';
import { ProjectInputSchema, type ArchitectureModel } from '@archspace/shared';
import { analyzeCodeFiles } from '../modules/analysis/CodebaseAnalysisService.js';
import { applyArchitectureChange, createArchitecture, proposeArchitectureChange } from '../modules/architecture/ArchitectureService.js';
import { detectDrift, constructActualArchitectureModel, compareArchitectures } from '../modules/drift/DriftDetector.js';
import { buildFileTree, generateScaffold } from '../modules/generation/GenerationService.js';
import {
  createProjectRecord,
  deleteProject,
  getArchitectureVersion,
  getArchitectureVersions,
  getProject,
  listProjects,
  saveArchitecture,
  VersionConflictError,
} from '../modules/projects/ProjectRepository.js';
import { analyzeRequirements } from '../modules/requirements/RequirementService.js';
import { validateArchitecture, validateCanonicalArchitecture } from '../modules/validation/ValidationService.js';
import { environment } from '../config/environment.js';
import { generateArchitectureWithAI, generateArchitectureWithHeuristic } from '../ai/orchestration/architectureOrchestrator.js';
import { AIProviderNotConfiguredError, AIProviderError, AIResponseParseError } from '../ai/providers/AIProvider.js';
import type { ProjectContext } from '../ai/providers/AIProvider.js';

export const projectRoutes = Router();

// ---- Helpers ----------------------------------------------------------------

function projectContextFromInput(input: {
  name: string;
  description: string;
  expectedScale?: string;
  frontendPreference?: string;
  backendPreference?: string;
  databasePreference?: string;
  authenticationMethod?: string;
}): ProjectContext {
  return {
    projectName: input.name,
    description: input.description,
    frontendPreference: input.frontendPreference ?? 'React + TypeScript',
    backendPreference: input.backendPreference ?? 'Node.js + Express',
    databasePreference: input.databasePreference ?? 'PostgreSQL',
    authenticationMethod: input.authenticationMethod ?? 'JWT sessions',
    expectedScale: input.expectedScale ?? '100K monthly users',
  };
}

function handleAIError(error: unknown, res: import('express').Response) {
  if (error instanceof AIProviderNotConfiguredError) {
    return res.status(503).json({
      error: error.message,
      code: 'AI_NOT_CONFIGURED',
    });
  }
  if (error instanceof AIProviderError) {
    return res.status(502).json({
      error: `AI provider error: ${error.message}`,
      code: 'AI_PROVIDER_ERROR',
    });
  }
  if (error instanceof AIResponseParseError) {
    return res.status(502).json({
      error: 'AI returned an invalid architecture response. Please try again.',
      code: 'AI_RESPONSE_INVALID',
    });
  }
  if (error instanceof VersionConflictError) {
    return res.status(409).json({
      error: error.message,
      expectedVersion: error.expectedVersion,
      currentVersion: error.currentVersion,
      code: 'VERSION_CONFLICT',
    });
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('[ArchSpace Routes Error]:', message);
  return res.status(500).json({ error: 'Internal server error' });
}

// ---- Routes -----------------------------------------------------------------

projectRoutes.get('/projects', async (_req, res) => {
  try {
    const projects = await listProjects();
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

projectRoutes.post('/projects', async (req, res) => {
  try {
    const input = ProjectInputSchema.parse(req.body);
    const mode = environment.generationMode;

    let result;
    if (mode === 'heuristic') {
      result = generateArchitectureWithHeuristic(input);
    } else {
      const context = projectContextFromInput(input);
      result = await generateArchitectureWithAI(input.requirements, context);
    }

    const project = await createProjectRecord({
      id: result.architecture.id,
      input,
      analysis: result.analysis,
      architecture: result.architecture,
      metadata: result.metadata,
    });

    return res.status(201).json({
      ...project,
      metadata: result.metadata,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: (error as any).errors ?? error.message });
    }
    return handleAIError(error, res);
  }
});

projectRoutes.get('/projects/:id', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    return res.json(project);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

projectRoutes.delete('/projects/:id', async (req, res) => {
  try {
    const deleted = await deleteProject(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Project not found' });
    return res.json({ success: true, message: 'Project deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

projectRoutes.put('/projects/:id/architecture', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const architecture = req.body.architecture || req.body;
    const changeDescription = String(req.body.changeDescription ?? 'Architecture updated');
    const expectedVersion = req.body.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined;

    const saved = await saveArchitecture(
      req.params.id,
      architecture as ArchitectureModel,
      undefined,
      'user_edit',
      changeDescription,
      expectedVersion,
    );

    const updatedProject = await getProject(req.params.id);
    return res.json({
      ...updatedProject,
      version: saved.version,
      metadata: saved.metadata,
    });
  } catch (error) {
    return handleAIError(error, res);
  }
});

projectRoutes.post('/projects/:id/architecture/approve', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const approvedArchitecture: ArchitectureModel = {
      ...project.architecture,
      status: 'approved',
    };

    const saved = await saveArchitecture(
      req.params.id,
      approvedArchitecture,
      undefined,
      'user_edit',
      'Architecture approved',
    );

    return res.json({
      ...approvedArchitecture,
      version: saved.version,
    });
  } catch (error) {
    return handleAIError(error, res);
  }
});

projectRoutes.post('/projects/:id/architecture/propose-change', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const instruction = String(req.body.instruction ?? '');
    const change = proposeArchitectureChange(project.architecture, instruction);
    return res.json(change);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

projectRoutes.post('/projects/:id/architecture/apply-change', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const instruction = String(req.body.instruction ?? 'Apply architecture change');
    const change = proposeArchitectureChange(project.architecture, instruction);
    const updatedArchitecture = applyArchitectureChange(project.architecture, change);

    const saved = await saveArchitecture(
      req.params.id,
      updatedArchitecture,
      undefined,
      'user_edit',
      `Applied change: ${change.summary}`,
    );

    return res.json({
      ...updatedArchitecture,
      version: saved.version,
    });
  } catch (error) {
    return handleAIError(error, res);
  }
});

projectRoutes.post('/projects/:id/validate', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const findings = validateCanonicalArchitecture(project.architecture);
    const hasErrors = findings.some((f) => f.severity === 'ERROR');
    return res.json({
      valid: !hasErrors,
      errorCount: findings.filter((f) => f.severity === 'ERROR').length,
      warningCount: findings.filter((f) => f.severity === 'WARNING').length,
      findings,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// AI-powered architecture generation/regeneration
projectRoutes.post('/projects/:id/architecture/generate', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const requirements = String(req.body.requirements ?? project.input.requirements);
    if (!requirements || requirements.length < 8) {
      return res.status(400).json({ error: 'Requirements must be at least 8 characters.' });
    }

    const mode = environment.generationMode;
    let result;

    if (mode === 'heuristic') {
      result = generateArchitectureWithHeuristic({ ...project.input, requirements });
    } else {
      const context = projectContextFromInput({ ...project.input, description: requirements });
      result = await generateArchitectureWithAI(requirements, context);
    }

    const saved = await saveArchitecture(
      req.params.id,
      result.architecture,
      result.metadata,
      'regeneration',
      'Regenerated architecture',
    );

    return res.json({
      success: true,
      architecture: result.architecture,
      analysis: result.analysis,
      metadata: result.metadata,
      version: saved.version,
    });
  } catch (error) {
    return handleAIError(error, res);
  }
});

// History / Version endpoints
projectRoutes.get('/projects/:id/architecture/versions', async (req, res) => {
  try {
    const versions = await getArchitectureVersions(req.params.id);
    return res.json(versions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

projectRoutes.get('/projects/:id/architecture/versions/:version', async (req, res) => {
  try {
    const versionNumber = Number(req.params.version);
    if (isNaN(versionNumber)) return res.status(400).json({ error: 'Invalid version number' });

    const versionRecord = await getArchitectureVersion(req.params.id, versionNumber);
    if (!versionRecord) return res.status(404).json({ error: 'Version not found' });
    return res.json(versionRecord);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

projectRoutes.get('/projects/:id/scaffold', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const files = generateScaffold(project.architecture);
    return res.json({ files, tree: buildFileTree(files) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

projectRoutes.post('/projects/:id/analyze-codebase', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const files = Array.isArray(req.body.files) ? req.body.files : [];
    const analysis = analyzeCodeFiles(files);
    const violations = validateArchitecture(project.architecture, analysis);
    const drift = detectDrift(project.architecture, analysis);
    const actualArchitecture = constructActualArchitectureModel(analysis, project.architecture);
    const driftReport = compareArchitectures(project.architecture, actualArchitecture);

    return res.json({ analysis, violations, drift, actualArchitecture, driftReport });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

projectRoutes.post('/projects/:id/compare', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    let actualArchitecture: ArchitectureModel;
    if (req.body.actualArchitecture) {
      actualArchitecture = req.body.actualArchitecture as ArchitectureModel;
    } else {
      const files = Array.isArray(req.body.files) ? req.body.files : [];
      const analysis = analyzeCodeFiles(files);
      actualArchitecture = constructActualArchitectureModel(analysis, project.architecture);
    }

    const report = compareArchitectures(project.architecture, actualArchitecture);
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

projectRoutes.get('/projects/:id/export/architecture.json', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(project.architecture, null, 2));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

projectRoutes.get('/projects/:id/export/project.zip', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${project.architecture.id}.zip"`);
    archive.pipe(res);
    for (const file of generateScaffold(project.architecture)) {
      archive.append(file.content, { name: `${project.architecture.id}/${file.path}` });
    }
    archive.finalize();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
