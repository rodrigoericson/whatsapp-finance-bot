# CLAUDE.md — WhatsApp Finance Bot

Este arquivo define regras para agentes IA que trabalhem neste projeto.

## Sobre o Projeto

- **Nome:** WhatsApp Finance Bot
- **Stack:** Node.js 22 + TypeScript strict + Baileys + PostgreSQL
- **Objetivo:** registrar gastos enviados em grupo de WhatsApp e gerar resumos financeiros simples
- **Banco:** PostgreSQL, database `whatsapp_bot`, schema `wpp_finance`
- **Execução:** máquina local 24/7, com autenticação WhatsApp via QR

## Regras Gerais de Trabalho

### Planejamento
- Usar plan mode para features novas ou mudanças de arquitetura
- Perguntar quando houver múltiplas abordagens reais
- Não iniciar implementação sem entender o fluxo esperado do bot
- Não fazer big-bang; preferir mudanças pequenas e verificáveis

### Implementação
- TypeScript strict, ESM e target ES2023
- npm como gerenciador de pacote
- Logs e mensagens de negócio em português brasileiro
- Sem overengineering: implementar só o necessário para a v1
- I/O sempre assíncrono
- Regras de negócio em services; handlers do WhatsApp apenas roteiam
- Parser de frase natural por heurística/regex; sem LLM na v1

### Segurança
- Nunca commitar `.env`, sessão do WhatsApp, logs locais ou tokens
- Nunca logar senha, token, QR completo ou credenciais
- Tratar dados financeiros como sensíveis
- Usar queries parametrizadas com `pg`
- Validar variáveis de ambiente com `zod`
- Secrets reais ficam somente no `.env` local

### Git
- Branch principal: `main`
- Nunca force push em `main`
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`
- Validar antes de commit: `npm run lint` + `npm run build`

## Convenções de Código

### Estrutura
- `src/bot/`: conexão Baileys e handlers de mensagens
- `src/parser/`: parsing de comandos, valores e períodos
- `src/services/`: regras de negócio
- `src/db/repositories/`: acesso ao PostgreSQL
- `src/config.ts`: configuração tipada
- `src/logger.ts`: logger estruturado

### Banco de Dados
- Schema: `wpp_finance`
- Tabelas: `tbl_` + snake_case
- Colunas: snake_case com prefixo:
  - `cn_`: chave numérica
  - `nm_`: nome/apelido
  - `ds_`: descrição/string longa
  - `fl_`: boolean
  - `dt_`: data/hora
  - `nr_`: número/código textual
  - `vl_`: valor monetário
- Migrations SQL versionadas em `migrations/`
- Soft delete/estorno em vez de delete físico para lançamentos

## Checklist Pós-Implementação

- [ ] `npm run lint` sem erros
- [ ] `npm run build` sem erros
- [ ] Migration roda em banco limpo
- [ ] Bot conecta por QR
- [ ] `!gasto` registra lançamento
- [ ] Frase natural simples registra lançamento
- [ ] `!resumo` calcula corretamente
- [ ] `!quem-deve` lista ranking
- [ ] `!desfazer` estorna o último lançamento
- [ ] `.env`, `auth_info/`, `sessions/` e logs não aparecem no git

## Gotchas

- Baileys pode reenviar mensagens após reconexão; `nr_mensagem_wa_id` deve impedir duplicidade
- Se a sessão expirar de vez, apagar a pasta de sessão e escanear QR novamente
- Não processar grupos fora de `ALLOWED_GROUP_ID` quando configurado
- WhatsApp pode limitar automações agressivas; v1 só responde dentro do grupo
- O container `postgres-lab17` precisa estar rodando antes do bot
- Windows suspendendo a máquina derruba o bot; usar PM2/Task Scheduler depois da v1
