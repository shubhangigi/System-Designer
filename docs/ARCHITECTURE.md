# Architecture — ArchSpace AI

ArchSpace AI is a complete AI System Designer + Architecture-to-Code Engineering Workspace. It turns requirements into a canonical architecture model, renders that model as an editable canvas, persists designs and version history in PostgreSQL, generates implementation-ready project artifacts with architecture guidance comments, and validates real code against the approved design to detect architecture drift.

---

## Core Stack

- **Frontend**: React 19, TypeScript, Vite, React Flow, Zustand, Lucide icons.
- **Backend**: Node.js, Express, TypeScript.
- **Shared Model**: `@archspace/shared` containing canonical Zod schemas, validator engine, and utilities.
- **Database**: PostgreSQL (via `pg` node-postgres connection pool and transactional repository).
- **AI Pipeline**: Senior software architect system prompt, `OpenAICompatibleProvider`, schema-validated JSON outputs (`AIArchitectureOutputSchema`), and canonical transformer (`transformToCanonicalModel`).

---

## Core Data Model (`@archspace/shared`)

The canonical `ArchitectureModel` is the single source of truth:
- Project metadata and selected technology stack
- Nodes for frontend, services, database, cache, message queues, external APIs, and platform components
- Explicit edges with source, target, protocol, purpose, and relationship types (`sync`, `async`, `db`, `cache`, `external`)
- Service API contracts with HTTP methods, paths, and summaries
- Database tables, columns, primary/foreign keys, and indexes
- External dependencies with required environment variables
- Architecture Decision Records (ADRs)

---

## Backend Modules

- `app.ts`: Express application initialization.
- `server.ts`: Server entry executing automatic database schema migrations on boot.
- `routes/projectRoutes.ts`: REST API endpoints for project lifecycle, architecture generation, validation, versions, scaffolding, codebase analysis, and drift comparison.
- `database/db.ts`: PostgreSQL pool manager, migration runner, and transaction helper (`withTransaction`).
- `modules/projects/ProjectRepository.ts`: Transactional repository managing `projects`, `architectures`, and immutable `architecture_versions`.
- `ai/`: Provider abstraction, system prompt, output schema, and orchestrator.
- `modules/generation/GenerationService.ts`: Project scaffold generator with architecture-aware guidance headers and path sanitization security.

---

## Documentation Files Created

- `docs/AI_PIPELINE.md`: AI generation pipeline architecture, schemas, and provider config.
- `docs/GENERATION.md`: Architecture-aware scaffolding and guidance comments.
- `docs/CODEBASE_ANALYSIS.md`: Static codebase analyzer and Actual Architecture Model construction.
- `docs/DRIFT_DETECTION.md`: Intended vs Actual architecture comparison and severity categorization.
