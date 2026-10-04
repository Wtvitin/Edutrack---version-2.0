# Tasks

### T1: Defaults and configuration

**Depends on**: None
**Tests**: `tests/agent-config.test.mjs`
**Gate**: `npm test`

- [x] Update `readAgentConfig` to default to Gemini and remove OpenRouter fallback defaults.
- [x] Update `.env.example` and docs without copying secrets.

### T2: Gemini adapter

**Depends on**: T1
**Tests**: `tests/agent-provider.test.mjs`
**Gate**: `npm test`

- [x] Send `systemInstruction`, Gemini contents and function declarations through the existing transport.
- [x] Send `x-goog-api-key`, structured-output schema and finite retries.
- [x] Prove Gemini failure never invokes OpenRouter.

### T3: Provider audit

**Depends on**: T2
**Tests**: `tests/agent-orchestrator.test.mjs`
**Gate**: `npm test`

- [x] Add provider audit column and migration.
- [x] Persist effective provider from orchestrator.

### T4: Verification

**Depends on**: T3
**Tests**: `npm test`, `npm run typecheck`, `npm run build`, targeted ESLint, TLC validators
**Gate**: full

- [x] Update unit/integration tests and run all gates.
- [x] Run real Gemini E2E only when a configured key exists; otherwise record deferred.

## Test Coverage Matrix

| Requirement | Test | Gate |
| --- | --- | --- |
| GEMINI-01 | `tests/agent-config.test.mjs` | `npm test` |
| GEMINI-02 | `tests/agent-provider.test.mjs` | `npm test` |
| GEMINI-03 | `tests/agent-provider.test.mjs` | `npm test` |
| GEMINI-04 | `tests/agent-provider.test.mjs` | `npm test` |
| GEMINI-05 | `tests/agent-orchestrator.test.mjs` | `npm test` |

## Gate Check Commands

| Gate | Command |
| --- | --- |
| Unit/integration | `npm test` |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` |
| Targeted lint | `npx eslint server/agent-config.mjs server/agent-provider.mjs server/agent-orchestrator.mjs tests/agent-config.test.mjs tests/agent-provider.test.mjs tests/agent-orchestrator.test.mjs` |
| TLC | `validate_spec.py`, `validate_tasks.py`, `validate_state.py` |

## Execution Plan

```text
T1 → T2 → T3 → T4
```

## Task Breakdown

#### Configuration details

**Done when**: default config resolves to Gemini, docs/env are updated, and config tests pass.

#### Adapter details

**Done when**: request/response mapping, Tool Calling, Structured Output, header auth, timeout and no-fallback tests pass.

#### Audit details

**Done when**: migration applies and Tool Execution stores the effective provider.

#### Verification details

**Done when**: all gates pass and real E2E is either passing or explicitly deferred for missing credentials.
