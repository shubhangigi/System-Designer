import { describe, expect, it } from 'vitest';
import { createArchitecture } from '../../shared/architecture/architecture-utils.js';
import { analyzeRequirements } from '../../backend/src/modules/requirements/RequirementService.js';

describe('architecture factory', () => {
  it('creates a structured food delivery architecture', () => {
    const input = {
      name: 'Food Delivery Platform',
      description: 'Build a scalable food delivery application.',
      requirements: 'Browse restaurants, place orders, make payments, notify users, and track deliveries.',
      expectedScale: '1M monthly users',
      frontendPreference: 'React + TypeScript',
      backendPreference: 'Node.js + Express',
      databasePreference: 'PostgreSQL',
      authenticationMethod: 'JWT',
      externalServices: [],
      optionalRequirements: '',
    };
    const analysis = analyzeRequirements(input);
    const model = createArchitecture(input, analysis);
    expect(model.nodes.map((node) => node.id)).toContain('payment-service');
    expect(model.database.tables.map((table) => table.name)).toContain('orders');
  });
});
