# Tasks

## 1. Diagnóstico

- [x] 1.1 Reproduzir o erro com conta autenticada e `Quais são minhas tarefas?`.
- [x] 1.2 Isolar o Provider e registrar status, código e mensagem sanitizados.
- [x] 1.3 Confirmar a incompatibilidade de Tool Call, nullable schema e Structured Output.

## 2. Correção

- [x] 2.1 Normalizar mensagens Assistant Tool Call no adapter Groq.
- [x] 2.2 Ajustar o filtro opcional `list_tasks` para o caso `null` do provider.
- [x] 2.3 Usar JSON object mode para Structured Output Groq dinâmico sem alterar schemas backend.

## 3. Verificação

- [x] 3.1 Adicionar regressões unitárias para request mapping e providers preservados.
- [x] 3.2 Executar teste E2E autenticado real com Groq configurado, sem expor credenciais.
- [x] 3.3 Executar testes, typecheck, build, lint e registrar OpenSpec/TLC.
