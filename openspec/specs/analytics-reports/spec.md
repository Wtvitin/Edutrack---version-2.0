# analytics-reports Specification

## Purpose

Documentar os relatórios acadêmicos calculados sob demanda, a fronteira segura
com Python/Pandas e a apresentação/exportação dos resultados no frontend.

## Requirements

### Requirement: Relatório autorizado por período e disciplina

O sistema MUST expor `GET /api/analytics` somente para conta autenticada e MUST
aceitar apenas períodos de 7, 30 ou 90 dias e disciplina `all` ou pertencente à
conta.

#### Scenario: consulta válida

- WHEN uma conta solicita período permitido e disciplina autorizada
- THEN a API MUST retornar métricas preparadas para o intervalo e filtro
  informados.

#### Scenario: filtro inválido ou alheio

- WHEN o período não é 7, 30 ou 90, o UUID é inválido ou a disciplina não pertence
  à conta
- THEN o sistema MUST rejeitar a requisição com erro controlado.

### Requirement: Cálculos determinísticos

O pipeline MUST calcular minutos atuais e anteriores, variação, dias ativos,
sessões, média, conclusões, pendências, atrasos, urgências, estimativas,
prioridades, série diária e distribuição por disciplina usando o dia local de
`America/Sao_Paulo`.

#### Scenario: comparação de período

- WHEN o período solicitado possui dados atuais e anteriores
- THEN o resultado MUST comparar os N dias atuais com os N dias imediatamente
  anteriores e MUST manter datas futuras fora da janela.

#### Scenario: ausência de sessões

- WHEN não há sessões na janela
- THEN o resultado MUST retornar dias e minutos zerados, sem dividir por zero.

### Requirement: Fronteira minimizada com Python

O backend MUST enviar ao processo Python somente sujeitos, sessões e campos de
tarefa necessários, MUST manter o banco fora do processo e MUST limitar tempo e
tamanho da resposta.

#### Scenario: pipeline disponível

- WHEN Python/Pandas processa o snapshot minimizado
- THEN a API MUST validar o JSON retornado e entregar as métricas ao frontend.

#### Scenario: pipeline indisponível

- WHEN o processo falha, excede o tempo ou retorna conteúdo inválido
- THEN a API MUST responder `503` e MUST NOT substituir silenciosamente o cálculo
  por uma chamada de IA.

### Requirement: Relatório interativo e exportação

O frontend MUST oferecer filtros de período e disciplina, comparação, detalhes
por disciplina/dia, gráficos nativos, exportação CSV e impressão pelo navegador.

#### Scenario: conta com relatório

- WHEN a pessoa abre progresso ou relatórios em uma conta
- THEN a interface MUST buscar métricas autorizadas e exibir estados de
  carregamento, erro e vazio.

#### Scenario: exportação segura

- WHEN a pessoa exporta o relatório
- THEN o frontend MUST gerar CSV com células escapadas e neutralização de fórmulas,
  sem incluir senha ou token.

#### Scenario: demonstração

- WHEN a pessoa consulta relatórios sem conta
- THEN a interface MUST calcular o exemplo localmente sem chamar Python ou IA.

## Traceability

| Requirement | Implementation | Test |
| --- | --- | --- |
| Período e autorização | `server/api.mjs:122`, `server/api.mjs:127` | `tests/analytics.test.mjs:11` |
| Cálculos | `analytics/prepare.py:12`, `lib/study-planning.ts:41` | `tests/analytics.test.mjs:5`, `tests/study-experience.test.mjs:27` |
| Python minimizado | `server/report-analytics.mjs:5`, `server/report-analytics.mjs:17` | `tests/study-experience.test.mjs:41`, `tests/study-experience.test.mjs:48` |
| UI e exportação | `components/edutrack/report-panel.tsx:14`, `components/edutrack/report-panel.tsx:30` | `tests/study-experience.test.mjs:32` |
