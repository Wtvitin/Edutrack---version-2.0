# classroom-integration Specification

## Purpose

Documentar a integração Google Classroom implementada para conexão OAuth por
conta, consulta de turmas e importação manual somente de leitura.

## Requirements

### Requirement: Conexão OAuth vinculada à conta

O sistema MUST iniciar OAuth somente para sessão autenticada, usar state de uso
único vinculado à conta e sessão, PKCE S256 e expiração de dez minutos.

#### Scenario: início de conexão

- WHEN uma conta autenticada chama `POST /api/integrations/classroom/connect`
  com Classroom configurado
- THEN o backend MUST persistir somente hash do state, verifier cifrado e
  vínculo da sessão e retornar URL de autorização Google.

#### Scenario: callback inválido

- WHEN o callback tem state ausente, duplicado, expirado, usado ou de outra sessão
- THEN o backend MUST rejeitar a conexão e MUST NOT salvar tokens.

### Requirement: Tokens e escopos protegidos

O sistema MUST solicitar somente escopos de leitura necessários, validar acesso
efetivo às turmas/atividades e cifrar tokens no servidor.

#### Scenario: conexão autorizada

- WHEN o Google devolve código válido e permissões verificadas
- THEN o backend MUST trocar o código, cifrar access/refresh tokens e salvar a
  conexão somente após confirmar que a sessão ainda está válida.

#### Scenario: Classroom desabilitado ou permissão insuficiente

- WHEN a integração não está configurada ou o Google não concede acesso exigido
- THEN o sistema MUST retornar estado/erro controlado sem registrar credenciais ou
  resposta OAuth bruta.

### Requirement: Consulta e sincronização manual

O sistema MUST listar somente turmas ativas do usuário como aluno e MUST aceitar
sincronização manual de 1 a 20 turmas autorizadas, com paginação, limites e
transação completa.

#### Scenario: turmas disponíveis

- WHEN uma conta conectada chama `GET /api/integrations/classroom/courses`
- THEN o backend MUST retornar somente turmas ativas autorizadas.

#### Scenario: importação

- WHEN `POST /api/integrations/classroom/sync` recebe cursos selecionados e a
  revisão atual
- THEN o backend MUST criar ou atualizar disciplinas e tarefas vinculadas às
  IDs externas, sem inserir parcialmente se a coleta falhar.

#### Scenario: revisão ou curso inválido

- WHEN a revisão está obsoleta, uma turma não está disponível, há duplicidade ou
  o limite de dados é excedido
- THEN o sistema MUST rejeitar a sincronização sem conceder acesso a outra conta.

### Requirement: Preservação das alterações locais

O sincronizador MUST atualizar somente campos que ainda correspondem ao último
baseline importado e MUST preservar alterações pessoais feitas depois da
importação.

#### Scenario: tarefa sem alteração local

- WHEN título, descrição ou prazo permanecem iguais ao baseline salvo
- THEN o backend MUST atualizar esses campos com o valor atual do Classroom.

#### Scenario: tarefa alterada localmente

- WHEN a pessoa alterou um campo desde a última importação
- THEN a sincronização MUST manter esse campo local e atualizar apenas os demais
  campos elegíveis.

### Requirement: Desconexão e status

O sistema MUST expor status sem segredo, revogar o refresh token antes de remover
o vínculo local e preservar registros acadêmicos já importados.

#### Scenario: desconexão

- WHEN uma conta conectada chama `POST /api/integrations/classroom/disconnect`
  e a revogação é aceita
- THEN o backend MUST remover conexão e estados OAuth locais e retornar sucesso.

#### Scenario: falha de revogação

- WHEN a revogação Google falha temporariamente
- THEN o backend MUST manter a conexão para nova tentativa e retornar erro
  controlado.

## Traceability

| Requirement | Implementation | Test |
| --- | --- | --- |
| OAuth e sessão | `server/classroom.mjs:170`, `server/api.mjs:57` | `tests/classroom.test.mjs:33` |
| Tokens e escopos | `server/classroom.mjs:18`, `server/classroom.mjs:192` | `tests/classroom.test.mjs:9`, `tests/classroom.test.mjs:22` |
| Sync manual | `server/classroom.mjs:203`, `database/006_classroom.sql:18` | `tests/classroom.test.mjs:33` |
| Preservação | `server/classroom.mjs:249` | `tests/classroom.test.mjs:33` |
| Status e desconexão | `server/classroom.mjs:166`, `server/classroom.mjs:268` | `tests/classroom.test.mjs:168` |
