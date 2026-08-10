# Architecture-Aware Project Generation — ArchSpace AI

The project generator creates customized project scaffolds based on the canonical `ArchitectureModel`.

---

## File Guidance Header

Every generated file includes a header comment with architecture guidance:

```typescript
// =============================================================================
//  ARCHSPACE ARCHITECTURE GUIDANCE: CATALOGSERVICE (CONTROLLER)
// =============================================================================
//  ARCHITECTURAL ROLE: Manages product catalog, categories, and search filters.
//  COMPONENT TYPE: service | TECHNOLOGY: Node.js
// 
//  RESPONSIBILITIES & BOUNDARIES:
//  - Own the Catalog Service component boundary.
// 
//  DEPENDENCIES:
//  - None
// 
//  PERSISTENCE & DATABASE:
//  - Storage: PostgreSQL (Access via repository layer only).
// 
//  API CONTRACTS:
//  - GET /api/products: List products
// 
//  REQUIRED ENVIRONMENT VARIABLES:
//  - DATABASE_URL
// 
//  IMPLEMENTATION TODOS:
//  - Validate request payload against API contract Zod schema.
//  - Delegate domain workflow to service layer.
//  - Emit structured log events and map standard error types.
// =============================================================================
```

---

## Generated Artifacts

- `README.md`: Setup commands, stack overview, and quick start.
- `database/schema.sql`: Generated `CREATE TABLE` and `CREATE INDEX` queries based on database tables.
- `database/database-design.md`: Column constraints, types, primary/foreign keys, and indexes.
- `docs/api-spec.yaml`: OpenAPI 3.1 specification for all service API contracts.
- `docs/architecture.md`: Architectural component boundaries and relationships.
- `docs/decisions.md`: Architecture Decision Records (ADRs).
- `.env.example`: Safe environment configuration placeholders with zero secrets.
- `backend/`: Controllers, services, and repositories per architecture node.
- `frontend/`: App interface stubs.
