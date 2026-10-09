# Gemini Study Comparison Error Specification

## Problem Statement

O navegador apresentava fallback genérico ao continuar uma conversa do Agent
com uma comparação das duas últimas semanas. A investigação encontrou uma
instância local antiga em `4173` e um gap de persistência do
`thoughtSignature` Gemini.

## Goals

- Reproduzir o caminho real UI/API/Orchestrator/Provider/Tool/segunda chamada.
- Diferenciar falha de runtime antigo, execução da Tool e comunicação com Gemini.
- Preservar metadados conhecidos necessários para reconstruir Tool Calls Gemini.
- Manter Gemini, Groq, autenticação, autorização, ownership, auditoria e
  Structured Output.

## Out of Scope

- Alterar analytics, `get_study_trends`, banco, frontend ou Tool Registry.
- Adicionar fallback entre providers ou OpenRouter.
- Remover validações de schema ou aceitar campos arbitrários.

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Processo usado pelo navegador | `4173` reiniciado a partir do código atual | A instância antiga retornava 503 até para `Olá` | y |
| Metadado Gemini persistido | Preservar somente `thoughtSignature` conhecido | O provider pode exigir o campo ao reconstruir Tool Calls | y |
| Provider fallback | Nenhum | Seleção explícita mantém diagnóstico e auditoria determinísticos | y |

**Open questions:** none - all resolved or logged above.

## User Stories

### P1: Retomar comparação acadêmica ⭐ MVP

**User Story**: As a estudante autenticada, I want to continuar uma conversa do
Agent após uma Tool de analytics so that eu receba a comparação das duas últimas
semanas na mesma tela.

**Why P1**: É o fluxo funcional reportado e precisa chegar ao usuário sem o
fallback genérico.

**Acceptance Criteria**:

1. WHEN uma conversa é retomada após uma Tool Call Gemini THEN o sistema SHALL
   reconstruir `id` e `thoughtSignature` quando esses campos existirem.
2. WHEN `get_study_trends` retorna `0` e `105` minutos THEN o sistema SHALL
   responder HTTP 200 com análise validada e gráfico autorizado.
3. IF o processo local usado pelo navegador estiver antigo THEN o sistema SHALL
   ser reiniciado antes da validação E2E, sem mascarar o erro no frontend.

**Independent Test**: executar login, salvar uma sessão de 105 minutos na
semana anterior e enviar as duas mensagens pela API autenticada.

## Requirements

### GSC-01 - Tool Call persistida

WHEN Gemini returns `id` or `thoughtSignature` in a Tool Call, the Orchestrator
SHALL persist those known fields and the next request SHALL reconstruct them.

### GSC-02 - Fluxo de comparação

WHEN `get_study_trends` returns the study comparison, the Agent SHALL complete a
validated final response through the same Orchestrator and Tool Registry.

### GSC-03 - Provider determinístico

WHEN `LLM_PROVIDER=google-gemini`, the system SHALL use Gemini only and SHALL NOT
fallback automatically to Groq or OpenRouter.

## Edge Cases

- IF `thoughtSignature` não for fornecido THEN o sistema SHALL manter o contrato
  anterior sem criar um campo artificial.
- IF Gemini falhar THEN o sistema SHALL retornar erro controlado e SHALL NOT
  trocar silenciosamente de provider.
- IF a Tool falhar THEN o sistema SHALL manter autorização, ownership e
  auditoria existentes.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| GSC-01 | P1: Retomar comparação acadêmica | Execute | Verified |
| GSC-02 | P1: Retomar comparação acadêmica | Verify | Verified |
| GSC-03 | P1: Retomar comparação acadêmica | Verify | Verified |

**Coverage:** 3 total, 3 mapped to tasks, 0 unmapped.

## Success Criteria

- [x] O fluxo autenticado de desempenho seguido de comparação retorna HTTP 200.
- [x] A resposta contém `minutes=0`, `previousMinutes=105` e gráfico com fonte
  `get_study_trends`.
- [x] O teste de retomada preserva `thoughtSignature` sem enfraquecer validação.
