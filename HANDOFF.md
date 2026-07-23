# HANDOFF — WhatsApp Finance Bot

Última atualização: 2026-07-22

## Estado atual

Projeto local em:

```text
F:\Git\whatsapp-finance-bot
```

Repositório Git local inicializado em `main`.

Commit local atual:

```text
51a759b feat: bootstrap whatsapp finance bot
```

Ainda não foi feito push para GitHub. O `gh` foi instalado, mas não ficou autenticado. Para subir depois, criar repo privado `whatsapp-finance-bot` no GitHub e rodar:

```powershell
Set-Location "F:\Git\whatsapp-finance-bot"
git remote add origin https://github.com/SEU_USUARIO/whatsapp-finance-bot.git
git push -u origin main
```

Se o remote já existir:

```powershell
git remote set-url origin https://github.com/SEU_USUARIO/whatsapp-finance-bot.git
git push -u origin main
```

## Stack

- Node.js + TypeScript strict
- Baileys (`@whiskeysockets/baileys`)
- PostgreSQL no Docker (`postgres-lab`)
- Pino para logs
- Zod para config
- Oxlint
- Migrator próprio em `src/db/migrate.ts`

## Banco

Container usado:

```text
postgres-lab
```

Database:

```text
whatsapp_bot
```

Schema:

```text
wpp_finance
```

Migrations aplicadas:

```text
001_wpp_finance_schema.sql
002_lancamento_parcelado.sql
003_lancamento_correcao.sql
004_pessoa_gasto_categoria_explicita.sql
```

Tabelas principais:

- `wpp_finance.tbl_usuario`
- `wpp_finance.tbl_lancamento`
- `wpp_finance.tbl_migration`

Convenção de banco herdada do STA:

- Schema dedicado
- Tabelas `tbl_*`
- Colunas com prefixos `cn_`, `nm_`, `ds_`, `fl_`, `dt_`, `nr_`, `qt_`, `vl_`

## Arquivos sensíveis / gerados

Não versionar:

- `.env`
- `auth_info/`
- `node_modules/`
- `dist/`
- logs

Eles já estão no `.gitignore`.

## Como rodar

PowerShell:

```powershell
Set-Location "F:\Git\whatsapp-finance-bot"
npm.cmd run dev
```

Se precisar limpar sessão e escanear QR de novo:

```powershell
Set-Location "F:\Git\whatsapp-finance-bot"
npm.cmd run reset-auth
npm.cmd run dev
```

Se o PowerShell bloquear `npm`, usar sempre `npm.cmd`.

## Configuração local

O arquivo real `.env` existe localmente e não deve ser commitado.

`.env.example` tem placeholders seguros.

Config importante:

```env
ALLOW_FROM_ME=true
WA_REPORT_TARGET_JID=
WA_REPORT_DAILY_ENABLED=true
WA_REPORT_DAILY_HOUR=21
WA_REPORT_DAILY_MINUTE=0
WA_REPORT_WEEKLY_ENABLED=true
WA_REPORT_WEEKLY_DAY=0
WA_REPORT_WEEKLY_HOUR=9
WA_REPORT_WEEKLY_MINUTE=0
```

`ALLOW_FROM_ME=true` permite usar o próprio número pareado para mandar comandos e o bot responder.

`WA_REPORT_TARGET_JID` ainda precisa ser preenchido para relatório automático ir para um grupo fixo.

## Comandos do bot

Com ou sem `!` quando aplicável:

```text
ajuda
```

```text
gasto 50 almoço pix
```

```text
gasto marcelo 600 planta baixa pix
```

```text
gasto marcelo 2056 servidor particular em 10 vezes no cartão categoria infra
```

```text
resumo
resumo hoje
resumo semana
resumo 2026-07
```

```text
quem deve
```

```text
ultimos
```

```text
corrigir 42 valor 60 descricao almoço forma pix
corrigir 42 categoria nenhuma
```

```text
desfazer
```

## Regras atuais de negócio

### Pessoa do gasto

O bot separa:

- `cn_usuario`: registrador/autor da mensagem no WhatsApp
- `cn_pessoa_gasto`: pessoa a quem o gasto pertence

Exemplo:

```text
gasto marcelo 600 planta baixa pix
```

Resultado:

- registrador: quem enviou a mensagem
- pessoa do gasto: Marcelo
- descrição: planta baixa
- forma: pix

Se não houver nome antes do valor, pessoa do gasto = registrador.

Pessoas manuais são salvas em `tbl_usuario` com telefone sintético:

```text
manual:marcelo
```

### Categoria

Categoria **não é mais inferida automaticamente**.

Só entra se o texto tiver:

```text
categoria nome
cat nome
```

Para limpar categoria:

```text
corrigir 42 categoria nenhuma
```

### Parcelamento

Exemplo:

```text
gasto marcelo 2056 servidor particular em 10 vezes no cartão
```

Grava uma linha por parcela em `tbl_lancamento`, com `cn_parcela_grupo` comum.

Resumo mensal soma apenas a parcela do mês.

`desfazer` de compra parcelada estorna todas as parcelas do grupo.

`corrigir valor` de parcelado é bloqueado na v1. Para corrigir valor de parcelado, usar `desfazer` e lançar de novo.

### Correção

`ultimos` lista os últimos 5 lançamentos ativos do registrador no grupo.

`corrigir ID ...` só corrige lançamentos do próprio registrador no mesmo grupo.

Campos aceitos:

- `valor`
- `descricao` / `descrição`
- `forma` / `pagamento`
- `categoria`

Auditoria:

- `dt_correcao`
- `ds_mensagem_correcao`

### Relatórios automáticos

Implementado em:

```text
src/jobs/report.job.ts
```

- Diário: `resumo hoje`
- Semanal: `resumo semana` + `quem deve`
- Só agenda se `WA_REPORT_TARGET_JID` estiver preenchido
- Timers são limpos/reagendados em reconexão para evitar duplicação

## Dados atuais corrigidos

Lançamentos existentes foram ajustados para pessoa do gasto `Marcelo`:

- `#1`: `taxa franquia Farma e Farma` — pix — 39950
- `#3` a `#12`: `servidor particular` — cartão — 10x de 205,90 — total 2059
- `#13`: `planta baixa farmácia` — pix — 600 — sem categoria

Resumo no banco para `2026-07` ficou agrupado em Marcelo:

```text
Marcelo | 40755.90
```

## Validações feitas

Comandos já passaram após as últimas mudanças:

```powershell
npm.cmd run migrate
npm.cmd run build
npm.cmd run lint
```

Também foi verificado que `F:\Git\STA` ficou intocado.

## Principais arquivos

- `src/bot/client.ts` — conexão Baileys e reconexão
- `src/bot/handlers/message.ts` — filtro de grupo, fromMe e roteamento
- `src/bot/handlers/commands.ts` — comandos
- `src/parser/gasto.ts` — parser de gasto, pessoa, forma, parcelas, categoria explícita
- `src/parser/correcao.ts` — parser do comando corrigir
- `src/services/lancamento.service.ts` — regras de gasto/correção/desfazer
- `src/services/resumo.service.ts` — resumo/ranking
- `src/db/repositories/lancamento.repo.ts` — queries de lançamentos
- `src/jobs/report.job.ts` — relatórios automáticos
- `migrations/` — schema versionado

## Próximos passos possíveis

- Preencher `WA_REPORT_TARGET_JID` para ativar relatório automático no grupo correto
- Configurar PM2 ou Agendador de Tarefas para rodar 24/7
- Fazer push para GitHub privado
- Adicionar exportação CSV/Excel futuramente
