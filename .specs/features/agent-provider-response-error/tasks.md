# Tasks

## 1. Discovery

### T1: Reproduzir e isolar a falha

**Depends on**: None
**Tests**: authenticated E2E and direct provider trace
**Gate**: sanitized root-cause evidence

- [x] Reproduzir 503 no endpoint real.
- [x] Capturar `providerStatus=400` e mensagens de validação sem secrets.

## 2. Implementation

### T2: Corrigir o wire mapping Groq

**Depends on**: T1
**Tests**: `tests/agent-provider.test.mjs`
**Gate**: targeted provider tests

- [x] Serializar assistant Tool Calls no formato exigido pelo Groq.
- [x] Ajustar `list_tasks` nullable sem alterar ownership.

### T3: Corrigir Structured Output dinâmico

**Depends on**: T2
**Tests**: `tests/agent-provider.test.mjs`, `tests/agent-orchestrator.test.mjs`
**Gate**: targeted Agent tests

- [x] Usar JSON object mode e instrução do contrato no Groq.
- [x] Preservar schemas Zod como validação final backend.

## 3. Verification

### T4: Validar providers e fluxo real

**Depends on**: T3
**Tests**: `npm test`, `npm run typecheck`, `npm run build`, authenticated E2E
**Gate**: full

- [x] Confirmar Gemini e Groq sem fallback.
- [x] Confirmar resposta HTTP 200 para `Quais são minhas tarefas?`.
- [x] Registrar limitações de lint, OpenSpec e TLC.

## Test Coverage Matrix

| Requirement | Test | Gate |
| --- | --- | --- |
| PROVIDER-ERR-01 | Groq request mapping | `npm test` |
| PROVIDER-ERR-02 | nullable list tool validation | `npm test` |
| PROVIDER-ERR-03 | response format mapping and backend validation | `npm test` |
| PROVIDER-ERR-04 | Gemini regression tests and no fallback | `npm test` |

## Execution Plan

```text
T1 -> T2 -> T3 -> T4
```

## Gate Check Commands

| Gate | Command |
| --- | --- |
| Unit/integration | `npm test` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| OpenSpec | `openspec validate --all --strict` |
| TLC | `validate_spec.py`, `validate_tasks.py`, `validate_state.py` |

## Task Breakdown

| Task | Done when |
| --- | --- |
| T1 | The real provider error and sanitized evidence are recorded. |
| T2 | Groq continuation messages preserve the shared Agent contract. |
| T3 | Groq final output is constrained without weakening backend validation. |
| T4 | Provider regressions, build gates and browser flow are validated. |
