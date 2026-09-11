# Arquitetura prevista — EduTrack AI

Este documento orienta a próxima etapa. As integrações aqui descritas ainda não estão implementadas.

## Fronteiras do sistema

Web e Mobile usam a mesma API HTTPS. O frontend nunca recebe credenciais de PostgreSQL. O backend autentica o usuário, autoriza cada recurso e aplica regras de negócio. Somente serviços internos autorizados acessam o banco.

O processamento analítico em Python/Pandas recebe dados autorizados do backend e prepara métricas e resumos estruturados. A IA interpreta esse resumo; não calcula métricas oficiais nem recebe uma conexão de banco. As Tools passam pelo backend, usam o contexto do usuário autenticado e registram ações de forma auditável.

## Primeira API

Uma implementação Python/FastAPI é uma opção coerente com a etapa de análise em Pandas. O serviço pode começar como um monólito modular; separar o processamento em um worker quando o volume justificar.

| Grupo | Responsabilidade |
| --- | --- |
| `/api/v1/auth/*` | Cadastro, login, logout, confirmação de e-mail e recuperação de senha. |
| `/api/v1/me` | Perfil, objetivo e preferências do usuário autenticado. |
| `/api/v1/subjects` | Listar e criar disciplinas. |
| `/api/v1/subjects/:id` | Ler, atualizar e arquivar disciplina do usuário. |
| `/api/v1/tasks` | Listar com filtros, criar e paginar tarefas. |
| `/api/v1/tasks/:id` | Atualizar tarefa e seu status com autorização por proprietário. |
| `/api/v1/study-sessions` | Registrar sessões e listar histórico. |
| `/api/v1/analytics/summary` | Retornar métricas determinísticas com período, fuso e versão do cálculo. |
| `/api/v1/agent/messages` | Conversar com o agente sobre um contexto autorizado e minimizado. |
| `/api/v1/agent/actions/:id/confirm` | Confirmar uma proposta de ação ainda válida. |
| `/api/v1/agent/audit` | Consultar o histórico de ações do próprio usuário. |

URLs ilustram o contrato planejado, não endpoints já disponíveis.

## Entidades essenciais

- **User**: id, nome, e-mail verificado, objetivo, fuso, datas de criação e atualização.
- **Subject**: id, user_id, nome, cor, descrição, archived_at.
- **Task**: id, user_id, subject_id opcional, título, descrição, prazo opcional, prioridade, status, completed_at e versão para atualização concorrente.
- **StudySession**: id, user_id, subject_id e task_id opcionais, início, fim, duração validada e origem (cronômetro/manual).
- **AgentAction**: id, user_id, proposta, parâmetros validados, confirmação, estado, chave de idempotência e expiração.
- **AuditEvent**: ator, user_id, ação, recurso, resultado, data, request_id e referências da autorização.

O backend deriva user_id da sessão; não aceita a identidade declarada pelo frontend como autorização. Relações entre tarefa, disciplina e sessão devem pertencer ao mesmo usuário.

## Regras determinísticas

1. Durações de estudo válidas, sem minutos negativos ou intervalos invertidos.
2. Critério documentado de arredondamento e tratamento de sessões que atravessam a meia-noite.
3. Datas de calendário no fuso do usuário; timestamps persistidos com referência UTC.
4. Tarefas concluídas divididas pelo total do mesmo escopo; denominador zero resulta em zero.
5. Comparações entre períodos equivalentes; sem porcentagem de crescimento quando a base é zero.
6. Registros duplicados evitados por idempotência; sessões simultâneas seguem uma regra explícita.
7. Tempo estudado não é apresentado como medida de aprendizagem ou domínio.

O frontend desta demonstração calcula apenas métricas locais para permitir a avaliação visual. Na versão conectada, o backend e o processamento analítico passam a ser a fonte dos valores oficiais.

## Ações do agente

Fluxo previsto: solicitação → proposta estruturada → validação → autorização/confirmacão → execução transacional → auditoria → resposta.

Exemplo: criar tarefa exige título válido, disciplina autorizada e prazo normalizado. Uma confirmação deve corresponder aos parâmetros exatos da proposta, ter validade limitada e impedir execução duplicada. O agente nunca recebe uma Tool genérica para executar SQL. Falhas não podem ser apresentadas ao usuário como sucesso.

O contexto enviado ao modelo deve conter somente os registros necessários à solicitação e à identidade autenticada. Retenção, provedor e política de consentimento serão definidos antes da integração. Chaves de API ficam em variáveis de ambiente do backend.

## Sequência recomendada

1. Definir migrações PostgreSQL, configuração local e testes de propriedade dos recursos.
2. Implementar autenticação, sessões seguras e recuperação por token de uso único com expiração.
3. Implementar CRUD e sincronização e substituir o armazenamento de demonstração no frontend.
4. Criar processamento Pandas e endpoint analítico com testes de período, fuso e arredondamento.
5. Conectar o agente, suas Tools e a auditoria, validando ações negadas e idempotência.
6. Conectar cliente mobile à mesma API e testar os fluxos completos.

Antes de publicar com dados reais, retirar o modo de demonstração das áreas protegidas e verificar autenticação, autorização entre usuários, recuperação de conta, limites de requisição, exportação e exclusão de dados.
