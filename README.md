# EduTrack AI

Primeira versão do frontend para organização acadêmica. Interface em português, responsiva e navegável, com uma demonstração local funcional.

## Executar

Pré-requisito: Node.js 22.13 ou superior.

```sh
npm ci
npm run dev
```

Abra `http://localhost:5173`. O painel é a página inicial; o site de apresentação fica em `/inicio`.

Neste ambiente Windows, caso o atalho `npm` esteja com resolução incorreta, o servidor também pode ser iniciado com `node scripts/run-framework.mjs dev`, depois da instalação das dependências.

```sh
npm run build
node node_modules/typescript/bin/tsc --noEmit
node --test tests/analytics.test.mjs
```

O servidor usa React 19, TypeScript e Vinext/Vite, com rotas compatíveis com a organização App Router. Os componentes acessíveis são compostos a partir de Radix/Shadcn e os ícones são Lucide. As fontes são DM Sans e Space Grotesk, com fallback local.

## O que já funciona

- Dashboard com métricas derivadas dos registros da demonstração.
- Criar, editar, concluir, reabrir, filtrar e remover tarefas, com desfazer na remoção.
- Cadastro de disciplinas, visualização de detalhes e tarefas relacionadas.
- Calendário mensal, seleção de dia e criação de tarefa com prazo preenchido.
- Cronômetro com pausa/continuação, persistente entre páginas, e registro manual de estudos.
- Progresso por dia e disciplina, edição do perfil e exportação dos dados em JSON.
- Site de apresentação, primeiros passos, ajuda e informações de privacidade.
- Telas de login, cadastro, recuperação, nova senha e verificação de e-mail, explicitamente identificadas como prévias.
- Layout móvel, menu acessível, navegação inferior, foco de teclado e movimento reduzido.

## Limites desta entrega

Não há conta real, autenticação, envio de e-mail, PostgreSQL, Pandas ou chamada a modelo de IA nesta versão. Nenhum formulário afirma executar essas integrações. A página do agente é uma prévia; seus resumos são calculados localmente, não gerados por IA.

Os dados são guardados apenas no navegador nas chaves `edutrack-demo-v1` e `edutrack-timer-v1`. Essa persistência serve exclusivamente à demonstração, sem sincronização ou garantia de durabilidade. As senhas dos formulários não são guardadas. Use dados fictícios para testar.

## Organização do código

- `app/page.tsx`: entrada do painel.
- `app/[...slug]/page.tsx`: rotas e validação de caminhos.
- `components/edutrack/app.tsx`: composição do aplicativo, navegação e estado local.
- `components/edutrack/views.tsx`: telas de tarefas, disciplinas, calendário, sessões, progresso, perfil e configurações.
- `components/edutrack/forms.tsx`: formulários e modais.
- `components/edutrack/public-pages.tsx`: apresentação, acesso e primeiros passos.
- `app/globals.css`: identidade visual, componentes e adaptação de telas.
- `lib/edutrack.ts`: tipos, exemplos e cálculos determinísticos da demonstração.
- `lib/edutrack-schema.ts`: validação do armazenamento local.
- `docs/arquitetura.md`: fronteiras e sequência da implementação de backend.
- `tests/analytics.test.mjs`: verificações dos cálculos locais.

Os arquivos de infraestrutura Cloudflare/Sites vieram do starter. D1 e R2 permanecem desativados e não substituem o PostgreSQL previsto para o produto. O projeto ainda não foi publicado.

## Próxima etapa

Implementar a API e a autenticação conforme `docs/arquitetura.md`. Na versão real, o estado local de demonstração deve ser substituído por chamadas à API autorizadas por usuário. Credenciais e conexões de banco pertencem exclusivamente ao servidor.
