# Design

## Estado atual auditado

`AgentView` chama `POST /api/ai/chat`; `server/api.mjs` chama `readAgentConfig` e cria o provider; `chatWithAgent` usa `provider.complete`; `createAgentProvider` seleciona `completeOpenRouter` ou `completeGemini`. Sem `LLM_PROVIDER`, o default é OpenRouter. O adapter Gemini já chama `generateContent`, mas não é o caminho default e envia a chave na query string.

## Decisão

`LLM_PROVIDER` default será `google-gemini`. O modelo default será `gemini-2.5-flash`. `GOOGLE_API_KEY` será a única credencial Gemini. `LLM_FALLBACK_MODEL` só será lido para OpenRouter explicitamente configurado; Gemini não fará fallback para OpenRouter.

## Provider

O adapter comum continuará recebendo `complete(request)`. Para Gemini:

1. separar mensagens `system` em `systemInstruction`;
2. converter mensagens user/model/tool para `contents`;
3. converter Tools allowlisted em `functionDeclarations`;
4. enviar `responseMimeType=application/json` e `responseSchema` na etapa de Structured Output;
5. autenticar com `x-goog-api-key`;
6. limitar timeout e retry a erros transitórios;
7. mapear texto, function calls, respostas vazias e erros para `AgentProviderError`.

O adapter OpenRouter permanece somente para configuração explícita e nunca é chamado por falha do Gemini.

## Auditoria

Adicionar coluna nullable `provider` em `ai_tool_executions`, preencher com `config.provider` e manter model, prompt version, status, timestamps e payloads redigidos.

## Segurança

Chave nunca aparece no frontend, resposta, logs de teste, URL, input/output de auditoria ou documentação. A API continua protegida pela sessão existente; Tools continuam usando registry, schema, authorization e ownership atuais.

## Verificação

Testes mockados provam seleção Gemini, ausência de fallback, request mapping, function call, structured output e header sem chave na URL. Testes existentes provam que Tools, ownership, Structured Output e API continuam funcionando. E2E real fica deferred se `GOOGLE_API_KEY` não estiver configurada.
