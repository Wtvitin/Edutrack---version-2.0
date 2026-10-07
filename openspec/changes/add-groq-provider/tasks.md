# Tasks

## 1. Configuracao

- [x] 1.1 Adicionar selecao deterministica de groq e configuracao server-side de chave, modelo, URL e timeout, preservando defaults Gemini.
- [x] 1.2 Adicionar testes de configuracao para Groq, chave/modelo ausentes, provider invalido e regressao Gemini.

## 2. Provider Groq

- [x] 2.1 Implementar GroqProviderAdapter no factory existente com transporte HTTP atual, mensagens, system prompt e Tool Calling OpenAI-compativeis.
- [x] 2.2 Adicionar Structured Output JSON Schema, retry finito, timeout e classificacao de erros sem fallback entre providers.
- [x] 2.3 Adicionar testes de request mapping, Tool results, Structured Output, timeout, retry, 401/403/404/429 e ausencia de segredo.

## 3. Integracao e evidencias

- [x] 3.1 Provar no Orchestrator existente que Tool Calls Groq preservam auditoria provider=groq, modelo, ownership e validacao.
- [x] 3.2 Atualizar configuracao e documentacao aditiva, incluindo SPEC.md, contextos, relatorio e matriz Gemini x Groq.
- [x] 3.3 Executar testes, typecheck, lint, build, OpenSpec strict e validadores TLC; registrar E2E real como deferred sem credenciais locais.
