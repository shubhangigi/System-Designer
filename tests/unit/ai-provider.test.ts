import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ArchitectureModelSchema } from '../../shared/architecture/architecture.schema.js';
import { AIArchitectureOutputSchema, transformToCanonicalModel } from '../../backend/src/ai/schemas/aiArchitectureSchema.js';
import { generateArchitectureWithHeuristic } from '../../backend/src/ai/orchestration/architectureOrchestrator.js';
import { AIProviderNotConfiguredError } from '../../backend/src/ai/providers/AIProvider.js';

// ---------------------------------------------------------------------------
// Fixture: valid AI response for an e-commerce platform
// ---------------------------------------------------------------------------

const validAIResponse = {
  project: {
    name: 'E-Commerce Platform',
    description: 'Multi-vendor e-commerce platform',
    requirements: ['Product browsing', 'Cart management', 'Order placement', 'Payment processing', 'Email notifications'],
  },
  frontend: {
    framework: 'React + TypeScript',
    responsibilities: ['Product catalog UI', 'Shopping cart', 'Checkout flow', 'User account'],
  },
  backend: {
    framework: 'Node.js + Express',
    services: [
      { id: 'product-service', name: 'Product Service', responsibility: 'Manages product catalog and search', technology: 'Node.js' },
      { id: 'cart-service', name: 'Cart Service', responsibility: 'Manages shopping carts', technology: 'Node.js' },
      { id: 'order-service', name: 'Order Service', responsibility: 'Handles order lifecycle', technology: 'Node.js' },
      { id: 'payment-service', name: 'Payment Service', responsibility: 'Processes payments via external provider', technology: 'Node.js' },
      { id: 'notification-service', name: 'Notification Service', responsibility: 'Sends email notifications', technology: 'Node.js' },
      { id: 'auth-service', name: 'Auth Service', responsibility: 'Handles user authentication and authorization', technology: 'Node.js' },
    ],
  },
  database: {
    type: 'PostgreSQL',
    entities: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'email', type: 'text' },
          { name: 'password_hash', type: 'text' },
          { name: 'created_at', type: 'timestamptz' },
        ],
        indexes: ['unique(email)'],
      },
      {
        name: 'products',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'name', type: 'text' },
          { name: 'price_cents', type: 'integer' },
          { name: 'vendor_id', type: 'uuid' },
        ],
        indexes: ['vendor_id'],
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'user_id', type: 'uuid', references: 'users.id' },
          { name: 'status', type: 'text' },
          { name: 'total_cents', type: 'integer' },
        ],
        indexes: ['user_id', 'status'],
      },
    ],
  },
  apis: [
    { method: 'GET' as const, path: '/api/products', description: 'List products', service: 'product-service' },
    { method: 'POST' as const, path: '/api/cart/items', description: 'Add item to cart', service: 'cart-service' },
    { method: 'POST' as const, path: '/api/orders', description: 'Create order', service: 'order-service' },
    { method: 'POST' as const, path: '/api/payments', description: 'Process payment', service: 'payment-service' },
  ],
  externalServices: [
    { name: 'Payment Provider', purpose: 'Payment processing (Stripe-compatible)' },
    { name: 'Email Provider', purpose: 'Transactional email delivery' },
  ],
  authentication: { required: true, strategy: 'JWT' },
  cache: { required: false, technology: 'none' },
  queue: { required: false, technology: 'none' },
  environmentVariables: [
    { name: 'DATABASE_URL', purpose: 'PostgreSQL connection' },
    { name: 'JWT_SECRET', purpose: 'JWT signing key' },
    { name: 'PAYMENT_API_KEY', purpose: 'Payment provider API key' },
  ],
  relationships: [
    { source: 'web-client', target: 'auth-service', type: 'sync' },
    { source: 'web-client', target: 'product-service', type: 'sync' },
    { source: 'web-client', target: 'cart-service', type: 'sync' },
    { source: 'web-client', target: 'order-service', type: 'sync' },
    { source: 'order-service', target: 'payment-service', type: 'sync' },
    { source: 'order-service', target: 'notification-service', type: 'async' },
    { source: 'auth-service', target: 'database', type: 'db' },
    { source: 'product-service', target: 'database', type: 'db' },
    { source: 'order-service', target: 'database', type: 'db' },
    { source: 'payment-service', target: 'payment-provider', type: 'external' },
    { source: 'notification-service', target: 'email-provider', type: 'external' },
  ],
  architectureDecisions: [
    { decision: 'Use PostgreSQL as primary database', reasoning: 'Relational data model suits e-commerce with referential integrity needs' },
    { decision: 'Modular monolith architecture', reasoning: 'Simpler deployment and development while maintaining service boundaries' },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AI Architecture Schema', () => {
  it('validates a correct AI response', () => {
    const parsed = AIArchitectureOutputSchema.parse(validAIResponse);
    expect(parsed).toBeDefined();
    expect(parsed.project.name).toBe('E-Commerce Platform');
    expect(parsed.backend.services).toHaveLength(6);
    expect(parsed.apis).toHaveLength(4);
  });

  it('rejects an empty object (missing required fields)', () => {
    expect(() => AIArchitectureOutputSchema.parse({})).toThrow();
  });

  it('rejects missing project field', () => {
    const { project, ...incomplete } = validAIResponse;
    expect(() => AIArchitectureOutputSchema.parse(incomplete)).toThrow();
  });

  it('applies defaults for optional arrays', () => {
    const minimal = {
      project: { name: 'Test', description: 'Test', requirements: [] },
      frontend: { framework: 'React', responsibilities: [] },
      backend: { framework: 'Express', services: [] },
      database: { type: 'PostgreSQL', entities: [] },
    };
    const parsed = AIArchitectureOutputSchema.parse(minimal);
    expect(parsed.apis).toEqual([]);
    expect(parsed.externalServices).toEqual([]);
    expect(parsed.cache).toEqual({ required: false, technology: 'none' });
    expect(parsed.queue).toEqual({ required: false, technology: 'none' });
  });
});

describe('transformToCanonicalModel', () => {
  it('produces a valid ArchitectureModel', () => {
    const aiOutput = AIArchitectureOutputSchema.parse(validAIResponse);
    const model = transformToCanonicalModel(aiOutput);

    // Must pass canonical schema validation
    const validated = ArchitectureModelSchema.parse(model);
    expect(validated).toBeDefined();
    expect(validated.projectName).toBe('E-Commerce Platform');
    expect(validated.nodes.length).toBeGreaterThan(0);
    expect(validated.edges.length).toBeGreaterThan(0);
    expect(validated.database.tables.length).toBe(3);
  });

  it('assigns correct node types', () => {
    const aiOutput = AIArchitectureOutputSchema.parse(validAIResponse);
    const model = transformToCanonicalModel(aiOutput);

    const frontendNode = model.nodes.find((n) => n.type === 'frontend');
    expect(frontendNode).toBeDefined();
    expect(frontendNode!.id).toBe('web-client');

    const serviceNodes = model.nodes.filter((n) => n.type === 'service');
    expect(serviceNodes).toHaveLength(6);

    const dbNode = model.nodes.find((n) => n.type === 'database');
    expect(dbNode).toBeDefined();
    expect(dbNode!.id).toBe('database');

    const externalNodes = model.nodes.filter((n) => n.type === 'externalApi');
    expect(externalNodes).toHaveLength(2);
  });

  it('maps APIs to the correct service nodes', () => {
    const aiOutput = AIArchitectureOutputSchema.parse(validAIResponse);
    const model = transformToCanonicalModel(aiOutput);

    const productService = model.nodes.find((n) => n.id === 'product-service');
    expect(productService).toBeDefined();
    expect(productService!.apis).toHaveLength(1);
    expect(productService!.apis[0].path).toBe('/api/products');
    expect(productService!.apis[0].method).toBe('GET');

    const orderService = model.nodes.find((n) => n.id === 'order-service');
    expect(orderService).toBeDefined();
    expect(orderService!.apis).toHaveLength(1);
    expect(orderService!.apis[0].path).toBe('/api/orders');
  });

  it('creates proper edge types from relationships', () => {
    const aiOutput = AIArchitectureOutputSchema.parse(validAIResponse);
    const model = transformToCanonicalModel(aiOutput);

    const syncEdges = model.edges.filter((e) => e.type === 'sync');
    expect(syncEdges.length).toBeGreaterThan(0);

    const asyncEdges = model.edges.filter((e) => e.type === 'async');
    expect(asyncEdges).toHaveLength(1);
    expect(asyncEdges[0].source).toBe('order-service');
    expect(asyncEdges[0].target).toBe('notification-service');

    const dbEdges = model.edges.filter((e) => e.type === 'db');
    expect(dbEdges.length).toBeGreaterThan(0);

    const externalEdges = model.edges.filter((e) => e.type === 'external');
    expect(externalEdges.length).toBeGreaterThan(0);
  });

  it('generates database tables with proper structure', () => {
    const aiOutput = AIArchitectureOutputSchema.parse(validAIResponse);
    const model = transformToCanonicalModel(aiOutput);

    const usersTable = model.database.tables.find((t) => t.name === 'users');
    expect(usersTable).toBeDefined();
    expect(usersTable!.columns.find((c) => c.primaryKey)).toBeDefined();

    const ordersTable = model.database.tables.find((t) => t.name === 'orders');
    expect(ordersTable).toBeDefined();
    const userIdCol = ordersTable!.columns.find((c) => c.name === 'user_id');
    expect(userIdCol?.references).toBe('users.id');
  });

  it('creates architecture decisions with ADR IDs', () => {
    const aiOutput = AIArchitectureOutputSchema.parse(validAIResponse);
    const model = transformToCanonicalModel(aiOutput);

    expect(model.decisions).toHaveLength(2);
    expect(model.decisions[0].id).toBe('ADR-001');
    expect(model.decisions[1].id).toBe('ADR-002');
  });

  it('uses project context when provided', () => {
    const aiOutput = AIArchitectureOutputSchema.parse(validAIResponse);
    const context = {
      projectName: 'Custom Name',
      description: 'Custom description',
      frontendPreference: 'Vue.js',
      backendPreference: 'Python + FastAPI',
      databasePreference: 'MySQL',
      authenticationMethod: 'OAuth2',
      expectedScale: '10M users',
    };
    const model = transformToCanonicalModel(aiOutput, context);

    expect(model.projectName).toBe('Custom Name');
    expect(model.description).toBe('Custom description');
    expect(model.stack.frontend).toBe('Vue.js');
    expect(model.stack.backend).toBe('Python + FastAPI');
    expect(model.scale).toBe('10M users');
  });
});

describe('AIProviderNotConfiguredError', () => {
  it('has default message', () => {
    const error = new AIProviderNotConfiguredError();
    expect(error.message).toContain('AI provider is not configured');
    expect(error.name).toBe('AIProviderNotConfiguredError');
  });

  it('accepts custom message', () => {
    const error = new AIProviderNotConfiguredError('Custom message');
    expect(error.message).toBe('Custom message');
  });
});

describe('generateArchitectureWithHeuristic', () => {
  it('returns valid result with heuristic metadata', () => {
    const result = generateArchitectureWithHeuristic({
      name: 'Test Project',
      description: 'A test food delivery project.',
      requirements: 'Users browse restaurants, place orders, and make payments.',
    });

    expect(result).toBeDefined();
    expect(result.architecture).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(result.metadata.generatedBy).toBe('heuristic');
    expect(result.metadata.generatedAt).toBeDefined();
    expect(result.metadata.version).toBe(1);
    expect(result.metadata.provider).toBeUndefined();
    expect(result.metadata.model).toBeUndefined();

    // Architecture should pass canonical validation
    const validated = ArchitectureModelSchema.parse(result.architecture);
    expect(validated.nodes.length).toBeGreaterThan(0);
  });
});

describe('OpenAICompatibleProvider error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles fetch timeout/abort errors', async () => {
    const { OpenAICompatibleProvider } = await import('../../backend/src/ai/providers/OpenAICompatibleProvider.js');
    const provider = new OpenAICompatibleProvider('test', 'http://localhost:9999', 'fake-key', 'test-model', 100);

    // This should fail with a network/timeout error since no server is running
    await expect(
      provider.generateArchitecture('test requirements', {
        projectName: 'Test',
        description: 'Test',
        frontendPreference: 'React',
        backendPreference: 'Node.js',
        databasePreference: 'PostgreSQL',
        authenticationMethod: 'JWT',
        expectedScale: '100K users',
      }),
    ).rejects.toThrow();
  });
});
