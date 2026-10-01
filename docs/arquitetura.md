# Arquitetura atual — EduTrack AI

## Fronteiras

Navegador → API Node HTTP → PostgreSQL. O navegador e o agente não recebem conexão de banco. Na instalação local, a API usa PGlite, PostgreSQL embutido no processo servidor; DATABASE_URL seleciona PostgreSQL convencional. Não há Docker.

A interface Vinext interna roda em loopback na porta 4174. A entrada é 4173 e encaminha páginas/recursos, mantendo API e frontend na mesma origem. Desenvolvimento também encaminha WebSocket para HMR.

O banco descrito na planilha foi incorporado com migrações versionadas. Dados de contas não usam o armazenamento local da demonstração.

## API disponível

| Endpoint | Função |
| --- | --- |
| POST /api/auth/register | Cadastro e link de confirmação |
| POST /api/auth/login | Sessão após confirmação |
| GET /api/auth/session | Identidade pública da sessão |
| POST /api/auth/logout | Revogar sessão atual |
| POST /api/auth/verify | Confirmar token de uso único |
| POST /api/auth/resend | Solicitar nova confirmação |
| POST /api/auth/request-reset | Solicitar recuperação |
| POST /api/auth/reset | Nova senha e revogação de sessões |
| GET/PUT /api/data | Snapshot autorizado e revisão otimista |
| GET /api/analytics | Preparação Pandas por período/disciplina |
| GET /api/history | Até 100 criações/alterações de tarefas |
| GET /api/notifications | Lembretes de tarefas próximas/atrasadas |
| POST /api/notifications/read | Leitura dos lembretes |
| GET /api/dev/mail | SOMENTE caixa de teste local |

## Segurança implementada e limitações

Senhas com scrypt e salt por senha; cookies HttpOnly/SameSite=Lax, Secure com origem HTTPS; tokens aleatórios armazenados apenas como hash. Confirmação expira em 24h; recuperação em 30 minutos; sessões em 7 dias. Reset revoga sessões anteriores. Operações mutáveis exigem Origin igual a APP_ORIGIN e JSON; cross-site é recusado.

A identidade deriva da sessão. UUIDs existentes pertencentes a outra conta são rejeitados. Relações de disciplina pertencem ao mesmo usuário; revisão de snapshot evita sobrescrever alterações concorrentes. Senhas/e-mails do perfil não podem ser modificados por esse snapshot.

Os limites de autenticação são locais ao processo, por IP e janela de 15 minutos. Para produção: limitador compartilhado, limpeza periódica de tokens/sessões, revisão de segurança, TLS, backups e monitoramento. E-mail SMTP não usa fila de retentativas nesta etapa.

A caixa local possui links de acesso às contas de teste e é insegura para compartilhamento. Só funciona em modo de desenvolvimento com origem loopback e transporte local; produção e SMTP a desativam. O servidor vincula-se a loopback.

Histórico atual acompanha criação e alterações de status, prioridade, prazo, título, notas, dificuldade e estimativa. Exclusão física segue CASCADE do dicionário e remove o histórico associado; retenção de auditoria de exclusões exige evolução antes de operações sensíveis/agente.

## Cálculos e privacidade

A API extrai SOMENTE registros da conta autenticada, remove perfil/e-mail/descrições e transmite os campos necessários por stdin a analytics/prepare.py. Python/Pandas devolve JSON; não acessa o banco diretamente.

Períodos incluem hoje e os N−1 dias anteriores; comparação usa os N dias imediatamente anteriores. Datas seguem America/Sao_Paulo nesta etapa. Duração é armazenada em segundos; interface registra minutos completos. Tarefas concluídas usam completed_at real, não due_date. Canceladas não contam como pendentes. Pendências/atrasos são fotografias atuais, não reconstruções históricas. Estimativas são declaradas pelo usuário. Base anterior zero resulta em ausência de comparação percentual.

O cronômetro continua por timestamps entre páginas e separa armazenamento por conta/dispositivo. Sessões são atribuídas ao dia em que o usuário conclui o cronômetro; não são divididas automaticamente à meia-noite. Estudos manuais usam o dia declarado. Não há deduplicação de sessões simultâneas em diferentes dispositivos ainda.

Nenhuma informação é enviada à IA ou ao Classroom. Fontes Google Fonts são externas; isso é informado no site. A demonstração possui Tool WebMCP estritamente de leitura dos exemplos locais; NÃO opera sobre contas.

## Evolução gradual

1. Validar envio Gmail com credenciais configuradas somente pelo usuário no servidor.
2. Refinar formulários adicionais das disciplinas e operações específicas da API, paginação, importação controlada e fuso editável.
3. Implementar fila de e-mails/notificações, push autorizado, relatórios salvos e auditoria durável de exclusões.
4. IA: solicitação → proposta estruturada → validação → confirmação vinculada aos parâmetros → execução idempotente no backend → auditoria → resposta. Nunca SQL genérico para IA.
5. Classroom: OAuth2 com consentimento e escopos mínimos, mapeamento de atividades externas, deduplicação por IDs externos e controles de sincronização. Não usar a senha de app SMTP para isso.
6. Publicar com HTTPS, PostgreSQL convencional, execução Python e revisão de segurança/privacidade. Mobile usa a mesma API; um app nativo poderá exigir autenticação adequada ao cliente sem relaxar as regras do navegador.
