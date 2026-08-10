# Codebase Analysis — ArchSpace AI

ArchSpace AI scans source code files to build an **Actual Architecture Model**.

---

## Static Code Scanning

The scanner extracts:
- Imported packages (`import ... from '...'`)
- Defined HTTP routes (`app.get`, `app.post`, `router.post`)
- Database technologies (`pg`, `postgres`, `mongodb`, `mongoose`)
- External API SDKs (`stripe`, `razorpay`, `email`)
- Framework choices (`express`, `react`)

---

## Actual Architecture Model Construction

Using `constructActualArchitectureModel()`, scanned implementation evidence is transformed into a canonical `ArchitectureModel`:

```text
Codebase Files
      ↓
Static Code Scanner (`analyzeCodeFiles`)
      ↓
`constructActualArchitectureModel()`
      ↓
Actual Architecture Model (Canonical Shape)
```
