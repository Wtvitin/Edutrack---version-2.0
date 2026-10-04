# Agent Integration Specification

## Problem Statement

O TARGET possui apenas uma prévia visual do Agent. O SOURCE comprova um fluxo funcional de conversa, Tool Calling, auditoria e respostas estruturadas, mas usa NestJS/Prisma e não pode substituir a arquitetura do TARGET. A integração precisa reproduzir o comportamento funcional no servidor Node HTTP, banco SQL e sessão por cookie já existentes.

## Goals

- [x] Entregar chat autenticado com o Agent em `POST /api/ai/chat`.
- [x] Reproduzir as oito Tools observadas no SOURCE somente com regras e dados existentes no TARGET.
- [x] Validar Tool Calls, ownership, Structured Output e auditoria no backend antes de responder à UI.
- [x] Conectar o `AgentView` nativo do TARGET sem permitir Provider, SQL, código ou secrets no frontend.

## Out of Scope

| Feature | Reason |
| --- | --- |
| NestJS, Prisma ou migração do SOURCE | A arquitetura do TARGET é autoridade. |
| RAG, memória semântica, streaming e filas | Não são necessários para o vertical slice funcional. |
| Rate limiting distribuído | O TARGET não possui requisito nem infraestrutura compartilhada para isso. |
| E2E dedicado e Provider real em CI | O TARGET não possui harness E2E; o fluxo será coberto com mocks e integração em memória. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Fonte de identidade | Sessão HttpOnly validada pelo `server/api.mjs` | Evita confiar em `userId` enviado pelo cliente ou pelo modelo. | yes |
| Persistência AI | Tabelas SQL existentes `ai_conversations`, `ai_messages`, `ai_tool_executions` | Evita tabelas duplicadas e preserva o schema do TARGET. | yes |
| Validação | `zod` já instalado | Mantém o padrão do TARGET sem nova dependência. | yes |
| Transporte LLM | `fetch` nativo com adapters OpenRouter/Gemini | Mantém o Provider server-side e testável por injeção. | yes |
| Analytics | `readData` e `prepareAnalytics` existentes | Reutiliza filtragem de usuário e pipeline Pandas autorizado. | yes |

**Open questions:** none - all resolved or logged above.

## User Stories

### P1: Chat autenticado e isolado ⭐ MVP

**User Story**: Como estudante autenticado, quero conversar com o Agent para consultar e alterar minhas tarefas sem acessar dados de outra conta.

**Why P1**: É o fluxo vertical mínimo e concentra autenticação, contexto, Provider, Tools e persistência.

**Acceptance Criteria**:

1. WHEN uma conta autenticada envia uma mensagem não vazia THEN system SHALL persistir a mensagem na conversa própria e retornar resposta validada.
2. IF a conta não possui sessão válida THEN system SHALL responder `401` sem executar Provider ou Tool.
3. IF uma conversa ou tarefa pertence a outra conta THEN system SHALL rejeitar a operação sem revelar os dados protegidos.
4. The system SHALL derive the Agent identity only from the authenticated session.

**Independent Test**: Criar duas contas em banco de memória, conversar com a primeira e tentar usar IDs da segunda; somente a primeira recebe dados e efeitos.

### P1: Tool Calling controlado ⭐ MVP

**User Story**: Como estudante, quero pedir consulta, criação, atualização e conclusão de tarefas, além de analytics, usando somente Tools registradas.

**Why P1**: As Tools são o comportamento funcional central observado no SOURCE.

**Acceptance Criteria**:

1. WHEN o Provider retorna uma Tool registrada com argumentos válidos THEN system SHALL validar, autorizar, executar a regra de domínio e devolver o resultado ao Provider.
2. IF o Provider retorna Tool desconhecida, argumentos extras, UUID inválido ou enum inválido THEN system SHALL rejeitar antes de consultar ou alterar o banco.
3. WHEN o Agent cria tarefa THEN system SHALL persistir `created_by=AGENT` e vincular `agent_execution_id` à auditoria.
4. The system SHALL stop Tool Calling after at most three Provider iterations.

**Independent Test**: Usar Provider mockado que solicita consulta, criação e chamada inválida; conferir resultado, banco e limite de iterações.

### P1: Resposta estruturada e UI segura ⭐ MVP

**User Story**: Como estudante, quero ver texto, análise, ação e gráficos seguros na interface existente.

**Why P1**: O SOURCE oferece contratos estruturados e o TARGET já tem `AgentView`.

**Acceptance Criteria**:

1. WHEN o Provider retorna `text`, `analysis` ou `action` válido THEN system SHALL validar o schema no backend antes de entregar o payload à UI.
2. IF o Provider retorna payload estruturado inválido THEN system SHALL registrar a falha e não encaminhar o payload inválido.
3. WHEN uma resposta contém gráfico THEN system SHALL renderizar somente dados declarados em `ChartSpecification` validada.
4. The system SHALL never execute SQL, JavaScript, HTML or arbitrary code from a user message or model response.

**Independent Test**: Exercitar os três contratos, gráfico inválido e mensagens de prompt injection com Provider mockado.

### P2: Resiliência e operação

**User Story**: Como operador, quero que falhas de Provider e banco resultem em respostas controladas e auditoria útil.

**Why P2**: Evita indisponibilidade silenciosa e vazamento de detalhes internos.

**Acceptance Criteria**:

1. WHEN uma chamada externa excede timeout ou falha transitoriamente THEN system SHALL aplicar retry finito e, quando configurado, fallback sem loop infinito.
2. IF Provider, schema, analytics ou banco falhar THEN system SHALL retornar código público controlado e registrar diagnóstico somente no servidor.
3. The system SHALL persist Tool audit states `PENDING`, `SUCCESS` or `FAILED` without secrets, passwords or tokens.

**Independent Test**: Injetar transporte que falha, expira e retorna payload inválido; conferir retry/fallback, status público e auditoria redigida.

## Edge Cases

- IF mensagem estiver vazia ou exceder o limite THEN system SHALL rejeitar com `400` sem criar mensagem.
- IF argumentos de Tool forem JSON inválido ou duplicarem uma execução THEN system SHALL rejeitar ou deduplicar antes do efeito de domínio.
- IF `conversationId` for inválido ou de outra conta THEN system SHALL responder `404`/`403` sem histórico.
- IF analytics não tiver sessões ou tarefas THEN system SHALL retornar métricas vazias válidas, sem erro de divisão ou acesso cruzado.
- IF o modelo pedir system prompt, API key, SQL, código arbitrário ou exclusão ampla THEN system SHALL executar nenhuma operação fora do registry e não revelar segredo.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AI-01 | P1: Chat autenticado e isolado | Design | Verified |
| AI-02 | P1: Chat autenticado e isolado | Design | Verified |
| AI-03 | P1: Tool Calling controlado | Design | Verified |
| AI-04 | P1: Tool Calling controlado | Design | Verified |
| AI-05 | P1: Tool Calling controlado | Design | Verified |
| AI-06 | P1: Resposta estruturada e UI segura | Design | Verified |
| AI-07 | P1: Resposta estruturada e UI segura | Design | Verified |
| AI-08 | P1: Resposta estruturada e UI segura | Design | Verified |
| AI-09 | P2: Resiliência e operação | Design | Verified |
| AI-10 | P2: Resiliência e operação | Design | Verified |

**Coverage**: 10 total, 10 mapped to tasks, 0 unmapped.

## Success Criteria

- [x] `Olá`, consulta de tarefas e criação/conclusão de tarefa funcionam com Provider mockado e sessão autenticada.
- [x] Tool desconhecida, argumentos inválidos, cross-user, conversation isolation e prompt injection não executam operação indevida.
- [x] Conversas, mensagens, Tool audit e `agent_execution_id` são persistidos sem secrets.
- [x] `npm test`, `npm run typecheck` e `npm run build` passam; `npm run lint` não introduz novos erros além do baseline documentado.
