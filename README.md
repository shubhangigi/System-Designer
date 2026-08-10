# ArchSpace AI — System Designer + Architecture-to-Code Workspace

ArchSpace AI turns product requirements into one canonical architecture model, renders that model on an interactive architecture canvas, persists designs and version history in PostgreSQL, generates architecture-aware project scaffolds with implementation guidance comments, and compares codebase implementations against approved architecture models to detect architecture drift.

---

## Architecture Pipeline

```text
User Requirements (Natural Language)
      ↓
AI Architect (`OpenAICompatibleProvider`)
      ↓
Structured JSON Output
      ↓
`AIArchitectureOutputSchema` (Zod validation)
      ↓
`transformToCanonicalModel()`
      ↓
Canonical `ArchitectureModelSchema`
      ↓
PostgreSQL Persistence & Version History (`projects`, `architectures`, `architecture_versions`)
      ↓
Interactive Architecture Canvas (React Flow) & Rule Validator
      ↓
Architecture-Aware Project Scaffold & File Guidance Header
      ↓
Codebase Analyzer & Drift Detector (Intended vs Actual Architecture Comparison)
```

---

## Core Features

1. **AI-Powered Architecture Generation**: Senior software architect system prompt, structured JSON output, Zod schema validation, provider-agnostic HTTP layer (`OpenAICompatibleProvider`).
2. **Real PostgreSQL Persistence & Versioning**: PostgreSQL connection pool (`pg`), transactions (`BEGIN`/`COMMIT`/`ROLLBACK`), and immutable version history records (v1, v2, v3...).
3. **Interactive Architecture Canvas**: React Flow canvas mapped to canonical `ArchitectureModel`.
4. **Canonical Architecture Validator**: 8 architectural rules detecting frontend-to-database coupling, orphaned nodes, duplicate API routes, unconfigured external dependencies, and missing authentication.
5. **Architecture-Aware Generator**: Dynamic scaffold creation with detailed architectural role, responsibility, API, database, required env vars, and TODO guidance comments.
6. **Codebase Analyzer & Drift Detector**: Scans code files, constructs an Actual `ArchitectureModel`, and compares Intended vs Actual architecture (detecting PostgreSQL → MongoDB drift, missing external services, unapproved API routes).

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
PORT=4100
DATABASE_URL=postgresql://archspace:archspace@localhost:5432/archspace

# Generation Mode: 'ai' (production default) or 'heuristic' (dev/testing mode)
GENERATION_MODE=ai

# AI Provider Settings
AI_PROVIDER=openai
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your_key_here
AI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=60000
```

---

## Setup & Running

```bash
# Install dependencies
npm.cmd install

# Start local PostgreSQL database container (Optional, automatic memory fallback supported in dev)
docker compose up -d

# Build all packages (@archspace/shared, @archspace/backend, @archspace/frontend)
npm.cmd run build

# Run automated unit, integration, and E2E test suite (24 tests)
npm.cmd run test

# Start development server
npm.cmd run dev
```

- Frontend UI: `http://127.0.0.1:5173`
- Backend REST API: `http://127.0.0.1:4100`

---

## Verification & Testing

ArchSpace AI includes end-to-end automated test suites verifying:
- AI schema validation and retries
- PostgreSQL database transactions and architecture version history
- Canvas property inspection & approval
- Dynamic scaffold generator & safe ZIP export
- Codebase analyzer & intentional PostgreSQL → MongoDB architecture drift detection
