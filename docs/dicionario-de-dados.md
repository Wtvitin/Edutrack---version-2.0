# Dicionário de dados incorporado

Origem: `Dicionario_de_Dados_EduTrack_AI_Moderno_tecnico.xlsx`, fornecido pelo usuário. O arquivo original não foi alterado. A versão legível por máquina está em `docs/data-dictionary.json`.

`database/001_core.sql` implementa as 12 entidades, enums, chaves e relações descritas na planilha. `database/002_accounts.sql` acrescenta os campos necessários à experiência atual: verificação de e-mail, preferências, versão de sincronização, sessões autenticadas, tokens, caixa local, leitura de notificações e detalhes do histórico.

O backend executa as migrações uma vez, registrando cada aplicação em `schema_migrations`. O banco fica em `.local/postgres` por padrão; nunca dentro do frontend e nunca versionado no Git. `DATABASE_URL` permite usar PostgreSQL convencional sem Docker.

Existência de tabela NÃO significa integração ativa. Na interface atual: relatórios são calculados sob demanda, alertas são internos, agente usa provedor configurado e Classroom permite importação manual após OAuth. Push e relatórios agendados permanecem previstos.

`database/006_classroom.sql` acrescenta quatro tabelas técnicas: `classroom_connections` (tokens cifrados e última sincronização), `classroom_oauth_states` (desafios de autorização de uso único), `classroom_course_links` e `classroom_task_links` (vínculos externos por conta para deduplicação). Essas extensões não alteram a planilha original. Os detalhes e contratos estão em `docs/integrar-classroom.md`.

`subject_id` é obrigatório para tarefas/sessões conforme a planilha. A disciplina protegida "Estudo livre" atende registros sem matéria específica. Relações compostas e validações do backend impedem referências entre contas.

Campos como professor, carga horária e período da disciplina estão no modelo, ainda sem formulário próprio. Datas e relatórios nesta etapa usam `America/Sao_Paulo`; a preferência de fuso existe no banco, mas ainda não tem interface de edição.
