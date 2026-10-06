# Tasks

## 1. Runtime

- [x] 1.1 Ativar `--use-system-ca` nos scripts `dev` e `start` e alinhar a versão mínima de Node.
- [x] 1.2 Adicionar teste que impeça regressão para TLS desabilitado ou startup sem a flag.

## 2. Diagnóstico seguro

- [x] 2.1 Preservar o status HTTP upstream nos erros do adapter.
- [x] 2.2 Registrar falhas do provider no boundary da API sem expor segredos.

## 3. Verificação

- [x] 3.1 Executar teste direto Gemini com e sem `--use-system-ca` e registrar somente diagnóstico sanitizado.
- [x] 3.2 Executar testes, typecheck, lint, build, OpenSpec e TLC; atualizar o relatório final.
