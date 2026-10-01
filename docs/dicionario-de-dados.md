# Dicionário de dados incorporado

Origem: `Dicionario_de_Dados_EduTrack_AI_Moderno_tecnico.xlsx`, fornecido pelo usuário. O arquivo original não foi alterado. A versão legível por máquina está em `docs/data-dictionary.json`.

`database/001_core.sql` implementa as 12 entidades, enums, chaves e relações descritas na planilha. `database/002_accounts.sql` acrescenta os campos necessários à experiência atual: verificação de e-mail, preferências, versão de sincronização, sessões autenticadas, tokens, caixa local, leitura de notificações e detalhes do histórico.

O backend executa as migrações uma vez, registrando cada aplicação em `schema_migrations`. O banco fica em `.local/postgres` por padrão; nunca dentro do frontend e nunca versionado no Git. `DATABASE_URL` permite usar PostgreSQL convencional sem Docker.

As áreas de IA, push e relatórios persistidos têm tabelas previstas, mas existência da tabela NÃO significa integração ativa. Na interface atual: relatórios são calculados sob demanda; alertas são internos ao aplicativo; IA e Classroom não estão conectados.

`subject_id` é obrigatório para tarefas/sessões conforme a planilha. A disciplina protegida "Estudo livre" atende registros sem matéria específica. Relações compostas e validações do backend impedem referências entre contas.

Campos como professor, carga horária e período da disciplina estão no modelo, ainda sem formulário próprio. Datas e relatórios nesta etapa usam `America/Sao_Paulo`; a preferência de fuso existe no banco, mas ainda não tem interface de edição.
