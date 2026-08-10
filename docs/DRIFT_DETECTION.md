# Drift Detection Engine — ArchSpace AI

The Drift Detection Engine compares the approved **Intended Architecture** against the **Actual Architecture Model** extracted from codebase scanning.

---

## Findings & Severity Categorization

Findings are classified into 4 severity levels:

1. **CRITICAL**: Missing authentication layer or core domain service missing.
2. **HIGH**: Database engine mismatch (e.g. Intended `PostgreSQL` vs Actual `MongoDB`).
3. **MEDIUM**: Intended external dependency missing or unapproved API route implemented.
4. **LOW**: Extra utility route or technology detected.

---

## Detailed Drift Report Format

```json
{
  "intendedProjectName": "Multi-Vendor E-Commerce Platform",
  "actualProjectName": "Multi-Vendor E-Commerce Platform (Actual Implemented)",
  "criticalCount": 0,
  "highCount": 1,
  "mediumCount": 0,
  "lowCount": 0,
  "findings": [
    {
      "severity": "HIGH",
      "category": "database",
      "expected": "PostgreSQL",
      "actual": "MongoDB",
      "explanation": "Architecture drift detected! Intended database engine is 'PostgreSQL', but detected implementation uses 'MongoDB'.",
      "recommendation": "Migrate persistence queries to 'PostgreSQL' or update approved architecture specification.",
      "affectedComponent": "database"
    }
  ]
}
```
