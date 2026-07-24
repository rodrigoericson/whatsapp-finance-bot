---
name: architecture
description: Use para decisões de arquitetura, camadas, boundaries, componentes, integrações externas, trade-offs técnicos e onde cada código deve viver.
---

# Architecture Skill

Use esta skill quando a tarefa envolver desenho ou mudança estrutural.

## Quando acionar

- Nova feature com impacto em mais de uma camada.
- Escolha entre abordagens técnicas.
- Integração com sistema externo.
- Refatoração de responsabilidades.
- Definição de boundaries, services, repositories, workers, APIs ou UI.

## Princípios

1. **Separação de responsabilidades** — cada camada tem um motivo claro para existir.
2. **Dependências apontam para dentro** — domínio/core não depende de UI/API/infra.
3. **Controllers/handlers finos** — recebem request, validam fronteira e delegam.
4. **Serviços com comportamento real** — não criar service sem regra ou coordenação.
5. **Configuração tipada** — evitar strings mágicas espalhadas.
6. **Continue-on-error quando apropriado** — serviços auxiliares não derrubam fluxo principal.
7. **Incremental antes de big-bang** — cada bloco deve compilar e ser validável.

## Perguntas de design

- O que é regra de negócio?
- O que é infraestrutura?
- Quem possui este dado/comportamento?
- Onde ficam validação, transação, retry e logs?
- O que precisa ser síncrono e o que pode ser assíncrono?
- Qual é o menor design que resolve o problema atual?

## Formato de recomendação

Ao propor arquitetura, responder com:

```text
Contexto
Decisão recomendada
Arquivos/camadas afetados
Alternativas consideradas
Riscos
Plano incremental
Validação
```

## Anti-patterns

- Criar abstração para um único uso hipotético.
- Misturar DTO de API com entidade de banco.
- Colocar regra de negócio em controller ou componente visual.
- Introduzir framework grande para problema pequeno.
- Mudar arquitetura e feature no mesmo commit sem necessidade.
