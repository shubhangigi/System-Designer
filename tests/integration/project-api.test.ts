import { describe, expect, it } from 'vitest';
import request from 'supertest';

// Set heuristic mode before modules load (no real AI provider in tests)
process.env.GENERATION_MODE = 'heuristic';

describe('project architecture API (heuristic mode)', () => {
  it('creates a project and returns structured architecture with metadata', async () => {
    const { app } = await import('../../backend/src/app.js');

    const response = await request(app)
      .post('/api/projects')
      .send({
        name: 'Food Delivery Platform',
        description: 'Build a scalable food delivery application.',
        requirements: 'Users browse restaurants, add items to cart, place orders, pay, and track deliveries.',
        expectedScale: '1M monthly users',
        frontendPreference: 'React + TypeScript',
        backendPreference: 'Node.js + Express',
        databasePreference: 'PostgreSQL',
        authenticationMethod: 'JWT',
        externalServices: [],
      });

    expect(response.status).toBe(201);
    expect(response.body.architecture.nodes.some((node: { id: string }) => node.id === 'order-service')).toBe(true);
    expect(response.body.analysis.functional).toContain('Payment processing');
    expect(response.body.metadata).toBeDefined();
    expect(response.body.metadata.generatedBy).toBe('heuristic');
    expect(response.body.metadata.generatedAt).toBeDefined();
    expect(response.body.metadata.version).toBe(1);
  });

  it('regenerates architecture via generate endpoint', async () => {
    const { app } = await import('../../backend/src/app.js');

    // First create a project
    const createResponse = await request(app)
      .post('/api/projects')
      .send({
        name: 'Test Generate Project',
        description: 'Test project for generate endpoint.',
        requirements: 'Users can browse products and place orders.',
      });

    expect(createResponse.status).toBe(201);
    const projectId = createResponse.body.id;

    // Then regenerate architecture
    const generateResponse = await request(app)
      .post(`/api/projects/${projectId}/architecture/generate`)
      .send({
        requirements: 'Users can browse products, place orders, and make payments.',
      });

    expect(generateResponse.status).toBe(200);
    expect(generateResponse.body.success).toBe(true);
    expect(generateResponse.body.architecture).toBeDefined();
    expect(generateResponse.body.metadata.generatedBy).toBe('heuristic');
  });
});
