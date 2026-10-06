# Proposal

## Why

O fluxo autenticado do Agent seleciona corretamente o Google Gemini, mas o runtime Node local falha no `fetch` HTTPS antes de receber uma resposta. A chamada direta ao mesmo adapter funciona quando o processo usa o armazenamento de certificados do sistema. Sem essa configuração, a API devolve o sintoma público `Não foi possível acessar o Provider`.

## What Changes

- Iniciar os scripts `dev` e `start` com `--use-system-ca`.
- Ajustar o requisito mínimo de Node para a versão que suporta essa flag.
- Registrar falhas do provider com metadados não sensíveis, preservando código técnico, status e causa TLS sem registrar chave, headers, cookies, tokens ou prompt.
- Preservar Gemini como provider padrão e OpenRouter somente por seleção explícita.
- Adicionar teste regressivo do comando de runtime.

## Non-goals

- Não trocar provider, modelo, endpoint ou adapter Gemini.
- Não adicionar fallback para OpenRouter.
- Não desabilitar validação TLS.
- Não alterar UI, autenticação, ownership, Tools ou analytics.
- Não instalar dependências nem registrar qualquer segredo.

## Impact

- **Runtime:** `package.json` passa a ativar a CA do sistema nos comandos locais e de produção.
- **Diagnóstico:** `server/api.mjs` registra somente metadados seguros de falhas do provider.
- **Provider:** `server/agent-provider.mjs` preserva o status HTTP upstream para diagnóstico interno.
- **Testes:** novo teste cobre os scripts e a preservação da validação TLS.
