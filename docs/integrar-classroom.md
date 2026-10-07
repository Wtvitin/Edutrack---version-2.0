# Integração Google Classroom

## Escopo da primeira versão

OAuth por conta, leitura de turmas ativas em que o usuário é aluno e importação
manual das atividades publicadas disponíveis nessas turmas. Não envia trabalhos,
não lê notas, não modifica o Google e não cria Tools novas no agente. Os demais
aplicativos do catálogo continuam planejados.

## Configuração

### Compatibilidade da resposta OAuth

As permissões solicitadas continuam somente de leitura. Nesta instalação o Google
retornou `classroom.student-submissions.me.readonly` no lugar de
`classroom.coursework.me.readonly`. Essa resposta não é aceita como um alias
automaticamente: exige também `classroom.courses.readonly`, lista as turmas ativas
como aluno e confirma `courses.courseWork.list` na primeira turma, com `pageSize=1`
e apenas o campo `courseWork(id)`. Só após uma resposta JSON válida de sucesso os
tokens são salvos. Essa verificação não importa dados, não lê notas ou entregas e
não altera nada no Google. Sem turma para validar, acesso negado ou falha do Google,
a conexão não é salva. Cada sincronização continua sujeita à autorização da API.

Os registros de diagnóstico incluem somente códigos de resultado e nomes públicos
de permissões; nunca tokens, códigos de autorização, URLs do retorno ou segredos.

### Etapas de configuração

1. Ativar a Google Classroom API em um projeto Google Cloud.
2. Configurar consentimento OAuth, adicionar as permissões abaixo e os usuários
   de teste. Contas escolares podem exigir aprovação do administrador.
3. Criar um cliente **Aplicação Web**. Cadastrar exatamente
   `APP_ORIGIN/api/integrations/google/callback` como redirecionamento.
   Exemplo nesta instalação: `http://localhost:4175/api/integrations/google/callback`.
4. Guardar o JSON fora do repositório. Configurar `GOOGLE_CLASSROOM_CREDENTIALS_FILE`
   em `.env.local` ou no arquivo ignorado `.env.classroom.local`, usando caminho
   completo entre aspas se houver espaços. O segredo não é exibido no navegador.
5. Reiniciar o servidor e abrir `/integracoes` com uma conta EduTrack autenticada.

Escopos exclusivos de leitura:

- `https://www.googleapis.com/auth/classroom.courses.readonly`
- `https://www.googleapis.com/auth/classroom.coursework.me.readonly`

Em desenvolvimento local, o servidor gera uma chave aleatória de 32 bytes em
`.local/classroom-token.key`. Os tokens e verificadores OAuth usam AES-256-GCM
antes de gravar no banco. Guarde uma cópia protegida dessa chave, separada do banco;
perdê-la exige reconectar. Não publicar chave, JSON, `.env*`, banco ou tokens.
Em produção, `CLASSROOM_TOKEN_ENCRYPTION_KEY` é obrigatória: chave aleatória estável
de 32 bytes codificada em base64, gerenciada como segredo. Não usar chaves públicas
nem mudar a chave com tokens existentes. HTTPS e configuração de produção do
projeto continuam obrigatórios.

## Uso

Conectar Google Classroom → consentir no Google → escolher até 20 turmas →
Sincronizar atividades. Todas as atividades publicadas acessíveis nas turmas
selecionadas entram no recorte. Não há seleção individual de atividades ou revisão
completa do enunciado antes da primeira importação nesta versão.

A primeira sincronização cria uma disciplina por turma e tarefas de origem SYSTEM.
Repetir usa os IDs externos para evitar duplicações. Título, descrição e prazo
mudam somente se não tiverem sido editados localmente desde a importação anterior.
Prioridade, dificuldade, estimativa, conclusão e disciplina escolhida localmente
não são substituídas. Atividades removidas no EduTrack não são recriadas; atividades
removidas no Google não são apagadas automaticamente no EduTrack. Há histórico de
criação/alteração com origem CLASSROOM.

Os prazos do Google são UTC, convertidos para o calendário em Brasília. A interface
atual edita apenas dias: enquanto o dia não mudar, o backend preserva o horário
original, inclusive em salvamentos de perfil ou prioridade. O enunciado inclui
um link da origem; consulte o Classroom para o horário exato. Títulos e descrições são limitados ao tamanho
aceito pelo EduTrack (140 e 1500 caracteres); consulte o link para o conteúdo completo.
Anexos não são baixados.

Desconectar revoga o acesso no Google e remove tokens e estados OAuth locais;
preserva tarefas, disciplinas e vínculos de origem para deduplicar uma reconexão.
Se o Google estiver indisponível, a interface solicita repetir a desconexão.

## Contratos e segurança

- `GET /api/integrations/classroom/status`: configuração, conexão e última sincronização;
  não devolve IDs de cliente, tokens ou segredos.
- `POST /api/integrations/classroom/connect`: URL de consentimento, state aleatório
  armazenado como hash, validade de 10 minutos, vinculado à sessão e à conta; PKCE S256.
- `GET /api/integrations/google/callback`: único GET autorizado a receber navegação
  cross-site; verifica sessão/state de uso único e redireciona sem expor o código OAuth.
- `GET /api/integrations/classroom/courses`: turmas ativas do aluno.
- `POST /api/integrations/classroom/sync`: `{courseIds: string[], revision: number}`;
  IDs são conferidos contra as turmas autorizadas; paginas são lidas antes da transação.
  Conflitos de revisão ou falhas impedem uma importação parcial.
- `POST /api/integrations/classroom/disconnect`: revogação e remoção de tokens locais.

Endpoints exigem sessão EduTrack. Escritas exigem origem e JSON; somente o callback
tem exceção estreita ao bloqueio cross-site. Sincronização trava a linha do usuário,
confere a revisão e incrementa após gravação para invalidar snapshots anteriores.
Paginação tem limites, chamadas têm timeout e erros não exibem respostas sensíveis.
A migração `006_classroom.sql` cria conexões, estados e vínculos de origem. Todas as
chamadas à API Classroom são GET; renovar/revogar OAuth é feito somente no servidor.

## Testes e limitações

`node --test tests/classroom.test.mjs tests/integrations.test.mjs` verifica cifra,
prazos, OAuth com mocks, sessão, replay, expiração, isolamento, paginação, importação,
revisão, merge sem perda, exclusões locais, renovação e desconexão. Os testes não
substituem consentimento real e validação de uma turma com atividades.

No consentimento externo em modo Testing, refresh tokens normalmente expiram em
sete dias. Reconectar pode ser necessário; publicar para terceiros pode exigir
verificação Google. Sincronização automática, notas, entregas, turmas como professor,
associação a disciplinas pré-existentes e controles para restaurar atividades
excluídas são evoluções futuras. A base local e as credenciais não viajam pelo GitHub.

Documentação oficial:

- [OAuth Web](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Permissões Classroom](https://developers.google.com/workspace/classroom/guides/auth)
- [Listagem de atividades](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork/list)
- [Prazos UTC](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork)
