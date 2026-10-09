# notifications-history Specification

## Purpose

Documentar lembretes internos de tarefas e o histórico auditável de mudanças
exibido para contas autenticadas.

## Requirements

### Requirement: Geração de lembretes internos

O sistema MUST atualizar lembretes ao abrir a área de notificações, considerando
tarefas pendentes com prazo próximo ou atrasado, e MUST evitar duplicidade por
tarefa, tipo e horário.

#### Scenario: tarefa elegível

- WHEN uma conta com notificações habilitadas acessa `GET /api/notifications`
- THEN o backend MUST criar ou reutilizar entrega para tarefa `TODO` ou
  `IN_PROGRESS` dentro da janela de 24 horas ou sete dias de atraso.

#### Scenario: notificações desabilitadas

- WHEN `notifications_enabled` está falso
- THEN a API MUST retornar lista vazia e MUST NOT criar novas entregas.

#### Scenario: tarefa resolvida ou prazo alterado

- WHEN uma entrega existente deixa de ser elegível
- THEN o backend MUST marcá-la como `CANCELLED` em vez de exibi-la como lembrete.

### Requirement: Leitura de notificações

O sistema MUST permitir marcar uma notificação específica ou todas as notificações
da conta como lidas, usando somente IDs pertencentes ao usuário autenticado.

#### Scenario: marcar uma notificação

- WHEN `POST /api/notifications/read` recebe um UUID opcional válido
- THEN o backend MUST preencher `read_at` somente para registro da conta.

#### Scenario: marcar todas

- WHEN o corpo não informa ID
- THEN o backend MUST marcar como lidas as notificações elegíveis da conta.

### Requirement: Histórico de tarefas

O sistema MUST persistir mudanças relevantes de tarefas e MUST expor no máximo
100 registros recentes para a conta autenticada, sem permitir consulta de outra
conta.

#### Scenario: consulta autenticada

- WHEN uma conta chama `GET /api/history`
- THEN a API MUST retornar mudanças ordenadas por data, com título da tarefa e
  `changes_json` para renderização do histórico.

#### Scenario: modo demonstração

- WHEN a pessoa acessa histórico sem conta
- THEN a interface MUST informar que o histórico auditável está disponível somente
  para contas e não deve consultar a API.

### Requirement: Apresentação acessível

O frontend MUST exibir estados vazio, erro, lido/não lido e ação para abrir a
 tarefa relacionada, mantendo a atualização same-origin.

#### Scenario: lista vazia

- WHEN não há lembretes ou alterações
- THEN a interface MUST mostrar estado vazio em vez de falhar silenciosamente.

## Traceability

| Requirement | Implementation | Test |
| --- | --- | --- |
| Geração | `server/api.mjs:136`, `database/002_accounts.sql:14` | `tests/accounts.test.mjs:35` |
| Leitura | `server/api.mjs:140`, `components/edutrack/account-views.tsx:22` | `tests/accounts.test.mjs:36` |
| Histórico | `server/api.mjs:135`, `components/edutrack/account-views.tsx:28` | `tests/accounts.test.mjs:26` |
| UI | `components/edutrack/account-views.tsx:23` | `tests/accounts.test.mjs:35` |
