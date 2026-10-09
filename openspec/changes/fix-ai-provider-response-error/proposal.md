# Corrigir erro de resposta do provider

## Problema

Uma conta autenticada que pergunta `Quais são minhas tarefas?` recebe HTTP 503 e
`O Provider não conseguiu responder.`. A mensagem pública mascara a etapa exata
da falha.

## Diagnóstico confirmado

O Groq respondeu à primeira chamada com Tool Call, mas rejeitou a segunda
requisição por três incompatibilidades no boundary OpenAI-compatível:

1. o Orchestrator mantém Tool Calls em contrato interno `{id,name,arguments}`;
   o Groq exige `type=function` e `function={name,arguments}` na mensagem
   `assistant` subsequente;
2. o modelo pode emitir `status: null` para o filtro opcional de `list_tasks`,
   mas o schema enviado ao Groq aceitava somente string;
3. o schema de resposta analítica contém objetos dinâmicos com
   `additionalProperties: true`, rejeitados pelo modo `json_schema` estrito do
   endpoint Groq.

O erro não foi causado por ausência de chave, seleção Gemini, autenticação ou
falha do Tool Registry.

## Solução

- normalizar Tool Calls somente no adapter Groq, sem alterar o contrato interno;
- representar o filtro opcional de `list_tasks` como nullable no boundary Groq e
  tratar `null` como ausência de filtro no schema backend;
- usar `response_format=json_object` no Groq quando o contrato contém objetos
  dinâmicos, acrescentando a instrução do schema e mantendo a validação Zod do
  backend como autoridade final.

## Não objetivos

- não alterar Gemini, OpenRouter, Orchestrator, Tool Registry, auth, ownership,
  persistência, auditoria ou frontend;
- não adicionar fallback entre providers;
- não registrar ou incluir credenciais.
