# OpenSpec Coverage Audit Report

Data da auditoria: **7 de outubro de 2026**

## Resumo executivo

A auditoria percorreu o código atual, rotas, telas, banco, migrations,
autenticação, autorização, funcionalidades acadêmicas, analytics, Agent,
providers, Classroom, catálogo de integrações, runtime, testes, documentação,
OpenSpec, TLC e histórico Git.

| Indicador | Resultado |
| --- | ---: |
| Grupos de capacidades relevantes identificados | 10 |
| Já documentados antes da auditoria | 2 |
| Parcialmente documentados antes da auditoria | 3 |
| Sem spec adequada antes da auditoria | 5 |
| Specs canônicas adicionadas | 8 |
| Deltas OpenSpec adicionados à change documental | 7 |
| Features TLC adicionadas | 1 |
| Dependências adicionadas | 0 |
| Arquivos de código alterados | 0 |

As oito specs canônicas correspondem a sete gaps funcionais/operacionais e à
canonicalização do Groq, cuja change e artefatos TLC já existiam, mas não tinham
spec dedicada em `openspec/specs/`.

## Cobertura

| Feature | Status da implementação | Cobertura OpenSpec antes | Ação | Cobertura após |
| --- | --- | --- | --- | --- |
| Agent autenticado, Tools, auditoria e Structured Output | Implementada e testada | `DOCUMENTED` | Nenhuma; reutilizar spec existente | `DOCUMENTED` |
| Google Gemini provider | Implementado como default | `DOCUMENTED` | Nenhuma; preservar spec existente | `DOCUMENTED` |
| Groq provider | Implementado e testado por mocks | `PARTIALLY_DOCUMENTED` — change/TLC/SPEC aditivo, sem spec canônica | Adicionar `openspec/specs/ai-groq-provider/spec.md` | `DOCUMENTED` |
| Conta, autenticação, verificação, reset e e-mail | Implementada | `UNDOCUMENTED` | Criar `account-authentication` | `DOCUMENTED` |
| Workspace acadêmico, tarefas, sessões, calendário, demo e temas | Implementado | `UNDOCUMENTED` | Criar `academic-study-management` | `DOCUMENTED` |
| Analytics e relatórios | Implementados; apenas Analytics Tools do Agent tinham cobertura | `PARTIALLY_DOCUMENTED` | Criar `analytics-reports` | `DOCUMENTED` |
| Notificações e histórico de tarefas | Implementados | `UNDOCUMENTED` | Criar `notifications-history` | `DOCUMENTED` |
| Google Classroom OAuth e importação manual | Implementados | `UNDOCUMENTED` — havia documentação operacional, não spec OpenSpec | Criar `classroom-integration` | `DOCUMENTED` |
| Catálogo frontend de integrações | Implementado; cinco integrações permanecem propostas | `UNDOCUMENTED` | Criar `integrations-catalog` | `DOCUMENTED` |
| Runtime, health, banco e migrations | Implementados | `PARTIALLY_DOCUMENTED` em README/docs | Criar `runtime-operations` | `DOCUMENTED` |

## Discovery por área

### Frontend

Foram confirmadas as rotas públicas e internas em
`app/[...slug]/page.tsx:3`, a navegação principal em
`components/edutrack/app.tsx:23` e as telas de disciplinas, tarefas,
calendário, sessões, progresso, Agent, perfil, configurações, ajuda,
integrações, notificações e histórico. Também foram auditados o modo
demonstração/localStorage, tema claro/escuro/sistema, estados de erro/vazio,
cronômetro, filtros, gráficos, CSV e impressão.

### Backend/API

As rotas foram levantadas em `server/api.mjs:74` até `server/api.mjs:140`:
health, caixa local, cadastro, login, logout, sessão, verificação, reenvio,
reset, Classroom, snapshot de dados, analytics, chat do Agent, histórico e
notificações. A API aplica origem/JSON para mutações, sessão HttpOnly, validação
Zod, limites de tentativas e mensagens públicas controladas.

### Banco e migrations

Foram analisadas `database/001_core.sql` a `database/006_classroom.sql` e
`server/database.mjs:7`. O modelo cobre usuários, disciplinas, tarefas,
sessões, histórico, notificações, sessões/tokens de autenticação, conversas,
mensagens, execuções AI, provider, metas semanais e vínculos Classroom.

### Autenticação, autorização e ownership

O ciclo de conta está em `server/api.mjs:79`, `server/api.mjs:86`,
`server/api.mjs:95` e `server/api.mjs:100`. A sessão é validada em
`server/api.mjs:41`; o hash de senha e cookie estão em `server/security.mjs:6`
e `server/security.mjs:18`. Dados e Tools filtram `user.id`, e os testes de
contas, Agent e Classroom cobrem isolamento e IDOR.

### Funcionalidades acadêmicas

`server/data.mjs:4` define o snapshot e `server/data.mjs:26` implementa escrita
transacional, revisão otimista, ownership, histórico, datas e sessões. O
planejamento visual está em `lib/study-planning.ts:14`,
`components/edutrack/views.tsx:15` e
`components/edutrack/study-calendar.tsx:12`.

### Analytics

O endpoint e os filtros estão em `server/api.mjs:122`; a fronteira minimizada
com Python/Pandas está em `server/report-analytics.mjs:5` e os cálculos em
`analytics/prepare.py:12`. A UI de relatórios e exportação está em
`components/edutrack/report-panel.tsx:14` e `components/edutrack/report-panel.tsx:30`.

### Agent e IA

O Agent existente foi comparado com `openspec/specs/ai-agent-integration`,
`openspec/specs/ai-gemini-provider`, a change `add-groq-provider` e as quatro
features TLC existentes. Não foi criada spec duplicada para Orchestrator,
Context Manager, Tool Registry, Tools, Structured Output, Gemini ou Groq;
somente a spec canônica Groq faltante foi adicionada.

### Integrações externas

Classroom foi auditado em `server/classroom.mjs:170` e
`server/classroom.mjs:203`, com OAuth state/PKCE, cifra, paginação, revisão,
importação, merge e revogação. O catálogo em `lib/integrations.ts:23` foi
separado da integração efetiva: apenas Classroom está disponível; os demais
cinco itens continuam planejados.

### Runtime e configuração

Foram auditados `.env.example`, `server/start.mjs:7`,
`server/start.mjs:13`, `server/database.mjs:7`, o health check em
`server/api.mjs:74` e os scripts npm. Não foi encontrada necessidade de
alteração de código, migration ou dependência.

## Specs criadas

### Specs canônicas

- `openspec/specs/account-authentication/spec.md` — cadastro, verificação,
  sessão, reset, e-mail, preferências e demonstração.
- `openspec/specs/academic-study-management/spec.md` — snapshot, concorrência,
  disciplinas, tarefas, sessões, histórico de planejamento, calendário e demo.
- `openspec/specs/analytics-reports/spec.md` — períodos, métricas, Python/Pandas,
  segurança de dados, UI, CSV e impressão.
- `openspec/specs/classroom-integration/spec.md` — OAuth, escopos, cifra,
  consulta, sync manual, preservação de alterações e desconexão.
- `openspec/specs/notifications-history/spec.md` — lembretes internos, leitura
  e histórico auditável.
- `openspec/specs/integrations-catalog/spec.md` — catálogo, busca, filtros,
  estados planejado/disponível e links oficiais.
- `openspec/specs/runtime-operations/spec.md` — startup, configuração, banco,
  migrations, health, same-origin e proxy.
- `openspec/specs/ai-groq-provider/spec.md` — canonicalização da change Groq já
  implementada, sem duplicar o Agent.

### Change OpenSpec

Foi criada `openspec/changes/document-system-capabilities/` com:

- `proposal.md` — problema, estado atual, estado desejado e escopo;
- `design.md` — fronteiras, fontes de verdade e estratégia retroativa;
- `tasks.md` — discovery, coverage, documentação e verificação;
- sete deltas em `specs/` para as capacidades documentadas.

## TLC

Foi criada a feature `.specs/features/system-documentation-audit/` com:

- `spec.md` — requisitos AUDIT-01 a AUDIT-05, critérios de aceite e rastreabilidade;
- `design.md` — arquitetura da auditoria e limites de capacidade;
- `tasks.md` — quatro tarefas TLC concluídas e matriz de evidências;
- `validation.md` — veredicto `PASS WITH TOOLING DEFERRED` e evidências `file:line`.

## Gaps restantes

Não restou capacidade funcional relevante implementada sem uma spec OpenSpec ou
justificativa explícita. Permanecem as seguintes exceções documentais:

1. As tabelas `insights`, `weekly_reports` e `push_devices` existem no schema
   base, mas não têm fluxo ativo de API/UI nesta versão. Foram tratadas como
   estruturas dormentes, não como funcionalidades implementadas.
2. Microsoft Teams, Moodle, Canvas, Notion e Google Agenda são itens planejados
   do catálogo; não foram documentados como integrações ativas.
3. E2E real de Gemini, Groq, Classroom e SMTP/Resend não foi executado nesta
   tarefa documental: exige contas de teste, serviços externos e pode criar ou
   alterar dados. A ausência de E2E live é uma limitação de evidência, não uma
   spec faltante; nenhuma credencial foi incluída nos artefatos.
4. A validação formal por CLI ficou deferred porque `openspec` e Python não
   estão instalados/disponíveis no ambiente atual. A revisão estrutural manual
   dos artefatos foi concluída.

## Inconsistências

| Categoria | Evidência | Classificação |
| --- | --- | --- |
| Agent | README/contextos antigos ainda descrevem o Agent como preview/offline ou limitado a OpenRouter/Gemini, embora o backend e testes atuais incluam Agent real e Groq | `IMPLEMENTATION_AHEAD_OF_SPEC` / `PARTIAL_MISMATCH` |
| Classroom | `SPEC.md` histórico mantém Classroom em `Deferred`, enquanto `server/classroom.mjs` e `docs/integrar-classroom.md` implementam OAuth e importação | `IMPLEMENTATION_AHEAD_OF_SPEC` |
| Testes | `README.md`, `IMPLEMENTATION.md` e `.specs/STATE.md` preservam contagens antigas como 34/38, enquanto a suíte atual reporta 69 passados e 1 skip | `OUTDATED` |
| Provider | A documentação histórica descreve seleção OpenRouter/Gemini em trechos anteriores, enquanto a configuração atual inclui Groq explícito e Gemini default | `PARTIAL_MISMATCH` |
| Schema | Entidades de relatórios, insights e push existem no dicionário, mas não há fluxo ativo correspondente | `SPEC_AHEAD_OF_IMPLEMENTATION` quando interpretadas como produto ativo |

As inconsistências foram registradas, não corrigidas, respeitando o escopo
documental e a regra de preservação do conteúdo existente.

## Evidências e validação

### Comandos executados

- `npm test`: **PASS** — 69 passados, 0 falhas, 1 teste opcional ignorado.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**.
- `npm run lint`: **BASELINE FAIL** — 5 erros e 37 avisos já existentes em
  arquivos fora do escopo desta auditoria; nenhum código foi alterado.
- `git log --oneline --all -12`: consultado para confirmar a evolução de Agent,
  Classroom, catálogo e Groq.
- `git diff -- SPEC.md`: **PASS** — o diff contém somente as linhas adicionadas
  na seção `Cobertura funcional retroativa`.

### Comandos indisponíveis

- `openspec validate --all --strict`: **DEFERRED** — o executável `openspec` não
  foi localizado no PATH (`where openspec` não retornou arquivo).
- `validate_spec.py`, `validate_tasks.py`, `validate_state.py`: **DEFERRED** — o
  runtime Python não está instalado/disponível (`py`/`python` não encontrados).
- Revisão TLC manual: **PASS** — os artefatos possuem seções obrigatórias,
  requisitos SHALL, tarefas concluídas, matriz e evidências `file:line`.

## SPEC.md

`SPEC.md` recebeu somente a seção nova `## Cobertura funcional retroativa`.

**Nenhuma informação existente foi alterada ou removida. Somente conteúdo
adicional foi acrescentado.**

## Arquivos modificados

### Adicionados

- `OPENSPEC_COVERAGE_AUDIT_REPORT.md`
- `openspec/changes/document-system-capabilities/`
- `openspec/specs/account-authentication/`
- `openspec/specs/academic-study-management/`
- `openspec/specs/analytics-reports/`
- `openspec/specs/classroom-integration/`
- `openspec/specs/notifications-history/`
- `openspec/specs/integrations-catalog/`
- `openspec/specs/runtime-operations/`
- `openspec/specs/ai-groq-provider/`
- `.specs/features/system-documentation-audit/`

### Atualizados somente por acréscimo

- `SPEC.md`
- `context.md`
- `IMPLEMENTATION.md`

As exclusões pré-existentes mostradas pelo Git (`DARK_MODE_COLOR_FIX_REPORT.md`,
`e2e_out.txt`, `h` e `output1.txt`) não foram revertidas nem modificadas.

## Dependências adicionadas

Nenhuma.

## Status final

**COMPLETE WITH DOCUMENTATION GAPS**

A cobertura documental relevante foi criada e revisada. O sufixo indica somente
as limitações explicitadas acima: estruturas de banco sem fluxo ativo, integrações
planejadas, E2E externo condicionado a credenciais e validadores formais ausentes
no ambiente.
