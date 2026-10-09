# Tasks

## 1. Discovery

- [x] 1.1 Inspecionar provider, Orchestrator, API, Tool Registry, analytics,
  frontend e testes.
- [x] 1.2 Reproduzir o endpoint real com autenticação e dados `0/105`.
- [x] 1.3 Comparar a instância antiga em `4173` com uma instância atual isolada.

## 2. Implementation

- [x] 2.1 Preservar `thoughtSignature` nas Tool Calls Gemini persistidas.
- [x] 2.2 Não alterar `get_study_trends`, autorização, ownership ou frontend.
- [x] 2.3 Adicionar teste de continuidade com `id`, `thoughtSignature`,
  `functionCall`, Tool Result e segunda chamada.

## 3. Verification

- [x] 3.1 Validar desempenho e comparação real por HTTP 200.
- [x] 3.2 Executar testes focados e regressão dos providers.
- [x] 3.3 Executar validação ampla, lint e build e registrar limitações.
- [x] 3.4 Executar validação OpenSpec/TLC disponível no ambiente.
