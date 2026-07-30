# Arquitetura — WhatsApp Finance Bot

Documento de referência sobre a estrutura do projeto, componentes e banco de dados.

---

## Visão Geral

```
WhatsApp (Baileys) → Handlers → Services → Repositories → PostgreSQL
                                    ↑
                                  Parser
                                  (regex)
```

O bot escuta mensagens de um grupo no WhatsApp, parseia comandos ou frases naturais, executa lógica de negócio e persiste no PostgreSQL.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22 |
| Linguagem | TypeScript strict, ESM, target ES2023 |
| WhatsApp | @whiskeysockets/baileys |
| Banco | PostgreSQL 17 (Docker) |
| Validação | zod (config) |
| Logger | pino |
| Lint | oxlint |
| Testes | node:test + tsx |
| Gerenciador | npm |

---

## Estrutura de Pastas

```
src/
├── bot/
│   ├── client.ts              # Conexão Baileys, QR, reconexão
│   └── handlers/
│       ├── message.ts         # Guarda de grupo, monta CommandContext
│       ├── commands.ts        # Roteador de comandos (!gasto, !resumo, etc)
│       └── natural.ts         # Fallback: frases naturais ("gastei 50...")
├── parser/
│   ├── gasto.ts              # Regex: valor, parcelas, forma, categoria, pessoa
│   ├── periodo.ts            # Converte "hoje|semana|mes" em {inicio, fim}
│   ├── correcao.ts           # Parse de "corrigir 42 valor 60..."
│   └── recorrencia.ts        # Parse de "criar netflix 39.90 dia 15..."
├── services/
│   ├── lancamento.service.ts  # Registrar, desfazer, corrigir, listar
│   ├── recorrencia.service.ts # Criar, listar, pausar, retomar, excluir, gerar
│   ├── resumo.service.ts      # Resumo e ranking (quem deve)
│   └── format.ts             # formatCurrency, formatPercent
├── db/
│   ├── pool.ts               # pg.Pool com search_path wpp_finance
│   ├── migrate.ts            # Runner de migrations SQL
│   └── repositories/
│       ├── lancamento.repo.ts # CRUD de lançamentos + queries de resumo
│       ├── usuario.repo.ts    # upsertUsuario
│       └── recorrencia.repo.ts # CRUD de recorrências + pendentes
├── jobs/
│   ├── report.job.ts         # Relatórios diário/semanal automáticos
│   └── recorrencia.job.ts    # Geração diária de lançamentos recorrentes
├── config.ts                  # Schema zod de variáveis de ambiente
├── logger.ts                  # Instância pino
└── index.ts                   # Bootstrap: startBot + jobs + shutdown

migrations/                    # Arquivos SQL versionados (001 a 006)
dist/                          # Build compilado (não versionado)
auth_info/                     # Sessão WhatsApp (não versionado)
```

---

## Fluxo de uma Mensagem

1. Baileys recebe mensagem → `messages.upsert` event
2. `message.ts`: verifica se é do grupo permitido, extrai texto, monta `CommandContext`
3. `commands.ts`: tenta casar com um comando (`!gasto`, `!resumo`, `!recorrencia`, etc)
4. Se não casou → `natural.ts`: tenta parsear frase natural (`gastei`, `paguei`, `comprei`)
5. Se parsear com sucesso → chama o service correspondente
6. Service executa lógica → repository persiste no banco → retorna mensagem
7. Bot envia resposta no grupo

---

## Banco de Dados (PostgreSQL)

### Conexão

- URL: `postgresql://postgres:postgres123@localhost:5434/whatsapp_bot`
- Container Docker: `postgres-lab17` (imagem `postgres:17-alpine`)
- Porta: 5434 no host → 5432 no container
- Schema: `wpp_finance`

### Convenção de nomes

| Prefixo | Significado | Exemplo |
|---|---|---|
| `tbl_` | Tabela | `tbl_lancamento` |
| `cn_` | Chave numérica / ID | `cn_lancamento` |
| `nm_` | Nome / apelido | `nm_apelido` |
| `ds_` | Descrição / string longa | `ds_descricao` |
| `fl_` | Boolean (flag) | `fl_estornado` |
| `dt_` | Data/hora | `dt_criacao` |
| `nr_` | Número / código textual | `nr_telefone` |
| `vl_` | Valor monetário | `vl_valor` |
| `qt_` | Quantidade | `qt_parcelas_total` |

### Tabelas

#### tbl_usuario
```sql
cn_usuario BIGSERIAL PK
nr_telefone VARCHAR(32) UNIQUE
nm_apelido VARCHAR(80)
nm_pushname VARCHAR(120)
fl_ativo BOOLEAN
dt_criacao TIMESTAMPTZ
dt_atualizacao TIMESTAMPTZ
```

#### tbl_lancamento
```sql
cn_lancamento BIGSERIAL PK
cn_usuario BIGINT FK → tbl_usuario
cn_pessoa_gasto BIGINT FK → tbl_usuario
ds_descricao VARCHAR(255)
ds_categoria VARCHAR(60)
ds_forma_pagamento VARCHAR(40)
ds_mensagem_original TEXT
ds_grupo_jid VARCHAR(80)
nr_mensagem_wa_id VARCHAR(140)         -- idempotência (unique parcial)
nr_mes_referencia CHAR(7)              -- "YYYY-MM"
vl_valor NUMERIC(12,2)
fl_estornado BOOLEAN
dt_lancamento TIMESTAMPTZ
dt_criacao TIMESTAMPTZ
dt_estorno TIMESTAMPTZ
-- Parcelamento:
cn_parcela_grupo BIGINT
nr_parcela SMALLINT
qt_parcelas_total SMALLINT
vl_valor_total_compra NUMERIC(12,2)
-- Correção:
dt_correcao TIMESTAMPTZ
ds_mensagem_correcao TEXT
```

#### tbl_recorrencia
```sql
cn_recorrencia BIGSERIAL PK
cn_usuario BIGINT FK → tbl_usuario     -- quem cadastrou
cn_pessoa_gasto BIGINT FK → tbl_usuario -- quem paga
ds_descricao VARCHAR(255)
ds_categoria VARCHAR(60)
ds_forma_pagamento VARCHAR(40)
vl_valor NUMERIC(12,2)
nr_dia_cobranca SMALLINT               -- 1 a 28
fl_ativo BOOLEAN
dt_inicio DATE
dt_fim DATE
ds_grupo_jid VARCHAR(80)
ds_mensagem_original TEXT
dt_criacao TIMESTAMPTZ
dt_atualizacao TIMESTAMPTZ
```

#### tbl_migration
```sql
cn_migration BIGSERIAL PK
nm_arquivo VARCHAR(255) UNIQUE
dt_aplicacao TIMESTAMPTZ
```

### Idempotência

- Lançamentos manuais: `nr_mensagem_wa_id` = ID da mensagem WhatsApp
- Parcelas: `nr_mensagem_wa_id` = `{waId}:{nrParcela}`
- Recorrências: `nr_mensagem_wa_id` = `rec:{cnRecorrencia}:{YYYY-MM}`
- Todos protegidos por: `ON CONFLICT (nr_mensagem_wa_id) ... DO NOTHING`

### Migrations

Arquivos em `migrations/` (SQL puro, ordem alfabética):

| Arquivo | O que faz |
|---|---|
| 001_wpp_finance_schema.sql | Schema, tbl_usuario, tbl_lancamento, trigger |
| 002_lancamento_parcelado.sql | Colunas de parcelamento |
| 003_lancamento_correcao.sql | Colunas de correção |
| 004_pessoa_gasto_categoria_explicita.sql | cn_pessoa_gasto |
| 005_lancamento_pessoa_gasto_fk_restrict.sql | FK restrict |
| 006_recorrencia.sql | tbl_recorrencia + índices + trigger |

Rodar: `npm run migrate` (aplica pendentes, pula já aplicadas).

---

## Jobs (Agendamentos)

| Job | Arquivo | Horário | O que faz |
|---|---|---|---|
| Relatório diário | `report.job.ts` | 21:00 (config) | Envia resumo do dia no grupo |
| Relatório semanal | `report.job.ts` | Dom 09:00 (config) | Envia resumo + ranking da semana |
| Recorrência | `recorrencia.job.ts` | 00:05 (config) | Gera lançamentos das recorrências do dia |

Todos usam `setTimeout` recursivo (não cron externo). Configuráveis via `.env`.

---

## Comandos do Bot

| Comando | O que faz |
|---|---|
| `!gasto 50 almoço pix` | Registra gasto avulso |
| `!gasto 600 servidor 10x cartao` | Registra parcelado |
| `!gasto marcelo 50 almoço` | Registra pra outra pessoa |
| `!resumo [periodo]` | Mostra total + por pessoa + categoria |
| `!quem deve` | Ranking de quem gastou mais |
| `!lancamentos` | Lista 10 lançamentos ativos |
| `!ultimos` | Lista 5 últimos |
| `!corrigir 42 valor 60 descricao almoço` | Corrige um lançamento |
| `!desfazer [id]` | Estorna lançamento |
| `!recorrencia criar <desc> <valor> dia <1-28> [forma] [cat]` | Cadastra recorrência |
| `!recorrencia listar` | Lista recorrências |
| `!recorrencia pausar <id>` | Pausa |
| `!recorrencia retomar <id>` | Reativa |
| `!recorrencia excluir <id>` | Exclui |
| `!ajuda` | Mostra todos os comandos |

Frases naturais também funcionam: "gastei 50 no almoço", "paguei 30 de uber".

---

## Variáveis de Ambiente (.env)

| Variável | Default | Descrição |
|---|---|---|
| NODE_ENV | development | Ambiente |
| LOG_LEVEL | info | Nível de log (pino) |
| TZ | America/Sao_Paulo | Timezone |
| WA_SESSION_PATH | ./auth_info | Pasta da sessão WhatsApp |
| ALLOWED_GROUP_ID | (vazio) | JID do grupo permitido |
| ALLOW_ALL_GROUPS | false | Aceitar todos os grupos |
| ALLOW_FROM_ME | false | Processar próprias mensagens |
| WA_REPORT_TARGET_JID | (vazio) | Grupo alvo dos relatórios |
| WA_REPORT_DAILY_ENABLED | true | Relatório diário |
| WA_REPORT_DAILY_HOUR | 21 | Hora do relatório diário |
| WA_REPORT_DAILY_MINUTE | 0 | Minuto do relatório diário |
| WA_REPORT_WEEKLY_ENABLED | true | Relatório semanal |
| WA_REPORT_WEEKLY_DAY | 0 | Dia da semana (0=dom) |
| WA_REPORT_WEEKLY_HOUR | 9 | Hora do relatório semanal |
| WA_REPORT_WEEKLY_MINUTE | 0 | Minuto do relatório semanal |
| WA_RECORRENCIA_ENABLED | true | Job de recorrência |
| WA_RECORRENCIA_HOUR | 0 | Hora do job de recorrência |
| WA_RECORRENCIA_MINUTE | 5 | Minuto do job de recorrência |
| DATABASE_URL | (obrigatório) | String de conexão PostgreSQL |
| PG_POOL_MAX | 5 | Conexões simultâneas |
| DEFAULT_CURRENCY | BRL | Moeda padrão |
| LOCALE | pt-BR | Locale para formatação |
| TIMEZONE | America/Sao_Paulo | Timezone para formatação |

---

## Infraestrutura (VM Proxmox)

```
Proxmox (host)
└── VM 101: whatsapp-bot (Debian, 2 vCPU, 2GB RAM, 20GB SSD)
    ├── Node.js 22
    ├── Docker Engine
    │   └── Container: postgres-lab17 (postgres:17-alpine, porta 5434)
    └── Serviço systemd: whatsapp-finance-bot.service
        └── /opt/whatsapp-finance-bot/dist/src/index.js
```

- **IP:** 192.168.1.145 (DHCP — pode mudar após reboot)
- **Usuário SSH:** wpp
- **Diretório:** /opt/whatsapp-finance-bot
- **Repositório:** https://github.com/rodrigoericson/whatsapp-finance-bot.git

Ver guia operacional completo em: [operacao-vm.md](operacao-vm.md)

---

## Diagrama de Dependências

```
index.ts
├── bot/client.ts
│   └── bot/handlers/message.ts
│       ├── bot/handlers/commands.ts
│       │   ├── services/lancamento.service.ts
│       │   │   ├── db/repositories/lancamento.repo.ts
│       │   │   ├── db/repositories/usuario.repo.ts
│       │   │   ├── parser/gasto.ts
│       │   │   └── parser/periodo.ts
│       │   ├── services/recorrencia.service.ts
│       │   │   ├── db/repositories/recorrencia.repo.ts
│       │   │   ├── db/repositories/lancamento.repo.ts
│       │   │   ├── db/repositories/usuario.repo.ts
│       │   │   ├── parser/recorrencia.ts
│       │   │   └── parser/periodo.ts
│       │   └── services/resumo.service.ts
│       │       └── db/repositories/lancamento.repo.ts
│       └── bot/handlers/natural.ts
│           └── services/lancamento.service.ts
├── jobs/report.job.ts
│   └── services/resumo.service.ts
└── jobs/recorrencia.job.ts
    ├── db/repositories/recorrencia.repo.ts
    └── services/recorrencia.service.ts
```
