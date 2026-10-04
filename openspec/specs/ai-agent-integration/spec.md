# ai-agent-integration Specification

## Purpose
Definir o delta necessário para transformar a prévia offline do Agent do TARGET em um Agent autenticado, auditável e seguro, preservando o servidor Node HTTP, PostgreSQL/PGlite, sessões por cookie, analytics e UI React existentes.

## Requirements

### Requirement: Chat autenticado e isolado

O sistema MUST expor `POST /api/ai/chat` somente para uma sessão autenticada e MUST derivar o `userId` da sessão, nunca do corpo, dos argumentos da Tool ou da resposta do modelo.

#### Scenario: mensagem válida

- WHEN um usuário autenticado envia `message` não vazia e um `conversationId` opcional
- THEN o Backend cria ou reutiliza somente uma conversa pertencente ao usuário, processa a mensagem e retorna `conversationId` e resposta validada

#### Scenario: requisição sem sessão

- WHEN uma requisição chega sem cookie de sessão válido
- THEN o Backend responde `401` sem chamar o Provider e sem criar registros AI

#### Scenario: conversa de outro usuário

- WHEN o usuário envia o identificador de uma conversa de outra conta
- THEN o Backend rejeita a operação sem expor conteúdo, mensagens ou existência da conversa

### Requirement: Provider encapsulado

O sistema MUST chamar Providers somente no servidor por meio de uma interface comum e MUST suportar OpenRouter e Google Gemini conforme a configuração de runtime.

#### Scenario: chamada OpenRouter

- WHEN `LLM_PROVIDER=openrouter` e uma chave válida estão configurados
- THEN o adapter envia mensagens, Tools e Structured Output para `${LLM_BASE_URL}/chat/completions` sem expor a chave ao cliente

#### Scenario: falha transitória

- WHEN o Provider retorna timeout, `408`, `429` ou erro `5xx`
- THEN o adapter tenta novamente no máximo uma vez para o modelo atual e termina com erro controlado ou usa o fallback configurado, sem retry infinito

#### Scenario: credencial ausente

- WHEN a chave do Provider não está configurada
- THEN o Backend retorna erro controlado de configuração e não executa uma chamada externa

### Requirement: Registro e validação de Tools

O sistema MUST executar somente Tools registradas e MUST rejeitar Tool desconhecida, argumentos não objeto, propriedades extras, UUID inválido, enum inválido e campos obrigatórios ausentes.

#### Scenario: Tool válida

- WHEN o Provider solicita uma Tool registrada com argumentos válidos
- THEN o Backend valida os argumentos antes de executar a operação de domínio

#### Scenario: Tool desconhecida

- WHEN o Provider solicita uma Tool não registrada
- THEN o Backend não executa código arbitrário, registra falha controlada e devolve erro de Tool ao Provider

#### Scenario: argumentos inválidos

- WHEN os argumentos não obedecem ao schema estrito da Tool
- THEN o Backend não acessa o banco pela Tool e registra a execução como `FAILED`

### Requirement: Tools de tarefas e analytics

O sistema MUST disponibilizar `create_task`, `update_task`, `complete_task`, `get_task`, `list_tasks`, `get_academic_performance`, `get_study_trends` e `get_general_dashboard`, sempre limitadas ao usuário autenticado e aos serviços/dados reais do TARGET.

#### Scenario: criar tarefa

- WHEN uma chamada válida de `create_task` informa disciplina pertencente ao usuário
- THEN o Backend cria uma tarefa `TODO` com `created_by=AGENT` e vincula `agent_execution_id` à auditoria da Tool

#### Scenario: atualizar ou concluir tarefa

- WHEN uma chamada válida de `update_task` ou `complete_task` informa tarefa pertencente ao usuário
- THEN o Backend aplica a regra de negócio da tarefa e mantém os campos de histórico existentes

#### Scenario: analytics autorizado

- WHEN uma Analytics Tool válida é executada
- THEN o Backend calcula a partir dos dados da conta autenticada usando o pipeline de analytics existente, sem aceitar `userId` ou SQL nos argumentos

### Requirement: Orchestration controlada

O sistema MUST executar o fluxo mensagem → Provider → Tool Call opcional → validação → domínio → resultado → Provider dentro de no máximo três iterações por mensagem.

#### Scenario: resposta sem Tool

- WHEN o Provider retorna uma resposta sem Tool Calls
- THEN o Backend valida a resposta final, persiste a mensagem `ASSISTANT` e encerra a execução

#### Scenario: resposta com Tool

- WHEN o Provider retorna Tool Calls
- THEN o Backend persiste a mensagem do Assistant, executa cada chamada válida no máximo uma vez, persiste cada resultado `TOOL` e chama o Provider novamente

#### Scenario: limite de iterações

- WHEN o Provider solicita Tool Calls em todas as três iterações sem resposta final
- THEN o Backend encerra com erro controlado e não tenta uma quarta iteração

### Requirement: Persistência e auditoria

O sistema MUST persistir conversas, mensagens e Tool Executions nas tabelas AI existentes, incluindo usuário, conversa, intenção redigida, nome, input, output, status, modelo, versão do prompt e timestamps.

#### Scenario: execução concluída

- WHEN uma Tool termina com sucesso
- THEN a execução correspondente muda de `PENDING` para `SUCCESS`, recebe `output_json` e `completed_at`, e o resultado é enviado ao Provider

#### Scenario: execução rejeitada ou falha

- WHEN a validação ou domínio falha
- THEN a execução correspondente muda de `PENDING` para `FAILED` com erro seguro, sem stack trace, token, senha ou chave de API

### Requirement: Structured Output validado no Backend

O sistema MUST validar independentemente no Backend as respostas `text`, `analysis` e `action` contra contratos versionados antes de retorná-las ao Frontend.

#### Scenario: resposta textual

- WHEN o Provider retorna `{"type":"text","content":"..."}` válido
- THEN o Backend retorna o conteúdo como resposta `text`

#### Scenario: resposta analítica

- WHEN uma Tool de leitura foi executada e o Provider retorna `analysis` válido
- THEN o Backend retorna análise, métricas e gráfico opcional somente se o contrato for válido

#### Scenario: resposta de ação

- WHEN uma Tool de escrita foi executada e o Provider retorna `action` válido
- THEN o Backend retorna a ação e o resultado sem aceitar ação fora do registro de Tools

#### Scenario: resposta inválida

- WHEN o Provider retorna Structured Output inválido ou com tipo incompatível com a Tool executada
- THEN o Backend rejeita a resposta, registra falha de validação e não a encaminha ao Frontend

### Requirement: Segurança contra prompt injection e execução arbitrária

O sistema MUST tratar o Backend como autoridade final e MUST impedir que mensagens do usuário ou do modelo executem SQL, JavaScript, HTML, código arbitrário, acesso a secrets ou acesso a dados de outra conta.

#### Scenario: tentativa de extração ou execução

- WHEN a mensagem pede o system prompt, API key, SQL, código arbitrário, exclusão ampla ou Tool inexistente
- THEN o Agent não executa a operação solicitada, não revela secret e responde por fluxo controlado

#### Scenario: argumento com identidade forjada

- WHEN uma Tool recebe `userId`, token, senha ou identificador de autorização como argumento extra
- THEN a validação rejeita a chamada antes de qualquer consulta de domínio

### Requirement: Frontend seguro e compatível com o TARGET

O sistema MUST manter `AgentView` como entrada visual do TARGET, chamar apenas a API same-origin, exibir estados de carregamento/erro e renderizar gráficos somente por campos de `ChartSpecification` validada.

#### Scenario: conta autenticada

- WHEN o usuário abre `/agente` em uma conta válida e envia uma mensagem
- THEN a interface mostra a mensagem, estado de pensamento, resposta validada e mantém o `conversationId` na sessão da página

#### Scenario: demonstração local

- WHEN o usuário usa o modo demonstração sem conta
- THEN nenhum dado local é enviado ao Provider e a interface informa que o Agent real exige uma conta autenticada

#### Scenario: gráfico não executável

- WHEN uma resposta analítica contém gráfico
- THEN a UI renderiza componentes nativos/Recharts a partir dos dados declarados e nunca injeta código, HTML ou JavaScript vindo do modelo

### Requirement: Configuração e erros operacionais

O sistema MUST ler configuração sensível somente no servidor, fornecer mensagens públicas sem detalhes internos e classificar indisponibilidade, timeout, quota, resposta inválida, autorização e falha de banco.

#### Scenario: erro externo

- WHEN o Provider está indisponível, excede quota ou atinge timeout
- THEN a API responde status/código controlado e a UI mostra orientação segura para tentar novamente

#### Scenario: erro interno

- WHEN ocorre falha de banco, schema ou Tool
- THEN logs server-side preservam diagnóstico sem devolver stack trace, SQL ou credenciais ao cliente
