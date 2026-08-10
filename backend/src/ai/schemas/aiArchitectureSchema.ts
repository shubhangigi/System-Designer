import { z } from 'zod';
import type {
  ArchitectureDecision,
  ArchitectureEdge,
  ArchitectureModel,
  ArchitectureNode,
  ApiContract,
  DatabaseTable,
  ExternalDependency,
} from '@archspace/shared';
import type { ProjectContext } from '../providers/AIProvider.js';

// ---------------------------------------------------------------------------
// AI output Zod schema — lenient parsing for LLM output
// ---------------------------------------------------------------------------

const AIColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  primaryKey: z.boolean().optional().default(false),
  nullable: z.boolean().optional().default(false),
  references: z.string().optional(),
});

const AIEntitySchema = z.object({
  name: z.string(),
  columns: z.array(AIColumnSchema),
  indexes: z.array(z.string()).optional().default([]),
});

const AIServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  responsibility: z.string(),
  technology: z.string(),
});

const AIApiSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string(),
  description: z.string(),
  service: z.string(),
});

const AIRelationshipSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.string(),
});

const AIDecisionSchema = z.object({
  decision: z.string(),
  reasoning: z.string(),
});

export const AIArchitectureOutputSchema = z.object({
  project: z.object({
    name: z.string(),
    description: z.string(),
    requirements: z.array(z.string()).default([]),
  }),
  frontend: z.object({
    framework: z.string(),
    responsibilities: z.array(z.string()).default([]),
  }),
  backend: z.object({
    framework: z.string(),
    services: z.array(AIServiceSchema),
  }),
  database: z.object({
    type: z.string(),
    entities: z.array(AIEntitySchema).default([]),
  }),
  apis: z.array(AIApiSchema).default([]),
  externalServices: z.array(z.object({
    name: z.string(),
    purpose: z.string(),
  })).default([]),
  authentication: z.object({
    required: z.boolean(),
    strategy: z.string(),
  }).default({ required: true, strategy: 'JWT' }),
  cache: z.object({
    required: z.boolean(),
    technology: z.string(),
  }).default({ required: false, technology: 'none' }),
  queue: z.object({
    required: z.boolean(),
    technology: z.string(),
  }).default({ required: false, technology: 'none' }),
  environmentVariables: z.array(z.object({
    name: z.string(),
    purpose: z.string(),
  })).default([]),
  relationships: z.array(AIRelationshipSchema).default([]),
  architectureDecisions: z.array(AIDecisionSchema).default([]),
});

export type AIArchitectureOutput = z.infer<typeof AIArchitectureOutputSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const validEdgeTypes = new Set(['sync', 'async', 'db', 'cache', 'external']);

function normalizeEdgeType(raw: string): ArchitectureEdge['type'] {
  const lower = raw.toLowerCase();
  if (validEdgeTypes.has(lower)) return lower as ArchitectureEdge['type'];
  if (lower.includes('async') || lower.includes('event') || lower.includes('queue')) return 'async';
  if (lower.includes('db') || lower.includes('database') || lower.includes('sql')) return 'db';
  if (lower.includes('cache') || lower.includes('redis')) return 'cache';
  if (lower.includes('external') || lower.includes('http') || lower.includes('api')) return 'external';
  return 'sync';
}

// ---------------------------------------------------------------------------
// Transform AI output → Canonical ArchitectureModel
// ---------------------------------------------------------------------------

export function transformToCanonicalModel(
  ai: AIArchitectureOutput,
  context?: ProjectContext,
): ArchitectureModel {
  const projectName = context?.projectName || ai.project.name;
  const projectId = slug(projectName) || 'new-project';

  // ---- Position layout ----
  let col = 0;
  let row = 0;
  const maxCols = 4;
  const colWidth = 280;
  const rowHeight = 220;

  function nextPosition() {
    const pos = { x: col * colWidth, y: row * rowHeight };
    col++;
    if (col >= maxCols) { col = 0; row++; }
    return pos;
  }

  // ---- Nodes ----
  const nodes: ArchitectureNode[] = [];
  const nodeIds = new Set<string>();

  // Frontend node
  const frontendNode: ArchitectureNode = {
    id: 'web-client',
    name: 'Web Client',
    type: 'frontend',
    responsibility: ai.frontend.responsibilities.join('. ') || 'User-facing web application.',
    technology: context?.frontendPreference || ai.frontend.framework,
    dependencies: [],
    apis: [],
    database: [],
    externalServices: [],
    environmentVariables: [],
    notes: [],
    position: nextPosition(),
  };
  nodes.push(frontendNode);
  nodeIds.add('web-client');

  // Service nodes
  for (const svc of ai.backend.services) {
    const svcApis: ApiContract[] = ai.apis
      .filter((a) => a.service === svc.id)
      .map((a) => ({
        method: a.method,
        path: a.path,
        summary: a.description,
        auth: ai.authentication.required ? `Bearer ${ai.authentication.strategy}` : 'none',
        requestBody: {},
        responseBody: {},
        serviceId: svc.id,
      }));

    const svcEnvVars = ai.environmentVariables
      .filter((ev) => {
        const lower = ev.name.toLowerCase();
        const svcLower = svc.id.toLowerCase().replace(/-/g, '_');
        return lower.includes(svcLower) || (svc.id.includes('auth') && lower.includes('jwt'));
      })
      .map((ev) => ev.name);

    const hasDbRelation = ai.relationships.some(
      (r) => r.source === svc.id && (r.target === 'database' || r.type === 'db'),
    );

    const node: ArchitectureNode = {
      id: svc.id,
      name: svc.name,
      type: 'service',
      responsibility: svc.responsibility,
      technology: svc.technology || context?.backendPreference || ai.backend.framework,
      dependencies: [],
      apis: svcApis,
      database: hasDbRelation ? [ai.database.type] : [],
      externalServices: [],
      environmentVariables: svcEnvVars,
      notes: [],
      position: nextPosition(),
    };
    nodes.push(node);
    nodeIds.add(svc.id);
  }

  // Database node
  const dbNode: ArchitectureNode = {
    id: 'database',
    name: ai.database.type || context?.databasePreference || 'PostgreSQL',
    type: 'database',
    responsibility: 'Primary transactional data store.',
    technology: context?.databasePreference || ai.database.type,
    dependencies: [],
    apis: [],
    database: [],
    externalServices: [],
    environmentVariables: [],
    notes: [],
    position: nextPosition(),
  };
  nodes.push(dbNode);
  nodeIds.add('database');

  // Cache node (if required)
  if (ai.cache.required && ai.cache.technology !== 'none') {
    const cacheNode: ArchitectureNode = {
      id: 'cache',
      name: ai.cache.technology,
      type: 'cache',
      responsibility: 'Caches frequently accessed data to reduce database load.',
      technology: ai.cache.technology,
      dependencies: [],
      apis: [],
      database: [],
      externalServices: [],
      environmentVariables: [],
      notes: [],
      position: nextPosition(),
    };
    nodes.push(cacheNode);
    nodeIds.add('cache');
  }

  // Queue node (if required)
  if (ai.queue.required && ai.queue.technology !== 'none') {
    const queueNode: ArchitectureNode = {
      id: 'message-queue',
      name: ai.queue.technology,
      type: 'messageQueue',
      responsibility: 'Buffers domain events for asynchronous processing.',
      technology: ai.queue.technology,
      dependencies: [],
      apis: [],
      database: [],
      externalServices: [],
      environmentVariables: [],
      notes: [],
      position: nextPosition(),
    };
    nodes.push(queueNode);
    nodeIds.add('message-queue');
  }

  // External service nodes
  for (const ext of ai.externalServices) {
    const extId = slug(ext.name) || `ext-${nodes.length}`;
    if (!nodeIds.has(extId)) {
      const extNode: ArchitectureNode = {
        id: extId,
        name: ext.name,
        type: 'externalApi',
        responsibility: ext.purpose,
        technology: 'External API',
        dependencies: [],
        apis: [],
        database: [],
        externalServices: [],
        environmentVariables: [],
        notes: [],
        position: nextPosition(),
      };
      nodes.push(extNode);
      nodeIds.add(extId);
    }
  }

  // ---- Edges ----
  const edges: ArchitectureEdge[] = [];
  const edgeIds = new Set<string>();

  for (const rel of ai.relationships) {
    // Skip edges that reference non-existent nodes
    if (!nodeIds.has(rel.source) && !nodeIds.has(rel.target)) continue;

    // Auto-create source/target if they're known aliases
    const source = nodeIds.has(rel.source) ? rel.source : rel.source;
    const target = nodeIds.has(rel.target) ? rel.target : rel.target;

    const edgeId = `${source}-${target}`;
    if (edgeIds.has(edgeId)) continue;
    edgeIds.add(edgeId);

    // Only add edge if both nodes exist
    if (!nodeIds.has(source) || !nodeIds.has(target)) continue;

    const edgeType = normalizeEdgeType(rel.type);
    let protocol = 'HTTP';
    if (edgeType === 'db') protocol = 'SQL';
    else if (edgeType === 'async') protocol = 'Event';
    else if (edgeType === 'cache') protocol = 'RESP';
    else if (edgeType === 'external') protocol = 'HTTPS';

    edges.push({
      id: edgeId,
      source,
      target,
      type: edgeType,
      protocol,
      purpose: `${source} → ${target}`,
    });
  }

  // ---- Database tables ----
  const tables: DatabaseTable[] = ai.database.entities.map((entity) => ({
    name: entity.name,
    columns: entity.columns.map((col) => ({
      name: col.name,
      type: col.type,
      primaryKey: col.primaryKey ?? false,
      nullable: col.nullable ?? false,
      ...(col.references ? { references: col.references } : {}),
    })),
    indexes: entity.indexes ?? [],
  }));

  // ---- External dependencies ----
  const externalDependencies: ExternalDependency[] = ai.externalServices.map((ext) => {
    const extId = slug(ext.name);
    const integrationEdge = edges.find((e) => e.target === extId);
    const relatedEnvVars = ai.environmentVariables
      .filter((ev) => {
        const lower = ev.name.toLowerCase();
        const extLower = ext.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return lower.includes(extLower) || lower.includes('api_key');
      })
      .map((ev) => ev.name);

    return {
      name: ext.name,
      purpose: ext.purpose,
      integrationPoint: integrationEdge?.source ?? 'unknown',
      requiredEnvVars: relatedEnvVars,
      apiEndpoints: [],
      authentication: 'API key',
      failureConsiderations: 'Retry with exponential backoff. Degrade gracefully if unavailable.',
    };
  });

  // ---- Architecture decisions ----
  const decisions: ArchitectureDecision[] = ai.architectureDecisions.map((dec, idx) => ({
    id: `ADR-${String(idx + 1).padStart(3, '0')}`,
    decision: dec.decision,
    reason: dec.reasoning,
    alternatives: [],
    tradeoff: '',
  }));

  // ---- Assemble ArchitectureModel ----
  return {
    id: projectId,
    projectName,
    description: context?.description || ai.project.description,
    scale: context?.expectedScale || '100K monthly users',
    status: 'draft',
    stack: {
      frontend: context?.frontendPreference || ai.frontend.framework,
      backend: context?.backendPreference || ai.backend.framework,
      database: context?.databasePreference || ai.database.type,
      auth: context?.authenticationMethod || ai.authentication.strategy,
    },
    nodes,
    edges,
    database: {
      engine: context?.databasePreference || ai.database.type,
      tables,
    },
    externalDependencies,
    decisions,
  };
}
