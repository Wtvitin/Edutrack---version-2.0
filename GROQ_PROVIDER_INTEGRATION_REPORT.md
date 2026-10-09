# Groq Provider Integration Report

## Estado anterior

O Agent já possuía seleção de provider server-side com Google Gemini como default e OpenRouter apenas por opt-in explícito. O Orchestrator, Tool Registry, autenticação, autorização, ownership, auditoria e Structured Output já eram compartilhados.

## Arquitetura atual

`AgentView` chama apenas `POST /api/ai/chat`. O backend seleciona um único provider no factory existente. Gemini e Groq usam o mesmo `AgentOrchestrator`, Context Manager, system prompt, Tool Registry, validação Zod, identidade de sessão, ownership e auditoria.

## GroqProviderAdapter

`GroqProviderAdapter` foi adicionado em `server/agent-provider.mjs`. Ele reutiliza o transporte HTTP com timeout, o contrato interno de mensagens e o parser OpenAI-compatível; não cria Agent, Orchestrator ou Tool Registry paralelo.

## Gemini

Gemini permanece o default quando `LLM_PROVIDER` está ausente e continua usando `GOOGLE_API_KEY`, `gemini-2.5-flash`, `generateContent`, Tools e Structured Output existentes. Não há mudança no adapter Gemini.

## Provider selection

- `LLM_PROVIDER=google-gemini`: seleciona Gemini.
- `LLM_PROVIDER=groq`: seleciona exclusivamente Groq.
- Provider inválido: retorna erro controlado; não envia a mensagem a outro provider.
- Nenhuma falha Groq aciona Gemini, OpenRouter ou fallback automático.

## Configuration

- `GROQ_API_KEY`: credencial somente server-side.
- `GROQ_MODEL`: obrigatório para Groq, sem modelo hardcodeado.
- `GROQ_BASE_URL`: opcional; o default é a raiz OpenAI-compatível do Groq.
- `GROQ_TIMEOUT_MS`: opcional; substitui `LLM_TIMEOUT_MS` para Groq.

## Model

O runtime não escolhe modelo Groq implicitamente. A implantação deve configurar um modelo Groq que suporte Tool Calling e Structured Output, conforme a documentação vigente do provider. Os testes usam `openai/gpt-oss-20b` como valor de fixture, não como default de produção.

## Tool Calling

Groq envia e recebe Tool Calls pelo mesmo contrato OpenAI-compatível. O resultado retorna ao mesmo Tool Registry. Tool desconhecida, argumentos extras, enums ou UUIDs inválidos, autorização e ownership continuam sendo validados no backend.

## Structured Output

O Orchestrator primeiro realiza Tool Calling e só depois solicita o JSON Schema final sem Tools na mesma requisição. A resposta continua sendo validada pelo schema do backend antes de chegar ao Frontend.

## Retry / Timeout

O adapter faz no máximo duas tentativas totais para falhas transitórias (`408`, `429`, `5xx`, rede e timeout). Erros não transitórios, como `401`, `403` e `404`, não são repetidos e não trocam de provider.

## Audit

A tabela existente `ai_tool_executions` já armazena provider, modelo, Tool, status, usuário, conversa e timestamps. O teste de integração confirma `provider=groq` e `model=openai/gpt-oss-20b` para uma Tool executada.

## Security

A API key é enviada apenas no header server-side `Authorization`. Não há mudança no Frontend, rota pública, banco, autenticação, autorização, ownership ou fontes de identidade. Nenhum teste, log ou documento contém chave real.

## Tests

| Capacidade | Gemini | Groq | Evidência |
| --- | --- | --- | --- |
| Chat | ✅ | ✅ | Testes de provider |
| Tool Calling | ✅ | ✅ | Teste de Tool Call e Orchestrator |
| Structured Output | ✅ | ✅ | Testes de JSON Schema |
| Agent Orchestrator | ✅ | ✅ | Mesmo `chatWithAgent` |
| Tool Registry | ✅ | ✅ | Mesmo registry validado |
| Authorization | ✅ | ✅ | Testes existentes de Tool/API |
| Ownership | ✅ | ✅ | Testes existentes de isolamento |
| Audit | ✅ | ✅ | Teste de `provider=groq` |

## Gemini verification

Os testes direcionados de configuração e provider passam com Gemini preservado. O adapter Gemini continua selecionado apenas por `google-gemini` e a falha Gemini continua sem fallback OpenRouter.

## Groq verification

Os testes mockados confirmam seleção Groq, endpoint Groq, header server-side, Tool Calling, Structured Output, modelo ausente, chave ausente, retry `429`, timeout e erro `401`. O E2E com API Groq real não foi executado nesta validação porque uma credencial Groq e uma conta autenticada de teste não foram fornecidas ao processo de validação.

## OpenSpec

Change criada em `openspec/changes/add-groq-provider` com proposta, delta spec, design e tasks. A change descreve preservação Gemini, seleção explícita, configuração, Tools, Structured Output, segurança, auditoria e testes.

## TLC

Artefatos TLC criados em `.specs/features/agent-groq-provider` com requisitos `GROQ-01` a `GROQ-06`, design, tarefas e rastreabilidade. A decisão de provider único foi adicionada append-only em `.specs/STATE.md` como `AD-003`.

## SPEC.md

Nenhuma informação existente foi alterada. Somente conteúdo adicional foi acrescentado.

## Arquivos modificados

- `server/agent-config.mjs`
- `server/agent-provider.mjs`
- `tests/agent-config.test.mjs`
- `tests/agent-provider.test.mjs`
- `tests/agent-orchestrator.test.mjs`
- `.env.example`, `SPEC.md`, `context.md`, `IMPLEMENTATION.md`
- Artefatos OpenSpec e TLC descritos acima

## Dependências adicionadas

Nenhuma. A integração reutiliza `fetch` e a compatibilidade OpenAI do endpoint Groq.

## Limitações

O modelo Groq é uma decisão de implantação e deve ser configurado explicitamente. O E2E real depende de `GROQ_API_KEY`, `GROQ_MODEL`, conectividade e uma conta autenticada de teste.

## Status final

READY WITH GROQ E2E DEFERRED

