# Proposal

## Why

O TARGET possui apenas uma prévia do Agent em `AgentView`; nenhuma mensagem chega a um modelo e nenhuma Tool é executável. O SOURCE comprova um fluxo funcional de Agent, mas usa NestJS/Prisma, portanto o comportamento precisa ser reimplementado no servidor Node HTTP do TARGET sem transportar essa arquitetura.

## What Changes

- Adicionar um endpoint autenticado `POST /api/ai/chat` no servidor HTTP existente.
- Adicionar adapters server-side para OpenRouter e Google Gemini, com timeout, retry limitado, fallback de modelo para OpenRouter e erros controlados.
- Adicionar registro e validação estrita das oito Tools funcionais do SOURCE, usando `zod` já presente no TARGET.
- Reutilizar PostgreSQL/PGlite, sessões por cookie, tabelas AI já existentes, tarefas existentes e pipeline de analytics autorizado.
- Implementar o loop do Agent com no máximo três iterações, persistência de mensagens, auditoria de Tool Calls e validação independente de Structured Output.
- Substituir a prévia de `AgentView` por chat real para contas autenticadas, mantendo a demonstração offline e renderizando gráficos somente a partir de especificações validadas.
- Adicionar configuração server-side no `.env.example`, testes de backend/frontend e uma migração incremental apenas para índices de conversa necessários.
- Documentar limitações reais: ausência de rate limiting distribuído e ausência de E2E dedicado permanecem deferred.

## Capabilities

### New Capabilities

- `ai-agent-integration`: Chat autenticado, Provider Adapter, Orchestration, Tools, persistência, Structured Output, auditoria e UI nativa do TARGET.

### Modified Capabilities

- Nenhuma. O TARGET não possui specs de capacidades existentes; esta mudança introduz a capacidade ausente.

## Impact

- **Servidor:** novos módulos `server/agent-*.mjs`, rota em `server/api.mjs` e integração no fluxo de autenticação existente.
- **Banco:** reutilização de `ai_conversations`, `ai_messages`, `ai_tool_executions` e `agent_execution_id`; nova migração somente para índices compostos de consulta.
- **Frontend:** novo cliente de chat, `AgentView` conectado à API e renderer seguro de ChartSpecification dentro da arquitetura atual.
- **Configuração:** novas variáveis opcionais para Provider, modelo, fallback, URL, timeout e chaves server-side.
- **Dependências:** nenhuma dependência runtime nova; `fetch` nativo e `zod` existente serão usados.
- **Compatibilidade:** nenhuma troca de framework, ORM, banco, autenticação ou pacote principal do TARGET.
