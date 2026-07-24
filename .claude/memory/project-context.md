---
name: project-context
description: Contexto operacional do WhatsApp Finance Bot v1.
metadata:
  type: project
---

WhatsApp Finance Bot é um bot local 24/7 para registrar gastos enviados em grupo de WhatsApp e gerar resumos financeiros simples. A v1 usa Node.js 22, TypeScript strict, ESM, Baileys e PostgreSQL (`whatsapp_bot`, schema `wpp_finance`).

**Why:** O projeto trata dados financeiros sensíveis e depende de WhatsApp via QR, PostgreSQL local e execução contínua na máquina do usuário; decisões futuras precisam preservar simplicidade, segurança e operação local.

**How to apply:** Ao propor mudanças, priorizar fluxo pequeno e verificável: parser/handler fino, regra em service, acesso a dados em repository, validação com `npm run lint` e `npm run build`, e cuidado para não processar grupos fora do `ALLOWED_GROUP_ID`.
