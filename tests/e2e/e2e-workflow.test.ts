import { describe, expect, it } from 'vitest';
import request from 'supertest';

process.env.GENERATION_MODE = 'heuristic';

describe('ArchSpace AI — Full End-to-End & Intentional Drift Verification', () => {
  it('executes full E2E workflow: Project Creation → Versioning → Validation → Scaffold → Intentional Drift', async () => {
    const { app } = await import('../../backend/src/app.js');

    // Step 1: Create project with Multi-Vendor E-Commerce Requirements
    const createRes = await request(app)
      .post('/api/projects')
      .send({
        name: 'Multi-Vendor E-Commerce Platform',
        description: 'Multi-vendor e-commerce platform with products, orders, payments, and notifications.',
        requirements: 'Build a multi-vendor e-commerce platform where customers can browse products, search and filter products, add items to a cart, place orders, pay through an external payment provider, receive email notifications, and where administrators can manage products and orders.',
        expectedScale: '500K monthly users',
        frontendPreference: 'React + TypeScript',
        backendPreference: 'Node.js + Express',
        databasePreference: 'PostgreSQL',
        authenticationMethod: 'JWT',
        externalServices: ['Stripe', 'Email Provider'],
      });

    expect(createRes.status).toBe(201);
    const projectId = createRes.body.id;
    expect(projectId).toBeDefined();
    expect(createRes.body.metadata.version).toBe(1);

    // Step 2: Validate Architecture Rules
    const valRes = await request(app).post(`/api/projects/${projectId}/validate`);
    expect(valRes.status).toBe(200);
    expect(valRes.body.findings).toBeDefined();

    // Step 3: Edit Architecture (creates Version 2)
    const updateRes = await request(app)
      .put(`/api/projects/${projectId}/architecture`)
      .send({
        architecture: createRes.body.architecture,
        changeDescription: 'Added Redis Cache to architecture stack',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.version).toBe(2);

    // Step 4: Verify Version History
    const versionsRes = await request(app).get(`/api/projects/${projectId}/architecture/versions`);
    expect(versionsRes.status).toBe(200);
    expect(versionsRes.body.length).toBeGreaterThanOrEqual(2);

    // Step 5: Generate Project Scaffold & File Guidance
    const scaffoldRes = await request(app).get(`/api/projects/${projectId}/scaffold`);
    expect(scaffoldRes.status).toBe(200);
    expect(scaffoldRes.body.files.some((f: any) => f.path === 'database/schema.sql')).toBe(true);

    // Step 6: INTENTIONAL DRIFT TEST (PostgreSQL -> MongoDB Mismatch)
    const compareRes = await request(app)
      .post(`/api/projects/${projectId}/compare`)
      .send({
        files: [
          {
            path: 'backend/src/server.ts',
            content: 'import express from "express"; import mongoose from "mongoose"; const app = express(); app.post("/api/orders", (req, res) => res.json({})); mongoose.connect("mongodb://localhost:27017/shop");',
          },
        ],
      });

    expect(compareRes.status).toBe(200);
    const driftReport = compareRes.body;
    expect(driftReport.findings.length).toBeGreaterThan(0);

    const dbDrift = driftReport.findings.find((f: any) => f.category === 'database');
    expect(dbDrift).toBeDefined();
    expect(dbDrift.severity).toBe('HIGH');
    expect(dbDrift.expected).toBe('PostgreSQL');
    expect(dbDrift.actual).toBe('MongoDB');
    expect(dbDrift.explanation).toContain('Architecture drift detected');
  });
});
