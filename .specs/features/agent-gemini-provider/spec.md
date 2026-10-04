# Agent Gemini Provider Specification

## Problem Statement

O Agent possui suporte de código a Gemini, mas o runtime default usa OpenRouter e o fallback default também é OpenRouter. A mudança deve tornar Gemini o fluxo normal sem quebrar a abstração, Tools, segurança ou UI do TARGET.

## Goals

- Selecionar `google-gemini` por default.
- Usar `GOOGLE_API_KEY` somente no servidor.
- Preservar Tool Calling, Structured Output, timeout, retry e erros públicos.
- Impedir fallback silencioso para OpenRouter.
- Registrar o provider efetivo na auditoria.

## Out of Scope

- UI, autenticação, ownership, rate limit, streaming, RAG e migração de domínio.
- E2E real sem credencial Gemini disponível.

## Requirements

### GEMINI-01 — Provider default

WHEN `LLM_PROVIDER` estiver ausente, the system SHALL select `google-gemini` with model `gemini-2.5-flash`.

### GEMINI-02 — Secret server-side

WHEN Gemini is configured, the system SHALL read only `GOOGLE_API_KEY` on the server and SHALL NOT expose or log it.

### GEMINI-03 — No silent OpenRouter fallback

WHEN Gemini fails, the system SHALL retry only finite transient failures and SHALL NOT call OpenRouter unless it was explicitly selected at startup.

### GEMINI-04 — Gemini mapping

WHEN the orchestrator sends system instructions, history, Tools or Structured Output, the adapter SHALL map them to Gemini `generateContent` request fields and parse text/function calls through the common provider contract.

### GEMINI-05 — Audit

WHEN a Tool execution is persisted, the system SHALL store the effective provider with model, status, conversation and user identity.

## Traceability

| Requirement | Implementation | Test |
| --- | --- | --- |
| GEMINI-01 | `server/agent-config.mjs` | `tests/agent-config.test.mjs` |
| GEMINI-02 | `server/agent-config.mjs`, `server/agent-provider.mjs` | `tests/agent-provider.test.mjs` |
| GEMINI-03 | `server/agent-provider.mjs` | `tests/agent-provider.test.mjs` |
| GEMINI-04 | `server/agent-provider.mjs` | `tests/agent-provider.test.mjs` |
| GEMINI-05 | `server/agent-orchestrator.mjs`, `database/004_ai_provider.sql` | `tests/agent-orchestrator.test.mjs` |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Gemini credential name | `GOOGLE_API_KEY` | Existing TARGET convention; one server-side name avoids ambiguity. | yes |
| Gemini model | `gemini-2.5-flash` | Configurable default for chat, Tools and Structured Output. | yes |
| OpenRouter compatibility | Explicit opt-in only | Existing adapter/tests remain useful without becoming a hidden dependency. | yes |
| Runtime transport | Native `fetch` adapter | Existing TARGET abstraction; no dependency installation needed. | yes |

Open questions: none.

## User Stories

### P1: Gemini chat

As a student, I want the authenticated Agent to use Google Gemini by default so that the normal runtime does not depend on OpenRouter.

### P1: Safe Tool Calling

As a student, I want Gemini function calls to pass through the existing backend registry, validation, authorization and ownership checks.

## Requirement Traceability

| Requirement | Acceptance evidence |
| --- | --- |
| GEMINI-01 | Default config test and runtime config inspection |
| GEMINI-02 | Header/no-URL-key test and frontend secret scan |
| GEMINI-03 | Gemini failure test with OpenRouter fallback forbidden |
| GEMINI-04 | Gemini function-call and Structured Output tests |
| GEMINI-05 | Orchestrator audit provider assertion and migration smoke |
