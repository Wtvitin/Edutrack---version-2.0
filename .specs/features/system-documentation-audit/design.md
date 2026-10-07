# System Documentation Audit Design

**Spec**: `.specs/features/system-documentation-audit/spec.md`
**Status**: Approved

## Architecture of the audit

```text
Implementation + tests + migrations + docs
                    |
             feature inventory
                    |
       existing OpenSpec/TLC comparison
                    |
          coverage matrix and gaps
                    |
      canonical specs + documentation change
                    |
             validation and report
```

## Capability boundaries

| Capability | Evidence boundary | Documentation action |
| --- | --- | --- |
| Account/authentication | `server/api.mjs`, `server/security.mjs`, `server/mail.mjs` | New spec |
| Academic workspace | `server/data.mjs`, `lib/study-planning.ts`, study components | New spec |
| Analytics/reports | `server/report-analytics.mjs`, `analytics/prepare.py`, report UI | New spec |
| Classroom | `server/classroom.mjs`, migration 006, Classroom tests | New spec |
| Notifications/history | `server/api.mjs`, account views, migration 002 | New spec |
| Integrations catalog | `lib/integrations.ts`, integrations view/tests | New spec |
| Runtime operations | `server/start.mjs`, `server/database.mjs`, runtime tests | New spec |
| Agent/Gemini | existing OpenSpec/TLC | No duplicate spec |
| Groq | completed Groq change/TLC | Canonicalize existing provider spec |

## Safety constraints

- No code or test file is changed.
- `SPEC.md` receives only appended sections.
- Existing Agent, Gemini and Groq specs remain authoritative for provider behavior.
- Planned integrations are described only as planned.
- Evidence uses `file:line` references available in the current tree.
