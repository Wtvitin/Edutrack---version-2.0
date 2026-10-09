# Tasks

## 1. Discovery

### T1: Inventariar o sistema

**Depends on**: None
**Tests**: `tests/*.test.mjs`, `analytics/test_prepare.py`
**Gate**: evidence review

- [x] Auditar rotas, serviços, componentes, schema, migrations, integrações,
  configuração, scripts e documentação.
- [x] Consultar testes e histórico Git como fontes auxiliares.

## 2. Coverage

### T2: Comparar implementação com specs

**Depends on**: T1
**Tests**: OpenSpec inventory and matrix review
**Gate**: no duplicated capability decision

- [x] Ler specs canônicas, changes, arquivos arquivados e features TLC.
- [x] Classificar capacidades e separar Agent/Gemini/Groq já cobertos dos gaps.

## 3. Documentation

### T3: Criar specs retroativas

**Depends on**: T2
**Tests**: `file:line` traceability review
**Gate**: canonical spec review

- [x] Criar sete specs canônicas para capacidades sem cobertura adequada.
- [x] Criar deltas OpenSpec correspondentes na change documental.
- [x] Canonicalizar a spec Groq já implementada sem duplicar o Agent.

## 4. Validation

### T4: Fechar auditoria e preservar histórico

**Depends on**: T3
**Tests**: `git diff -- SPEC.md`, available validators
**Gate**: final audit report

- [x] Acrescentar seção auditável ao `SPEC.md` sem alterar linhas existentes.
- [x] Registrar validações, indisponibilidades e inconsistências.
- [x] Gerar `OPENSPEC_COVERAGE_AUDIT_REPORT.md` e revisar gaps restantes.

## Test Coverage Matrix

| Requirement | Evidence | Gate |
| --- | --- | --- |
| AUDIT-01 | Inventory sections in final report | evidence review |
| AUDIT-02 | Coverage table in final report | matrix review |
| AUDIT-03 | Seven canonical specs and deltas | spec review |
| AUDIT-04 | SPEC diff | append-only check |
| AUDIT-05 | validation.md and command log | final report |

## Execution Plan

```text
T1 -> T2 -> T3 -> T4
```
