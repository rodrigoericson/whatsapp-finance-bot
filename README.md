# WhatsApp Finance Bot

Bot simples para registrar gastos em um grupo de WhatsApp e gerar resumos financeiros.

## Stack

- Node.js 22
- TypeScript strict
- Baileys (`@whiskeysockets/baileys`)
- PostgreSQL
- Pino
- Zod
- Oxlint

## Comandos

```text
gasto 50 almoço pix
gasto R$ 30,50 mercado cartão
gasto marcelo 600 planta baixa pix
gasto marcelo 2056 servidor particular em 10 vezes no cartão categoria infra
gasto mercado 1000 em 3x
gastei 25 no almoço pix
resumo
resumo hoje
resumo semana
resumo 2026-07
quem deve
ultimos
corrigir 42 valor 60 descricao almoço forma pix
desfazer
```

Os comandos com `!` continuam funcionando se você preferir: `!gasto`, `!resumo`, `!quem-deve`, `!desfazer`.

Quando houver um nome antes do valor, ele vira a pessoa do gasto. Ex.: `gasto marcelo 600 planta baixa pix` entra no resumo como Marcelo. Categoria só é salva se você escrever explicitamente `categoria nome`.

## Configuração

1. Copie o template:

```bash
cp .env.example .env
```

2. Ajuste `DATABASE_URL` com a senha local do PostgreSQL.

3. Crie o database no container `postgres-lab`:

```bash
docker exec -i postgres-lab psql -U postgres < docker/create-database.sql
```

4. Rode as migrations SQL versionadas pelo migrator próprio:

```bash
npm run migrate
```

5. Suba o bot:

```bash
npm run dev
```

Na primeira execução, escaneie o QR exibido no terminal.

### Usar o próprio número

Por padrão, o bot ignora mensagens enviadas pelo próprio WhatsApp pareado. Para testar/usá-lo no seu próprio número, configure no `.env`:

```env
ALLOW_FROM_ME=true
```

Com isso, mensagens que você enviar em grupos também serão processadas pelo bot.

## Banco de dados

- Database: `whatsapp_bot`
- Schema: `wpp_finance`
- Tabelas:
  - `wpp_finance.tbl_usuario`
  - `wpp_finance.tbl_lancamento`

O projeto segue a convenção de banco do STA: tabelas `tbl_*` e colunas com prefixos (`cn_`, `nm_`, `ds_`, `fl_`, `dt_`, `nr_`, `vl_`).

## Relatórios automáticos

Configure o grupo de destino no `.env`:

```env
WA_REPORT_TARGET_JID=120000000000000000@g.us
WA_REPORT_DAILY_ENABLED=true
WA_REPORT_DAILY_HOUR=21
WA_REPORT_DAILY_MINUTE=0
WA_REPORT_WEEKLY_ENABLED=true
WA_REPORT_WEEKLY_DAY=0
WA_REPORT_WEEKLY_HOUR=9
WA_REPORT_WEEKLY_MINUTE=0
```

- Diário: envia `resumo hoje` no horário configurado.
- Semanal: envia `resumo semana` + `quem deve` no dia/horário configurado.
- Se `WA_REPORT_TARGET_JID` estiver vazio, os relatórios automáticos ficam desativados.

## Desenvolvimento

```bash
npm run lint
npm run build
npm run dev
```

## Segurança

Não commite:

- `.env`
- `auth_info/`
- `sessions/`
- `logs/`

O bot trata dados financeiros como sensíveis e não deve logar credenciais, tokens ou QR completo.

## 24/7

A v1 roda localmente. Depois de validar o fluxo no grupo, use PM2 ou Task Scheduler para manter o bot ativo no Windows.
