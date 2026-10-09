# EduTrack AI

Aplicativo Web em português para disciplinas, tarefas, sessões de estudo e relatórios. Esta etapa acrescenta contas reais no servidor e mantém a demonstração separada.

## Executar localmente — sem Docker

Requer Node.js 22.15+ e Python com Pandas para os relatórios de contas.

```sh
npm ci
python -m pip install -r analytics/requirements.txt
```

Copie `.env.example` para `.env.local`. Se Python não estiver no PATH, informe o executável em `PYTHON_BIN`.

```sh
npm run build
npm start
```

Abra http://localhost:4173. Para desenvolvimento: `npm run dev` no mesmo endereço (a interface interna usa 4174).

Nesta validação, o pipeline foi executado com Python 3.13/Pandas por meio de `PYTHON_BIN`. Se o Python padrão não tiver as dependências, informe o caminho completo do interpretador em `PYTHON_BIN`. Se o atalho npm falhar, use Node 22.15+ com `node --use-system-ca server/start.mjs` após compilar com `node scripts/run-framework.mjs build`.

O banco PostgreSQL embutido roda EXCLUSIVAMENTE no backend, persiste em `.local/postgres` e não exige instalar PostgreSQL ou Docker. Para PostgreSQL convencional, configure `DATABASE_URL`. Não execute duas instâncias sobre a mesma pasta do banco.

## Catálogo de integrações

A aba **Integrações** (`/integracoes`) apresenta propostas para Google Classroom,
Microsoft Teams for Education, Moodle, Canvas LMS, Notion e Google Agenda. Inclui
busca, filtros por categoria e detalhes dos recursos propostos, com links para os
sites oficiais. Funciona em modo claro/escuro e no menu móvel.

O **Classroom agora possui conexão OAuth por conta e importação manual**,
somente de leitura, após configuração no servidor e consentimento Google. Permite
escolher turmas, sincronizar sem duplicar e desconectar, preservando alterações
pessoais. Os outros cinco aplicativos continuam planejados. A demonstração não
conecta contas. O agente de IA não foi alterado.

Configuração e limites: [Integrar Classroom](docs/integrar-classroom.md).

Teste do catálogo: `node --test tests/integrations.test.mjs`.

## Primeiro acesso

1. Abra `/cadastro` e crie uma conta de teste.
2. Com `MAIL_MODE=local`, abra `/emails-locais` e siga o link de confirmação. Nada é enviado externamente.
3. Entre em `/login`. A confirmação é obrigatória.
4. Para enviar pelo Gmail, siga [o guia de configuração](docs/configurar-gmail.md). Não coloque sua senha normal do Google no projeto.
5. A recuperação de senha usa links de 30 minutos, de uso único, e encerra as sessões anteriores.

A caixa local permite usar os links de qualquer conta de teste; não a exponha na rede. O servidor local está vinculado a 127.0.0.1.

## Recursos desta etapa

- Autenticação, cadastro, confirmação, reenvio, recuperação, logout e sessões com cookies HttpOnly.
- Dados separados por conta, validação da API, controle de concorrência e histórico de criação/alteração de tarefas.
- Menu do usuário, perfil, tema claro/escuro/sistema e preferências persistentes.
- Tarefas com quatro prioridades, status, dificuldade e estimativa de tempo.
- Calendário com filtros e marcações por prioridade, sessões registradas no dia e atualização após alterações.
- Notificações internas, marcação de leitura e controle de preferências. Atualizam ao abrir a área; não são push em segundo plano.
- Gráficos interativos e relatórios por 7/30/90 dias e disciplina, comparação equivalente, distribuição, pendências, atrasos, carga estimada, CSV e impressão/PDF pelo navegador.
- Python/Pandas prepara métricas de contas a partir de registros autorizados e minimizados. A demonstração calcula exemplos localmente.
- Exportação JSON dos registros sem senhas ou tokens.
- Interface responsiva, navegação acessível e respeito a movimento reduzido.
- Modelo PostgreSQL com as 12 entidades da planilha: veja [o dicionário incorporado](docs/dicionario-de-dados.md).

## Demonstração e contas

`/demo` usa exemplos em `edutrack-demo-v1` no navegador. Eles NÃO são importados automaticamente para contas. Para usar sua conta após a demonstração, entre novamente em `/login`. O cronômetro é separado por conta/dispositivo e continua entre páginas. Não é sincronizado entre dispositivos.

Em Sessões de estudo, **Resetar** pede confirmação, descarta apenas o tempo da sessão atual e deixa o cronômetro parado em `00:00`. Mantém a disciplina selecionada e não altera os estudos já registrados. Para salvar o tempo, use **Concluir sessão** antes de resetar.

Nas contas, os registros ficam no banco do servidor. Trocar de dispositivo só acessa o mesmo banco se a API estiver disponível naquele dispositivo — localhost aponta para a própria máquina.

A sincronização desta etapa usa um snapshot com revisão otimista; alterações de outra aba geram conflito e não sobrescrevem silenciosamente. O Agent usa endpoint próprio, sessão autenticada e Tools com auditoria, não esse mecanismo de snapshot do frontend.

## Verificações

```sh
npm run typecheck
npm run lint
npm test
python -m unittest discover -s analytics -p "test_*.py"
npm run build
```

Os testes cobrem confirmação, links de uso único, isolamento entre usuários, conflitos, histórico, recuperação, cálculos de período e Agent mockado. SMTP real depende da configuração e não foi validado com uma conta Gmail.

## Agent de IA

Contas autenticadas podem usar `/agente` para conversar com o Agent por `POST /api/ai/chat`. O backend mantém o Provider server-side, deriva a identidade da sessão HttpOnly, valida as oito Tools registradas, aplica ownership, persiste conversas/mensagens e audita Tool Calls. Configure `LLM_PROVIDER`, `LLM_MODEL`, `LLM_FALLBACK_MODEL`, `LLM_TIMEOUT_MS` e a chave correspondente no `.env.local`; nunca coloque essas chaves no frontend.

O modo `/demo` permanece offline e não envia dados locais a um modelo. O Agent real depende de uma chave OpenRouter ou Google Gemini e do Python/Pandas quando uma Tool de analytics for usada. Rate limiting distribuído, streaming, RAG, filas e E2E dedicado continuam deferred.

## Experiência de estudos — dashboard, calendário e relatórios

- Dashboard: filtros de 7/30/90 dias e disciplina, cartões que filtram tarefas, foco por atraso/prioridade, detalhes de atividades e meta semanal.
- Calendário: mês/agenda, filtros combinados, navegação por teclado, estudo registrado, pendências atrasadas de todos os meses e tarefas sem prazo.
- Relatórios de conta: `GET /api/analytics` processa um snapshot autorizado e minimizado com `server/report-analytics.mjs` e Python/Pandas. Configure `PYTHON_BIN` e instale `analytics/requirements.txt`. Não há fallback silencioso para JavaScript ou IA.
- Comparação de períodos, detalhes por dia/disciplina, pontualidade, prioridades, cobertura das estimativas e CSV protegido contra fórmulas. PDF usa a impressão do navegador.
- Meta opcional de 0 a 10080 minutos, persistida pela migração aditiva `005_study_goal.sql`. Zero desativa a meta; o acompanhamento usa todas as disciplinas nos últimos sete dias.
- A demonstração continua local; não envia dados ao modelo. A meta não é evidência de domínio de um assunto.
- Os arquivos `server/agent-*`, `server/analytics.mjs` e `components/edutrack/agent-*` não foram alterados. O agente mantém o fluxo existente. A integração Classroom está documentada separadamente em `docs/integrar-classroom.md`.

Validação adicional: `node --test tests/study-experience.test.mjs`; com `PYTHON_BIN` configurado, também confere paridade entre Python e os cálculos da demonstração. Testes Python: `python -m unittest discover -s analytics -p "test_*.py"`.

### Pastas

- `server/`: API, banco, autenticação, e-mail, analytics e servidor local.
- `database/`: migrações derivadas do dicionário e extensões de contas.
- `analytics/`: preparação determinística em Python/Pandas.
- `components/edutrack/`: interface, formulários, navegação e comunicação com API.
- `docs/data-dictionary.json`: transcrição técnica da planilha fornecida.
- `docs/arquitetura.md`: implementação atual e sequência de evolução.

Credenciais, banco local, logs e arquivos de ambiente não entram no Git. Faça backup de `.local/postgres` com o servidor parado antes de mover a instalação.

## Ainda não conectado

Teams, Moodle, Canvas, Notion, Google Agenda, push com app fechado e geração de relatórios em segundo plano. Classroom possui importação manual autorizada; sincronização automática ainda não foi implementada. O Agent de IA e suas Tools estão ativos para contas autenticadas quando o Provider server-side está configurado. Campos adicionais da disciplina (professor/período/carga horária) ainda não têm formulário.

Antes de produção: revisão de segurança, política de dados/consentimento, backups, recuperação, filas confiáveis de e-mail, monitoramento, limites distribuídos e publicação HTTPS. A caixa local é recusada com NODE_ENV=production. O protótipo não deve ser anunciado como pronto para operação pública.

React 19, TypeScript, Next.js oficial (App Router), Radix/Shadcn, Recharts e Lucide.

## Runtime oficial do Next.js

O frontend foi migrado de Vinext/Vite para Next.js 16.4.0. `npm run build`
gera `.next`; `npm start` mantém a API Node e encaminha as telas ao `next start`
interno. `npm run dev` usa `next dev` no mesmo fluxo. Não exige Docker.
As portas são definidas em `.env.local` por `PORT`, `UI_PORT` e `APP_ORIGIN`;
preserve o `APP_ORIGIN` autorizado no OAuth do Classroom. Nunca exponha a porta
interna da interface como substituta da API: ela não fornece autenticação nem dados.

O banco, os arquivos de ambiente, a chave de criptografia do Classroom e as
credenciais de IA não mudaram. Após atualizar um clone existente, execute `npm ci`
e `npm run build` antes de `npm start`. Pare o servidor antes de instalar dependências
ou substituir o build; não inicie duas instâncias sobre `.local/postgres`.

O lint usa plugins diretos de React, Hooks, TypeScript e acessibilidade, com zero
avisos permitido. A antiga cadeia de `eslint-config-next`/Vinext que dependia de
`braces` foi removida; não foi usada uma exceção de auditoria ou versão fictícia.

A configuração Vite/Workers foi removida. Os exemplos D1, os tipos Cloudflare
e os metadados herdados do starter não são o banco ou a hospedagem do EduTrack.
Cloudflare/Sites exige um adaptador e uma estratégia de publicação próprios para
Next.js, API Node e Python; os antigos artefatos `dist` não devem ser publicados.
Esta migração valida a execução local em Node, não um novo deploy externo.

Após `npm run build`, `npm run test:runtime` verifica 25 páginas, duas rotas 404,
CSS/JavaScript e os fluxos da API em um banco descartável em memória. Configure
`PYTHON_BIN` no terminal para a checagem de relatórios. Não chama Google nem IA
externa e não utiliza `.local/postgres`. `node scripts/smoke-next.mjs --serve`
mantém essa instância isolada em `http://127.0.0.1:4185` para testes no navegador;
as credenciais fictícias são exibidas no terminal. Encerre com Ctrl+C.
Acrescente `--dev` ao script para repetir a validação usando `next dev`.

## Status automático das entregas do Classroom

Após conectar o Google e importar as turmas escolhidas em **Integrações**, o
EduTrack consulta suas entregas ao abrir uma página autenticada e a cada dois
minutos enquanto a aba estiver visível. Ao voltar à aba, a consulta vencida é
retomada. O servidor precisa estar rodando; não há monitoramento com o localhost
desligado. Não é uma atualização instantânea nem usa Pub/Sub.

O backend usa os mesmos escopos somente de leitura, consulta apenas as entregas
do aluno (`userId=me`) nas turmas importadas, compartilha a requisição entre abas
e mantém cache por dois minutos. Falhas têm espera progressiva de até 15 minutos.
O último resultado é preservado e identificado como potencialmente desatualizado.

Os indicadores aparecem nas tarefas e em seus detalhes, separados da conclusão
local. **Concluir no EduTrack não entrega no Google; entregar no Google não
marca automaticamente a tarefa local como concluída.** Devolução pelo professor,
retirada de entrega e status desconhecido têm rótulos próprios. Novas atividades
e alterações de enunciado/prazo continuam usando a importação manual existente.

A migração `007_classroom_deliveries.sql` é aplicada no próximo início do backend.
Ela adiciona somente campos de observação e não modifica conclusões ou revisões
dos dados locais. O endpoint autenticado `POST /api/integrations/classroom/deliveries`
aceita apenas `{}` e utiliza proteção de origem/CSRF e limitação de requisições.
Não retorna tokens nem notas; não implementa escrita no Classroom.

Para conferir a interface com dados fictícios, use
`node scripts/smoke-next.mjs --serve --classroom` após o build e com `PYTHON_BIN`
configurado. Essa opção usa banco em memória e transporte Google simulado.

## Prioridades, prazos e lembretes no aplicativo

A prioridade é a importância escolhida pelo usuário; o prazo determina a proximidade. As listas de tarefas, disciplinas, dashboard e calendário seguem a mesma regra determinística: **atrasadas → hoje/amanhã → em 2–3 dias → demais**. Dentro de cada grupo, **Urgente → Alta → Normal → Baixa**, depois prazo e título. Sem prazo, a tarefa fica no último grupo e continua respeitando a importância. A prioridade salva não muda automaticamente, e os relatórios continuam contando a importância escolhida.

| Prioridade | Quando usar | Início do aviso antes do prazo |
| --- | --- | --- |
| Urgente | Precisa de atenção prioritária | 7 dias |
| Alta | Importante; reservar tempo antes da rotina | 3 dias |
| Normal | Rotina de estudos | 2 dias |
| Baixa | Pode esperar dentro do mesmo grupo de prazo | 1 dia |

Os avisos mostram **Entrega hoje**, **Entrega amanhã** ou **Entrega em N dias**. São dias de calendário em Brasília, não uma contagem de horas; no Classroom, consulte a origem para o horário exato. Os lembretes deixam de aparecer depois da data de entrega. Não há aviso para tarefas sem prazo, concluídas ou canceladas; a ordenação e os indicadores existentes de atraso continuam preservados.

O sino mostra a quantidade não lida. A aba Notificações conserva um aviso por tarefa/prazo, atualiza a mensagem e preserva a leitura; mudar o prazo pode gerar um novo aviso. Concluir, cancelar, remover, adiar ou reduzir a prioridade retira os avisos que deixaram de ser elegíveis. As configurações permitem desativá-los. Marcar como lido não conclui a tarefa nem altera o Classroom.

Atualização ao abrir o app, alterar tarefas, voltar à aba e a cada **60 segundos com a aba visível**. Não são e-mails, notificações push nem um serviço de fundo com o navegador fechado. A sinalização de prazo na tarefa é informativa, mesmo com lembretes desativados.

Backend: `server/notifications.mjs`, `GET /api/notifications` e migração aditiva `database/008_deadline_reminders.sql` (`TASK_DEADLINE`; o tipo antigo é preservado para o histórico). Política compartilhada: `lib/task-attention.mjs`. A atualização dos avisos não modifica tarefas, revisões ou histórico. O Agent e os escopos/conexão do Classroom não mudaram.

Teste visual isolado, somente dados fictícios em memória:

```powershell
node scripts/smoke-next.mjs --serve --classroom --deadlines
```

## Agent e Google Gemini

O Agent usa Google Gemini por default no servidor (`LLM_PROVIDER=google-gemini`, modelo `gemini-2.5-flash`) e lê `GOOGLE_API_KEY` somente do ambiente server-side. OpenRouter não é fallback automático; só é compatibilidade explícita quando `LLM_PROVIDER=openrouter` é configurado. Sem a chave Gemini, o endpoint protegido retorna erro controlado de provider não configurado.
