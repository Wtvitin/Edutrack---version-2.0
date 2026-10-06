# Design

## Implementação

1. `package.json` ativa `node --use-system-ca` nos scripts do servidor.
2. `server/agent-provider.mjs` mantém o status HTTP upstream em `provider-http-error`.
3. `server/api.mjs` registra provider, model, status, code, status upstream e código/nome da causa quando disponíveis.

## Segurança

O processo continua validando certificados TLS. A chave Gemini continua server-side em `GOOGLE_API_KEY`, no header do adapter, e não entra no log. Nenhum fallback ou bypass de autenticação será introduzido.
