# Agent Groq Provider Specification

## Problem Statement

O Agent suporta Google Gemini como provider padrão, mas não oferece Groq como escolha explícita dentro do contrato de provider atual. O TARGET precisa aceitar Groq sem duplicar Agent, Orchestrator, Tools, validações, autorização, ownership, auditoria ou interface.

## Goals

- Selecionar Groq explicitamente por `LLM_PROVIDER=groq`.
- Manter Gemini como provider padrão e preservar seu comportamento.
- Usar `GROQ_API_KEY` somente no servidor e `GROQ_MODEL` sem default hardcodeado.
- Preservar Tool Calling local, Structured Output validado no backend, timeout, retry finito, segurança e auditoria.

## Out of Scope

- Alterar UI, autenticação, autorização, ownership, banco, Context Manager, system prompt, Tool Registry ou Orchestrator.
- Criar fallback automático entre Gemini, Groq ou OpenRouter.
- Instalar SDK Groq ou dependência adicional.
- Executar E2E real sem `GROQ_API_KEY` e `GROQ_MODEL` configurados no ambiente.

## Requirements

### GROQ-01 - Provider selection

WHEN `LLM_PROVIDER=groq`, the system SHALL select Groq and SHALL NOT call Gemini or OpenRouter for that request.

### GROQ-02 - Gemini preservation

WHEN `LLM_PROVIDER` is absent or is `google-gemini`, the system SHALL retain the existing Gemini provider, model default and request behavior.

### GROQ-03 - Server-side configuration

WHEN Groq is selected, the system SHALL read `GROQ_API_KEY` and `GROQ_MODEL` only from server-side configuration and SHALL return a controlled error before network access when either required value is absent.

### GROQ-04 - Provider contract mapping

WHEN the Orchestrator sends messages, system instruction, Tools, Tool results or a final response schema, the Groq adapter SHALL map them to the OpenAI-compatible Groq chat contract without changing the Agent internal contract.

### GROQ-05 - Tool and structured-output safety

WHEN Groq returns Tool Calls or a structured final response, the system SHALL retain existing Tool Registry validation, authenticated ownership, backend response validation and audit flow.

### GROQ-06 - Resilience and audit

WHEN Groq returns a transient failure, the adapter SHALL make at most one retry against Groq; WHEN it returns a non-transient failure, the adapter SHALL not retry or select another provider; WHEN a Tool is audited, the system SHALL persist `provider=groq` and the effective model without secrets.

## Traceability

| Requirement | Implementation | Test |
| --- | --- | --- |
| GROQ-01 | `server/agent-config.mjs`, `server/agent-provider.mjs` | `tests/agent-config.test.mjs`, `tests/agent-provider.test.mjs` |
| GROQ-02 | `server/agent-config.mjs`, `server/agent-provider.mjs` | `tests/agent-config.test.mjs`, `tests/agent-provider.test.mjs` |
| GROQ-03 | `server/agent-config.mjs` | `tests/agent-config.test.mjs` |
| GROQ-04 | `server/agent-provider.mjs` | `tests/agent-provider.test.mjs` |
| GROQ-05 | `server/agent-orchestrator.mjs`, `server/agent-tools.mjs` | `tests/agent-orchestrator.test.mjs`, existing security tests |
| GROQ-06 | `server/agent-provider.mjs`, `server/agent-orchestrator.mjs` | `tests/agent-provider.test.mjs`, `tests/agent-orchestrator.test.mjs` |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Groq transport | Existing native `fetch` transport | Groq chat endpoint is OpenAI-compatible; no SDK is required. | yes |
| Groq model | Required `GROQ_MODEL`, no code default | Model support changes; deployment must choose a model compatible with Tool Calling and Structured Output. | yes |
| Tool and schema calls | Separate requests | Existing Orchestrator already uses Tools before the final `responseFormat` request. | yes |
| Retry policy | One retry only for transient failures | Aligns with existing provider pattern and avoids hidden fallback. | yes |

Open questions: none.

## User Stories

### P1: Groq chat

As a student, I want the authenticated Agent to use Groq when the server explicitly selects it so that provider choice does not require a UI or architecture change.

### P1: Safe Groq Tool Calling

As a student, I want Groq Tool Calls to use the same backend authorization and ownership checks so that a model response cannot access data outside my account.

## Requirement Traceability

| Requirement | Acceptance evidence |
| --- | --- |
| GROQ-01 | Groq factory selection and no-fallback unit tests |
| GROQ-02 | Gemini config and request-regression tests |
| GROQ-03 | Missing key/model and secret-handling config tests |
| GROQ-04 | Request mapping, Tool Call and provider-compatible Structured Output tests |
| GROQ-05 | Groq Tool audit plus existing unknown Tool, invalid argument and ownership tests |
| GROQ-06 | Retry, timeout, non-transient error and audit provider tests |
