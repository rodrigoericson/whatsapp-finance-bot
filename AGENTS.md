# AGENTS.md — WhatsApp Finance Bot

Instruções para qualquer agente de código trabalhar neste projeto.

## Contexto rápido

- Bot gratuito de WhatsApp para registrar gastos em grupos
- Stack: Node.js 22 + TypeScript + Baileys + PostgreSQL
- Banco local: `postgres-lab` no Docker, database `whatsapp_bot`, schema `wpp_finance`
- Projeto fora do STA: `F:\Git\whatsapp-finance-bot`

## Como rodar

```bash
npm install
cp .env.example .env
npm run migrate
npm run dev
```

Na primeira execução, escaneie o QR no terminal com o WhatsApp.

## Comandos do bot

- `!gasto 50 almoço pix`
- `gastei 50 no almoço pix`
- `!resumo`
- `!resumo hoje`
- `!quem-deve`
- `!desfazer`

## Convenções

### TypeScript
- Strict mode obrigatório
- ESM (`type: module`)
- Target ES2023
- npm como package manager
- `oxlint` para lint

### Banco
- Schema: `wpp_finance`
- Tabelas: `tbl_*`
- Prefixos de colunas: `cn_`, `nm_`, `ds_`, `fl_`, `dt_`, `nr_`, `vl_`
- Migrations versionadas em `migrations/`
- Lançamentos são estornados com `fl_estornado`, não apagados

### Segurança
- Nunca commitar `.env`
- Nunca commitar `auth_info/`, `sessions/` ou logs
- Nunca logar credenciais, token, QR completo ou dados sensíveis
- Usar queries parametrizadas

## Checklist antes de commitar

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `.env` não aparece no git
- [ ] Sessão do WhatsApp não aparece no git
- [ ] Mensagens do bot estão em PT-BR
- [ ] STA não foi alterado

## Gotchas

- `messages.upsert` pode chegar duplicado; usar `nr_mensagem_wa_id`
- Baileys pode exigir novo QR se a sessão cair definitivamente
- `ALLOWED_GROUP_ID` vazio aceita qualquer grupo; configure após descobrir o JID
- O bot depende do `postgres-lab` estar rodando
