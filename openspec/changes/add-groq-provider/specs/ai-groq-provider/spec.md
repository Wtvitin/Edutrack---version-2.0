# AI Groq Provider

## ADDED Requirements

### Requirement: Seleção explícita do provider Groq

O sistema MUST aceitar `groq` como valor explícito de `LLM_PROVIDER`. Quando `LLM_PROVIDER=groq`, o Agent MUST enviar todas as inferências ao Groq. Quando `LLM_PROVIDER` estiver ausente ou for `google-gemini`, o comportamento Gemini existente MUST permanecer inalterado. O sistema MUST NOT trocar entre Gemini, Groq ou OpenRouter depois de uma falha do provider.

#### Scenario: Groq selecionado

- **WHEN** o processo inicia com `LLM_PROVIDER=groq`
- **THEN** a rota autenticada `/api/ai/chat` MUST usar somente o adapter Groq para a conversa

#### Scenario: Gemini preservado

- **WHEN** o processo inicia com `LLM_PROVIDER=google-gemini`
- **THEN** a rota autenticada `/api/ai/chat` MUST continuar usando somente o adapter Gemini

#### Scenario: provider inválido

- **WHEN** `LLM_PROVIDER` não corresponder a um provider suportado
- **THEN** o sistema MUST responder com erro controlado e MUST NOT enviar a mensagem a outro provider

### Requirement: Configuração e segredo server-side

O sistema MUST ler `GROQ_API_KEY` somente no runtime server-side. O modelo Groq MUST ser configurado por `GROQ_MODEL`, sem modelo Groq hardcodeado. `GROQ_BASE_URL` e `GROQ_TIMEOUT_MS` MAY substituir, respectivamente, a URL e timeout comuns para uma instalação Groq. O sistema MUST falhar de forma controlada quando a chave ou o modelo Groq obrigatório estiver ausente.

#### Scenario: credencial ausente

- **WHEN** `LLM_PROVIDER=groq` e `GROQ_API_KEY` estiver vazio
- **THEN** o sistema MUST retornar `provider-not-configured` sem revelar valor de ambiente, header ou chave

#### Scenario: modelo ausente

- **WHEN** `LLM_PROVIDER=groq` e nenhum modelo Groq configurado estiver disponível
- **THEN** o sistema MUST retornar `model-not-configured` antes de chamar a rede

### Requirement: Conversa, Tool Calling e Structured Output Groq

O Groq MUST receber o mesmo system prompt, histórico, mensagens do usuário e definições de Tool do contrato interno do Agent. Quando o Groq solicitar Tool Calls, o sistema MUST encaminhá-las ao Tool Registry existente, mantendo validação, autorização, ownership e auditoria no backend. Depois de uma Tool, o adapter MUST retornar a resposta estruturada final do Groq pelo contrato JSON existente e o backend MUST continuar validando o resultado antes de devolvê-lo ao Frontend.

#### Scenario: Tool local autorizada

- **WHEN** o Groq solicitar uma Tool registrada com argumentos válidos
- **THEN** o sistema MUST executar a mesma Tool local usada pelo Gemini e devolver o resultado ao Groq com o `tool_call_id` correspondente

#### Scenario: Tool inválida ou não autorizada

- **WHEN** o Groq solicitar Tool desconhecida, argumentos extras, enum inválido, UUID inválido ou recurso de outra conta
- **THEN** o backend MUST rejeitar a operação pelo fluxo existente e MUST NOT conceder autoridade ao Groq

#### Scenario: resposta estruturada final

- **WHEN** o Agent concluir uma execução que exige resposta estruturada
- **THEN** o adapter MUST solicitar JSON Schema ao Groq sem Tools na mesma requisição e o backend MUST validar o JSON antes de responder

### Requirement: Resiliência e diagnóstico seguro

O adapter Groq MUST usar o timeout configurado e MUST tentar novamente apenas falhas transitórias, no máximo uma vez. Status `408`, `429` e `5xx`, timeout e falha de rede MUST resultar em erro público controlado e diagnóstico server-side sem segredo. Status `401`, `403`, `404` e respostas inválidas MUST NOT ser reexecutados como fallback em outro provider.

#### Scenario: quota temporária

- **WHEN** o Groq retornar `429`
- **THEN** o adapter MUST realizar no máximo uma nova tentativa no Groq e MUST retornar erro controlado se a segunda tentativa falhar

#### Scenario: erro de autorização

- **WHEN** o Groq retornar `401` ou `403`
- **THEN** o adapter MUST não repetir a chamada e MUST não chamar Gemini, OpenRouter ou outro provider

### Requirement: Auditoria e compatibilidade

Quando uma Tool for solicitada durante uma conversa Groq, a auditoria existente MUST persistir `provider=groq`, o modelo efetivo, usuário, conversa, Tool, status e timestamps. A integração MUST reutilizar as estruturas atuais e MUST NOT criar tabela, rota de frontend, Agent, Orchestrator ou Tool Registry paralelo.

#### Scenario: Tool auditada

- **WHEN** uma Tool solicitada pelo Groq terminar com sucesso ou falha
- **THEN** o registro de execução MUST identificar `provider=groq` e MUST permanecer livre de API key, token, header de autorização e prompt sensível
