# Tasks

## 1. Contratos e fundação

- [x] 1.1 Criar configuração server-side do Agent e documentar defaults seguros; verificar que nenhuma chave sensível é lida no cliente.
- [x] 1.2 Criar schemas estritos para Tool Calls, respostas `text`/`analysis`/`action` e `ChartSpecification`; verificar rejeição de campos extras e payloads inválidos.
- [x] 1.3 Adicionar migração incremental de índices AI somente se ausentes; verificar aplicação em PostgreSQL/PGlite sem alterar dados existentes.

## 2. Provider

- [x] 2.1 Implementar adapters OpenRouter e Gemini com transporte injetável, timeout, retry limitado e fallback de modelo; verificar comportamento com respostas mockadas.

## 3. Tools e domínio

- [x] 3.1 Implementar registry estrito e Tools de tarefas usando a persistência existente, com autenticação, ownership e `agent_execution_id`; verificar operações legítimas e cross-user denial.
- [x] 3.2 Implementar Tools de analytics sobre `readData`/`prepareAnalytics` e auditar chamadas sem expor SQL, secrets ou dados de outras contas.

## 4. Orquestração e API

- [x] 4.1 Implementar contexto mínimo, persistência de conversa/mensagens, loop de no máximo três iterações, validação de Tool Calls, Structured Output e auditoria.
- [x] 4.2 Integrar `POST /api/ai/chat` ao fluxo de sessão do TARGET, com erros públicos controlados e testes de chat, isolamento, injection e falhas operacionais.

## 5. Interface e verificação

- [x] 5.1 Conectar `AgentView` a API same-origin, estados de loading/erro, respostas estruturadas e renderer seguro de gráficos; manter demo offline sem envio de dados ao Provider.
- [x] 5.2 Atualizar `.env.example`, documentação e rastreabilidade TLC/OpenSpec; executar testes, typecheck, lint, build, smoke mockado e verificação final independente.
