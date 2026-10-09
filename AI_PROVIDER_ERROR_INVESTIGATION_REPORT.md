# AI Provider Error Investigation Report

Data: **7 de outubro de 2026**

## 1. Sintoma

Ao enviar `Quais são minhas tarefas?` na tela `/agente`, a interface mostrava:

```text
Não consegui concluir agora.
O Provider não conseguiu responder.
```

O frontend recebia HTTP `503` de `POST /api/ai/chat`.

## 2. Reprodução

O fluxo foi reproduzido contra uma instância local com Groq selecionado:

```text
cadastro local
→ verificação via mailbox local
→ login
→ POST /api/ai/chat
→ Quais são minhas tarefas?
```

Resultado antes da correção:

- cadastro: `200`;
- verificação: `200`;
- login: `200`;
- chat: `503`;
- mensagem pública: `O Provider não conseguiu responder.`.

O provider foi isolado com o mesmo runtime `node --use-system-ca`, sem imprimir
API key, cookie ou Authorization. A primeira chamada Groq respondeu Tool Call
`list_tasks`; a falha ocorreu na continuação da conversa.

## 3. Causa raiz

A causa raiz foi incompatibilidade no boundary do adapter Groq, não falta de
credencial, autenticação ou falha do Tool Registry.

### Falha 1 — Tool Call wire format

O contrato interno do Orchestrator usa:

```json
{"id":"...","name":"list_tasks","arguments":{"status":"TODO"}}
```

O Groq exige, na mensagem Assistant seguinte, o formato OpenAI-compatível:

```json
{
  "id": "...",
  "type": "function",
  "function": {
    "name": "list_tasks",
    "arguments": "{\"status\":\"TODO\"}"
  }
}
```

Antes da correção, o provider respondeu `400` com diagnóstico sanitizado
informando que `messages.2.tool_calls.0.type` estava ausente.

### Falha 2 — filtro nullable

Após corrigir o wire format, o modelo emitiu `{"status":null}`. O schema
enviado ao Groq aceitava somente string e o provider rejeitou a chamada antes de
devolvê-la ao backend.

### Falha 3 — Structured Output estrito

Após corrigir o filtro, o Groq rejeitou o `response_format` analítico porque
`chart.data.items` utilizava `additionalProperties:true`, incompatível com o
modo JSON Schema estrito aceito pelo endpoint observado.

## 4. Correção

Arquivos alterados:

- `server/agent-provider.mjs` — normaliza somente o wire format Groq, torna o
  schema do `list_tasks` nullable no boundary Groq e usa JSON object mode com a
  instrução do contrato para Structured Output dinâmico.
- `server/agent-schemas.mjs` — trata `status:null` como ausência de filtro,
  preservando validação de extras e enum.
- `tests/agent-provider.test.mjs` — cobre Tool Call wire mapping, nullable
  filter e JSON object mode.
- `tests/agent-tools.test.mjs` — cobre execução de `list_tasks` com status nulo.

O backend continua validando a resposta final com os schemas existentes. Não
houve mudança no Orchestrator, Tool Registry, autenticação, autorização,
ownership, persistência, auditoria ou frontend.

## 5. Fluxo antes

```text
POST /api/ai/chat
→ Groq retorna Tool Call
→ Orchestrator monta assistant.tool_calls no contrato interno
→ adapter envia formato incompleto ao Groq
→ Groq responde 400
→ adapter converte para provider error
→ API responde 503 genérico
→ frontend mostra “O Provider não conseguiu responder”
```

## 6. Fluxo depois

```text
POST /api/ai/chat
→ AgentOrchestrator
→ GroqProviderAdapter normaliza assistant.tool_calls
→ Groq executa list_tasks
→ Tool Registry valida status nullable e ownership
→ resultado retorna ao Groq
→ adapter usa json_object para contrato dinâmico
→ Backend valida analysis/text/action
→ API responde 200
→ frontend renderiza resposta estruturada
```

## 7. Testes

- `npm test`: **PASS** — 71 testes aprovados, 1 teste opcional de Python/Pandas
  ignorado, 0 falhas.
- Testes direcionados de provider, schemas, tools e Orchestrator: **PASS** — 35.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**.
- `npm run lint`: **BASELINE FAIL** — 5 erros e 37 avisos preexistentes,
  concentrados em arquivos fora do escopo da correção.
- E2E autenticado Groq: **PASS** — cadastro `200`, verificação `200`, login
  `200`, chat `200` para `Quais são minhas tarefas?`.

Resposta E2E validada:

```json
{
  "type": "analysis",
  "analysis": "Não há tarefas cadastradas na sua conta.",
  "metrics": {}
}
```

## 8. Configuração

Variáveis necessárias para Groq:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=
GROQ_BASE_URL=
GROQ_TIMEOUT_MS=
```

Nenhum valor real foi adicionado a código, testes, documentação, logs ou
relatórios.

## 9. Gemini, OpenRouter e segurança

- Gemini permanece selecionável por `LLM_PROVIDER=google-gemini` e seus testes
  continuam passando.
- Nenhum fallback automático para Gemini ou OpenRouter foi adicionado.
- O AgentOrchestrator e o Tool Registry permanecem únicos.
- O `userId` continua vindo da sessão autenticada.
- Ownership e validação backend continuam obrigatórios.
- Nenhuma API key, token, cookie ou header Authorization completo foi registrado.

## 10. OpenSpec e TLC

Foi criada a change:

```text
openspec/changes/fix-ai-provider-response-error/
```

Com `proposal.md`, `design.md`, `tasks.md` e delta spec.

Foi criada a feature TLC:

```text
.specs/features/agent-provider-response-error/
```

Com `spec.md`, `design.md`, `tasks.md` e `validation.md`.

`SPEC.md` recebeu somente a seção adicional sobre a correção. O diff foi
verificado com `git diff -- SPEC.md`; nenhuma linha anterior foi alterada ou
removida.

## 11. Limitações

- O E2E Gemini live não foi executado nesta correção; os testes de adapter Gemini
  passaram e o caso real foi validado com Groq, provider configurado no ambiente.
- A validação formal `openspec validate --all --strict` permanece `DEFERRED` se o
  CLI não estiver disponível no ambiente.
- Os validadores TLC Python permanecem `DEFERRED` se Python não estiver
  disponível no ambiente.
- O lint continua falhando somente pelo baseline preexistente; não foram feitas
  correções não relacionadas.

## 12. Status

**FIXED AND VALIDATED**

## 11. Valida??o forense do navegador ? 7 de outubro de 2026

A diverg?ncia foi reproduzida contra o runtime local real, sem curl substituindo a UI:

- Frontend acessado em `http://localhost:4173/agente`; o processo Vinext interno atende em `127.0.0.1:4174`.
- O navegador enviou `POST /api/ai/chat` com `credentials: same-origin` e manteve o mesmo `conversationId` entre as duas perguntas.
- A configura??o efetivamente carregada pelo runtime era Groq, n?o Gemini: `LLM_PROVIDER=groq`.
- A chamada anterior com Groq/gpt-oss-20b produziu HTTP 400 do provider com `output_parse_failed`; a API converteu isso corretamente em HTTP 503 p?blico.
- Tamb?m foi observado `tool_use_failed` no segundo round quando o modelo tentou chamar ferramenta apesar de a continua??o exigir Structured Output sem Tools.

A corre??o adicionou uma instru??o final provider-specific no adapter Groq para impedir nova Tool Call ap?s a execu??o da ferramenta e atualizou o modelo local para `openai/gpt-oss-120b`, verificado com Structured Output JSON antes do E2E. O backend tamb?m passou a destruir o proxy quando o cliente aborta uma requisi??o, evitando encerramento do runtime por `ECONNRESET` durante reload/navega??o.

Fluxo real ap?s a corre??o:

`Como est? meu desempenho?` ? HTTP 200, `iterations=2`, `toolCalls=1`.

`Fa?a uma compara??o entre as minhas duas ?ltimas semanas de estudo.` ? HTTP 200, mesmo `conversationId`, `get_study_trends`, `iterations=2`, `toolCalls=1`, resposta `analysis` com gr?fico renderizado e sem fallback de erro.

## 12. Valida??o atualizada

- `npm test`: PASS ? 72 aprovados, 1 skip.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- `npm run lint`: baseline FAIL ? 5 erros e 37 warnings preexistentes fora do escopo.
- `openspec validate --all --strict`: PASS ? 15 itens.
- TLC response-error: spec, tasks e state PASS.
- Smoke HTTP: `GET /api/health` retornou HTTP 200.
- Smoke visual/browser: PASS ? compara??o exibida na conversa sem ?N?o consegui concluir agora.?.

## 13. Status final

FIXED AND VALIDATED
- Targeted ESLint (`server/agent-provider.mjs`, `server/start.mjs`, `tests/agent-provider.test.mjs`): PASS.
