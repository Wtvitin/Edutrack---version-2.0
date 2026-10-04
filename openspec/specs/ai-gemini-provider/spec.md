# ai-gemini-provider Specification

## Purpose
Definir o uso server-side do Google Gemini como provider normal do Agent, preservando Tool Calling, Structured Output, seguranca, auditoria e a arquitetura Node HTTP do TARGET sem fallback silencioso para OpenRouter.

## Requirements

### Requirement: Gemini como provider default

O sistema MUST selecionar `google-gemini` quando `LLM_PROVIDER` estiver ausente e MUST usar `GOOGLE_API_KEY` exclusivamente no servidor.

#### Scenario: configuração padrão

- WHEN o servidor inicia sem `LLM_PROVIDER`
- THEN o Agent usa `google-gemini`, modelo `gemini-2.5-flash` e endpoint Gemini configurável, sem selecionar OpenRouter.

#### Scenario: credencial Gemini ausente

- WHEN `LLM_PROVIDER` é Gemini e `GOOGLE_API_KEY` está ausente
- THEN o backend retorna erro controlado de provider não configurado e não chama rede nem OpenRouter.

### Requirement: nenhuma dependência silenciosa de OpenRouter

O sistema MUST NOT usar OpenRouter como fallback quando Gemini falhar; OpenRouter MAY funcionar apenas quando `LLM_PROVIDER=openrouter` for explicitamente configurado.

#### Scenario: falha Gemini

- WHEN Gemini retorna timeout, quota, erro HTTP ou resposta inválida
- THEN o adapter aplica somente retry transitório finito e retorna erro controlado, sem instanciar ou chamar OpenRouter.

### Requirement: adapter Gemini completo

O adapter MUST encapsular autenticação, system instruction, mensagens, Tools, function calls, Structured Output, timeout e retry.

#### Scenario: chamada com Tool

- WHEN o orchestrator envia Tools ao provider Gemini
- THEN o adapter envia `functionDeclarations`, interpreta `functionCall` e devolve nome e argumentos ao registry backend.

#### Scenario: resposta estruturada

- WHEN o orchestrator solicita Structured Output sem Tool
- THEN o adapter envia JSON output/schema e o backend ainda valida a resposta antes da UI.

#### Scenario: credencial protegida

- WHEN uma chamada Gemini é realizada
- THEN a chave usa header server-side e não aparece na URL, frontend, payload de auditoria ou resposta.

### Requirement: auditoria do provider efetivo

O sistema MUST registrar o provider efetivo em cada Tool Execution junto com modelo, usuário, conversa, status e timestamps.

#### Scenario: Tool Gemini

- WHEN uma Tool é solicitada por uma execução Gemini
- THEN `ai_tool_executions.provider` registra `google-gemini`.
