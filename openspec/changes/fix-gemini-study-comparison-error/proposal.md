# Corrigir erro de comparação de semanas no Gemini

## Problema

O fluxo autenticado do Assistente apresentava `Não consegui concluir agora.` e
`O Provider não conseguiu responder.` ao continuar uma conversa com a pergunta
`faça uma comparação entre as minhas duas últimas semanas de estudo`.

## Diagnóstico confirmado

A instância local que estava sendo usada pelo navegador na porta `4173` era um
processo antigo do EduTrack. Antes do reinício, ela retornava HTTP 503 até para
uma mensagem simples (`Olá`). Depois de encerrada e iniciada a partir do código
atual com `LLM_PROVIDER=google-gemini`, o mesmo fluxo autenticado retornou HTTP
200 para desempenho e para a comparação com `0` minutos na semana atual e
`105` minutos na semana anterior.

Durante o trace também foi confirmado um gap de continuidade: o Orchestrator
persistia a Tool Call Gemini sem `thoughtSignature`, embora esse campo fosse
preservado em memória durante o segundo round da mesma requisição. Se o Gemini
exigir esse campo ao reconstruir uma conversa em uma requisição posterior, a
continuação poderia falhar mesmo com a Tool executada corretamente.

## Solução

- reiniciar a instância local usada pelo navegador a partir do código atual;
- preservar `thoughtSignature` na mensagem de Tool Call persistida;
- adicionar regressão fiel com `id`, `thoughtSignature`, `functionCall`, Tool
  Result, retomada por `conversationId` e segunda chamada ao provider;
- manter o mesmo AgentOrchestrator, Provider Layer, Gemini, Groq, Tool Registry,
  validação, autorização, ownership, auditoria e ausência de fallback.

## Non-goals

- Não alterar `get_study_trends`, AnalyticsService, banco ou frontend.
- Não reimplementar o AgentOrchestrator.
- Não adicionar fallback Gemini/Groq/OpenRouter.
- Não remover validação de Tool Calls ou Structured Output.
- Não alterar o `SPEC.md` principal, pois nenhuma capacidade nova foi criada.

## Impacto

- **Runtime local:** a porta `4173` precisa ser servida pelo processo iniciado
  com o código atual e com o provider explicitamente configurado.
- **Histórico Gemini:** Tool Calls persistidas mantêm somente o campo adicional
  conhecido e necessário para reconstrução do contrato Gemini.
- **Segurança:** `userId`, ownership, autorização, auditoria e schemas não são
  alterados.
