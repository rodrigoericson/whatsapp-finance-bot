---
name: decisions
description: Decisões técnicas e de produto importantes do WhatsApp Finance Bot.
metadata:
  type: project
---

## Parser sem LLM na v1

A v1 deve interpretar comandos e frases naturais simples com heurísticas/regex, sem chamar LLM.

**Why:** O bot roda localmente, precisa ser simples, previsível, barato e seguro para dados financeiros sensíveis.

**How to apply:** Ao melhorar parsing, preferir regex/normalização/testes unitários; só discutir LLM se houver decisão explícita de produto para versão futura.

## Escuta centralizada por grupo permitido

O bot deve processar mensagens apenas no grupo autorizado quando `ALLOWED_GROUP_ID` estiver configurado.

**Why:** Um teste em outro grupo mostrou que comandos como `!ajuda` podem responder fora do contexto desejado se o filtro estiver ausente ou mal configurado.

**How to apply:** Antes de mexer em handlers do WhatsApp, verificar se o `chatId` é comparado com `ALLOWED_GROUP_ID` antes de qualquer parser/comando; tratar ausência da variável como decisão consciente de permitir todos os grupos.

## Idempotência por mensagem do WhatsApp

`nr_mensagem_wa_id` deve impedir lançamento financeiro duplicado quando o Baileys reenviar mensagens após reconexão.

**Why:** Reenvios e retries do WhatsApp/Baileys podem ocorrer e não podem duplicar gastos.

**How to apply:** Em mudanças de registro de gasto, manter chave/idempotência baseada no ID da mensagem WhatsApp e validar isso em testes/repositório.
