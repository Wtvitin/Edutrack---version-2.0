# API MODEL AUDIT

Data da auditoria: 4 de outubro de 2026

## 1. Arquitetura encontrada

- Entrada HTTP: `server/start.mjs` cria o servidor Node HTTP na porta `4173`.
- Roteamento: `server/api.mjs` faz o despacho por caminho e método; não há uma camada REST separada por recurso.
- Persistência: `server/database.mjs` usa PostgreSQL quando `DATABASE_URL` existe e PGlite quando usa `DATA_DIR`/`memory://`.
- Migrações: `database/001_core.sql` até `database/004_ai_provider.sql`, registradas em `schema_migrations`.
- Domínio de dados: `server/data.mjs` implementa o snapshot de conta e a gravação transacional com revisão otimista.
- Analytics: `server/analytics.mjs` envia um snapshot minimizado para `analytics/prepare.py`; o Python não acessa o banco.
- Autenticação: cookie HttpOnly `edutrack_session`, sessão persistida em `auth_sessions`, tokens de verificação/reset em `auth_tokens`.
- Agent: `POST /api/ai/chat` é uma fronteira separada; o Agent usa o orchestrator, Tools autorizadas e as tabelas AI.

## 2. Entidades do modelo de dados

| Entidade | Tabela | Acesso principal | API relacionada |
|---|---|---|---|
| Usuário | `users` | `server/api.mjs`, `server/data.mjs` | Auth, sessão e `/api/data` |
| Disciplina | `subjects` | `server/data.mjs`, `server/agent-tools.mjs` | `/api/data`, Agent Tools |
| Tarefa acadêmica | `academic_tasks` | `server/data.mjs`, `server/agent-tools.mjs` | `/api/data`, `/api/history`, `/api/notifications`, Agent Tools |
| Sessão de estudo | `study_sessions` | `server/data.mjs` | `/api/data`, `/api/analytics` |
| Histórico de tarefa | `task_history` | `server/data.mjs`, `server/api.mjs`, `server/agent-tools.mjs` | `/api/data`, `/api/history`, Agent Tools |
| Dispositivo push | `push_devices` | Migração/schema apenas | Nenhuma API ativa |
| Entrega de notificação | `notification_deliveries` | `server/api.mjs` | `/api/notifications`, `/api/notifications/read` |
| Conversa do Agent | `ai_conversations` | `server/agent-orchestrator.mjs` | Agent, não API de CRUD pública |
| Mensagem do Agent | `ai_messages` | `server/agent-orchestrator.mjs` | Agent, não API de CRUD pública |
| Execução de Tool | `ai_tool_executions` | `server/agent-orchestrator.mjs`, `server/agent-tools.mjs` | Agent, não API de CRUD pública |
| Insight | `insights` | Migração/schema apenas | Nenhuma API ativa |
| Relatório semanal | `weekly_reports` | Migração/schema apenas | Nenhuma API ativa |
| Sessão autenticada | `auth_sessions` | `server/api.mjs` | Auth |
| Token de auth | `auth_tokens` | `server/api.mjs` | Auth |
| E-mail local de desenvolvimento | `development_mail` | `server/mail.mjs`, `server/api.mjs` | `/api/dev/mail` somente local |

`schema_migrations` é uma tabela técnica de controle das migrações, não uma entidade de domínio exposta por API.

## 3. APIs encontradas

### 3.1 APIs do modelo de dados e autenticação

| Método | Rota | Entidade/operação | Auth | Status real |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Criar `users`, disciplina inicial em `subjects`, token de verificação e e-mail local/SMTP | Pública, com limite local | **FUNCIONANDO** |
| `POST` | `/api/auth/login` | Validar `users` e criar `auth_sessions` | Pública; exige e-mail verificado | **FUNCIONANDO** |
| `GET` | `/api/auth/session` | Ler identidade da sessão | Sessão obrigatória | **FUNCIONANDO** |
| `POST` | `/api/auth/logout` | Remover sessão atual de `auth_sessions` | Origin válido; sessão pode estar ausente | **FUNCIONANDO** |
| `POST` | `/api/auth/verify` | Consumir `auth_tokens` e marcar `users.email_verified_at` | Token de uso único | **FUNCIONANDO** |
| `POST` | `/api/auth/resend` | Emitir novo token de verificação | Pública, resposta não enumerável | **FUNCIONANDO** |
| `POST` | `/api/auth/request-reset` | Emitir token de recuperação | Pública, resposta não enumerável | **FUNCIONANDO** |
| `POST` | `/api/auth/reset` | Alterar senha, consumir token e revogar sessões | Token de uso único | **FUNCIONANDO** |
| `GET` | `/api/data` | Ler snapshot de perfil, disciplinas, tarefas e sessões | Sessão obrigatória | **FUNCIONANDO** |
| `PUT` | `/api/data` | Gravar snapshot transacional, histórico e revisão otimista | Sessão + ownership | **FUNCIONANDO** |
| `GET` | `/api/analytics` | Calcular métricas por período/disciplina | Sessão + disciplina própria | **PARCIAL NO AMBIENTE ATUAL** |
| `GET` | `/api/history` | Listar até 100 registros de `task_history` | Sessão + filtro por usuário | **FUNCIONANDO** |
| `GET` | `/api/notifications` | Criar/consultar lembretes de tarefas | Sessão + filtro por usuário | **FUNCIONANDO** |
| `POST` | `/api/notifications/read` | Marcar uma ou todas as notificações como lidas | Sessão + filtro por usuário | **FUNCIONANDO** |

Não existem handlers públicos separados como `/api/tasks`, `/api/subjects`, `/api/study-sessions`, `/api/users` ou rotas CRUD por `/:id`. O CRUD de disciplinas, tarefas e sessões está encapsulado no snapshot `GET/PUT /api/data`; exclusões também são representadas pela substituição do snapshot.

### 3.2 APIs do Agent

| Método | Rota | Entidade/operação | Auth | Status real |
|---|---|---|---|---|
| `POST` | `/api/ai/chat` | Conversa, mensagens, Tool Calls, tarefas e analytics autorizados | Sessão obrigatória | **PARCIAL: mock funcionando; Provider real deferred** |

As oito Tools (`create_task`, `update_task`, `complete_task`, `get_task`, `list_tasks`, `get_academic_performance`, `get_study_trends`, `get_general_dashboard`) são chamadas internas do Agent, não endpoints HTTP públicos.

### 3.3 Health e desenvolvimento

| Método | Rota | Finalidade | Auth | Status real |
|---|---|---|---|---|
| `GET` | `/api/health` | Verificar API e modo da caixa local | Pública | **FUNCIONANDO** |
| `GET` | `/api/dev/mail` | Consultar caixa de e-mails local | Apenas modo local; não habilitada em produção | **FUNCIONANDO NO DESENVOLVIMENTO** |

## 4. APIs funcionando

Foram considerados funcionando os endpoints com handler, persistência/retorno coerente e evidência de teste.

- Auth completo: registro, reenvio, verificação, login, sessão, logout, reset de senha e proteção de sessão.
- Snapshot: leitura, gravação, persistência de tarefa/sessão, histórico e controle de revisão `409`.
- Notificações: geração idempotente, leitura e marcação de leitura.
- Agent com Provider mockado: conversa, persistência de mensagens, resposta estruturada e proteção de ownership.
- Health e página `/agente`: resposta HTTP válida.

Evidências executadas:

- `npm test`: **38 passed, 0 failed**.
- Smoke HTTP no servidor TARGET: `/api/health` retornou `200`, `/agente` retornou `200` e `/api/data` sem sessão retornou `401`.
- Smoke HTTP isolado com banco `memory://`: auth, snapshot CRUD, histórico, notificações, validação de entrada, cross-user ownership e Agent mock retornaram os status esperados.

## 5. APIs com falhas ou indisponibilidade operacional

### `/api/analytics`

- O handler, validação de período, filtro de disciplina e isolamento estão implementados.
- Na revalidação deste ambiente, retornou `503` porque `.env.local` define `PYTHON_BIN=python`, mas não há executável Python instalado/disponível no `PATH` (`py` também informou que não há Python instalado).
- O teste de integração retorna `200` quando um interpretador com Pandas é configurado, conforme a evidência histórica em `.specs/features/agent-integration/validation.md`.
- Classificação: **implementada, mas indisponível no ambiente atual**.
- Correção necessária: configurar o runtime Python/Pandas ou um `PYTHON_BIN` válido; não há evidência de defeito na rota SQL/ownership.

### `/api/ai/chat`

- A rota protegida e o orchestrator funcionam com Provider mockado.
- A conta verificada consegue chegar ao Agent, mas o Provider real retorna erro controlado quando `GOOGLE_API_KEY` não está configurada.
- Classificação: **implementada, Provider real deferred por configuração de ambiente**.

## 6. APIs parcialmente implementadas

- `/api/analytics`: backend e frontend existem, porém dependem de Python/Pandas externo.
- `/api/ai/chat`: fluxo completo está implementado, porém a resposta LLM real e Tool Calling real dependem de chave Gemini server-side.
- `/api/dev/mail`: existe somente para desenvolvimento local; não é uma caixa de e-mail de produção.

## 7. APIs especificadas mas ausentes

Não foi encontrada, nas especificações atuais, uma rota HTTP ativa especificada e ausente do código. A especificação/documentação descreve o snapshot `/api/data`, analytics, notificações, histórico, auth e Agent, todos presentes.

As seguintes tabelas existem no modelo, mas não possuem APIs ativas e não devem ser tratadas como endpoints faltantes automaticamente:

- `push_devices`: push em segundo plano está explicitamente deferred.
- `insights`: não há pipeline/API de insights ativa.
- `weekly_reports`: relatórios persistidos/assíncronos estão explicitamente deferred; a UI calcula analytics sob demanda.

Também não há API de Google Classroom, RAG, filas, streaming ou rate limiting distribuído; essas capacidades estão documentadas como fora do escopo/deferred.

## 8. APIs implementadas mas não documentadas

- `/api/health` está implementada em `server/api.mjs` e foi validada com `200`, mas não aparece na tabela principal de API de `docs/arquitetura.md`. Ela aparece apenas em evidências de validação/contexto.
- As demais rotas encontradas estão listadas na tabela de `docs/arquitetura.md` ou descritas em `README.md`/`context.md`.

## 9. APIs usadas pelo frontend

| Frontend | API | Evidência |
|---|---|---|
| `components/edutrack/account-store.ts` | `GET /api/data` e `PUT /api/data` | Carregamento de conta e fila de salvamento |
| `components/edutrack/account-store.ts` | `POST /api/auth/logout` e APIs genéricas de auth | `api('/auth/logout', ...)` e `auth-pages.tsx` |
| `components/edutrack/account-views.tsx` | `GET /api/analytics` | Relatórios e gráficos |
| `components/edutrack/account-views.tsx` | `GET /api/history` | Tela de histórico |
| `components/edutrack/account-views.tsx` | `GET /api/notifications` e `POST /api/notifications/read` | Tela de notificações |
| `components/edutrack/agent-api.ts` | `POST /api/ai/chat` | AgentView, same-origin, sem acesso direto ao Provider |
| `components/edutrack/auth-pages.tsx` | Auth APIs | Registro, login, verificação, reenvio e reset |

O frontend não chama PostgreSQL/PGlite, Google Gemini ou OpenRouter diretamente.

## 10. APIs de Analytics

- HTTP: `GET /api/analytics?days=7|30|90&subject=all|<uuid>`.
- Origem dos dados: `readData(db,user)` limitado ao `user.id` da sessão.
- Execução: `server/analytics.mjs` inicia `analytics/prepare.py` e envia apenas snapshot minimizado por stdin.
- Segurança: rejeita período inválido e disciplina de outra conta com `403`; não aceita `userId` ou SQL.
- Estado: rota implementada, mas requer Python/Pandas disponível no runtime.

## 11. APIs do Agent

- HTTP: `POST /api/ai/chat` com `{message, conversationId?}`.
- Orquestração: `server/api.mjs` → `server/agent-orchestrator.mjs` → Provider → Tool Registry → banco/analytics → Structured Output.
- Persistência: `ai_conversations`, `ai_messages`, `ai_tool_executions`.
- Auditoria: cada Tool Call registra usuário, conversa, Tool, input/output redigidos, status, modelo, provider e timestamps.
- Auth/ownership: o usuário vem exclusivamente de `edutrack_session`; `conversationId`, `taskId` e `subjectId` são verificados no backend.
- Estado: rota e testes mockados funcionam; E2E real depende de `GOOGLE_API_KEY`.

## 12. Segurança

### Authentication

- Sem sessão, endpoints protegidos retornam `401` com mensagem pública controlada.
- Login de conta não verificada retorna `403`, conforme esperado.
- Sessão usa cookie HttpOnly/SameSite=Lax, expiração de sete dias e hash do token no banco.

### Authorization

- A identidade é obtida do cookie e não do corpo da requisição.
- Escritas exigem `Origin` igual a `APP_ORIGIN` e JSON; requests cross-site são rejeitadas.
- Filtros e queries usam `user_id` autenticado.

### Ownership / IDOR

- O teste isolado tentou usar snapshot de uma conta em outra e recebeu `403`.
- Testes do Agent cobrem conversa cross-user, tarefa de outra conta, `userId` forjado, Tool desconhecida e argumentos inválidos.
- Chaves compostas e FKs `(user_id, subject_id)` reforçam ownership no banco.

### CORS / cookies

- Não há CORS aberto; a API valida Origin para métodos mutáveis e bloqueia `sec-fetch-site=cross-site`.
- O frontend usa `credentials: 'same-origin'`.

## 13. Validação de entrada

- Auth e snapshot usam `zod`.
- UUIDs, enums, datas, tamanhos, limites de minutos, revisão e duplicidade de IDs são validados.
- Analytics aceita somente `days` 7, 30 ou 90 e disciplina `all`/UUID próprio.
- Notificação aceita somente UUID opcional.
- Corpo JSON inválido, content type ausente e payload acima de 2 MB são rejeitados.

## 14. Contratos de request/response

- Erros públicos usam `{ "message": "..." }`.
- `/api/auth/session` retorna `{ user: { id, name, email, verified } }`.
- `/api/data` retorna `{ revision, data: { version, profile, subjects, tasks, sessions } }`; `PUT` retorna `{ revision }`.
- `/api/history`, `/api/notifications` retornam `{ items: [...] }`.
- `/api/notifications/read` retorna `{ ok: true }`.
- `/api/analytics` retorna métricas, séries diárias e distribuição por disciplina produzidas pelo script Python.
- `/api/ai/chat` retorna `{ conversationId, response, metadata }` com resposta estruturada validada.
- Não foi observado conflito `snake_case`/`camelCase` no caminho frontend validado; o snapshot mantém o contrato camelCase e endpoints SQL internos usam nomes físicos.

## 15. Cobertura de testes

| Área | Cobertura encontrada |
|---|---|
| Auth e modelo de conta | `tests/accounts.test.mjs` cobre registro, verificação, login, reset, sessão, isolamento, histórico e notificações |
| Agent API | `tests/agent-api.test.mjs` cobre sessão, identidade forjada, isolamento, injection/Tool desconhecida e timeout |
| Provider | `tests/agent-provider.test.mjs` cobre mapeamento, Tool Calls, Structured Output, retry, fallback explícito e ausência de fallback Gemini→OpenRouter |
| Orchestrator | `tests/agent-orchestrator.test.mjs` cobre persistência, Tools, limite de iteração, resposta incompatível e conversation isolation |
| Schemas/Tools | `tests/agent-schemas.test.mjs` e `tests/agent-tools.test.mjs` cobrem allowlist, argumentos, ownership e analytics autorizado |
| Analytics puro | `tests/analytics.test.mjs` cobre cálculos frontend; `analytics/test_prepare.py` cobre o pipeline Python quando o interpretador existe |
| HTTP live | `/api/health`, `/agente` e `401` protegido foram testados no servidor TARGET; o fluxo completo foi repetido com `memory://` |

Gaps de cobertura: não há suíte HTTP live persistente para todas as rotas, nem E2E real com Gemini, nem cobertura de produção para PostgreSQL externo, SMTP, CORS externo ou push.

## 16. Gaps encontrados

1. Python/Pandas não está disponível no ambiente atual, deixando `/api/analytics` em `503`.
2. `GOOGLE_API_KEY` não está configurada, deixando o Provider Gemini real deferred.
3. O lint global falha com 5 erros e 24 warnings preexistentes, principalmente em `components/edutrack/account-views.tsx` e artefatos auxiliares; não foi alterado por esta auditoria.
4. `/api/health` deve ser incluída na tabela de API da documentação para eliminar a única divergência documental encontrada.
5. Não existem endpoints públicos de CRUD por entidade; isso é uma decisão arquitetural atual, mas deve ser preservada/documentada para evitar expectativa de `/api/tasks` e similares.

## 17. Correções realizadas

Nenhuma correção de código, banco ou autenticação foi realizada. A tarefa permaneceu em modo de auditoria; não houve defeito de ownership ou rota quebrada comprovado que justificasse iniciar um novo OpenSpec change.

## 18. OpenSpec

- O inventário foi comparado com `openspec/specs/`, os changes arquivados e `docs/arquitetura.md`.
- Os changes existentes de Agent/Gemini permanecem arquivados e não foram recriados.
- Não foi criado change novo porque esta execução somente documenta o estado real e os gaps de ambiente.
- `openspec validate --all --strict` não pôde ser reexecutado nesta sessão: o executável `openspec` não está disponível no `PATH`. O estado anterior registrado em `.specs/STATE.md` e nas validações arquivadas indica validação estrutural sem erros.

## 19. TLC

- O estado TLC existente permanece concluído para Agent/Gemini, conforme `.specs/STATE.md` e `.specs/features/*/validation.md`.
- Não foi iniciado novo ciclo TLC porque não houve implementação nesta auditoria.
- A rastreabilidade existente continua sendo `SPEC → DESIGN → TASKS → IMPLEMENTATION → VALIDATION`.

## 20. Testes finais

| Verificação | Resultado |
|---|---|
| `npm test` | **PASS — 38/38** |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| `npm run lint` | **FAIL — 5 erros, 24 warnings preexistentes** |
| `git diff --check` | **PASS**, apenas warnings de normalização LF/CRLF do Git |
| `/api/health` | **PASS — 200** |
| `/agente` | **PASS — 200** |
| Endpoint protegido sem sessão | **PASS — 401** |
| Auth + snapshot CRUD + history + notifications + ownership em `memory://` | **PASS** |
| `/api/analytics` no ambiente atual | **503 — Python/Pandas indisponível** |
| `openspec validate --all --strict` nesta sessão | **NÃO EXECUTÁVEL — CLI ausente** |

## 21. Status

**READY WITH GAPS**

O inventário das APIs está completo para o código real atual. As APIs de autenticação, snapshot, histórico, notificações e health estão funcionando. Analytics e a resposta real do Agent permanecem dependentes de runtimes/configurações ausentes no ambiente atual. Nenhuma API foi reimplementada ou alterada durante a auditoria.
