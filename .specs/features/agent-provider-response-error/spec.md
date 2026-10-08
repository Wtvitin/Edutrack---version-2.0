# Agent Provider Response Error Specification

## Problem Statement

O fluxo real do Agent autenticado falha depois que Groq retorna Tool Calling para
`Quais são minhas tarefas?`. A API converte a falha em 503 genérico, embora a
causa esteja na compatibilidade do request de continuação e do Structured Output.

## Goals

- Reproduzir e documentar a causa real sem expor secrets.
- Corrigir somente o boundary Groq.
- Manter Gemini, Orchestrator, Tools, segurança e auditoria.
- Validar o caso reportado com teste automatizado e E2E real quando configurado.

## Out of Scope

- Fallback entre providers, alteração de frontend, novo Agent ou novo Tool Registry.
- Alteração de autenticação, autorização, ownership, banco ou persistência.
- Alteração do contrato backend `text`, `analysis` e `action`.

## Requirements

### AGENT-01 - Tool Call wire mapping

WHEN Groq receives a continuation with an assistant Tool Call, the adapter SHALL
send the OpenAI-compatible `type=function` and nested `function` fields.

### AGENT-02 - Nullable optional filter

WHEN Groq emits `status: null` for `list_tasks`, the Tool validation SHALL treat it
as no filter and SHALL preserve account ownership and strict extra-field checks.

### AGENT-03 - Dynamic Structured Output

WHEN Groq receives a final response contract with dynamic object values, the adapter
SHALL request JSON object mode and the backend SHALL remain the final validator.

### AGENT-04 - Provider preservation

WHEN Gemini is selected, the existing Gemini mapping SHALL remain unchanged and the
system SHALL NOT introduce automatic fallback.

## Acceptance Criteria

1. WHEN an authenticated Groq chat asks for tasks, the API SHALL complete the Tool Calling flow and return HTTP 200 with a validated response.
2. WHEN Groq returns a Tool Call, the adapter SHALL serialize the continuation in the provider-required wire format.
3. WHEN Groq returns a nullable optional filter, the Tool SHALL execute without weakening authorization or accepting extra properties.
4. WHEN Groq requests dynamic Structured Output, the adapter SHALL avoid the rejected strict schema mode and the backend SHALL validate the final JSON.
5. WHEN Gemini is selected, its existing request mapping SHALL continue to pass its regression tests without Groq-specific transformations.
6. WHEN a provider remains unavailable or returns an invalid response, the API SHALL retain controlled errors and SHALL NOT switch providers.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
| --- | --- | --- |
| Wire mapping location | Groq adapter only | Keeps provider-specific details out of the Orchestrator. |
| Dynamic Groq output mode | `json_object` plus contract instruction | The observed Groq endpoint rejected `additionalProperties:true` in strict schema mode. |
| E2E credential use | Existing local server configuration only | The key is never copied to code, tests, logs or documentation. |

Open questions: none.

## User Stories

### P1: Consultar tarefas

As a estudante, I want `Quais são minhas tarefas?` to complete so that a provider
compatibility error does not block the Agent.

### P1: Preservar segurança

As a maintainer, I want the fix to remain behind the existing provider adapter so
that ownership and authorization cannot be bypassed.

## Requirement Traceability

| Requirement | Evidence | Result |
| --- | --- | --- |
| AGENT-01 | `server/agent-provider.mjs:43`, `tests/agent-provider.test.mjs:123` | Covered |
| AGENT-02 | `server/agent-schemas.mjs:40`, `tests/agent-tools.test.mjs:46` | Covered |
| AGENT-03 | `server/agent-provider.mjs:98`, `tests/agent-provider.test.mjs:130` | Covered |
| AGENT-04 | `server/agent-provider.mjs:264`, `tests/agent-provider.test.mjs:60` | Covered |
