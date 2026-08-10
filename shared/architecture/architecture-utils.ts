import type {
  ArchitectureDecision,
  ArchitectureEdge,
  ArchitectureModel,
  ArchitectureNode,
  DatabaseTable,
  ExternalDependency,
} from './architecture.schema.js';
import type { ProjectInput, RequirementAnalysis } from '../schemas/project.schema.js';

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function api(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, summary: string, serviceId: string) {
  return {
    method,
    path,
    summary,
    auth: 'Bearer JWT',
    requestBody: {},
    responseBody: { id: 'string', status: 'string' },
    serviceId,
  };
}

function node(
  id: string,
  name: string,
  type: ArchitectureNode['type'],
  responsibility: string,
  technology: string,
  position: { x: number; y: number },
  extra: Partial<ArchitectureNode> = {},
): ArchitectureNode {
  return {
    id,
    name,
    type,
    responsibility,
    technology,
    dependencies: [],
    apis: [],
    database: [],
    externalServices: [],
    environmentVariables: [],
    notes: [],
    position,
    ...extra,
  };
}

function col(name: string, type: string, options: { primaryKey?: boolean; nullable?: boolean; references?: string } = {}) {
  return {
    name,
    type,
    primaryKey: options.primaryKey ?? false,
    nullable: options.nullable ?? false,
    ...(options.references ? { references: options.references } : {}),
  };
}

export function createArchitecture(input: ProjectInput, analysis: RequirementAnalysis): ArchitectureModel {
  const needsPayments = analysis.functional.some((item) => /payment/i.test(item));
  const needsDelivery = analysis.functional.some((item) => /delivery/i.test(item));
  const needsCatalog = analysis.functional.some((item) => /catalog|browse|search/i.test(item));
  const needsNotifications = analysis.functional.some((item) => /notification/i.test(item));

  const nodes: ArchitectureNode[] = [
    node('web-client', 'Web Client', 'frontend', 'Customer and operator web experience.', input.frontendPreference, { x: 0, y: 0 }, {
      dependencies: ['api-gateway'],
      environmentVariables: ['VITE_API_BASE_URL'],
    }),
    node('api-gateway', 'API Gateway', 'service', 'Routes API traffic, applies authentication, and normalizes errors.', 'Express Router', { x: 280, y: 0 }, {
      dependencies: ['auth-service'],
      apis: [api('POST', '/api/auth/login', 'Authenticate a user and issue a session token.', 'api-gateway')],
      environmentVariables: ['JWT_SECRET'],
    }),
    node('auth-service', 'Auth Service', 'service', 'Owns identity, password checks, and session token claims.', 'Node.js service module', { x: 560, y: 0 }, {
      database: ['PostgreSQL'],
      apis: [api('POST', '/api/users', 'Create user account.', 'auth-service')],
      environmentVariables: ['JWT_SECRET'],
    }),
    node('order-service', 'Order Service', 'service', 'Coordinates checkout, order lifecycle, and consistency boundaries.', 'Node.js service module', { x: 280, y: 220 }, {
      dependencies: ['auth-service'],
      database: ['PostgreSQL'],
      apis: [
        api('POST', '/api/orders', 'Create an order.', 'order-service'),
        api('GET', '/api/orders/{id}', 'Fetch order status and line items.', 'order-service'),
        api('PATCH', '/api/orders/{id}/status', 'Update order lifecycle state.', 'order-service'),
      ],
    }),
    node('postgres', 'PostgreSQL', 'database', 'Primary transactional data store.', input.databasePreference, { x: 560, y: 420 }),
  ];

  const edges: ArchitectureEdge[] = [
    { id: 'web-client-api-gateway', source: 'web-client', target: 'api-gateway', type: 'sync', protocol: 'HTTPS', purpose: 'User-facing API calls' },
    { id: 'api-gateway-auth-service', source: 'api-gateway', target: 'auth-service', type: 'sync', protocol: 'HTTP', purpose: 'Authentication and identity checks' },
    { id: 'api-gateway-order-service', source: 'api-gateway', target: 'order-service', type: 'sync', protocol: 'HTTP', purpose: 'Order API routing' },
    { id: 'auth-service-postgres', source: 'auth-service', target: 'postgres', type: 'db', protocol: 'SQL', purpose: 'Users and sessions' },
    { id: 'order-service-postgres', source: 'order-service', target: 'postgres', type: 'db', protocol: 'SQL', purpose: 'Orders and order items' },
  ];

  if (needsCatalog) {
    nodes.push(node('catalog-service', 'Catalog Service', 'service', 'Manages restaurant/menu catalog and search-ready read models.', 'Node.js service module', { x: 0, y: 220 }, {
      database: ['PostgreSQL'],
      apis: [api('GET', '/api/restaurants', 'List restaurants and filters.', 'catalog-service'), api('GET', '/api/restaurants/{id}/menu', 'Fetch menu items.', 'catalog-service')],
    }));
    edges.push(
      { id: 'api-gateway-catalog-service', source: 'api-gateway', target: 'catalog-service', type: 'sync', protocol: 'HTTP', purpose: 'Catalog API routing' },
      { id: 'catalog-service-postgres', source: 'catalog-service', target: 'postgres', type: 'db', protocol: 'SQL', purpose: 'Restaurants and menu items' },
    );
  }

  if (needsPayments) {
    nodes.push(
      node('payment-service', 'Payment Service', 'service', 'Creates payment intents, verifies callbacks, and isolates payment provider logic.', 'Node.js service module', { x: 560, y: 220 }, {
        dependencies: ['order-service'],
        externalServices: ['Payment Provider'],
        environmentVariables: ['PAYMENT_PROVIDER_API_KEY', 'PAYMENT_WEBHOOK_SECRET'],
        apis: [api('POST', '/api/payments', 'Create payment intent for an order.', 'payment-service')],
      }),
      node('payment-provider', 'Payment Provider', 'externalApi', 'External payment authorization and settlement API.', 'Stripe/Razorpay compatible adapter', { x: 840, y: 220 }),
    );
    edges.push(
      { id: 'order-service-payment-service', source: 'order-service', target: 'payment-service', type: 'sync', protocol: 'HTTP', purpose: 'Payment authorization' },
      { id: 'payment-service-payment-provider', source: 'payment-service', target: 'payment-provider', type: 'external', protocol: 'HTTPS', purpose: 'Provider payment API' },
    );
  }

  if (needsDelivery) {
    nodes.push(node('delivery-service', 'Delivery Service', 'service', 'Tracks delivery assignment, ETA updates, and delivery state.', 'Node.js service module', { x: 280, y: 440 }, {
      dependencies: ['order-service'],
      database: ['PostgreSQL'],
      apis: [api('GET', '/api/deliveries/{orderId}', 'Track delivery for an order.', 'delivery-service')],
    }));
    edges.push(
      { id: 'order-service-delivery-service', source: 'order-service', target: 'delivery-service', type: 'sync', protocol: 'HTTP', purpose: 'Delivery creation after order placement' },
      { id: 'delivery-service-postgres', source: 'delivery-service', target: 'postgres', type: 'db', protocol: 'SQL', purpose: 'Delivery state' },
    );
  }

  if (needsNotifications) {
    nodes.push(node('notification-service', 'Notification Service', 'service', 'Sends transactional status updates over configured channels.', 'Node.js service module', { x: 840, y: 440 }, {
      externalServices: ['Email/SMS Provider'],
      environmentVariables: ['NOTIFICATION_API_KEY'],
    }));
    edges.push({ id: 'order-service-notification-service', source: 'order-service', target: 'notification-service', type: 'async', protocol: 'Queue event', purpose: 'Order status notifications' });
  }

  const tables: DatabaseTable[] = [
    { name: 'users', columns: [col('id', 'uuid', { primaryKey: true }), col('email', 'text'), col('password_hash', 'text'), col('created_at', 'timestamptz')], indexes: ['unique(email)'] },
    { name: 'orders', columns: [col('id', 'uuid', { primaryKey: true }), col('user_id', 'uuid', { references: 'users.id' }), col('status', 'text'), col('total_cents', 'integer'), col('created_at', 'timestamptz')], indexes: ['user_id', 'status'] },
    { name: 'order_items', columns: [col('id', 'uuid', { primaryKey: true }), col('order_id', 'uuid', { references: 'orders.id' }), col('name', 'text'), col('quantity', 'integer'), col('price_cents', 'integer')], indexes: ['order_id'] },
  ];

  if (needsCatalog) {
    tables.push(
      { name: 'restaurants', columns: [col('id', 'uuid', { primaryKey: true }), col('name', 'text'), col('status', 'text')], indexes: ['status'] },
      { name: 'menu_items', columns: [col('id', 'uuid', { primaryKey: true }), col('restaurant_id', 'uuid', { references: 'restaurants.id' }), col('name', 'text'), col('price_cents', 'integer')], indexes: ['restaurant_id'] },
    );
  }
  if (needsDelivery) {
    tables.push({ name: 'deliveries', columns: [col('id', 'uuid', { primaryKey: true }), col('order_id', 'uuid', { references: 'orders.id' }), col('status', 'text'), col('eta_minutes', 'integer', { nullable: true })], indexes: ['order_id', 'status'] });
  }

  const externalDependencies: ExternalDependency[] = nodes
    .filter((entry) => entry.type === 'externalApi')
    .map((entry) => ({
      name: entry.name,
      purpose: entry.responsibility,
      integrationPoint: edges.find((edge) => edge.target === entry.id)?.source ?? 'unknown',
      requiredEnvVars: entry.name.includes('Payment') ? ['PAYMENT_PROVIDER_API_KEY', 'PAYMENT_WEBHOOK_SECRET'] : [],
      apiEndpoints: ['/v1/payment-intents', '/v1/webhooks'],
      authentication: 'Server-side API key or webhook signature.',
      failureConsiderations: 'Retry idempotent requests, persist provider response, and surface manual reconciliation states.',
    }));

  const decisions: ArchitectureDecision[] = [
    {
      id: 'ADR-001',
      decision: `Use ${input.databasePreference} as the primary database.`,
      reason: 'The approved workflows include transactional state that benefits from relational constraints.',
      alternatives: ['MongoDB', 'DynamoDB'],
      tradeoff: 'Relational consistency is stronger, while schema changes require migrations.',
    },
    {
      id: 'ADR-002',
      decision: `Use ${input.backendPreference} for backend modules.`,
      reason: 'A modular monolith keeps local development simple while preserving service boundaries in code.',
      alternatives: ['Microservices', 'Serverless functions'],
      tradeoff: 'Deployment is simpler, but runtime scaling is coarser than independently deployed services.',
    },
  ];

  return {
    id: slug(input.name) || 'new-project',
    projectName: input.name,
    description: input.description,
    scale: input.expectedScale,
    status: 'draft',
    stack: {
      frontend: input.frontendPreference,
      backend: input.backendPreference,
      database: input.databasePreference,
      auth: input.authenticationMethod,
    },
    nodes,
    edges,
    database: { engine: input.databasePreference, tables },
    externalDependencies,
    decisions,
  };
}

export function proposeArchitectureChange(model: ArchitectureModel, instruction: string) {
  const lower = instruction.toLowerCase();
  if (lower.includes('redis') || lower.includes('cache')) {
    const hasRedis = model.nodes.some((entry) => entry.id === 'redis-cache');
    return {
      summary: 'Add Redis cache and connect read-heavy services to it.',
      additions: hasRedis ? [] : ['Redis Cache'],
      modifications: model.nodes.filter((entry) => /catalog|restaurant/i.test(entry.name)).map((entry) => entry.name),
      impact: ['Database read load reduced', 'Additional cache invalidation responsibility introduced'],
      patch: { kind: 'add-cache' as const },
    };
  }
  if (lower.includes('asynchronous') || lower.includes('async') || lower.includes('queue')) {
    return {
      summary: 'Introduce a message queue and make payment/order follow-up communication asynchronous.',
      additions: ['Message Queue'],
      modifications: ['Order Service', 'Payment Service'],
      impact: ['Checkout path becomes more resilient', 'Event retry and idempotency handling required'],
      patch: { kind: 'async-payments' as const },
    };
  }
  if (lower.includes('mongodb')) {
    return {
      summary: 'Replace PostgreSQL technology label with MongoDB and flag schema tradeoffs.',
      additions: [],
      modifications: ['PostgreSQL'],
      impact: ['Document modeling required', 'Relational constraints must move into application logic'],
      patch: { kind: 'replace-database' as const, technology: 'MongoDB' },
    };
  }
  return {
    summary: 'Record the requested architecture note for review.',
    additions: [],
    modifications: ['Architecture notes'],
    impact: ['Manual review recommended before changing the approved model'],
    patch: { kind: 'note' as const, note: instruction },
  };
}

export type ArchitectureChange = ReturnType<typeof proposeArchitectureChange>;

export function applyArchitectureChange(model: ArchitectureModel, change: ArchitectureChange): ArchitectureModel {
  const next: ArchitectureModel = JSON.parse(JSON.stringify(model));
  if (change.patch.kind === 'add-cache' && !next.nodes.some((entry) => entry.id === 'redis-cache')) {
    next.nodes.push(node('redis-cache', 'Redis Cache', 'cache', 'Caches read-heavy responses and short-lived computed views.', 'Redis', { x: 0, y: 440 }));
    const target = next.nodes.find((entry) => /catalog|restaurant/i.test(entry.name))?.id ?? 'order-service';
    next.edges.push({ id: `${target}-redis-cache`, source: target, target: 'redis-cache', type: 'cache', protocol: 'RESP', purpose: 'Read-through caching' });
    const service = next.nodes.find((entry) => entry.id === target);
    if (service) {
      service.dependencies.push('redis-cache');
      service.environmentVariables.push('REDIS_URL');
      service.notes.push('Cache invalidation must be tied to writes that affect user-visible reads.');
    }
  }
  if (change.patch.kind === 'async-payments') {
    if (!next.nodes.some((entry) => entry.id === 'message-queue')) {
      next.nodes.push(node('message-queue', 'Message Queue', 'messageQueue', 'Buffers domain events for asynchronous processing.', 'RabbitMQ', { x: 560, y: 560 }, { environmentVariables: ['RABBITMQ_URL'] }));
    }
    const paymentEdge = next.edges.find((edge) => edge.source === 'order-service' && edge.target === 'payment-service');
    if (paymentEdge) {
      paymentEdge.type = 'async';
      paymentEdge.protocol = 'Domain event';
      paymentEdge.purpose = 'Payment requested event';
    }
    if (!next.edges.some((edge) => edge.id === 'order-service-message-queue')) {
      next.edges.push({ id: 'order-service-message-queue', source: 'order-service', target: 'message-queue', type: 'async', protocol: 'AMQP', purpose: 'Publish order events' });
      next.edges.push({ id: 'message-queue-payment-service', source: 'message-queue', target: 'payment-service', type: 'async', protocol: 'AMQP', purpose: 'Consume payment requests' });
    }
  }
  if (change.patch.kind === 'replace-database') {
    next.database.engine = change.patch.technology;
    next.stack.database = change.patch.technology;
    for (const dbNode of next.nodes.filter((entry) => entry.type === 'database')) {
      dbNode.name = change.patch.technology;
      dbNode.technology = change.patch.technology;
      dbNode.notes.push('Validate data modeling and consistency rules after database replacement.');
    }
  }
  if (change.patch.kind === 'note') {
    next.decisions.push({
      id: `ADR-${String(next.decisions.length + 1).padStart(3, '0')}`,
      decision: 'Review requested architecture change.',
      reason: change.patch.note,
      alternatives: [],
      tradeoff: 'Stored as a review note because automated structural intent was ambiguous.',
    });
  }
  return next;
}
