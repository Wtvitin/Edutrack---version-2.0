# academic-study-management Specification

## Purpose

Documentar o workspace acadêmico implementado: snapshot autorizado de dados,
disciplinas, tarefas, sessões de estudo, planejamento visual, concorrência e
demonstração local.

## Requirements

### Requirement: Snapshot autorizado e concorrência

O sistema MUST expor `GET /api/data` e `PUT /api/data` para o snapshot da conta,
validar o contrato completo e MUST rejeitar alterações com revisão obsoleta ou
registro pertencente a outra conta.

#### Scenario: leitura da conta

- WHEN uma conta autenticada chama `GET /api/data`
- THEN o sistema MUST retornar somente perfil, disciplinas, tarefas e sessões do
  `user_id` da sessão, junto com a revisão atual.

#### Scenario: conflito de revisão

- WHEN `PUT /api/data` envia revisão diferente da armazenada
- THEN o sistema MUST responder `409` sem sobrescrever dados concorrentes.

#### Scenario: registro alheio ou snapshot inválido

- WHEN o snapshot contém UUID de outra conta, duplicidade, data inválida ou
  estrutura fora do schema
- THEN o sistema MUST rejeitar a operação antes de persistir a alteração.

### Requirement: Disciplinas, tarefas e sessões

O sistema MUST manter disciplinas e tarefas por usuário, com status, prioridade,
dificuldade, prazo, estimativa e sessão de estudo associada a uma disciplina,
preservando a disciplina protegida `Estudo livre`.

#### Scenario: tarefa válida

- WHEN uma tarefa válida é salva para uma disciplina da conta
- THEN o sistema MUST persistir a tarefa com status e prioridade normalizados e
  MUST manter sua associação com o usuário.

#### Scenario: sessão futura

- WHEN uma sessão é enviada com data posterior ao dia local atual
- THEN o sistema MUST rejeitar a sessão com erro de validação.

#### Scenario: conclusão

- WHEN uma tarefa muda para `COMPLETED`
- THEN o sistema MUST preencher `completed_at` e preservar os dados necessários
  para os relatórios.

### Requirement: Histórico e regras de planejamento

O sistema MUST registrar criação e alterações relevantes de tarefas e MUST aplicar
as regras atuais de ordenação, filtros e contagens no dashboard, lista de foco e
calendário.

#### Scenario: alteração de tarefa

- WHEN status, prioridade, prazo, título, descrição, disciplina, dificuldade ou
  estimativa muda
- THEN o sistema MUST registrar uma entrada em `task_history` com a mudança.

#### Scenario: lista de foco

- WHEN a lista de foco é calculada
- THEN o frontend MUST priorizar tarefas atrasadas e depois respeitar prioridade
  e prazo, excluindo tarefas concluídas ou canceladas.

#### Scenario: calendário

- WHEN a pessoa filtra o calendário por disciplina, prioridade ou situação
- THEN a interface MUST exibir somente as tarefas compatíveis e oferecer visão
  mensal e agenda.

### Requirement: Sessão de foco e persistência local

O frontend MUST oferecer cronômetro de foco, registrar minutos completos no dia
da conclusão e preservar o estado do cronômetro por conta ou dispositivo.

#### Scenario: registro de sessão

- WHEN a pessoa conclui ao menos um minuto no cronômetro
- THEN o sistema MUST adicionar uma sessão com disciplina, data local e minutos.

#### Scenario: sessão curta

- WHEN a pessoa tenta concluir menos de um minuto
- THEN o frontend MUST impedir o registro e informar a regra ao usuário.

### Requirement: Navegação e modo demonstração

O frontend MUST disponibilizar as telas acadêmicas e MUST manter dados de
demonstração no navegador, sem misturá-los com contas reais.

#### Scenario: conta autenticada

- WHEN a conta abre dashboard, disciplinas, tarefas, calendário, sessões ou
  progresso
- THEN a interface MUST carregar e salvar dados pela API autenticada.

#### Scenario: demonstração

- WHEN a pessoa usa `/demo` ou o modo local sem sessão
- THEN o frontend MUST usar dados seed/localStorage e MUST NOT chamar `/api/data`
  para persistir esse snapshot.

## Traceability

| Requirement | Implementation | Test |
| --- | --- | --- |
| Snapshot e concorrência | `server/data.mjs:16`, `server/data.mjs:26`, `server/api.mjs:120` | `tests/accounts.test.mjs:22`, `tests/accounts.test.mjs:25` |
| Domínio acadêmico | `database/001_core.sql:25`, `server/data.mjs:45` | `tests/accounts.test.mjs:31`, `tests/study-experience.test.mjs:36` |
| Histórico e planejamento | `server/data.mjs:54`, `lib/study-planning.ts:14`, `components/edutrack/study-calendar.tsx:16` | `tests/accounts.test.mjs:26`, `tests/study-experience.test.mjs:12` |
| Sessões de foco | `components/edutrack/views.tsx:26`, `lib/edutrack.ts:52` | `tests/study-experience.test.mjs:17` |
| Navegação e demo | `components/edutrack/app.tsx:68`, `components/edutrack/account-store.ts:19` | `tests/study-experience.test.mjs:36` |
