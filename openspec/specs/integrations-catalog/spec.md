# integrations-catalog Specification

## Purpose

Documentar o catálogo frontend de integrações, sua busca, filtros, indicação de
disponibilidade e links oficiais sem tratar propostas como integrações ativas.

## Requirements

### Requirement: Catálogo explícito de integrações

O sistema MUST apresentar seis integrações catalogadas, com Google Classroom como
disponível e os demais itens como planejados, sem enviar credenciais ao cliente.

#### Scenario: catálogo inicial

- WHEN a pessoa abre `/integracoes`
- THEN o frontend MUST mostrar Google Classroom, Microsoft Teams for Education,
  Moodle, Canvas LMS, Notion e Google Agenda com seus estados atuais.

#### Scenario: integração planejada

- WHEN a pessoa seleciona uma integração planejada
- THEN a interface MUST mostrar recursos propostos e MUST NOT simular uma conexão
  funcional.

### Requirement: Busca e filtros

O catálogo MUST combinar busca normalizada por acentos, caixa e espaços com filtro
de categoria sem mutar a fonte de dados.

#### Scenario: busca normalizada

- WHEN a pessoa pesquisa termo com caixa, acento ou espaços externos diferentes
- THEN o frontend MUST retornar os itens correspondentes de forma equivalente.

#### Scenario: categoria e busca combinadas

- WHEN a pessoa usa busca e categoria ao mesmo tempo
- THEN o resultado MUST conter somente itens que atendam aos dois filtros.

### Requirement: Links e segurança de apresentação

Cada integração MUST apresentar link oficial HTTPS sem usuário, senha ou query
secreta, e a tela MUST funcionar nos temas e navegação responsiva existentes.

#### Scenario: link oficial

- WHEN um cartão de integração é renderizado
- THEN seu link MUST usar HTTPS e MUST estar livre de credenciais e parâmetros
  sensíveis.

#### Scenario: Classroom disponível

- WHEN Classroom é selecionado em conta autenticada
- THEN a interface MUST oferecer o fluxo real de conexão/sincronização, enquanto
  as propostas permanecem apenas informativas.

## Traceability

| Requirement | Implementation | Test |
| --- | --- | --- |
| Catálogo | `lib/integrations.ts:23`, `components/edutrack/integrations-view.tsx:1` | `tests/integrations.test.mjs:5` |
| Busca e filtro | `lib/integrations.ts:56` | `tests/integrations.test.mjs:12` |
| Links e apresentação | `lib/integrations.ts:23`, `app/integrations.css:1` | `tests/integrations.test.mjs:25` |
