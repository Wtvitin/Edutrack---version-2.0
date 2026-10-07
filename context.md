# Contexto operacional — Agent

## Estado

Implementado no change OpenSpec `integrate-ai-agent-into-target` e planejado/validado pelos artefatos TLC em `.specs/features/agent-integration/`. O Agent é nativo do TARGET; o SOURCE foi usado somente para comportamento e contratos.

## Arquitetura

`AgentView` → `POST /api/ai/chat` → sessão HttpOnly → `agent-orchestrator.mjs` → Provider adapter → Tool registry/validação → tarefas/analytics autorizados → PostgreSQL/PGlite → resposta estruturada validada.

## Configuração

`LLM_PROVIDER` aceita `openrouter` ou `google-gemini`. `LLM_MODEL`, `LLM_FALLBACK_MODEL`, `LLM_BASE_URL`, `LLM_TIMEOUT_MS`, `OPENROUTER_API_KEY` e `GOOGLE_API_KEY` são server-side. O default mantém o modelo/fallback auditados no SOURCE; testes injetam Provider mockado.

## Tools

`create_task`, `update_task`, `complete_task`, `get_task`, `list_tasks`, `get_academic_performance`, `get_study_trends` e `get_general_dashboard`. Tarefas reutilizam as tabelas e regras do TARGET; analytics usa `readData` e `prepareAnalytics` com snapshot minimizado.

## Persistência e segurança

`ai_conversations`, `ai_messages` e `ai_tool_executions` são reutilizadas. `academic_tasks.agent_execution_id` liga tarefa criada à auditoria. A auditoria não persiste secrets. Tool desconhecida, argumento inválido, conversation cross-user, prompt injection e tentativa de SQL arbitrário falham no backend.

## Verificação e limitações

Há testes mockados de Provider, schemas, Tools, orchestrator e API; o banco de integração usa `memory://`. O pipeline real Python/Pandas foi validado com `PYTHON_BIN` configurado para um interpretador com `analytics/requirements.txt`. O build e typecheck são gates; o lint conserva cinco erros e dezoito warnings preexistentes não relacionados ao Agent. Não há rate limit distribuído, streaming, RAG ou E2E dedicado.
## Validação final — 4 de outubro de 2026

- Login de conta verificada, sessão HttpOnly, `401` sem sessão, `400` para identidade forjada e `/agente` em `200` foram confirmados.
- O chat autenticado alcança o Agent, mas retorna `503 provider-not-configured` sem chave LLM server-side; isso é uma limitação de ambiente, não falha de autenticação.
- O endpoint de analytics real retornou `200` com as métricas esperadas; a suíte Node atual passou `38/38`.
- A resposta LLM real e o Tool E2E dependente de Provider permanecem deferred até configurar uma chave válida.
## Provider vigente — Google Gemini

O estado vigente Ã© `google-gemini` como default, com modelo `gemini-2.5-flash` e `GOOGLE_API_KEY`. OpenRouter nÃ£o Ã© fallback automÃ¡tico e sÃ³ Ã© usado quando selecionado explicitamente. O adapter Gemini usa `generateContent`, `systemInstruction`, function declarations, Structured Output e header server-side `x-goog-api-key`.

## Providers LLM — Gemini + Groq

Gemini continua o provider default: sem `LLM_PROVIDER` ou com `LLM_PROVIDER=google-gemini`, o runtime usa `GOOGLE_API_KEY` e `gemini-2.5-flash`. Com `LLM_PROVIDER=groq`, o factory seleciona exclusivamente `GroqProviderAdapter`; não há fallback automático para Gemini ou OpenRouter.

Groq lê apenas `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_BASE_URL` e `GROQ_TIMEOUT_MS` no servidor. `GROQ_MODEL` é obrigatório e não tem default no código, pois a implantação deve selecionar modelo com Tool Calling e Structured Output compatíveis. O adapter usa o mesmo Orchestrator, prompt, Context Manager, Tool Registry, ownership, validação e auditoria. Os testes mockados passam; o E2E Groq real permanece condicionado a credencial, modelo e conta de teste configurados.
