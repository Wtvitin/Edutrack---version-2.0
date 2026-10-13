# Validação de autenticação e envio de e-mail

Validação realizada em 13/10/2026, no ambiente local, usando Gmail SMTP.

## Escopo e resultado

Os fluxos foram executados pela API real em banco PostgreSQL descartável em memória.
Uma conta fictícia e senhas aleatórias foram utilizadas; a conta e os dados reais
do usuário não foram alterados. Três mensagens foram enviadas ao endereço
autorizado para o teste: cadastro, reenvio de confirmação e recuperação de senha.
O envio SMTP foi aceito; isso não confirma a chegada na caixa de entrada, que
precisa ser verificada pelo destinatário, incluindo a pasta de spam.

Verificações aprovadas:

- Cadastro gera uma mensagem de confirmação.
- Login é bloqueado antes da confirmação do endereço.
- Link de confirmação expirado é rejeitado.
- Reenvio gera um novo link e invalida o anterior.
- Confirmação válida funciona uma única vez.
- Login após confirmação cria uma sessão autenticada.
- Cadastro repetido e reenvio para conta já confirmada não geram nova confirmação.
- Recuperação gera uma mensagem com link para nova senha.
- Token de recuperação não pode ser usado para confirmar e-mail.
- Troca de senha permite login com a nova senha e rejeita a antiga.
- Troca de senha revoga a sessão anterior.
- Link de recuperação utilizado não pode ser reutilizado.
- Solicitações para endereço inexistente mantêm resposta genérica e não enviam mensagem.
- A caixa `/api/dev/mail` não fica disponível em modo SMTP.

Os dois testes automatizados de `tests/mail-delivery.test.mjs` também passaram,
cobrindo falha do transporte, reenvio de cadastro e expiração da confirmação.
Os links das três mensagens eram temporários, restritos ao banco de testes;
não devem ser utilizados para acessar uma conta real.

## Funcionalidades que utilizam e-mail

| Fluxo | Envia e-mail? |
| --- | --- |
| Cadastro de conta elegível | Sim, confirmação |
| Reenvio de confirmação de conta não confirmada | Sim |
| Recuperação de senha de conta existente | Sim |
| Login comum | Não |
| Notificações de tarefas | Não; são avisos dentro do aplicativo |
| Integração com Classroom | Não pelo serviço de e-mail do EduTrack |

Código numérico para acesso não está implementado. Os fluxos atuais utilizam
links de uso único: confirmação por 24 horas e recuperação por 30 minutos.

## Configuração em outro computador

Configure o `.env.local` da cópia do projeto que será executada:

```env
MAIL_MODE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=seu-remetente@gmail.com
SMTP_PASSWORD=SENHA_DE_APP_CONFIGURADA_SOMENTE_LOCALMENTE
MAIL_FROM="EduTrack AI <seu-remetente@gmail.com>"
```

Use uma senha de app da conta remetente; não utilize a senha normal do Gmail.
Não repita `MAIL_MODE` e preserve `APP_ORIGIN`, `PORT`, `UI_PORT` e as demais
configurações. Reinicie o backend após alterações. Os links utilizam
`APP_ORIGIN`: com localhost, abrem apenas na máquina onde o servidor é executado.
Para destinatários em outros dispositivos, é necessário um endereço acessível
e uma configuração de publicação segura.

Credenciais SMTP, JSON OAuth, chaves de criptografia, banco local e arquivos
`.env` não são enviados ao GitHub. Cada instalação precisa das próprias
configurações privadas. O teste real não deve ser repetido automaticamente
por CI, pois envia mensagens externas.
