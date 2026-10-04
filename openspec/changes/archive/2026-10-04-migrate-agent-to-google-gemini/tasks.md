# Tasks

## 1. Especificação e configuração

- [x] 1.1 Atualizar defaults server-side para Gemini, modelo configurável e sem fallback OpenRouter implícito.
- [x] 1.2 Atualizar `.env.example`, SPEC, context e IMPLEMENTATION para diferenciar default, suporte explícito e credencial Gemini.

## 2. Adapter Gemini

- [x] 2.1 Separar `systemInstruction`, corrigir request mapping, Structured Output e autenticação por header.
- [x] 2.2 Garantir retry/timeout e erro controlado sem fallback para OpenRouter.

## 3. Auditoria e testes

- [x] 3.1 Adicionar migration aditiva e persistir provider efetivo em Tool Execution.
- [x] 3.2 Adicionar testes de seleção, não-fallback, chave protegida, request/response Gemini e Tool Calling.
- [x] 3.3 Executar testes, typecheck, lint direcionado, build e validações OpenSpec/TLC; registrar E2E real como deferred se não houver chave.
