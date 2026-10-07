# Documentar capacidades do sistema

## Problema

O TARGET possui autenticação, experiência acadêmica, analytics, notificações,
integração Classroom, catálogo de integrações e runtime operacional implementados,
mas o OpenSpec canônico descreve principalmente o Agent e seus providers. A
implementação atual, os testes e a documentação operacional ficaram à frente da
cobertura OpenSpec.

## Estado atual

- O comportamento está implementado em `server/`, `components/`, `lib/`,
  `analytics/` e `database/`.
- Os testes em `tests/` cobrem os fluxos principais e servem como evidência
  retroativa.
- O OpenSpec principal contém as capacidades do Agent/Gemini; Groq possui uma
  change própria já concluída, mas ainda não há uma especificação canônica
  dedicada.

## Estado desejado

Adicionar especificações retroativas, precisas e não prescritivas para as
capacidades que já existem, mantendo o código e o comportamento inalterados.
Sincronizar também a especificação canônica do Groq a partir da change existente.

## Escopo

- ciclo de conta, autenticação, verificação, recuperação e entrega de e-mail;
- workspace acadêmico, snapshot, tarefas, sessões, calendário, demo e temas;
- analytics, relatórios, exportação e visualização;
- notificações internas e histórico de tarefas;
- OAuth e importação manual do Google Classroom;
- catálogo frontend de integrações;
- runtime, configuração, health check, banco e fronteiras operacionais.

## Fora de escopo

- alterar código, banco, APIs, frontend ou comportamento;
- documentar como implementadas integrações apenas planejadas;
- criar uma spec para cada tabela, componente ou função auxiliar;
- reescrever `SPEC.md`, `context.md`, `README.md` ou `IMPLEMENTATION.md`.

## Evidência

As specs serão rastreadas para arquivos e testes existentes. Divergências entre
implementação e documentação histórica serão registradas no relatório, não
corrigidas nesta change.
