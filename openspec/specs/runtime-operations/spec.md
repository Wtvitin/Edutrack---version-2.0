# runtime-operations Specification

## Purpose

Documentar as fronteiras operacionais implementadas para inicialização, banco,
proxy frontend/API, health check e validação de configuração.

## Requirements

### Requirement: Configuração de ambiente e modos de execução

O processo MUST carregar `.env.local` e `.env.classroom.local` quando presentes,
MUST usar origem/portas configuráveis e MUST rejeitar combinações de produção sem
HTTPS, PostgreSQL externo ou transporte de e-mail real.

#### Scenario: desenvolvimento local

- WHEN o servidor roda com origem loopback e `MAIL_MODE=local`
- THEN o sistema MUST permitir a caixa local e o banco embutido configurável por
  `DATA_DIR`.

#### Scenario: produção inválida

- WHEN o processo não é local e falta HTTPS, `DATABASE_URL` ou e-mail real
- THEN o startup MUST falhar antes de aceitar tráfego.

### Requirement: Banco e migrações versionadas

O sistema MUST selecionar PostgreSQL convencional quando `DATABASE_URL` existe,
usar PGlite embutido caso contrário e aplicar cada migration uma única vez por
`schema_migrations`.

#### Scenario: banco externo

- WHEN `DATABASE_URL` está configurada
- THEN o backend MUST usar pool PostgreSQL e transações explícitas.

#### Scenario: banco local

- WHEN `DATABASE_URL` está vazia
- THEN o backend MUST abrir o diretório local configurado e aplicar migrations
  pendentes antes de criar a API.

### Requirement: Fronteira same-origin e health check

O servidor MUST atender API e frontend pela origem pública, rejeitar mutações sem
origem/JSON esperados e expor `GET /api/health` com resposta sem segredo.

#### Scenario: health

- WHEN `GET /api/health` é chamado
- THEN o sistema MUST responder `200` com estado operacional e indicação segura do
  mailbox local.

#### Scenario: mutação cross-site

- WHEN uma mutação chega sem origem autorizada, com `sec-fetch-site` cross-site ou
  sem `application/json`
- THEN a API MUST rejeitar a requisição antes do handler de domínio.

### Requirement: Proxy e encerramento controlado

O startup MUST iniciar a UI interna em loopback, encaminhar tráfego não-API e
encerrar servidor, processo frontend e banco em sinais de término.

#### Scenario: frontend iniciando

- WHEN a UI interna ainda não responde
- THEN o proxy MUST retornar uma resposta temporária `503` sem expor stack trace.

## Traceability

| Requirement | Implementation | Test |
| --- | --- | --- |
| Configuração | `server/start.mjs:7`, `server/start.mjs:13` | `tests/agent-runtime.test.mjs:7` |
| Banco e migrations | `server/database.mjs:7`, `server/database.mjs:26` | `tests/accounts.test.mjs:4` |
| Same-origin e health | `server/api.mjs:68`, `server/api.mjs:74` | `tests/agent-api.test.mjs:28` |
| Proxy e encerramento | `server/start.mjs:20`, `server/start.mjs:31` | `tests/agent-runtime.test.mjs:7` |
