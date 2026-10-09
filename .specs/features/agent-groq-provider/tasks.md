# Tasks

## 1. Configuração

### T1: Adicionar seleção e configuração Groq

**Depends on**: None
**Tests**: `tests/agent-config.test.mjs`
**Gate**: `npm test`

- [x] Normalizar `LLM_PROVIDER=groq` e ler `GROQ_API_KEY`, `GROQ_MODEL`, URL e timeout sem alterar defaults Gemini.
- [x] Cobrir Groq, chave/modelo ausentes, provider inválido e regressão Gemini.

## 2. Provider

### T2: Implementar GroqProviderAdapter

**Depends on**: T1
**Tests**: `tests/agent-provider.test.mjs`
**Gate**: `npm test`

- [x] Mapear mensagens, system prompt, Tools, Tool results, JSON Schema, timeout, retry e erros para Groq.
- [x] Garantir no máximo uma repetição transitória e nenhum fallback Gemini/OpenRouter.

### T3: Cobrir Tool Calling e Structured Output Groq

**Depends on**: T2
**Tests**: `tests/agent-provider.test.mjs`
**Gate**: `npm test`

- [x] Validar Tool Call OpenAI-compatível, retorno de Tool e JSON Schema final sem Tools na mesma requisição.
- [x] Validar resposta inválida, 401/403/404, 429, timeout e ausência de segredo no request/log auxiliar.

## 3. Integração e documentação

### T4: Provar auditoria e preservação do Agent

**Depends on**: T3
**Tests**: `tests/agent-orchestrator.test.mjs`, `tests/agent-tools.test.mjs`, `tests/agent-schemas.test.mjs`
**Gate**: `npm test`

- [x] Comprovar `provider=groq` e modelo em Tool auditada, usando o Orchestrator e Registry existentes.
- [x] Confirmar segurança de Tool desconhecida, argumentos extras e ownership por testes existentes.

### T5: Atualizar documentação e validar

**Depends on**: T4
**Tests**: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, OpenSpec strict, TLC validators
**Gate**: full

- [x] Atualizar `.env.example`, `SPEC.md` apenas por acréscimo, `context.md`, `IMPLEMENTATION.md` e relatório final.
- [x] Executar gates e registrar E2E Gemini/Groq como deferred quando as credenciais locais não existirem.

## Test Coverage Matrix

| Requirement | Test | Gate |
| --- | --- | --- |
| GROQ-01 | `tests/agent-config.test.mjs`, `tests/agent-provider.test.mjs` | `npm test` |
| GROQ-02 | `tests/agent-config.test.mjs`, `tests/agent-provider.test.mjs` | `npm test` |
| GROQ-03 | `tests/agent-config.test.mjs` | `npm test` |
| GROQ-04 | `tests/agent-provider.test.mjs` | `npm test` |
| GROQ-05 | `tests/agent-provider.test.mjs`, `tests/agent-orchestrator.test.mjs`, existing security tests | `npm test` |
| GROQ-06 | `tests/agent-provider.test.mjs`, `tests/agent-orchestrator.test.mjs` | `npm test` |

## Gate Check Commands

| Gate | Command |
| --- | --- |
| Unit/integration | `npm test` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| OpenSpec | `openspec validate --all --strict` |
| TLC | `validate_spec.py`, `validate_tasks.py`, `validate_state.py` |

## Execution Plan

```text
T1 -> T2 -> T3 -> T4 -> T5
```

## Task Breakdown

| Task | Done when |
| --- | --- |
| T1 | Groq config is deterministic, secret-safe and Gemini defaults remain unchanged. |
| T2 | Groq adapter completes chat through the shared provider contract with finite retry. |
| T3 | Tool and schema request mapping has direct success and error coverage. |
| T4 | The existing Orchestrator audits `groq` and existing security gates remain green. |
| T5 | Docs are additive where required and all available gates have recorded evidence. |
