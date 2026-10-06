# Design

## Diagnóstico confirmado

O adapter já monta o endpoint correto de `generateContent`, usa `GOOGLE_API_KEY` no header `x-goog-api-key` e seleciona `google-gemini` por default. O erro ocorre antes de uma resposta HTTP: o `fetch` nativo do Node falha na validação da cadeia de certificados do ambiente. Com `node --use-system-ca`, a mesma chamada controlada retorna `OK`.

## Decisão de runtime

Os scripts `dev` e `start` serão os únicos pontos alterados para habilitar a CA do sistema. TLS continua habilitado; não será usado `NODE_TLS_REJECT_UNAUTHORIZED=0`, agente inseguro ou bypass de certificado. O requisito de Node sobe para `22.15.0`, versão mínima compatível com a flag.

## Decisão de diagnóstico

`server/api.mjs` registra falhas classificadas como provider em um objeto com campos fixos e não sensíveis. `server/agent-provider.mjs` anexa o status HTTP upstream ao erro interno. A mensagem pública permanece controlada pela API.

## Fluxo preservado

```text
AgentView
→ POST /api/ai/chat
→ sessão/autorização existente
→ chatWithAgent
→ google-gemini
→ fetch server-side com CA do sistema
→ Gemini generateContent
```

Nenhuma alteração é feita no registry de Tools, ownership, structured output, auditoria ou UI.
