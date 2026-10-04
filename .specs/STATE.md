# STATE

## Decisions

### AD-001
- **Decision**: O Agent integrado ao TARGET permanece em módulos server-side Node HTTP e usa o adaptador SQL runtime existente, sem introduzir NestJS, Prisma ou Drizzle runtime.
- **Reason**: O TARGET é a autoridade arquitetural e já possui sessão, banco PostgreSQL/PGlite, persistência de tarefas e pipeline de analytics.
- **Trade-off**: O Agent não reutiliza classes e repositories do SOURCE literalmente, exigindo reimplementação de contratos e testes na arquitetura local.
- **Scope**: Todas as integrações server-side de AI/Agent do TARGET.
- **Date**: 2026-10-04
- **Status**: active

### AD-002
- **Decision**: A identidade do Agent é derivada exclusivamente da sessão HttpOnly validada no backend; IDs fornecidos por cliente ou modelo não definem ownership.
- **Reason**: Evita IDOR, cross-user access e confusão entre intenção do modelo e autorização do sistema.
- **Trade-off**: Tools precisam receber contexto autenticado e não podem ser funções genéricas reaproveitáveis pelo frontend.
- **Scope**: API, orchestrator, Tools, persistência AI e testes de segurança.
- **Date**: 2026-10-04
- **Status**: active

## Handoff

- **Feature**: agent-integration / `.specs/features/agent-integration`
- **Phase / Task**: Execute complete through T8; final verification complete.
- **Completed**: audit, baseline, OpenSpec proposal/spec/design/tasks, TLC spec/design/tasks, config/schemas/provider/tools/orchestrator/API/UI/migration/docs, 34 Node tests, typecheck, build, smoke and 3/3 mutation sensor.
- **Completed**: `.specs/features/agent-integration/validation.md:5` records the passing Python/Pandas analytics gate and independent verification.
- **Next step**: Keep the archived OpenSpec record and validation evidence with the TARGET; configure a real server-side Provider key only if live LLM E2E is required.
- **Blockers**: No implementation or security blocker. Live Provider response/Tool E2E is deferred without an API key; repository lint retains its pre-existing baseline.

### Final validation — 2026-10-04
- Authenticated login and protected Agent endpoint were validated with the normal TARGET session flow.
- Live chat reached the Provider boundary and returned the expected `provider-not-configured` response because no server-side LLM key is configured.
- `34/34` Node tests, typecheck, build, targeted Agent lint, OpenSpec/TLC validators, health and `/agente` smoke checks passed.
- Live Provider response and Provider-driven Tool E2E remain deferred until a valid API key is configured.
- **Report**: `AGENT_INTEGRATION_REPORT.md`; OpenSpec archive is `openspec/changes/archive/2026-10-03-integrate-ai-agent-into-target`.
- **Uncommitted files**: `.env.example`, `.specs/`, `IMPLEMENTATION.md`, `README.md`, `SPEC.md`, `components/edutrack/`, `context.md`, `database/003_ai_agent_indexes.sql`, `docs/arquitetura.md`, `openspec/`, `server/`, `tests/`, `package-lock.json`, `.npm-cache/`
- **Branch**: `feature/ai-agent-integration`

## Gemini Provider Migration — 2026-10-04

- **Decision**: Google Gemini is the runtime default; OpenRouter is explicit compatibility only and is never a Gemini fallback.
- **Evidence**: `server/agent-config.mjs:24`, `server/agent-provider.mjs:144`, `tests/agent-provider.test.mjs:77`, OpenSpec strict validation and TLC validators.
- **Credential**: `GOOGLE_API_KEY` is server-only and is absent from the current environment; real Gemini E2E is deferred.
- **Feature**: `.specs/features/agent-gemini-provider`.
- **OpenSpec**: `openspec/changes/archive/2026-10-04-migrate-agent-to-google-gemini` and `openspec/specs/ai-gemini-provider/spec.md`.
