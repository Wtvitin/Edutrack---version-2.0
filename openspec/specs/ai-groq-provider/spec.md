# ai-groq-provider Specification

## Purpose

Documentar o suporte opcional ao Groq dentro da mesma camada de providers do
Agent, preservando Gemini, OpenRouter explícito, Orchestrator, Tools, segurança e
auditoria existentes.

## Requirements

### Requirement: Seleção explícita do provider Groq

O sistema MUST aceitar `groq` como valor explícito de `LLM_PROVIDER`. Quando
`LLM_PROVIDER=groq`, o Agent MUST usar somente `GroqProviderAdapter`; quando a
variável estiver ausente ou for `google-gemini`, o comportamento Gemini MUST
permanecer inalterado. O sistema MUST NOT trocar de provider depois de uma falha.

#### Scenario: Groq selecionado

- WHEN o processo inicia com `LLM_PROVIDER=groq`
- THEN `/api/ai/chat` MUST usar somente o adapter Groq para a conversa.

#### Scenario: Gemini preservado

- WHEN o processo inicia sem `LLM_PROVIDER` ou com `LLM_PROVIDER=google-gemini`
- THEN `/api/ai/chat` MUST continuar usando Google Gemini.

#### Scenario: provider inválido

- WHEN `LLM_PROVIDER` não corresponder a um provider suportado
- THEN o sistema MUST retornar erro controlado sem chamar outro provider.

### Requirement: Configuração server-side e modelo explícito

O sistema MUST ler `GROQ_API_KEY` e `GROQ_MODEL` somente no backend, MUST exigir
modelo configurado para Groq e MAY aceitar `GROQ_BASE_URL` e `GROQ_TIMEOUT_MS` para
substituir os valores comuns.

#### Scenario: credencial ou modelo ausente

- WHEN Groq está selecionado e a chave ou modelo obrigatório está vazio
- THEN o backend MUST responder `provider-not-configured` ou
  `model-not-configured` antes da rede, sem revelar secrets.

### Requirement: Contrato comum de chat, Tools e Structured Output

O adapter Groq MUST mapear mensagens, system prompt, Tools, Tool results,
temperatura, limite de tokens e o modo de Structured Output compatível com o
endpoint sem alterar o contrato interno do Agent. O adapter MUST usar JSON
Schema quando o contrato for aceito pelo endpoint e JSON object mode com
instrução do contrato quando houver objetos dinâmicos incompatíveis com o modo
estrito.

#### Scenario: Tool Calling

- WHEN Groq solicita Tool registrada com argumentos válidos
- THEN o Orchestrator MUST executar o mesmo registry, validação, autorização,
  ownership e auditoria usados por Gemini.

#### Scenario: Structured Output

- WHEN o Orchestrator solicita resposta estruturada final
- THEN Groq MUST receber JSON estruturado sem Tools na mesma requisição e o
  backend MUST validar o JSON antes da resposta.

### Requirement: Retry, timeout, erros e auditoria

O adapter MUST respeitar timeout, repetir no máximo uma vez somente erros
transitórios e registrar diagnóstico server-side sem API key. Falhas `401`, `403`,
`404` e respostas inválidas MUST NOT acionar outro provider.

#### Scenario: falha transitória

- WHEN Groq retorna `408`, `429`, `5xx`, timeout ou falha de rede
- THEN o adapter MUST realizar no máximo uma nova tentativa no Groq e retornar
  erro público controlado se persistir.

#### Scenario: Tool auditada

- WHEN uma Tool é executada em conversa Groq
- THEN `ai_tool_executions` MUST registrar `provider=groq`, modelo, usuário,
  conversa, Tool, status e timestamps, sem chave ou header secreto.

## Traceability

| Requirement | Implementation | Test |
| --- | --- | --- |
| Seleção | `server/agent-config.mjs:25`, `server/agent-provider.mjs:240` | `tests/agent-config.test.mjs:30`, `tests/agent-provider.test.mjs:111` |
| Configuração | `server/agent-config.mjs:33`, `server/agent-provider.mjs:175` | `tests/agent-config.test.mjs:40`, `tests/agent-provider.test.mjs:170` |
| Contrato | `server/agent-provider.mjs:179`, `server/agent-orchestrator.mjs:145` | `tests/agent-provider.test.mjs:111`, `tests/agent-provider.test.mjs:130` |
| Retry e auditoria | `server/agent-provider.mjs:184`, `server/agent-orchestrator.mjs:171` | `tests/agent-provider.test.mjs:140`, `tests/agent-orchestrator.test.mjs:70` |
