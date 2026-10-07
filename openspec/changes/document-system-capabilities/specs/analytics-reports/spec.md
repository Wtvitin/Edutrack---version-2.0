# Analytics and Reports

## ADDED Requirements

### Requirement: relatórios acadêmicos documentados

O sistema MUST documentar períodos autorizados, cálculos determinísticos,
pipeline Python/Pandas minimizado e exportação/visualização já implementados.

#### Scenario: falha do pipeline

- WHEN Python/Pandas não responde
- THEN a API MUST retornar erro controlado sem fallback silencioso para IA.
