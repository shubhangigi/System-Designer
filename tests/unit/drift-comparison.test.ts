import { describe, expect, it } from 'vitest';
import { analyzeCodeFiles, compareArchitectures, constructActualArchitectureModel } from '../../shared/dist/architecture/architecture-validator.js';
import type { ArchitectureModel } from '../../shared/architecture/architecture.schema.js';

describe('Drift Comparison & Codebase Analyzer', () => {
  const intendedModel: ArchitectureModel = {
    id: 'e-commerce-store',
    projectName: 'E-Commerce Store',
    description: 'Multi-vendor e-commerce platform',
    scale: '100K users',
    status: 'approved',
    stack: { frontend: 'React', backend: 'Node', database: 'PostgreSQL', auth: 'JWT' },
    nodes: [
      { id: 'web-client', name: 'Web Client', type: 'frontend', responsibility: 'UI', technology: 'React', dependencies: [], apis: [], database: [], externalServices: [], environmentVariables: [], notes: [], position: { x: 0, y: 0 } },
      { id: 'order-service', name: 'Order Service', type: 'service', responsibility: 'Orders', technology: 'Node', dependencies: [], apis: [{ method: 'POST', path: '/api/orders', summary: 'Place order', auth: 'Bearer JWT', requestBody: {}, responseBody: {}, serviceId: 'order-service' }], database: ['PostgreSQL'], externalServices: ['Stripe'], environmentVariables: [], notes: [], position: { x: 280, y: 0 } },
      { id: 'database', name: 'PostgreSQL', type: 'database', responsibility: 'DB', technology: 'PostgreSQL', dependencies: [], apis: [], database: [], externalServices: [], environmentVariables: [], notes: [], position: { x: 560, y: 0 } },
    ],
    edges: [],
    database: { engine: 'PostgreSQL', tables: [] },
    externalDependencies: [{ name: 'Stripe', purpose: 'Payments', integrationPoint: 'order-service', requiredEnvVars: ['STRIPE_API_KEY'], apiEndpoints: [], authentication: 'API Key', failureConsiderations: 'Retry' }],
    decisions: [],
  };

  it('scans code files and constructs Actual Architecture Model', () => {
    const files = [
      { path: 'src/server.ts', content: 'import express from "express"; import mongoose from "mongoose"; const app = express(); app.post("/api/orders", (req, res) => res.json({}));' }
    ];

    const analysis = analyzeCodeFiles(files);
    expect(analysis.detectedDatabases).toContain('MongoDB');
    expect(analysis.detectedRoutes).toContain('POST /api/orders');

    const actualModel = constructActualArchitectureModel(analysis, intendedModel);
    expect(actualModel.database.engine).toBe('MongoDB');
  });

  it('detects database engine drift between PostgreSQL and MongoDB', () => {
    const actualModel: ArchitectureModel = {
      ...intendedModel,
      database: { ...intendedModel.database, engine: 'MongoDB' },
    };

    const report = compareArchitectures(intendedModel, actualModel);
    expect(report.findings.length).toBeGreaterThan(0);
    const dbDrift = report.findings.find((f) => f.category === 'database');
    expect(dbDrift).toBeDefined();
    expect(dbDrift?.severity).toBe('HIGH');
    expect(dbDrift?.expected).toBe('PostgreSQL');
    expect(dbDrift?.actual).toBe('MongoDB');
  });
});
