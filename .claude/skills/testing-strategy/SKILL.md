---
name: testing-strategy
description: Use para decidir cobertura de testes, unit/integration/e2e, mocks, fixtures, smoke tests, CI gates e validação manual.
---

# Testing Strategy Skill

## Pirâmide

```text
E2E/Smoke       poucos, fluxos críticos reais
Integration     DB/API/filesystem/serviços reais ou fakes fortes
Unit            regra pura e edge cases
```

## Princípios

- Testar comportamento observável.
- Mockar dependências externas, não lógica interna.
- Cada bug corrigido deve ter teste quando viável.
- Testes devem ser determinísticos.
- Build passar não substitui teste manual de UI.

## Quando usar cada tipo

### Unit

- Validação
- Cálculos
- Parsers
- Mappers críticos
- Regras sem I/O

### Integration

- Repositórios
- Controllers/API
- Migrations
- Filesystem
- Integrações com fake/local service

### E2E/Smoke

- Login
- Fluxo principal do produto
- Feature visual crítica
- Deploy health check

## Mocks

- Mock bom: simula gateway externo, relógio, filesystem, API de terceiro.
- Mock ruim: simula classe interna que contém a regra que queremos testar.

## Checklist

- [ ] Fluxo feliz
- [ ] Erros principais
- [ ] Edge cases
- [ ] Validação de segurança
- [ ] Idempotência/retry se existir
- [ ] Teste manual de UI se houver frontend
- [ ] Comandos de validação documentados

## Nomes de teste

Preferir padrão legível:

```text
Metodo_Cenario_Resultado
```

Exemplo:

```text
TryNormalize_SegmentoParent_Rejeita
```
