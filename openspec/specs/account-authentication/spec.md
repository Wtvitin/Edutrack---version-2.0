# account-authentication Specification

## Purpose

Documentar retroativamente o ciclo de conta do TARGET, incluindo autenticação,
verificação de e-mail, recuperação de senha, sessão, preferências e entrega de
mensagens transacionais.

## Requirements

### Requirement: Cadastro e verificação de conta

O sistema MUST aceitar cadastro com nome, e-mail normalizado e senha válida,
criar a disciplina protegida `Estudo livre` e enviar um token de verificação sem
expor se um e-mail já existe.

#### Scenario: cadastro novo

- WHEN uma pessoa envia dados válidos para `POST /api/auth/register`
- THEN o sistema MUST criar a conta, criar `Estudo livre` e disponibilizar um
  link de confirmação com validade de 24 horas.

#### Scenario: conta não verificada

- WHEN o e-mail já pertence a uma conta não verificada
- THEN o sistema MUST reenviar a confirmação e retornar uma mensagem genérica.

#### Scenario: confirmação de uso único

- WHEN `POST /api/auth/verify` recebe um token válido, não utilizado e dentro da
  validade
- THEN o sistema MUST marcar o e-mail como verificado e invalidar tokens
  anteriores do mesmo propósito.

### Requirement: Login, sessão e isolamento

O sistema MUST permitir login somente para conta verificada, criar sessão
server-side com cookie HttpOnly e derivar a identidade autenticada da sessão.

#### Scenario: login permitido

- WHEN uma conta verificada envia credenciais válidas
- THEN o sistema MUST criar uma sessão com validade de sete dias e responder com
  cookie `edutrack_session` sem expor o hash persistido.

#### Scenario: conta não verificada

- WHEN uma conta ainda não confirmou o e-mail
- THEN o sistema MUST rejeitar o login com `403` e orientar a confirmação.

#### Scenario: recurso protegido

- WHEN uma requisição sem sessão válida acessa dados de conta
- THEN o sistema MUST responder `401` e MUST NOT consultar dados como se houvesse
  um usuário autenticado.

### Requirement: Recuperação e revogação de acesso

O sistema MUST oferecer reenvio de confirmação e recuperação de senha por tokens
de uso único, com respostas públicas genéricas e revogação das sessões após
alteração de senha.

#### Scenario: solicitação de recuperação

- WHEN `POST /api/auth/request-reset` recebe um e-mail válido
- THEN o sistema MUST responder de forma genérica e, quando a conta for elegível,
  criar link de reset com validade de 30 minutos.

#### Scenario: senha alterada

- WHEN `POST /api/auth/reset` recebe um token de reset válido
- THEN o sistema MUST atualizar a senha, marcar o token como usado e revogar as
  sessões existentes da conta.

#### Scenario: token inválido, expirado ou usado

- WHEN um token não atende propósito, validade ou uso único
- THEN o sistema MUST rejeitar a operação sem modificar a conta.

### Requirement: Entrega de e-mail e diagnóstico seguro

O sistema MUST suportar os modos local, SMTP e Resend conforme configuração
server-side, MUST manter credenciais fora do cliente e MUST retornar erro público
controlado quando a entrega falhar.

#### Scenario: caixa local

- WHEN `MAIL_MODE=local` em ambiente local
- THEN o sistema MUST persistir mensagens em `development_mail` e disponibilizar
  a caixa de desenvolvimento somente nesse modo.

#### Scenario: transporte não configurado

- WHEN o modo de e-mail exige configuração ausente ou o provedor falha
- THEN o sistema MUST retornar `503` sem incluir senha, token, destinatário
  completo, stack trace ou credencial na mensagem pública.

### Requirement: Preferências de conta e demonstração

O sistema MUST persistir nome, meta, tema e preferência de notificações da conta,
e MUST manter o modo demonstração separado no navegador sem compartilhar dados
locais com a API.

#### Scenario: preferências autenticadas

- WHEN a pessoa altera tema, meta ou notificações na tela de configurações
- THEN o sistema MUST salvar as preferências no snapshot autenticado e aplicar
  tema `system`, `light` ou `dark`.

#### Scenario: modo demonstração

- WHEN a pessoa acessa a demonstração sem conta
- THEN o sistema MUST usar armazenamento local do navegador e MUST NOT enviar os
  registros da demonstração para o backend ou Provider.

## Traceability

| Requirement | Implementation | Test |
| --- | --- | --- |
| Cadastro e verificação | `server/api.mjs:79`, `server/api.mjs:100`, `database/002_accounts.sql:3` | `tests/accounts.test.mjs:16`, `tests/mail-delivery.test.mjs:77` |
| Login e sessão | `server/api.mjs:86`, `server/security.mjs:18`, `database/002_accounts.sql:17` | `tests/accounts.test.mjs:21`, `tests/agent-api.test.mjs:28` |
| Recuperação | `server/api.mjs:95`, `server/api.mjs:107` | `tests/accounts.test.mjs:47`, `tests/mail-delivery.test.mjs:84` |
| E-mail | `server/mail.mjs:15`, `server/api.mjs:75` | `tests/mail-delivery.test.mjs:24` |
| Preferências e demo | `server/data.mjs:65`, `components/edutrack/account-store.ts:19` | `tests/accounts.test.mjs:33`, `tests/study-experience.test.mjs:36` |
