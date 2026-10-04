# Agent Integration Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implementar estes tasks com a skill `tlc-spec-driven`, mantendo a sequência spec → plan → code → test → verify. Cada task deve ser verificado antes do próximo. A criação de commits está deliberadamente omitida porque a instrução de maior prioridade desta execução proíbe commits; o worktree deve permanecer preservado e auditável.

**Design**: `.specs/features/agent-integration/design.md`
**Status**: Complete

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `README.md`, `package.json`, `tests/accounts.test.mjs`, `tests/analytics.test.mjs`, `AGENTS.md` fornecido na solicitação; não existe harness E2E dedicado.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Config/schemas | unit | Defaults, limits, strictness and every structured output variant | `tests/agent-config.test.mjs`, `tests/agent-schemas.test.mjs` | `node --test tests/agent-config.test.mjs tests/agent-schemas.test.mjs` |
| Provider adapter | unit | Success, tool call, timeout, retry, fallback, quota and malformed response | `tests/agent-provider.test.mjs` | `node --test tests/agent-provider.test.mjs` |
| Tool/domain layer | integration | Every registered tool, ownership, invalid args, audit-safe result and empty analytics | `tests/agent-tools.test.mjs` | `node --test tests/agent-tools.test.mjs` |
| Orchestrator | integration | Text/analysis/action, three-iteration cap, conversation isolation, persistence and audit | `tests/agent-orchestrator.test.mjs` | `node --test tests/agent-orchestrator.test.mjs` |
| HTTP route | integration | Auth, happy path, empty/oversized input, provider/database errors, injection and cross-user | `tests/agent-api.test.mjs` | `node --test tests/agent-api.test.mjs` |
| Frontend view/chart | unit/build | API states and safe chart data; typecheck/build catches integration errors | `tests/agent-frontend.test.mjs` or build gate | `npm run typecheck` |
| Migration/config/docs | none | Build gate and migration smoke only | `database/003_ai_agent_indexes.sql`, `.env.example`, docs | `npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Unit/config/provider tasks | `npm test` |
| Full | Tool, orchestrator and route tasks | `npm test` |
| Build | Phase completion or config/frontend/docs tasks | `npm test; npm run typecheck; npm run lint; npm run build` |

## Execution Plan

### Phase 1: Contracts and resilience

```
T1 → T2 → T3
```

### Phase 2: Domain and orchestration

```
T4 → T5 → T6
```

### Phase 3: UI and final verification

```
T7 → T8
```

## Task Breakdown

### T1: Configuração do Agent

**What**: Criar a leitura server-side de provider, modelo, fallback, base URL, timeout, limite de iteração, prompt version e limites de entrada.
**Where**: `server/agent-config.mjs`
**Depends on**: None
**Reuses**: `server/api.mjs` e `.env.example`
**Requirement**: AI-01, AI-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Defaults são determinísticos e secrets só são lidos no servidor.
- [x] Provider/model/fallback/timeout/iteration limits são configuráveis sem copiar `.env` do SOURCE.
- [x] Gate `npm test` passa e o teste de configuração cobre defaults e limites.

**Tests**: unit
**Gate**: quick
**Commit**: não executar; commits proibidos nesta execução.

### T2: Schemas estritos

**What**: Criar schemas zod para envelope HTTP, registry, argumentos, mensagens, outputs estruturados e ChartSpecification.
**Where**: `server/agent-schemas.mjs`
**Depends on**: T1
**Reuses**: `zod` e contratos auditados no SOURCE
**Requirement**: AI-03, AI-06, AI-07, AI-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Campos desconhecidos, UUID inválido, enum inválido e argumentos forjando identidade são rejeitados.
- [x] `text`, `analysis`, `action` e gráfico validam no backend.
- [x] Testes de schemas cobrem cada variante e falha de payload.
- [x] Gate `npm test` passa.

**Tests**: unit
**Gate**: quick
**Commit**: não executar; commits proibidos nesta execução.

### T3: Provider adapter

**What**: Implementar adapters OpenRouter/Gemini usando `fetch` injetável, timeout, retry finito, fallback e parsing controlado.
**Where**: `server/agent-provider.mjs`
**Depends on**: T1, T2
**Reuses**: `fetch` nativo e formatos funcionais auditados do SOURCE
**Requirement**: AI-09, AI-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Transporte não executa rede nos testes e não expõe API key ao retorno.
- [x] Timeout, erro transitório, quota, resposta sem choices/candidates e fallback têm resultados controlados.
- [x] Testes cobrem sucesso, Tool Call, retry, fallback e timeout.
- [x] Gate `npm test` passa.

**Tests**: unit
**Gate**: quick
**Commit**: não executar; commits proibidos nesta execução.

### T4: Registry e Tools de domínio

**What**: Implementar registry allowlisted, Tools de tarefas e analytics sobre os serviços/pipelines existentes, com ownership e auditoria segura.
**Where**: `server/agent-tools.mjs`
**Depends on**: T2, T3
**Reuses**: `server/data.mjs`, `server/analytics.mjs`, tabelas SQL existentes
**Requirement**: AI-03, AI-04, AI-05, AI-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] As oito Tools do SOURCE são registradas somente quando compatíveis com o TARGET.
- [x] `create_task` reutiliza a regra de tarefa, grava `created_by=AGENT` e vincula execution ID.
- [x] Ownership e ausência de `userId` confiável são validados antes do domínio.
- [x] Testes cobrem todas as Tools, cross-user, args inválidos e analytics vazios.
- [x] Gate `npm test` passa.

**Tests**: integration
**Gate**: full
**Commit**: não executar; commits proibidos nesta execução.

### T5: Orchestrator

**What**: Implementar montagem de contexto, persistência de conversa/mensagem, loop controlado, execução de Tools, Structured Output e audit.
**Where**: `server/agent-orchestrator.mjs`
**Depends on**: T3, T4
**Reuses**: database adapter e tabelas `ai_*`
**Requirement**: AI-01, AI-02, AI-05, AI-06, AI-07, AI-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Contexto contém apenas prompt, mensagem, histórico limitado, disciplinas próprias e Tool results.
- [x] Conversa de outra conta não é acessível e mensagens/audits são persistidos sem secrets.
- [x] Loop encerra em resposta final ou em no máximo três iterações.
- [x] Testes cobrem text/analysis/action, persistence, audit, isolation e cap.
- [x] Gate `npm test` passa.

**Tests**: integration
**Gate**: full
**Commit**: não executar; commits proibidos nesta execução.

### T6: API autenticada

**What**: Integrar `POST /api/ai/chat` ao roteador existente, com sessão, envelope, códigos públicos e delegação ao orchestrator.
**Where**: `server/api.mjs`
**Depends on**: T5
**Reuses**: `auth`, `body`, `respond`, `error` e checks de origem existentes
**Requirement**: AI-01, AI-02, AI-08, AI-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Sem sessão retorna `401` e não chama Provider/Tool.
- [x] Mensagem vazia/oversized, origem inválida e erro externo retornam status controlado sem stack trace.
- [x] Testes da rota cobrem happy path, edge cases, cross-user, injection e falhas.
- [x] Gate `npm test` passa.

**Tests**: integration
**Gate**: full
**Commit**: não executar; commits proibidos nesta execução.

### T7: AgentView e gráficos seguros

**What**: Conectar a view existente a API same-origin e adicionar cliente/renderer para estados de chat e ChartSpecification validada.
**Where**: `components/edutrack/agent-view.tsx`
**Depends on**: T6
**Reuses**: `components/edutrack/views.tsx`, `components/ui`, `recharts`
**Requirement**: AI-06, AI-07, AI-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Conta autenticada consegue enviar mensagem, ver loading/erro e manter conversation ID.
- [x] Demo offline não envia dados ao Provider e informa requisito de login.
- [x] Chart renderer aceita somente especificação validada e nunca injeta código/HTML.
- [x] `npm run typecheck` e `npm run build` passam.

**Tests**: unit/build
**Gate**: build
**Commit**: não executar; commits proibidos nesta execução.

### T8: Migração, documentação e verificação final

**What**: Registrar migração/configuração/documentação real e executar a verificação completa da implementação.
**Where**: `database/003_ai_agent_indexes.sql`
**Depends on**: T7
**Reuses**: `README.md`, `docs/arquitetura.md`, OpenSpec change e evidências TLC
**Requirement**: AI-01 through AI-10

**Done when**:

- [x] Migração é idempotente e aplicada pelo runtime do TARGET sem dados duplicados.
- [x] `.env.example`, `README.md`, `docs/arquitetura.md`, `context.md` e `IMPLEMENTATION.md` refletem o estado real, incluindo deferred.
- [x] `npm test`, `npm run typecheck`, `npm run lint` e `npm run build` executam; erros de lint são comparados ao baseline.
- [x] Smoke mockado valida Olá, tarefas, criação/conclusão, analytics e cross-user.
- [x] TLC validation report contém evidência por requisito e discriminação; OpenSpec é validado e só então arquivado.

**Tests**: integration/build
**Gate**: build
**Commit**: não executar; commits proibidos nesta execução.

## Phase Execution Map

```
T1 → T2
T1 → T3
T2 → T3
T2 → T4
T3 → T4
T3 → T5
T4 → T5
T5 → T6
T6 → T7
T7 → T8
```

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 config boundary | ✅ Granular |
| T2 | 1 schema boundary | ✅ Granular |
| T3 | 1 provider boundary | ✅ Granular |
| T4 | 1 registry/domain boundary | ✅ Granular |
| T5 | 1 orchestrator boundary | ✅ Granular |
| T6 | 1 endpoint boundary | ✅ Granular |
| T7 | 1 UI boundary with cohesive client/renderer | ✅ Granular |
| T8 | 1 release/verification boundary | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends on | Diagram shows | Status |
| --- | --- | --- | --- |
| T1 | None | Phase 1 start | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1, T2 | T2 → T3 | ✅ Match |
| T4 | T2, T3 | Phase 2 after T3; T4 first | ✅ Match |
| T5 | T3, T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1 | Config | unit | unit | ✅ OK |
| T2 | Schemas | unit | unit | ✅ OK |
| T3 | Provider | unit | unit | ✅ OK |
| T4 | Tool/domain | integration | integration | ✅ OK |
| T5 | Orchestrator | integration | integration | ✅ OK |
| T6 | HTTP route | integration | integration | ✅ OK |
| T7 | Frontend | unit/build | unit/build | ✅ OK |
| T8 | Migration/docs | none + build | integration/build | ✅ OK |

## Task Verification Standards

Every task must leave its tests and gate evidence in the worktree before it is marked complete. No test may be weakened or skipped. Because commits are prohibited by the higher-priority execution rule, task completion is tracked by checkboxes, test output and `validation.md` rather than commit hashes.
