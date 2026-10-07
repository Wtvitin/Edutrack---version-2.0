# Runtime Operations

## ADDED Requirements

### Requirement: operação e configuração documentadas

O sistema MUST documentar startup, modos local/produção, banco, migrations,
health check, fronteira same-origin e proxy já implementados.

#### Scenario: produção incompleta

- WHEN falta HTTPS, banco externo ou e-mail real em modo não local
- THEN o startup MUST falhar antes de aceitar tráfego.
