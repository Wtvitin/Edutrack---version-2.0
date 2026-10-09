# Classroom Integration

## ADDED Requirements

### Requirement: Classroom implementado e somente leitura

O sistema MUST documentar OAuth por conta, state/PKCE, tokens cifrados, consulta
de turmas e importação manual transacional do Classroom sem alterar o código.

#### Scenario: reconciliação

- WHEN a sincronização encontra alterações pessoais locais
- THEN MUST preservar os campos locais e atualizar somente o baseline elegível.
