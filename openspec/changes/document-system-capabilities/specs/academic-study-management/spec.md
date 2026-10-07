# Academic Study Management

## ADDED Requirements

### Requirement: workspace acadêmico documentado

O sistema MUST documentar o snapshot autorizado, revisão otimista, disciplinas,
tarefas, sessões, histórico, planejamento, calendário e modo demonstração já
implementados.

#### Scenario: alteração concorrente

- WHEN o snapshot usa revisão obsoleta
- THEN a API MUST rejeitar a gravação sem sobrescrever dados.
