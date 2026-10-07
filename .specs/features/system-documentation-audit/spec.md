# System Documentation Audit Specification

## Problem Statement

O código atual do EduTrack implementa capacidades além das especificações OpenSpec
canônicas existentes. A documentação precisa descrever retroativamente essas
capacidades sem transformar a auditoria em implementação ou alterar o sistema.

## Goals

- Inventariar capacidades funcionais e arquiteturais significativas.
- Comparar cada capacidade com OpenSpec, changes, TLC, documentação e testes.
- Criar somente specs faltantes ou parcialmente ausentes.
- Preservar código e conteúdo histórico, com `SPEC.md` apenas append-only.
- Registrar evidência, divergências e gaps restantes.

## Out of Scope

- Alterar código, banco, frontend, configuração runtime ou testes existentes.
- Criar requisitos para integrações planejadas que não estão implementadas.
- Criar specs individuais para funções, constantes, componentes triviais ou tabelas.
- Corrigir documentação histórica divergente nesta auditoria.

## Requirements

### AUDIT-01 - Discovery completo

WHEN a auditoria é executada, the audit SHALL inspect backend, frontend, banco,
integrações, configuração, testes, documentação, OpenSpec, TLC e histórico Git
quando necessário.

### AUDIT-02 - Cobertura sem duplicação

WHEN uma capacidade implementada é comparada com documentação existente, the audit
SHALL classify it as `DOCUMENTED`, `PARTIALLY_DOCUMENTED`, `UNDOCUMENTED`,
`OUTDATED` or `DUPLICATED` before creating a spec.

### AUDIT-03 - Spec retroativa verificável

WHEN a capacidade não possui cobertura adequada, the audit SHALL create a small
OpenSpec capability with observable requirements, scenarios and implementation/test
traceability grounded in current behavior.

### AUDIT-04 - Preservação histórica

WHEN `SPEC.md` is updated, the audit SHALL append only new sections and SHALL NOT
modify or remove any prior line.

### AUDIT-05 - TLC evidence

WHEN the documentation audit is closed, the audit SHALL record spec, design, tasks,
validation evidence and any unavailable validator in the TLC feature artifacts.

## Acceptance Criteria

1. WHEN the inventory is complete, the audit SHALL list all relevant frontend, API, database, authentication, academic, analytics, Agent, provider, integration and operational capabilities.
2. WHEN coverage is calculated, the audit SHALL provide one classification and one action for every inventoried capability.
3. WHEN new capabilities are documented, each spec SHALL contain implementation and test references for its requirements.
4. WHEN `SPEC.md` is checked with `git diff -- SPEC.md`, the diff SHALL contain only added lines.
5. WHEN available validation commands are run, the audit SHALL record their result or the concrete reason a validator could not run.
6. WHEN the final report is generated, it SHALL state totals, created specs, gaps, inconsistencies, evidence and final status.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
| --- | --- | --- |
| Source of truth | Current implementation and tests | The user explicitly requires retroactive documentation of behavior that exists today. |
| OpenSpec canonicalization | Add canonical specs and keep a documentation-only change | The repository keeps current specs under `openspec/specs/` and deltas under `openspec/changes/`. |
| TLC execution | Record artifacts and run available validators | Python/OpenSpec executables may not be installed in the current shell. |

Open questions: none.

## User Stories

### P1: Auditoria rastreável

As a maintainer, I want every significant implemented capability classified against
OpenSpec so that future changes do not repeat discovery work.

### P1: Documentação fiel

As a product owner, I want specs to describe current behavior without code changes
so that spec debt is reduced without introducing regressions.

## Requirement Traceability

| Requirement | Evidence | Result |
| --- | --- | --- |
| AUDIT-01 | `server/api.mjs:28`, `components/edutrack/app.tsx:42`, `database/001_core.sql:1`, `tests/accounts.test.mjs:1` | Discovery completed |
| AUDIT-02 | `openspec/specs/ai-agent-integration/spec.md:1`, `openspec/specs/ai-groq-provider/spec.md:1`, `OPENSPEC_COVERAGE_AUDIT_REPORT.md:1` | Coverage matrix completed |
| AUDIT-03 | `openspec/specs/account-authentication/spec.md:1`, `openspec/specs/classroom-integration/spec.md:1` | Seven capability specs added |
| AUDIT-04 | `SPEC.md` append-only diff | Prior content preserved |
| AUDIT-05 | `.specs/features/system-documentation-audit/design.md:1`, `.specs/features/system-documentation-audit/tasks.md:1`, `.specs/features/system-documentation-audit/validation.md:1` | TLC artifacts recorded |
