# Gemini Runtime CA Specification

## ADDED Requirements

### Requirement: System CA for server startup

The system SHALL launch `server/start.mjs` with Node `--use-system-ca` through the `dev` and `start` scripts while keeping normal TLS certificate validation enabled.

#### Scenario: Development startup

- **WHEN** `npm run dev` is executed
- **THEN** the server process SHALL include `--use-system-ca`
- **AND** the command SHALL NOT disable TLS certificate verification

### Requirement: Secure provider diagnostics

The system SHALL log only provider, model, public status, safe error code, optional upstream HTTP status and optional cause code/name for provider failures. It SHALL NOT log API keys, authorization headers, cookies, session tokens, verification tokens or full prompts.

#### Scenario: Provider network failure

- **WHEN** a provider network failure reaches the API boundary
- **THEN** the server SHALL log sanitized diagnostic metadata
- **AND** the public response SHALL remain controlled

### Requirement: Provider selection remains explicit

The system SHALL preserve `google-gemini` with `gemini-2.5-flash` as the default and SHALL NOT invoke OpenRouter as a fallback.

#### Scenario: Gemini remains the default

- **WHEN** `LLM_PROVIDER` is absent
- **THEN** the selected provider SHALL be `google-gemini`
- **AND** a Gemini failure SHALL NOT select OpenRouter

### Requirement: Upstream status remains diagnosable

The provider error SHALL retain the upstream HTTP status for internal diagnosis while preserving the existing safe public response mapping.

#### Scenario: Non-success provider response

- **WHEN** Gemini or OpenRouter returns a non-success HTTP response
- **THEN** the internal provider error SHALL contain the upstream status
- **AND** the existing public status mapping SHALL remain unchanged
