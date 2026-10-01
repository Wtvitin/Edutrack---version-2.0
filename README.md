# EduTrack AI

Aplicativo Web em português para disciplinas, tarefas, sessões de estudo e relatórios. Esta etapa acrescenta contas reais no servidor e mantém a demonstração separada.

## Executar localmente — sem Docker

Requer Node.js 22.13+ e Python com Pandas para os relatórios de contas.

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

Neste computador, `.env.local` já aponta para o Python/Pandas disponível. Se o atalho npm falhar, use `node server/start.mjs` após compilar com `node scripts/run-framework.mjs build`.

O banco PostgreSQL embutido roda EXCLUSIVAMENTE no backend, persiste em `.local/postgres` e não exige instalar PostgreSQL ou Docker. Para PostgreSQL convencional, configure `DATABASE_URL`. Não execute duas instâncias sobre a mesma pasta do banco.

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

Nas contas, os registros ficam no banco do servidor. Trocar de dispositivo só acessa o mesmo banco se a API estiver disponível naquele dispositivo — localhost aponta para a própria máquina.

A sincronização desta etapa usa um snapshot com revisão otimista; alterações de outra aba geram conflito e não sobrescrevem silenciosamente. Operações futuras do agente usarão endpoints específicos e confirmação, não esse mecanismo de frontend.

## Verificações

```sh
npm run typecheck
npm test
python analytics/test_prepare.py
npm run build
```

Os testes cobrem confirmação, links de uso único, isolamento entre usuários, conflitos, histórico, recuperação e cálculos de período. SMTP real depende da configuração e não foi validado com uma conta Gmail.

## Organização

- `server/`: API, banco, autenticação, e-mail, analytics e servidor local.
- `database/`: migrações derivadas do dicionário e extensões de contas.
- `analytics/`: preparação determinística em Python/Pandas.
- `components/edutrack/`: interface, formulários, navegação e comunicação com API.
- `docs/data-dictionary.json`: transcrição técnica da planilha fornecida.
- `docs/arquitetura.md`: implementação atual e sequência de evolução.

Credenciais, banco local, logs e arquivos de ambiente não entram no Git. Faça backup de `.local/postgres` com o servidor parado antes de mover a instalação.

## Ainda não conectado

IA real, Tools do agente, Google Classroom, push com app fechado e geração de relatórios em segundo plano. As tabelas previstas existem, mas não representam integrações ativas. Campos adicionais da disciplina (professor/período/carga horária) ainda não têm formulário.

Antes de produção: revisão de segurança, política de dados/consentimento, backups, recuperação, filas confiáveis de e-mail, monitoramento, limites distribuídos e publicação HTTPS. A caixa local é recusada com NODE_ENV=production. O protótipo não deve ser anunciado como pronto para operação pública.

React 19, TypeScript, Vinext/Vite, Radix/Shadcn, Recharts e Lucide. Infraestrutura Cloudflare/Sites herdada do starter não hospeda a nova API Node/Python: a publicação requer uma estratégia própria para esses serviços.
