# Design

## Estado confirmado

O TARGET já concentra a seleção em `readAgentConfig`, cria o adapter por `createAgentProvider` e executa Tools somente em `chatWithAgent`. O Orchestrator sempre envia Tools antes de uma execução de Tool e só solicita `responseFormat` depois que uma Tool define o tipo de resposta. Portanto, ele já separa Tool Calling e Structured Output em requisições diferentes.

## Decisão

Adicionar Groq no factory existente. O adapter Groq usa o transporte HTTP existente, o endpoint OpenAI-compatível `/chat/completions`, `Authorization: Bearer`, o mesmo contrato de mensagens já usado por OpenRouter e o parser comum de respostas OpenAI-compatíveis. Não será adicionada SDK nem dependência.

`GROQ_MODEL` é obrigatório quando `LLM_PROVIDER=groq`; não há modelo padrão no código. A documentação de Groq lista modelos que suportam Tool Use e separa Structured Outputs com `strict: true` em modelos específicos. A configuração operacional deve escolher um modelo que suporte ambas as capacidades, como um modelo `openai/gpt-oss-*` suportado no momento da implantação. A integração mantém Tool Calling e Structured Output em requisições separadas, conforme o fluxo atual e a compatibilidade documentada.

## Fluxo

```text
AgentView
  -> POST /api/ai/chat
  -> sessao autenticada
  -> AgentOrchestrator unico
  -> createAgentProvider(config)
  -> GroqProviderAdapter
  -> POST /openai/v1/chat/completions
  -> Tool Registry existente (quando houver tool_calls)
  -> resposta estruturada validada pelo backend
```

Gemini mantém o mesmo caminho, substituindo somente o adapter selecionado.

## Componentes

| Componente | Local | Mudança |
| --- | --- | --- |
| Configuração | `server/agent-config.mjs` | Normalizar `groq`, selecionar `GROQ_API_KEY`, `GROQ_MODEL`, URL e timeout próprios. |
| Provider layer | `server/agent-provider.mjs` | Criar `GroqProviderAdapter` com payload OpenAI-compatível, retry finito e parser existente. |
| Orchestrator | `server/agent-orchestrator.mjs` | Sem alteração. Continua fonte de verdade para Tools, ownership, auditoria e Structured Output. |
| Auditoria | `ai_tool_executions` | Sem migration. A coluna `provider` já recebe `config.provider`. |
| Frontend | `components/` | Sem alteração. Continua usando apenas `/api/ai/chat`. |

## Contrato Groq

- Mensagens, `tools`, `tool_choice`, `tool_calls` e mensagens `tool` usam o formato já aceito pelo parser OpenAI-compatível do projeto.
- `response_format` usa JSON Schema com `strict: true` quando o Orchestrator solicita a resposta final estruturada.
- `GROQ_BASE_URL` default é a raiz OpenAI-compatível do Groq. O adapter acrescenta `/chat/completions`.
- `GROQ_TIMEOUT_MS` prevalece sobre `LLM_TIMEOUT_MS` apenas para Groq; os limites globais de configuração continuam aplicados.
- Apenas `408`, `429`, `5xx`, timeout e rede são transitórios; há no máximo duas tentativas totais no Groq e nenhuma troca de provider.

## Segurança

- A chave é lida só em `readAgentConfig` no servidor e é enviada somente no header da chamada HTTP.
- O adapter não aceita `userId` como autoridade. O contexto autenticado continua sendo anexado apenas pelo Orchestrator ao Tool Registry.
- A validação Zod existente continua rejeitando Tools e argumentos inválidos antes do domínio.
- Logs mantêm status técnico seguro, sem headers, chave, prompt, cookie ou resultado sensível não redigido.

## Riscos e controles

| Risco | Controle |
| --- | --- |
| Modelo configurado sem Structured Output estrito | Não definir modelo default; documentar que a implantação deve selecionar modelo compatível. O backend continua validando toda resposta. |
| Groq não suporta Tools e Structured Output juntos na mesma chamada | O Orchestrator existente nunca pede ambos na mesma requisição. |
| Erro Groq causar fallback oculto | Factory seleciona um único adapter por startup e testes proíbem fallback. |
| Vazamento da chave | Variável apenas server-side, header não é logado e testes verificam o comportamento. |
