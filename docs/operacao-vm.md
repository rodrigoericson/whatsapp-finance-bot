# Operação em VM Proxmox — WhatsApp Finance Bot

Este documento descreve como o bot foi instalado e como operar a VM Linux que roda o WhatsApp Finance Bot 24/7.

## Visão geral

Ambiente planejado:

```text
Proxmox
└── VM 101: whatsapp-bot
    ├── Debian GNU/Linux sem interface gráfica
    ├── Node.js 22
    ├── Docker Engine + Docker Compose
    ├── PostgreSQL 17 em container Docker
    └── WhatsApp Finance Bot como serviço systemd
```

VM existente que não deve ser alterada:

```text
VM 100: WinServer-ERP
```

## Recursos da VM

Configuração usada para a VM do bot:

```text
VMID: 101
Nome: whatsapp-bot
CPU: 2 vCPU
RAM: 2 GB
Disco: 20 GB em local-lvm/SSD
Rede: vmbr0
IP observado: 192.168.1.146
Usuário Linux: wpp
Diretório do projeto: /opt/whatsapp-finance-bot
```

## Serviços principais

### Bot

Serviço systemd:

```text
whatsapp-finance-bot.service
```

Arquivo:

```text
/etc/systemd/system/whatsapp-finance-bot.service
```

Conteúdo esperado:

```ini
[Unit]
Description=WhatsApp Finance Bot
After=network-online.target docker.service
Wants=network-online.target docker.service

[Service]
Type=simple
WorkingDirectory=/opt/whatsapp-finance-bot
ExecStart=/usr/bin/node /opt/whatsapp-finance-bot/dist/src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
User=wpp
Group=wpp

[Install]
WantedBy=multi-user.target
```

O serviço está habilitado para iniciar com a VM:

```bash
sudo systemctl enable whatsapp-finance-bot
```

### Banco

Container Docker:

```text
postgres-lab17
```

Imagem:

```text
postgres:17-alpine
```

Porta:

```text
localhost:5434 -> container:5432
```

Database:

```text
whatsapp_bot
```

Schema:

```text
wpp_finance
```

Volume Docker:

```text
whatsapp-finance-bot_postgres_lab17_data
```

Arquivo compose:

```text
/opt/whatsapp-finance-bot/docker-compose.yml
```

Conteúdo esperado:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: postgres-lab17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: whatsapp_bot
      TZ: America/Sao_Paulo
    ports:
      - "5434:5432"
    volumes:
      - postgres_lab17_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_lab17_data:
```

## Arquivos sensíveis

Nunca versionar:

```text
.env
auth_info/
logs/
dist/
node_modules/
```

Na VM, o `.env` fica em:

```text
/opt/whatsapp-finance-bot/.env
```

Configuração principal esperada:

```env
NODE_ENV=production
LOG_LEVEL=info
TZ=America/Sao_Paulo

WA_SESSION_PATH=./auth_info
ALLOWED_GROUP_ID=120363427303948147@g.us
ALLOW_ALL_GROUPS=false
ALLOW_FROM_ME=true

DATABASE_URL=postgresql://postgres:postgres123@localhost:5434/whatsapp_bot
PG_POOL_MAX=5

DEFAULT_CURRENCY=BRL
LOCALE=pt-BR
TIMEZONE=America/Sao_Paulo
```

## Como conectar na VM

No Windows/PowerShell:

```powershell
ssh wpp@192.168.1.146
```

Depois:

```bash
cd /opt/whatsapp-finance-bot
```

## Operação do bot

### Ver status

```bash
sudo systemctl status whatsapp-finance-bot
```

Status saudável esperado:

```text
Active: active (running)
```

### Ver logs em tempo real

```bash
journalctl -u whatsapp-finance-bot -f
```

Se aparecer QR, escanear com WhatsApp.

Mensagens esperadas:

```text
Iniciando WhatsApp Finance Bot
WhatsApp conectado
```

### Iniciar

```bash
sudo systemctl start whatsapp-finance-bot
```

### Parar

```bash
sudo systemctl stop whatsapp-finance-bot
```

### Reiniciar

```bash
sudo systemctl restart whatsapp-finance-bot
```

### Habilitar início automático

```bash
sudo systemctl enable whatsapp-finance-bot
```

### Desabilitar início automático

```bash
sudo systemctl disable whatsapp-finance-bot
```

## Operação do banco

### Ver containers

```bash
docker ps
```

Container esperado:

```text
postgres-lab17   postgres:17-alpine   0.0.0.0:5434->5432/tcp
```

### Subir banco

```bash
cd /opt/whatsapp-finance-bot
docker compose up -d
```

### Parar banco

```bash
cd /opt/whatsapp-finance-bot
docker compose stop
```

### Reiniciar banco

```bash
cd /opt/whatsapp-finance-bot
docker compose restart postgres
```

### Testar prontidão

```bash
docker exec postgres-lab17 pg_isready -U postgres
```

### Abrir psql

```bash
docker exec -it postgres-lab17 psql -U postgres -d whatsapp_bot
```

Dentro do psql, sair com:

```text
\q
```

### Contar lançamentos

```bash
docker exec postgres-lab17 psql -U postgres -d whatsapp_bot -c "SELECT COUNT(*) FROM wpp_finance.tbl_lancamento;"
```

### Ver migrations aplicadas

```bash
docker exec postgres-lab17 psql -U postgres -d whatsapp_bot -c "SELECT nm_arquivo FROM wpp_finance.tbl_migration ORDER BY nm_arquivo;"
```

## Atualizar o bot

Quando houver novo código no GitHub:

```bash
cd /opt/whatsapp-finance-bot
sudo systemctl stop whatsapp-finance-bot
git pull
npm ci
npm run build
npm run migrate
sudo systemctl start whatsapp-finance-bot
sudo systemctl status whatsapp-finance-bot
```

Ver logs:

```bash
journalctl -u whatsapp-finance-bot -f
```

## Validações do projeto

Rodar após mudanças:

```bash
cd /opt/whatsapp-finance-bot
npm run build
npm run lint
npm test
npm run migrate
```

## Backup

### Backup do banco

Na VM:

```bash
mkdir -p ~/backups

docker exec postgres-lab17 pg_dump -U postgres -d whatsapp_bot -Fc -f /tmp/whatsapp_bot.dump

docker cp postgres-lab17:/tmp/whatsapp_bot.dump ~/backups/whatsapp_bot-$(date +%F).dump
```

### Backup da sessão WhatsApp

```bash
mkdir -p ~/backups

tar -czf ~/backups/auth_info-$(date +%F).tar.gz -C /opt/whatsapp-finance-bot auth_info
```

### Copiar backup para o PC

No PowerShell do Windows:

```powershell
scp wpp@192.168.1.146:/home/wpp/backups/whatsapp_bot-YYYY-MM-DD.dump .\
scp wpp@192.168.1.146:/home/wpp/backups/auth_info-YYYY-MM-DD.tar.gz .\
```

Trocar `YYYY-MM-DD` pela data real.

## Restore de banco

Copiar dump para a VM:

```powershell
scp .\whatsapp_bot.dump wpp@192.168.1.146:/home/wpp/whatsapp_bot.dump
```

Na VM:

```bash
docker cp /home/wpp/whatsapp_bot.dump postgres-lab17:/tmp/whatsapp_bot.dump

docker exec postgres-lab17 dropdb -U postgres --if-exists whatsapp_bot

docker exec postgres-lab17 createdb -U postgres whatsapp_bot

docker exec postgres-lab17 pg_restore -U postgres -d whatsapp_bot /tmp/whatsapp_bot.dump

cd /opt/whatsapp-finance-bot
npm run migrate
```

## Primeiro QR / sessão WhatsApp

A sessão fica em:

```text
/opt/whatsapp-finance-bot/auth_info
```

Se a sessão expirar ou quiser parear novamente:

```bash
sudo systemctl stop whatsapp-finance-bot
cd /opt/whatsapp-finance-bot
rm -rf auth_info
npm run dev
```

Escanear o QR no terminal.

Depois que conectar:

```bash
Ctrl+C
sudo systemctl start whatsapp-finance-bot
```

## Troubleshooting

### Bot não sobe

Ver status:

```bash
sudo systemctl status whatsapp-finance-bot
```

Ver logs:

```bash
journalctl -u whatsapp-finance-bot -n 100 --no-pager
```

Causas comuns:

- `.env` ausente ou inválido
- Postgres parado
- `dist/src/index.js` não existe porque faltou `npm run build`
- dependências não instaladas (`npm ci`)
- sessão WhatsApp inválida

### Erro `Cannot find module /opt/whatsapp-finance-bot/dist/index.js`

O build do projeto gera:

```text
dist/src/index.js
```

O service deve usar:

```ini
ExecStart=/usr/bin/node /opt/whatsapp-finance-bot/dist/src/index.js
```

Depois de alterar:

```bash
sudo systemctl daemon-reload
sudo systemctl restart whatsapp-finance-bot
```

### Bot não responde no grupo

Verificar `.env`:

```bash
grep -E '^(ALLOWED_GROUP_ID|ALLOW_ALL_GROUPS|ALLOW_FROM_ME)=' /opt/whatsapp-finance-bot/.env
```

Esperado:

```env
ALLOWED_GROUP_ID=120363427303948147@g.us
ALLOW_ALL_GROUPS=false
ALLOW_FROM_ME=true
```

Se `ALLOWED_GROUP_ID` estiver vazio e `ALLOW_ALL_GROUPS=false`, o bot ignora todos os grupos.

### Banco não conecta

Verificar container:

```bash
docker ps
```

Testar Postgres:

```bash
docker exec postgres-lab17 pg_isready -U postgres
```

Testar migrations:

```bash
cd /opt/whatsapp-finance-bot
npm run migrate
```

### Ver uso de disco

```bash
df -h
docker system df
```

### Ver memória

```bash
free -h
```

### Reiniciar VM

```bash
sudo reboot
```

Depois de voltar:

```bash
sudo systemctl status whatsapp-finance-bot
docker ps
```

## Testes manuais no WhatsApp

No grupo permitido:

```text
!ajuda
resumo
resumo 2026-07
lançamentos
quem deve
```

O bot não deve responder em outros grupos quando `ALLOW_ALL_GROUPS=false`.
