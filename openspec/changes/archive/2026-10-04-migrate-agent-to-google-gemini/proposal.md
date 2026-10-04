# Proposal

## Why

O Agent possui adapters para OpenRouter e Google Gemini, mas `readAgentConfig` usa OpenRouter, `qwen/qwen3-coder:free` e `openrouter/free` como defaults. Assim, a existência do adapter Gemini não prova uso em runtime e o fluxo normal não atende à decisão de usar a API direta do Google.

## What Changes

- Tornar Google Gemini o provider default e o único fallback implícito permitido: nenhum fallback silencioso para OpenRouter.
- Usar `GOOGLE_API_KEY` somente no servidor, com modelo Gemini configurável e default compatível com chat, Tool Calling e Structured Output.
- Corrigir o adapter Gemini para usar `systemInstruction`, `responseSchema`/JSON output quando aplicável e header `x-goog-api-key`, sem colocar a chave na URL.
- Preservar suporte OpenRouter somente como modo explicitamente configurado, sem ser usado pelo fluxo Gemini.
- Persistir o provider efetivo na auditoria de Tool Executions.
- Adicionar testes de seleção, ausência de fallback, request/response Gemini, Tool Calling, Structured Output e segurança da credencial.
- Atualizar `.env.example`, SPEC, contexto, implementação e relatório final.

## Non-goals

- Não alterar UI, autenticação, ownership, Tool Registry, banco de domínio ou schema de tarefas.
- Não adicionar SDK ou dependência externa; o transporte `fetch` server-side existente permanece.
- Não executar E2E real sem uma chave Gemini válida presente no ambiente.

## Impact

- **Servidor:** `server/agent-config.mjs`, `server/agent-provider.mjs`, `server/agent-orchestrator.mjs` e rota já existente.
- **Banco:** migração aditiva para registrar `provider` em `ai_tool_executions`.
- **Testes:** defaults, adapter Gemini, Tool Calling, Structured Output, auditoria e regressão explícita OpenRouter.
- **Documentação:** `.env.example`, `SPEC.md`, `context.md`, `IMPLEMENTATION.md` e relatório dedicado.
