# Gemini Study Comparison Error Design

**Spec**: `.specs/features/gemini-study-comparison-error/spec.md`
**Status**: Approved

## Boundary

```text
Persisted conversation
        |
  parseStoredMessage
        |
  geminiMessages
        |
     Gemini
```

O Orchestrator continua sendo único. A correção somente preserva o metadado
Gemini conhecido no registro persistido da Tool Call. O adapter continua
convertendo o histórico interno para `model.parts.functionCall` e
`user.parts.functionResponse`.

## Error separation

O relatório separa:

1. runtime antigo em `4173`, que retornava 503 antes do reinício;
2. execução de `get_study_trends`, que retornou `0/105` corretamente;
3. resposta final, que foi validada e entregue com HTTP 200 depois do reinício.

## Security

Somente `id`, `name`, `arguments` e `thoughtSignature` são persistidos para a
Tool Call. O modelo não escolhe `userId`; a autorização segue o usuário da
sessão e o backend continua validando o resultado.
