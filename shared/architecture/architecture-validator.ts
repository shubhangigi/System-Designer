import type { ArchitectureModel, ArchitectureNode, ArchitectureEdge } from './architecture.schema.js';

export interface CodeFileSummary {
  path: string;
  imports: string[];
  mentions: string[];
}

export interface CodebaseAnalysis {
  files: CodeFileSummary[];
  detectedTechnologies: string[];
  detectedRoutes: string[];
  detectedDatabases: string[];
  detectedExternalServices: string[];
}

export interface ArchitectureViolation {
  file: string;
  problem: string;
  expected: string;
  severity: 'Low' | 'Medium' | 'High';
  suggestedFix: string;
}

export interface DriftItem {
  expected: string;
  actual: string;
  category: 'database' | 'external' | 'dependency' | 'api';
}

export interface RuleValidationFinding {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  rule: string;
  component: string;
  message: string;
  recommendation: string;
}

export interface DetailedDriftFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'database' | 'external' | 'service' | 'api' | 'security' | 'architecture';
  expected: string;
  actual: string;
  explanation: string;
  recommendation: string;
  affectedComponent: string;
}

export interface DetailedDriftReport {
  intendedProjectName: string;
  actualProjectName: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: DetailedDriftFinding[];
  actualArchitecture: ArchitectureModel;
}

// ---------------------------------------------------------------------------
// Canonical Architecture Validator Engine
// ---------------------------------------------------------------------------

export function validateCanonicalArchitecture(model: ArchitectureModel): RuleValidationFinding[] {
  const findings: RuleValidationFinding[] = [];
  const nodeMap = new Map(model.nodes.map((n) => [n.id, n]));
  const nodeIdsSeen = new Set<string>();

  // Rule: Duplicate Component IDs
  for (const node of model.nodes) {
    if (nodeIdsSeen.has(node.id)) {
      findings.push({
        severity: 'ERROR',
        rule: 'DUPLICATE_COMPONENT_ID',
        component: node.id,
        message: `Duplicate component ID '${node.id}' detected in architecture model.`,
        recommendation: 'Ensure every architecture component has a unique ID.',
      });
    } else {
      nodeIdsSeen.add(node.id);
    }
  }

  // Rule: Direct Frontend to Database Access
  const frontendIds = new Set(model.nodes.filter((n) => n.type === 'frontend').map((n) => n.id));
  const databaseIds = new Set(model.nodes.filter((n) => n.type === 'database').map((n) => n.id));

  for (const edge of model.edges) {
    if (frontendIds.has(edge.source) && databaseIds.has(edge.target)) {
      findings.push({
        severity: 'ERROR',
        rule: 'DIRECT_FRONTEND_DB_ACCESS',
        component: edge.source,
        message: `Frontend node '${edge.source}' directly connects to database '${edge.target}'.`,
        recommendation: 'Route persistence access through a backend API or service layer boundary.',
      });
    }
  }

  // Rule: Orphaned Component (0 incoming, 0 outgoing edges)
  const connectedNodes = new Set<string>();
  for (const edge of model.edges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  }
  for (const node of model.nodes) {
    if (!connectedNodes.has(node.id) && model.nodes.length > 1) {
      findings.push({
        severity: 'WARNING',
        rule: 'ORPHANED_COMPONENT',
        component: node.id,
        message: `Component '${node.name}' (${node.type}) is orphaned with no connected relationships.`,
        recommendation: 'Connect component to dependent services or remove it from architecture.',
      });
    }
  }

  // Rule: API referencing non-existent service ID & Duplicate API routes
  const apiRoutesSeen = new Set<string>();
  for (const node of model.nodes) {
    for (const api of node.apis) {
      const routeKey = `${api.method} ${api.path}`;
      if (apiRoutesSeen.has(routeKey)) {
        findings.push({
          severity: 'ERROR',
          rule: 'DUPLICATE_API_ROUTE',
          component: node.id,
          message: `Duplicate API route contract '${routeKey}' defined.`,
          recommendation: 'Ensure API routes are uniquely assigned to owning services.',
        });
      } else {
        apiRoutesSeen.add(routeKey);
      }

      if (api.serviceId && !nodeMap.has(api.serviceId)) {
        findings.push({
          severity: 'ERROR',
          rule: 'API_NONEXISTENT_SERVICE',
          component: node.id,
          message: `API route '${routeKey}' references non-existent service '${api.serviceId}'.`,
          recommendation: 'Assign API contract to a valid service component.',
        });
      }
    }
  }

  // Rule: External Service missing required configuration
  for (const ext of model.externalDependencies) {
    if (ext.requiredEnvVars.length === 0) {
      findings.push({
        severity: 'WARNING',
        rule: 'MISSING_EXTERNAL_ENV_VARS',
        component: ext.name,
        message: `External dependency '${ext.name}' has no required environment variables specified.`,
        recommendation: 'Specify API keys or webhook secrets in requiredEnvVars configuration.',
      });
    }
  }

  // Rule: Missing Authentication
  const hasApis = model.nodes.some((n) => n.apis.length > 0);
  if (hasApis && (!model.stack.auth || model.stack.auth.toLowerCase() === 'none')) {
    findings.push({
      severity: 'ERROR',
      rule: 'MISSING_AUTHENTICATION',
      component: 'stack.auth',
      message: 'APIs are defined but authentication strategy is missing or unconfigured.',
      recommendation: 'Set authentication strategy (e.g. JWT sessions or OAuth2) in architecture stack.',
    });
  }

  // Rule: Direct Circular Service Dependency
  for (const edgeA of model.edges) {
    if (edgeA.type === 'sync') {
      const edgeB = model.edges.find((e) => e.source === edgeA.target && e.target === edgeA.source && e.type === 'sync');
      if (edgeB && edgeA.source < edgeA.target) {
        findings.push({
          severity: 'WARNING',
          rule: 'CIRCULAR_SERVICE_DEPENDENCY',
          component: edgeA.source,
          message: `Synchronous circular call dependency detected between '${edgeA.source}' and '${edgeA.target}'.`,
          recommendation: 'Decouple services using an event queue or asynchronous messaging.',
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Static Code Analysis & Actual Model Construction
// ---------------------------------------------------------------------------

export function analyzeCodeFiles(files: Array<{ path: string; content: string }>): CodebaseAnalysis {
  const detectedRoutes = new Set<string>();
  const detectedDatabases = new Set<string>();
  const detectedExternalServices = new Set<string>();
  const detectedTechnologies = new Set<string>();

  const summaries = files.map((file) => {
    const imports = Array.from(file.content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g)).map((match) => match[1]);
    const routeMatches = Array.from(file.content.matchAll(/(?:app|router)\.(get|post|put|patch|delete)\(['"`]([^'"`]+)/gi));
    routeMatches.forEach((match) => detectedRoutes.add(`${match[1].toUpperCase()} ${match[2]}`));
    if (/pg|postgres|postgresql/i.test(file.content)) detectedDatabases.add('PostgreSQL');
    if (/mongodb|mongoose/i.test(file.content)) detectedDatabases.add('MongoDB');
    if (/stripe/i.test(file.content)) detectedExternalServices.add('Stripe');
    if (/razorpay/i.test(file.content)) detectedExternalServices.add('Razorpay');
    if (/express/i.test(file.content)) detectedTechnologies.add('Express');
    if (/react/i.test(file.content)) detectedTechnologies.add('React');

    return {
      path: file.path,
      imports,
      mentions: Array.from(new Set([...detectedDatabases, ...detectedExternalServices])),
    };
  });

  return {
    files: summaries,
    detectedTechnologies: Array.from(detectedTechnologies),
    detectedRoutes: Array.from(detectedRoutes),
    detectedDatabases: Array.from(detectedDatabases),
    detectedExternalServices: Array.from(detectedExternalServices),
  };
}

export function constructActualArchitectureModel(
  analysis: CodebaseAnalysis,
  intendedModel: ArchitectureModel,
): ArchitectureModel {
  const detectedDb = analysis.detectedDatabases[0] || intendedModel.database.engine;
  const detectedTech = analysis.detectedTechnologies.join(' + ') || intendedModel.stack.backend;

  const nodes: ArchitectureNode[] = [
    {
      id: 'web-client',
      name: 'Web Client',
      type: 'frontend',
      responsibility: 'Detected customer web interface.',
      technology: analysis.detectedTechnologies.find((t) => /react|vue|next/i.test(t)) || intendedModel.stack.frontend,
      dependencies: [],
      apis: [],
      database: [],
      externalServices: [],
      environmentVariables: [],
      notes: [],
      position: { x: 0, y: 0 },
    },
    {
      id: 'backend-api',
      name: 'Backend API Service',
      type: 'service',
      responsibility: 'Detected backend application endpoints.',
      technology: detectedTech,
      dependencies: [],
      apis: analysis.detectedRoutes.map((r) => {
        const parts = r.split(' ');
        return {
          method: (parts[0] || 'GET') as any,
          path: parts[1] || '/api',
          summary: 'Scanned endpoint',
          auth: 'Bearer JWT',
          requestBody: {},
          responseBody: {},
          serviceId: 'backend-api',
        };
      }),
      database: [detectedDb],
      externalServices: analysis.detectedExternalServices,
      environmentVariables: [],
      notes: [],
      position: { x: 280, y: 0 },
    },
    {
      id: 'database',
      name: detectedDb,
      type: 'database',
      responsibility: 'Detected persistence data store.',
      technology: detectedDb,
      dependencies: [],
      apis: [],
      database: [],
      externalServices: [],
      environmentVariables: [],
      notes: [],
      position: { x: 560, y: 0 },
    },
  ];

  const edges: ArchitectureEdge[] = [
    { id: 'web-backend', source: 'web-client', target: 'backend-api', type: 'sync', protocol: 'HTTP', purpose: 'API requests' },
    { id: 'backend-db', source: 'backend-api', target: 'database', type: 'db', protocol: 'DB Protocol', purpose: 'Persistence queries' },
  ];

  for (const ext of analysis.detectedExternalServices) {
    const extId = ext.toLowerCase().replace(/[^a-z0-9]/g, '-');
    nodes.push({
      id: extId,
      name: ext,
      type: 'externalApi',
      responsibility: `Detected external integration with ${ext}`,
      technology: ext,
      dependencies: [],
      apis: [],
      database: [],
      externalServices: [],
      environmentVariables: [],
      notes: [],
      position: { x: 280, y: 220 },
    });
    edges.push({ id: `backend-${extId}`, source: 'backend-api', target: extId, type: 'external', protocol: 'HTTPS', purpose: 'External API calls' });
  }

  return {
    id: `${intendedModel.id}-actual`,
    projectName: `${intendedModel.projectName} (Actual Implemented)`,
    description: `Constructed actual architecture from scanning codebase files.`,
    scale: intendedModel.scale,
    status: 'approved',
    stack: {
      frontend: nodes.find((n) => n.type === 'frontend')?.technology || intendedModel.stack.frontend,
      backend: detectedTech,
      database: detectedDb,
      auth: intendedModel.stack.auth,
    },
    nodes,
    edges,
    database: {
      engine: detectedDb,
      tables: intendedModel.database.tables,
    },
    externalDependencies: analysis.detectedExternalServices.map((name) => ({
      name,
      purpose: `Detected external service ${name}`,
      integrationPoint: 'backend-api',
      requiredEnvVars: [`${name.toUpperCase()}_API_KEY`],
      apiEndpoints: [],
      authentication: 'API Key',
      failureConsiderations: 'Retry with backoff',
    })),
    decisions: intendedModel.decisions,
  };
}

export function validateArchitecture(model: ArchitectureModel, analysis: CodebaseAnalysis): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  for (const file of analysis.files) {
    const isController = /controller/i.test(file.path);
    const importsDb = file.imports.some((entry) => /pg|postgres|database|repository/i.test(entry));
    if (isController && importsDb) {
      violations.push({
        file: file.path,
        problem: 'Controller appears to import database/repository code directly.',
        expected: 'Controller -> service -> repository -> database',
        severity: 'High',
        suggestedFix: 'Move persistence access into the service/repository layer and keep controller orchestration thin.',
      });
    }
  }

  const approvedRoutes = new Set(model.nodes.flatMap((node) => node.apis.map((api) => `${api.method} ${api.path.replace(/\{([^}]+)\}/g, ':$1')}`)));
  for (const route of analysis.detectedRoutes) {
    if (!approvedRoutes.has(route)) {
      violations.push({
        file: 'route registry',
        problem: `Route ${route} is implemented but not present in the approved API contract.`,
        expected: 'Implemented routes should be generated from docs/api-spec.yaml.',
        severity: 'Medium',
        suggestedFix: 'Add the route to the architecture/API contract or remove the implementation.',
      });
    }
  }

  return violations;
}

export function detectDrift(model: ArchitectureModel, analysis: CodebaseAnalysis): DriftItem[] {
  const drift: DriftItem[] = [];
  const approvedDb = model.database.engine.toLowerCase();
  for (const actual of analysis.detectedDatabases) {
    if (!approvedDb.includes(actual.toLowerCase())) {
      drift.push({ category: 'database', expected: model.database.engine, actual });
    }
  }
  const approvedExternal = model.externalDependencies.map((dep) => dep.name.toLowerCase()).join(' ');
  for (const actual of analysis.detectedExternalServices) {
    if (!approvedExternal.includes(actual.toLowerCase())) {
      drift.push({ category: 'external', expected: model.externalDependencies.map((dep) => dep.name).join(', ') || 'No external dependency', actual });
    }
  }
  return drift;
}

export function compareArchitectures(
  intended: ArchitectureModel,
  actual: ArchitectureModel,
): DetailedDriftReport {
  const findings: DetailedDriftFinding[] = [];

  // 1. Database engine mismatch
  const intendedDb = intended.database.engine.toLowerCase();
  const actualDb = actual.database.engine.toLowerCase();
  if (intendedDb !== actualDb) {
    findings.push({
      severity: 'HIGH',
      category: 'database',
      expected: intended.database.engine,
      actual: actual.database.engine,
      explanation: `Architecture drift detected! Intended database engine is '${intended.database.engine}', but detected implementation uses '${actual.database.engine}'.`,
      recommendation: `Migrate persistence queries to '${intended.database.engine}' or update approved architecture specification.`,
      affectedComponent: 'database',
    });
  }

  // 2. Missing external service dependencies
  for (const intendedExt of intended.externalDependencies) {
    const found = actual.externalDependencies.some((aExt) =>
      aExt.name.toLowerCase().includes(intendedExt.name.toLowerCase()) ||
      intendedExt.name.toLowerCase().includes(aExt.name.toLowerCase()),
    );
    if (!found) {
      findings.push({
        severity: 'MEDIUM',
        category: 'external',
        expected: intendedExt.name,
        actual: 'Not detected in codebase scan',
        explanation: `Intended external service '${intendedExt.name}' was not detected in the codebase implementation.`,
        recommendation: `Integrate SDK or adapter for '${intendedExt.name}' as specified in architecture decisions.`,
        affectedComponent: intendedExt.name,
      });
    }
  }

  // 3. API route mismatches
  const intendedApis = new Set(intended.nodes.flatMap((n) => n.apis.map((a) => `${a.method} ${a.path}`)));
  const actualApis = actual.nodes.flatMap((n) => n.apis.map((a) => `${a.method} ${a.path}`));

  for (const actualApi of actualApis) {
    if (!intendedApis.has(actualApi)) {
      findings.push({
        severity: 'MEDIUM',
        category: 'api',
        expected: 'API contract defined in architecture model',
        actual: actualApi,
        explanation: `Unapproved endpoint '${actualApi}' implemented in codebase without architectural contract review.`,
        recommendation: 'Add endpoint contract to approved architecture model or remove unapproved route handler.',
        affectedComponent: actualApi,
      });
    }
  }

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;
  const lowCount = findings.filter((f) => f.severity === 'LOW').length;

  return {
    intendedProjectName: intended.projectName,
    actualProjectName: actual.projectName,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    findings,
    actualArchitecture: actual,
  };
}
