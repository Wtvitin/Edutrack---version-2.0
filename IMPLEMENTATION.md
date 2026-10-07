# Implementação — Agent de IA

## Mapa SOURCE → TARGET

| SOURCE | TARGET |
| --- | --- |
| `AgentController` | Rota `POST /api/ai/chat` em `server/api.mjs` |
| `AgentOrchestratorService` | `server/agent-orchestrator.mjs` |
| Adapters OpenRouter/Gemini | `server/agent-provider.mjs` com `fetch` injetável |
| Tool registry/validator | `server/agent-tools.mjs` + `server/agent-schemas.mjs` |
| Prisma AI models | SQL runtime existente e migração `database/003_ai_agent_indexes.sql` |
| NestJS guards | `auth(req)` e ownership no servidor Node |
| `AIAssistantPage`/`AgentChart` | `components/edutrack/agent-view.tsx` e `agent-chart.tsx` |

## Fluxo

1. A rota valida origem, JSON e sessão.
2. O orchestrator cria/reutiliza a conversa do usuário, persiste a mensagem e monta contexto mínimo.
3. O Provider retorna texto ou Tool Calls; o registry valida e executa somente funções allowlisted.
4. Cada Tool Call recebe audit `PENDING`, `SUCCESS` ou `FAILED` e os resultados voltam ao modelo.
5. O backend valida `text`, `analysis` ou `action`; a UI renderiza somente dados estruturados.

## Testes

`npm test` cobre 34 casos, incluindo retry/fallback/timeout, oito Tools, ownership, conversation isolation, Structured Output, auditoria, prompt injection, analytics e rota autenticada. `npm run typecheck` e `npm run build` passam. `npm run lint` ainda possui o baseline preexistente documentado no relatório da integração.
## Provider vigente

O fluxo normal usa `google-gemini` por default, `gemini-2.5-flash` e `GOOGLE_API_KEY` server-side. O adapter Gemini separa `systemInstruction`, converte Tools para function declarations, envia Structured Output quando solicitado e autentica com `x-goog-api-key` sem incluir a chave na URL. OpenRouter permanece somente como compatibilidade explicitamente selecionada e nÃ£o Ã© fallback automÃ¡tico.

## Groq Provider

`server/agent-provider.mjs` contém `GroqProviderAdapter` no mesmo factory do Gemini. A seleção `LLM_PROVIDER=groq` usa `GROQ_API_KEY` exclusivamente no header server-side e exige `GROQ_MODEL`; Gemini mantém `google-gemini` como default e não foi substituído.

O adapter Groq reutiliza o transporte `fetch`, timeout, retry finito, mensagens OpenAI-compatíveis, Tools, Tool results e `response_format` JSON Schema. O Orchestrator continua sendo o único responsável por system prompt, Context Manager, Tool Registry, validação, autorização, ownership, Structured Output final e auditoria. Não houve alteração de banco, frontend, autenticação ou autorização.

Os testes cobrem seleção, chave/modelo ausentes, Tool Calling, Structured Output sem Tools na mesma requisição, `429` com uma repetição, timeout, `401` sem repetição, ausência de fallback e auditoria `provider=groq`. O E2E real depende de credenciais Groq configuradas no ambiente.
