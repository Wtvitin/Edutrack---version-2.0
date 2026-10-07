# Proposal

## Why

O Agent do EduTrack possui um contrato de provider que hoje atende Google Gemini e compatibilidade explicita com OpenRouter. E necessario permitir Groq como escolha explicita sem criar um segundo Agent, alterar as Tools ou remover o fluxo Gemini existente.

## What Changes

- Adicionar `GroqProviderAdapter` ao provider layer existente, usando o transporte HTTP injetavel ja adotado pelo TARGET.
- Selecionar Groq apenas quando `LLM_PROVIDER=groq`; `google-gemini` continua o default e nao existe fallback automatico entre providers.
- Ler `GROQ_API_KEY` somente no servidor e configurar o modelo Groq exclusivamente por `GROQ_MODEL`, sem reutilizar o `LLM_MODEL` do caminho Gemini/OpenRouter.
- Mapear mensagens, system prompt, Tools, resultados de Tool Calls, Structured Output, timeout, retry finito e erros para o endpoint OpenAI-compativel do Groq.
- Preservar o Orchestrator, Context Manager, Tool Registry, validacao de schema, autorizacao, ownership, auditoria e Frontend existentes.
- Atualizar documentacao operacional, `.env.example`, a rastreabilidade TLC e o relatorio de integracao. `SPEC.md` recebera somente uma nova secao aditiva.

## Capabilities

### New Capabilities

- `ai-groq-provider`: provider Groq explicito, seguro e compativel com o contrato interno do Agent.

### Modified Capabilities

- Nenhuma. A capability Gemini permanece intacta; a nova capability e complementar.

## Non-goals

- Remover, substituir ou alterar o comportamento de `GoogleGeminiProviderAdapter`.
- Criar outro Orchestrator, Tool Registry, Context Manager, system prompt, rota, tabela ou fluxo de autenticacao.
- Introduzir OpenRouter como fallback ou adicionar fallback automatico Gemini/Groq.
- Inserir uma chave de API real, expo-la ao browser ou persisti-la em logs, banco, testes ou documentacao.
- Escolher ou hardcodear um modelo Groq default sem evidencia de capacidades compativeis; uma instalacao Groq exige modelo configurado explicitamente.

## Impact

- **Configuracao:** `server/agent-config.mjs` e `.env.example` passam a reconhecer credencial e modelo Groq server-side.
- **Provider:** `server/agent-provider.mjs` recebe o adapter Groq no mesmo factory ja usado pelo Orchestrator.
- **Seguranca e auditoria:** sem alteracoes de autoridade; `ai_tool_executions.provider` passa a registrar `groq` pela configuracao efetiva existente.
- **Testes:** testes unitarios cobrem selecao, request mapping, Tools, Structured Output, retry, timeout, erros e regressao Gemini.
