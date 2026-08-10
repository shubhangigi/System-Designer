import { describe, expect, it } from 'vitest';
import { validateCanonicalArchitecture } from '../../shared/dist/architecture/architecture-validator.js';
import type { ArchitectureModel } from '../../shared/architecture/architecture.schema.js';

describe('validateCanonicalArchitecture engine', () => {
  it('detects direct frontend to database access', () => {
    const model: ArchitectureModel = {
      id: 'test-app',
      projectName: 'Test App',
      description: 'Test application',
      scale: '100K users',
      status: 'draft',
      stack: { frontend: 'React', backend: 'Node', database: 'PostgreSQL', auth: 'JWT' },
      nodes: [
        { id: 'web-client', name: 'Web Client', type: 'frontend', responsibility: 'UI', technology: 'React', dependencies: [], apis: [], database: [], externalServices: [], environmentVariables: [], notes: [], position: { x: 0, y: 0 } },
        { id: 'postgres', name: 'PostgreSQL', type: 'database', responsibility: 'DB', technology: 'PostgreSQL', dependencies: [], apis: [], database: [], externalServices: [], environmentVariables: [], notes: [], position: { x: 0, y: 0 } },
      ],
      edges: [
        { id: 'illegal-edge', source: 'web-client', target: 'postgres', type: 'db', protocol: 'SQL', purpose: 'Direct access' }
      ],
      database: { engine: 'PostgreSQL', tables: [] },
      externalDependencies: [],
      decisions: [],
    };

    const findings = validateCanonicalArchitecture(model);
    expect(findings.some((f) => f.rule === 'DIRECT_FRONTEND_DB_ACCESS' && f.severity === 'ERROR')).toBe(true);
  });

  it('detects orphaned components', () => {
    const model: ArchitectureModel = {
      id: 'test-app',
      projectName: 'Test App',
      description: 'Test application',
      scale: '100K users',
      status: 'draft',
      stack: { frontend: 'React', backend: 'Node', database: 'PostgreSQL', auth: 'JWT' },
      nodes: [
        { id: 'web-client', name: 'Web Client', type: 'frontend', responsibility: 'UI', technology: 'React', dependencies: [], apis: [], database: [], externalServices: [], environmentVariables: [], notes: [], position: { x: 0, y: 0 } },
        { id: 'auth-service', name: 'Auth Service', type: 'service', responsibility: 'Auth', technology: 'Node', dependencies: [], apis: [], database: [], externalServices: [], environmentVariables: [], notes: [], position: { x: 0, y: 0 } },
        { id: 'lonely-service', name: 'Lonely Service', type: 'service', responsibility: 'Unused', technology: 'Node', dependencies: [], apis: [], database: [], externalServices: [], environmentVariables: [], notes: [], position: { x: 0, y: 0 } },
      ],
      edges: [
        { id: 'edge-1', source: 'web-client', target: 'auth-service', type: 'sync', protocol: 'HTTP', purpose: 'Auth' }
      ],
      database: { engine: 'PostgreSQL', tables: [] },
      externalDependencies: [],
      decisions: [],
    };

    const findings = validateCanonicalArchitecture(model);
    expect(findings.some((f) => f.rule === 'ORPHANED_COMPONENT' && f.severity === 'WARNING')).toBe(true);
  });
});
