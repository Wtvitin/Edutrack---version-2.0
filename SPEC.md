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
