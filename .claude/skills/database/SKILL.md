---
name: database
description: Use para schema, migrations, entidades, repositórios, queries, índices, transações, idempotência e consistência de dados.
---

# Database Skill

## Princípios

- Banco guarda invariantes importantes, não só dados.
- Migrations devem ser pequenas, revisáveis e reversíveis.
- Nullability deve respeitar dados existentes.
- Índices seguem queries reais, não suposições vagas.
- Repositórios/queries devem evitar N+1 e carregar só o necessário.

## Checklist de migration

- [ ] Nome claro da migration
- [ ] `Up` e `Down` revisados
- [ ] Colunas novas em tabelas existentes são nullable ou têm default seguro
- [ ] FK com comportamento de delete definido
- [ ] Índices para filtros/joins frequentes
- [ ] Dados existentes não quebram
- [ ] Script SQL revisado quando risco alto

## Convenções sugeridas

Projetos podem definir suas próprias, mas um padrão robusto é:

```text
tbl_        prefixo de tabela
cn_         chave numérica / id interno
nm_         nome/label
ds_         descrição/string longa
fl_         boolean
id_         status/tipo/código
nr_         número/tamanho
qt_         quantidade
dt_         data/hora
```

## Query patterns

- Usar projeção (`Select`) para DTOs de leitura.
- Usar eager loading (`Include`) só quando necessário.
- Considerar split query para múltiplas coleções.
- Usar paginação em endpoints listagem.
- Evitar lazy loading em APIs.

## Idempotência

Quando uma operação externa pode repetir:

- Definir chave natural ou chave de idempotência.
- Registrar estado antes/depois conforme risco.
- Garantir que retry não duplica efeito.

## Testes

- Unitários para regras puras.
- Integração com provider real ou in-memory conforme risco.
- Atenção: providers in-memory podem não suportar operações SQL específicas.
