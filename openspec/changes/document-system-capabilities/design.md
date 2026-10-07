# Design

## Estratégia

Esta é uma change documental retroativa. Cada capacidade significativa recebe uma
especificação pequena e independente, com requisitos observáveis e cenários
baseados no comportamento encontrado no código e nos testes.

## Organização

| Capacidade | Especificação |
| --- | --- |
| Conta e e-mail | `account-authentication` |
| Workspace acadêmico | `academic-study-management` |
| Analytics e relatórios | `analytics-reports` |
| Classroom | `classroom-integration` |
| Notificações e histórico | `notifications-history` |
| Catálogo de integrações | `integrations-catalog` |
| Runtime operacional | `runtime-operations` |

As especificações canônicas em `openspec/specs/` terão o mesmo contrato atual,
enquanto os deltas desta change registram apenas capacidades adicionadas à
cobertura documental.

## Fontes de verdade

1. comportamento atual do código;
2. testes automatizados;
3. migrações e schema;
4. documentação operacional existente;
5. histórico Git, somente para contexto de evolução.

Quando fontes divergem, a implementação atual prevalece e a divergência é
registrada no relatório.

## Não alteração de comportamento

Nenhum requisito desta change autoriza mudança em runtime. A fase de execução é
somente documental; o status de implementação é retroativo e deve apontar para a
implementação já existente.

## Rastreabilidade

Cada spec inclui uma tabela de requisito → implementação → teste. O relatório
`OPENSPEC_COVERAGE_AUDIT_REPORT.md` consolida a matriz de cobertura e os gaps.
