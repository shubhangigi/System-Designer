import path from 'node:path';
import type { ArchitectureModel, ArchitectureNode, DatabaseTable } from '@archspace/shared';

export interface GeneratedFile {
  path: string;
  content: string;
}

export function sanitizePath(inputPath: string): string {
  const normalized = path.normalize(inputPath).replace(/^(\.\.[\/\\])+/, '').replace(/\\/g, '/');
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new Error(`Security Violation: Unsafe file path '${inputPath}' detected.`);
  }
  return normalized;
}

function serviceName(node: ArchitectureNode) {
  return node.id.replace(/-service$/, '').replace(/-/g, '');
}

function guidance(node: ArchitectureNode, componentRole: 'controller' | 'service' | 'repository') {
  const lines = [
    '=============================================================================',
    ` ARCHSPACE ARCHITECTURE GUIDANCE: ${node.name.toUpperCase()} (${componentRole.toUpperCase()})`,
    '=============================================================================',
    ` ARCHITECTURAL ROLE: ${node.responsibility}`,
    ` COMPONENT TYPE: ${node.type} | TECHNOLOGY: ${node.technology}`,
    '',
    ' RESPONSIBILITIES & BOUNDARIES:',
    ...node.notes.map((note) => ` - ${note}`),
    ` - Own the ${node.name} component boundary.`,
    '',
    ' DEPENDENCIES:',
    ...(node.dependencies.length ? node.dependencies.map((dep) => ` - ${dep}`) : [' - None']),
    '',
    ' PERSISTENCE & DATABASE:',
    node.database.length ? ` - Storage: ${node.database.join(', ')} (Access via repository layer only).` : ' - Do not access persistent storage directly.',
    '',
    ' API CONTRACTS:',
    ...(node.apis.length ? node.apis.map((api) => ` - ${api.method} ${api.path}: ${api.summary}`) : [' - No public API contract defined']),
    '',
    ' REQUIRED ENVIRONMENT VARIABLES:',
    ...(node.environmentVariables.length ? node.environmentVariables.map((ev) => ` - ${ev}`) : [' - Standard application environment configuration']),
    '',
    ' IMPLEMENTATION TODOS:',
    componentRole === 'controller' ? ' - Validate request payload against API contract Zod schema.' : '',
    componentRole === 'controller' ? ' - Delegate domain workflow to service layer.' : '',
    componentRole === 'service' ? ` - Implement core business logic for ${node.name}.` : '',
    componentRole === 'service' ? ' - Coordinate transactional operations across repositories.' : '',
    componentRole === 'repository' ? ` - Implement SQL persistence layer for ${node.database.join(', ') || 'database'}.` : '',
    componentRole === 'repository' ? ' - Isolate query execution behind repository interfaces.' : '',
    ' - Emit structured log events and map standard error types.',
    '=============================================================================',
  ].filter((line) => line !== '');

  return lines.map((line) => (line ? `// ${line}` : '//')).join('\n');
}

export function generateSchemaSql(tables: DatabaseTable[]) {
  if (!tables.length) {
    return `-- Initial Schema SQL\n-- No database tables defined in architecture.\n`;
  }

  return tables
    .map((table) => {
      const columns = table.columns.map((column) => {
        const parts = [`  ${column.name} ${column.type.toUpperCase()}`];
        if (column.primaryKey) parts.push('PRIMARY KEY');
        if (!column.nullable) parts.push('NOT NULL');
        if (column.references) parts.push(`REFERENCES ${column.references.replace('.', '(')})`);
        return parts.join(' ');
      });
      const indexes = table.indexes.map((idx) => `CREATE INDEX IF NOT EXISTS idx_${table.name}_${idx.replace(/[^a-z0-9]/gi, '_')} ON ${table.name}(${idx});`);
      return `CREATE TABLE IF NOT EXISTS ${table.name} (\n${columns.join(',\n')}\n);\n${indexes.join('\n')}`;
    })
    .join('\n\n');
}

export function generateOpenApi(model: ArchitectureModel) {
  const paths = model.nodes
    .flatMap((node) => node.apis)
    .map((api) => {
      const lower = api.method.toLowerCase();
      return `  ${api.path}:\n    ${lower}:\n      summary: ${api.summary}\n      tags:\n        - ${api.serviceId}\n      security:\n        - bearerAuth: []\n      responses:\n        "200":\n          description: Successful response`;
    })
    .join('\n');

  return `openapi: 3.1.0\ninfo:\n  title: ${model.projectName} API\n  version: 0.1.0\ncomponents:\n  securitySchemes:\n    bearerAuth:\n      type: http\n      scheme: bearer\n      bearerFormat: JWT\npaths:\n${paths || '  {}'}\n`;
}

export function generateDatabaseDesign(model: ArchitectureModel) {
  const lines = [`# Database Design: ${model.projectName}`, '', `Engine: ${model.database.engine}`, ''];
  for (const table of model.database.tables) {
    lines.push(`## Table: ${table.name}`, '');
    for (const column of table.columns) {
      const constraints = [
        column.primaryKey ? 'primary key' : '',
        column.nullable ? 'nullable' : 'required',
        column.references ? `references ${column.references}` : '',
      ].filter(Boolean);
      lines.push(`- **${column.name}**: \`${column.type}\` (${constraints.join(', ')})`);
    }
    if (table.indexes.length) {
      lines.push(`- **Indexes**: ${table.indexes.join(', ')}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function generateArchitectureMarkdown(model: ArchitectureModel) {
  const lines = [`# ${model.projectName} Architecture Specification`, '', model.description, '', `Expected Scale: ${model.scale}`, ''];
  lines.push('## Stack Configuration', '');
  lines.push(`- Frontend: ${model.stack.frontend}`);
  lines.push(`- Backend: ${model.stack.backend}`);
  lines.push(`- Database: ${model.stack.database}`);
  lines.push(`- Authentication: ${model.stack.auth}`);
  lines.push('');
  lines.push('## Architecture Components', '');
  for (const node of model.nodes) {
    lines.push(`### ${node.name} (\`${node.id}\`)`, '', `- Type: ${node.type}`, `- Technology: ${node.technology}`, `- Responsibility: ${node.responsibility}`, '');
  }
  lines.push('## Communication & Relationships', '');
  for (const edge of model.edges) {
    lines.push(`- **${edge.source}** → **${edge.target}** (\`${edge.type}\` via ${edge.protocol}): ${edge.purpose}`);
  }
  return lines.join('\n');
}

export function generateDecisions(model: ArchitectureModel) {
  return model.decisions
    .map((decision) => `# ${decision.id}: ${decision.decision}\n\nReasoning:\n${decision.reason}\n\nAlternatives Considered:\n${decision.alternatives.map((item) => `- ${item}`).join('\n') || '- None recorded'}\n\nTradeoffs:\n${decision.tradeoff}\n`)
    .join('\n');
}

export function generateEnvExample(model: ArchitectureModel) {
  const vars = new Set<string>(['PORT', 'DATABASE_URL', 'JWT_SECRET']);
  for (const node of model.nodes) {
    node.environmentVariables.forEach((entry) => vars.add(entry));
  }
  for (const dep of model.externalDependencies) {
    dep.requiredEnvVars.forEach((entry) => vars.add(entry));
  }
  return Array.from(vars)
    .sort()
    .map((entry) => `${entry}=`)
    .join('\n');
}

export function generateScaffold(model: ArchitectureModel): GeneratedFile[] {
  const serviceNodes = model.nodes.filter((node) => node.type === 'service');
  const files: GeneratedFile[] = [
    { path: 'README.md', content: `# ${model.projectName}\n\nGenerated from an approved ArchSpace AI architecture model.\n\n## Project Overview\n${model.description}\n\n## Quick Start\n\`\`\`bash\ncp .env.example .env\nnpm install\nnpm run dev\n\`\`\`\n` },
    { path: '.env.example', content: generateEnvExample(model) },
    { path: 'database/schema.sql', content: generateSchemaSql(model.database.tables) },
    { path: 'database/database-design.md', content: generateDatabaseDesign(model) },
    { path: 'docs/architecture.md', content: generateArchitectureMarkdown(model) },
    { path: 'docs/api-spec.yaml', content: generateOpenApi(model) },
    { path: 'docs/decisions.md', content: generateDecisions(model) },
    { path: 'backend/package.json', content: JSON.stringify({ name: `${model.id}-backend`, scripts: { dev: 'tsx src/server.ts' }, dependencies: { express: '^4.21.2' }, devDependencies: { tsx: '^4.19.2', typescript: '^5.7.3' } }, null, 2) },
    { path: 'backend/src/server.ts', content: `import express from 'express';\n\nconst app = express();\napp.use(express.json());\napp.get('/health', (_req, res) => res.json({ status: 'ok', project: '${model.projectName}' }));\napp.listen(process.env.PORT ?? 3000);\n` },
    { path: 'frontend/package.json', content: JSON.stringify({ name: `${model.id}-frontend`, scripts: { dev: 'vite' }, dependencies: { '@vitejs/plugin-react': '^4.3.4', vite: '^6.0.7', react: '^19.0.0', 'react-dom': '^19.0.0' }, devDependencies: { typescript: '^5.7.3' } }, null, 2) },
    { path: 'frontend/src/App.tsx', content: `export default function App() {\n  return (\n    <main>\n      <h1>${model.projectName}</h1>\n      <p>${model.description}</p>\n    </main>\n  );\n}\n` },
  ];

  for (const service of serviceNodes) {
    const base = serviceName(service);
    files.push(
      { path: `backend/src/controllers/${base}Controller.ts`, content: `${guidance(service, 'controller')}\n\nexport async function handle${base}Request() {\n  throw new Error('TODO: implement ${service.name} controller logic');\n}\n` },
      { path: `backend/src/services/${base}Service.ts`, content: `${guidance(service, 'service')}\n\nexport async function run${base}Workflow() {\n  throw new Error('TODO: implement ${service.name} business workflow');\n}\n` },
      { path: `backend/src/repositories/${base}Repository.ts`, content: `${guidance(service, 'repository')}\n\nexport async function load${base}State() {\n  throw new Error('TODO: implement ${service.name} persistence access');\n}\n` },
    );
  }

  // Sanitize all output paths for security
  return files.map((f) => ({
    path: sanitizePath(f.path),
    content: f.content,
  }));
}

export function buildFileTree(files: GeneratedFile[]) {
  return files.map((file) => file.path).sort();
}
