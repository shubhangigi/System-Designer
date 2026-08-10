import { z } from 'zod';
export const nodeTypes = [
    'frontend',
    'service',
    'database',
    'cache',
    'messageQueue',
    'externalApi',
    'platform',
];
export const edgeTypes = ['sync', 'async', 'db', 'cache', 'external'];
export const ApiContractSchema = z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    path: z.string(),
    summary: z.string(),
    auth: z.string(),
    requestBody: z.record(z.string(), z.string()).default({}),
    responseBody: z.record(z.string(), z.string()).default({}),
    serviceId: z.string(),
});
export const DatabaseTableSchema = z.object({
    name: z.string(),
    columns: z.array(z.object({
        name: z.string(),
        type: z.string(),
        primaryKey: z.boolean().default(false),
        nullable: z.boolean().default(false),
        references: z.string().optional(),
    })),
    indexes: z.array(z.string()).default([]),
});
export const ArchitectureNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(nodeTypes),
    responsibility: z.string(),
    technology: z.string(),
    dependencies: z.array(z.string()).default([]),
    apis: z.array(ApiContractSchema).default([]),
    database: z.array(z.string()).default([]),
    externalServices: z.array(z.string()).default([]),
    environmentVariables: z.array(z.string()).default([]),
    notes: z.array(z.string()).default([]),
    position: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
});
export const ArchitectureEdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    type: z.enum(edgeTypes),
    protocol: z.string(),
    purpose: z.string(),
});
export const ExternalDependencySchema = z.object({
    name: z.string(),
    purpose: z.string(),
    integrationPoint: z.string(),
    requiredEnvVars: z.array(z.string()).default([]),
    apiEndpoints: z.array(z.string()).default([]),
    authentication: z.string(),
    failureConsiderations: z.string(),
});
export const ArchitectureDecisionSchema = z.object({
    id: z.string(),
    decision: z.string(),
    reason: z.string(),
    alternatives: z.array(z.string()).default([]),
    tradeoff: z.string(),
});
export const ArchitectureModelSchema = z.object({
    id: z.string(),
    projectName: z.string(),
    description: z.string(),
    scale: z.string(),
    status: z.enum(['draft', 'approved']).default('draft'),
    stack: z.object({
        frontend: z.string(),
        backend: z.string(),
        database: z.string(),
        auth: z.string(),
    }),
    nodes: z.array(ArchitectureNodeSchema),
    edges: z.array(ArchitectureEdgeSchema),
    database: z.object({
        engine: z.string(),
        tables: z.array(DatabaseTableSchema),
    }),
    externalDependencies: z.array(ExternalDependencySchema),
    decisions: z.array(ArchitectureDecisionSchema),
});
