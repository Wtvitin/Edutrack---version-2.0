# Gemini Study Comparison Error Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill. Preserve the existing
Agent architecture and do not create provider fallback.

**Design**: `.specs/features/gemini-study-comparison-error/design.md`
**Status**: Done

## Test Coverage Matrix

Guidelines found: `AGENTS.md`, `package.json`, existing `tests/*.test.mjs`.

| Code Layer | Required Tests | Coverage Expectation | Test Location |
| --- | --- | --- | --- |
| Orchestrator persistence | integration | round 1, persisted history, round 2 with `thoughtSignature` | `tests/agent-orchestrator.test.mjs` |
| Provider mapping | unit | Gemini function call and function response contract | `tests/agent-provider.test.mjs` |
| Authenticated API flow | e2e | login, data, performance, comparison, HTTP 200 | local authenticated E2E evidence |
| Documentation | none | OpenSpec/TLC structural validation | OpenSpec and TLC commands |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After code/test task | `npm test -- tests/agent-orchestrator.test.mjs tests/agent-provider.test.mjs` |
| Full | After E2E task | authenticated local HTTP flow for `/api/ai/chat` |
| Build | Final verification | `npm test`; `npm run typecheck`; `npm run lint`; `npm run build` |
| Spec | Documentation verification | `openspec validate --all --strict`; TLC validators |

## Execution Plan

Phases execute sequentially.

### Phase 1: Discovery

```text
T1 -> T2
```

### Phase 2: Implementation

```text
T3 -> T4
```

### Phase 3: Verification

```text
T5 -> T6 -> T7
```

## Task Breakdown

### T1: Reproduzir o fluxo real

**What**: Comparar a instância antiga usada pelo navegador com uma instância
atual isolada e registrar o ponto de falha sem secrets.
**Where**: runtime local e endpoint `/api/ai/chat`
**Depends on**: None
**Reuses**: fluxo de autenticação e `/api/ai/chat` existentes
**Requirement**: GSC-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O 503 na instância antiga e o 200 na instância atual estão registrados.
- [x] O caso `0/105` é reproduzido autenticado.

**Tests**: e2e
**Gate**: full

### T2: Isolar persistência de Tool Call

**What**: Comparar a mensagem em memória e a mensagem persistida após uma Tool
Call Gemini com `id` e `thoughtSignature`.
**Where**: `server/agent-orchestrator.mjs`
**Depends on**: T1
**Reuses**: `parseStoredMessage` e `geminiMessages`
**Requirement**: GSC-01

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O gap de persistência está identificado.
- [x] O ponto mínimo de correção está definido.

**Tests**: integration
**Gate**: quick

### T3: Preservar metadado Gemini

**What**: Persistir `thoughtSignature` quando fornecido pelo adapter Gemini.
**Where**: `server/agent-orchestrator.mjs`
**Depends on**: T2
**Reuses**: `redact` e contrato interno de Tool Call
**Requirement**: GSC-01

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Somente o campo conhecido é persistido.
- [x] Nenhum campo arbitrário ou secret é aceito.

**Tests**: integration
**Gate**: quick

### T4: Adicionar regressão de retomada

**What**: Cobrir Tool Call Gemini, Tool Result, persistência e segunda chamada
após `conversationId`.
**Where**: `tests/agent-orchestrator.test.mjs`
**Depends on**: T3
**Reuses**: fake transport Gemini e fixtures de banco em memória
**Requirement**: GSC-01, GSC-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O teste inclui `id` e `thoughtSignature` reais do formato Gemini.
- [x] O segundo request somente passa quando o campo é reconstruído.
- [x] O gate rápido passa.

**Tests**: integration
**Gate**: quick

### T5: Validar E2E autenticado

**What**: Executar login, dados de estudo, desempenho e comparação na porta usada
pelo navegador.
**Where**: `/api/auth/*`, `/api/data`, `/api/ai/chat`
**Depends on**: T4
**Reuses**: runtime local e mailbox de desenvolvimento
**Requirement**: GSC-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Desempenho retorna HTTP 200.
- [x] Comparação retorna HTTP 200, `0/105` e gráfico autorizado.

**Tests**: e2e
**Gate**: full

### T6: Executar gates do repositório

**What**: Executar testes, typecheck, lint e build, separando baseline de
regressões desta mudança.
**Where**: `package.json`
**Depends on**: T5
**Reuses**: scripts existentes
**Requirement**: GSC-02, GSC-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `npm test` passa.
- [x] `npm run typecheck` passa.
- [x] `npm run build` passa.
- [x] `npm run lint` registra somente baseline preexistente.

**Tests**: unit/integration
**Gate**: build

### T7: Validar documentação e relatório

**What**: Executar OpenSpec/TLC e atualizar o relatório com evidências e
limitações reais.
**Where**: `openspec/changes/fix-gemini-study-comparison-error`, `.specs/features/gemini-study-comparison-error`, `AI_WEEK_COMPARISON_ERROR_INVESTIGATION_REPORT.md`
**Depends on**: T6
**Reuses**: validadores OpenSpec/TLC instalados
**Requirement**: GSC-01, GSC-02, GSC-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `openspec validate --all --strict` passa.
- [x] `validate_spec.py --strict` passa.
- [x] `validate_tasks.py --strict` passa.
- [x] `validation.md` registra PASS com evidência.

**Tests**: none
**Gate**: spec

## Phase Execution Map

```text
Phase 1 -> Phase 2 -> Phase 3
T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7
```
