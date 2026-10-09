# Notifications and History

## ADDED Requirements

### Requirement: lembretes e histórico documentados

O sistema MUST documentar notificações internas sob demanda, leitura e histórico
de mudanças de tarefas por conta.

#### Scenario: notificações desabilitadas

- WHEN a preferência está desabilitada
- THEN a API MUST retornar lista vazia e MUST NOT criar entregas.
