# Account and Authentication

## ADDED Requirements

### Requirement: ciclo de conta documentado

O sistema MUST manter cadastro, confirmação, login, sessão, reset, e-mail e
preferências de conta conforme o comportamento existente em `server/api.mjs` e
`server/mail.mjs`, sem exigir alteração de implementação.

#### Scenario: conta existente

- WHEN uma conta autenticada usa os fluxos de conta
- THEN o backend MUST preservar sessão, isolamento e tokens de uso único.
