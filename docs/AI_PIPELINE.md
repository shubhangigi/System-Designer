# AI Pipeline — ArchSpace AI

ArchSpace AI uses a structured, schema-validated AI architecture generation pipeline.

---

## Data Pipeline

```text
User Requirements & Context
      ↓
`OpenAICompatibleProvider` (Provider-Agnostic HTTP client)
      ↓
Raw JSON Output from LLM
      ↓
`AIArchitectureOutputSchema` (Lenient Zod validation)
      ↓
`transformToCanonicalModel()` (Canonical normalization & spatial layout)
      ↓
`ArchitectureModelSchema` (Final canonical safety validation)
      ↓
PostgreSQL Persistence (`projects`, `architectures`, `architecture_versions`)
      ↓
React Flow Canvas & Rule Validator Engine
```

---

## Configuration

Environment configuration:

```env
GENERATION_MODE=ai
AI_PROVIDER=openai
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your_key_here
AI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=60000
```

Strict Error Handling:
- `AI_NOT_CONFIGURED` (503): Returned when `GENERATION_MODE=ai` and credentials are missing. No silent fallback to heuristic generation.
- `AI_PROVIDER_ERROR` (502): Network failures, rate limits, or timeouts.
- `AI_RESPONSE_INVALID` (502): Invalid JSON response after retries.
