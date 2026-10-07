# SPEC — Agent de IA do TARGET

## Escopo implementado

O TARGET mantém Next/Vinext/React, servidor Node HTTP, sessão por cookie e PostgreSQL/PGlite. O Agent adiciona chat autenticado, OpenRouter/Google Gemini server-side, oito Tools allowlisted, persistência AI, auditoria, Structured Output e UI nativa em `AgentView`.

A implementação foi verificada com Provider mockado, banco `memory://`, pipeline real Python/Pandas, typecheck e build. O lint completo mantém apenas o baseline preexistente em arquivos não relacionados.

## Invariantes

- A identidade vem exclusivamente da sessão autenticada.
- Cada conversa, tarefa e métrica é filtrada pelo `user_id` da sessão.
- Tool Calls, argumentos e respostas estruturadas são validados no backend.
- O frontend não recebe secrets, SQL, código executável ou resposta não validada.
- O loop termina em resposta final ou em três iterações.

## Deferred

Rate limiting distribuído, streaming, RAG/memória semântica, filas, Google Classroom e E2E dedicado não fazem parte deste change.
## Provider Gemini — estado atual

O runtime normal MUST usar `google-gemini` quando `LLM_PROVIDER` nÃ£o estiver definido. O modelo default Ã© `gemini-2.5-flash` e a credencial server-side Ã© `GOOGLE_API_KEY`. OpenRouter permanece somente como compatibilidade explÃ­cita quando `LLM_PROVIDER=openrouter`; ele nÃ£o Ã© fallback do Gemini. O E2E real depende de uma chave Gemini configurada no ambiente.

## Groq Provider

O sistema MUST suportar Groq como provider LLM opcional pelo adapter Groq dentro da camada de providers existente. A seleção MUST ser explícita: `LLM_PROVIDER=groq` usa Groq, enquanto `LLM_PROVIDER=google-gemini` e a ausência da variável preservam Google Gemini como runtime default.

`GROQ_API_KEY` MUST permanecer somente no servidor. `GROQ_MODEL` MUST configurar o modelo Groq e não há modelo Groq hardcodeado pelo runtime. `GROQ_BASE_URL` e `GROQ_TIMEOUT_MS` podem configurar o endpoint e timeout do provider sem alterar Gemini.

Groq MUST reutilizar o mesmo Agent Orchestrator, Context Manager, system prompt, Tool Registry, validação de argumentos, autorização, ownership, Structured Output e Frontend. Tool Calls Groq MUST seguir a validação backend existente e respostas estruturadas MUST continuar validadas antes de retornar ao cliente.

O adapter Groq MUST aplicar retry finito somente para falhas transitórias, respeitar timeout e nunca trocar silenciosamente para Gemini, OpenRouter ou outro provider. A auditoria existente MUST identificar Tools Groq por `provider=groq` e modelo efetivo, sem registrar API key ou outros secrets.
