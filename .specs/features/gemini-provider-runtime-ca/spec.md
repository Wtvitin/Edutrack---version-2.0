# Gemini Provider Runtime CA

## Problem Statement

O Agent seleciona Gemini, mas o runtime local retorna `provider-network` porque o `fetch` do Node não confia na cadeia de certificados usada pelo ambiente. A mensagem exibida pelo frontend é somente um sintoma.

## Goals

- Fazer o runtime local usar a CA do sistema sem desabilitar TLS.
- Preservar Gemini como provider padrão e OpenRouter apenas por seleção explícita.
- Registrar diagnóstico técnico seguro para falhas do provider.
- Manter o fluxo `/api/ai/chat`, autenticação, autorização, Tools e auditoria existentes.

## Out of Scope

- Redesign da UI.
- Alterações em autenticação, ownership, Tool Registry ou analytics.
- Troca de provider, modelo ou endpoint.
- Fallback para OpenRouter.
- Rotação ou alteração de valores secretos.

## Requirements

### GCA-01 — CA do sistema no startup

WHEN `npm run dev` or `npm start` is executed, the system SHALL start `server/start.mjs` with `--use-system-ca` and SHALL keep TLS certificate verification enabled.

### GCA-02 — Diagnóstico seguro

WHEN a provider error reaches the API, the system SHALL emit provider, model, public status and safe error code, optionally with upstream status and cause code/name, and SHALL NOT emit credentials, tokens, cookies or complete prompts.

### GCA-03 — Seleção Gemini

WHEN `LLM_PROVIDER` is absent, the system SHALL select `google-gemini` with `gemini-2.5-flash` and SHALL NOT select OpenRouter after a Gemini failure.

### GCA-04 — Status upstream

WHEN the upstream provider returns a non-success response, the system SHALL retain its HTTP status for internal diagnosis while preserving the existing public status mapping.

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Runtime certificate trust | Node system CA | The direct provider call succeeds with the system trust store in this environment. | yes |
| Minimum Node version | `22.15.0` | This runtime supports `--use-system-ca`. | yes |
| Provider fallback | None | Gemini must remain the only default path. | yes |
| Secret source | `GOOGLE_API_KEY` server-side | Existing TARGET convention and adapter contract. | yes |

Open questions: none.

## User Stories

### P1: Gemini runtime access

As a student, I want the authenticated Agent to reach Google Gemini from the local server so that a valid message receives a provider response.

### P1: Safe diagnosis

As an operator, I want provider failures to include safe technical metadata so that TLS, HTTP and configuration failures can be distinguished without exposing secrets.

## Requirement Traceability

| Requirement | Acceptance evidence |
| --- | --- |
| GCA-01 | `tests/agent-runtime.test.mjs` and startup smoke with `--use-system-ca` |
| GCA-02 | `tests/agent-api.test.mjs` safe log assertion |
| GCA-03 | Existing `tests/agent-config.test.mjs` and `tests/agent-provider.test.mjs` no-fallback tests |
| GCA-04 | `tests/agent-provider.test.mjs` upstream status assertion |
