# Investigação do erro de comparação semanal no EduTrack AI

## 1. Sintoma

O Agent exibia `Não consegui concluir agora.` e `O Provider não conseguiu
responder.` ao continuar a conversa com `faça uma comparação entre as minhas
duas últimas semanas de estudo`.

## 2. Reprodução

O fluxo foi executado com conta local autenticada, dados controlados e sessão
server-side:

```text
register -> verify -> login -> PUT /api/data
         -> POST /api/ai/chat: Como está meu desempenho?
         -> POST /api/ai/chat: comparação entre as duas últimas semanas
```

Antes da correção operacional, a instância que ocupava `4173` era um processo
antigo e retornou HTTP 503 até para `Olá`. A instância isolada atual em `4373`
retornou HTTP 200 para ambos os pedidos. Depois de reiniciar a instância atual
em `4173`, o caso reportado também retornou HTTP 200.

## 3. Causa raiz

### Causa observada no navegador

A porta usada pelo navegador estava ligada a um runtime EduTrack antigo, não ao
processo iniciado a partir do código atual. A evidência é objetiva: o mesmo
endpoint autenticado retornava 503 para uma mensagem simples antes do reinício,
mas retornou 200 após reiniciar o backend/frontend atuais com Gemini explícito.

Portanto, a falha visual persistente não era uma falha de SQL ou de
`get_study_trends` no código atual; era uma instância local stale em `4173`.

### Gap de continuidade corrigido

O trace do código atual também revelou que o Orchestrator mantinha
`thoughtSignature` em memória, mas o removia do `assistantCallMessage` persistido.
Isso poderia quebrar uma nova requisição que reconstruísse o histórico e
reenviasse a Tool Call ao Gemini. O campo conhecido passou a ser persistido e
foi coberto por regressão fiel.

## 4. Correção aplicada

- `server/agent-orchestrator.mjs`: preserva `thoughtSignature` ao persistir
  Tool Calls Gemini, sem aceitar campos arbitrários.
- `tests/agent-orchestrator.test.mjs`: reproduz a retomada por `conversationId`
  com `id`, `thoughtSignature`, `functionCall`, Tool Result e segunda chamada.
- Runtime local: processos antigos em `4173/4174` foram encerrados e o projeto
  foi reiniciado com `LLM_PROVIDER=google-gemini` e `--use-system-ca`.

Não foram alterados `get_study_trends`, Tool Registry, autorização, ownership,
banco, frontend, Gemini adapter, Groq adapter ou fallback de provider.

## 5. Fluxo antes

```text
Browser -> 4173 stale process -> /api/ai/chat -> 503 genérico
```

No risco de continuidade do código anterior:

```text
Tool Call Gemini -> execução correta -> persistência sem thoughtSignature
                  -> retomada -> histórico incompleto -> possível rejeição Gemini
```

## 6. Fluxo depois

```text
UI
 -> /api/ai/chat
 -> AgentOrchestrator
 -> Gemini
 -> get_study_trends
 -> Tool Result
 -> segunda chamada Gemini com histórico preservado
 -> análise/ChartSpecification validada
 -> HTTP 200
 -> UI
```

## 7. Testes

- Testes focados Orchestrator/Provider: PASS — 26 testes.
- Regressão de continuidade Gemini: PASS.
- E2E autenticado Gemini com `0/105`: PASS — desempenho HTTP 200 e comparação
  HTTP 200.
- `npm test`: PASS — 72 testes passaram, 1 foi ignorado opcionalmente.
- `npm run typecheck`: PASS.
- `npm run lint`: FAIL baseline — 5 erros e 37 warnings preexistentes fora desta
  correção.
- Lint direcionado (`server/agent-orchestrator.mjs` e
  `tests/agent-orchestrator.test.mjs`): PASS.
- `npm run build`: PASS.
- OpenSpec `validate --all --strict`: PASS — 15 itens.
- TLC `validate_spec.py --strict`: PASS.
- TLC `validate_tasks.py --strict`: PASS com 1 warning de documentação sem teste.
- TLC `validate_state.py`: PASS.

## 8. Configuração

```text
LLM_PROVIDER=google-gemini
GOOGLE_API_KEY=<server-side>
LLM_MODEL=<modelo configurado>
LLM_TIMEOUT_MS=<opcional>
```

Nenhum valor secreto é registrado neste relatório.

## 9. Limitações

- O teste real depende de quota, rede e credencial Gemini local.
- O processo antigo foi identificado pelo comportamento e pela porta ocupada;
  o código atual foi validado após reinício.
- A validação visual por navegador depende de apontar o navegador para a
  instância reiniciada em `http://localhost:4173`.

## 10. Status

FIXED AND VALIDATED
