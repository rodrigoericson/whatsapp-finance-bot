# Manual de Deploy — WhatsApp Finance Bot

Guia rápido para quando precisar fazer deploy manualmente (sem ajuda do Kiro).

## Pré-requisitos

- Acesso SSH à VM: `ssh wpp@192.168.1.145`
- Git instalado na VM
- Node.js 22 instalado na VM
- Docker rodando com container `postgres-lab17`

> O IP da VM pode mudar após reinício. Se o SSH não conectar, verifique o IP atual no painel do Proxmox (VM 101).

---

## Deploy de código novo

### 1. No Windows (máquina de desenvolvimento)

Abrir terminal na pasta do projeto (`e:\Git\whatsapp-finance-bot`):

```powershell
npm run lint
npm run build
```

Se tiver erros, corrigir antes de prosseguir.

Fazer commit e push (pelo GitHub Desktop ou terminal):

```powershell
# Se git estiver no PATH:
git add .
git commit -m "feat: descricao da mudanca"
git push origin main

# Se git NÃO estiver no PATH, usar GitHub Desktop (app) pra commit + push
```

### 2. Na VM (produção)

```bash
ssh wpp@192.168.1.145
cd /opt/whatsapp-finance-bot
sudo systemctl stop whatsapp-finance-bot
git pull
npm ci
npm run build
npm run migrate
sudo systemctl start whatsapp-finance-bot
```

### 3. Verificar

```bash
sudo systemctl status whatsapp-finance-bot
```

Deve mostrar `Active: active (running)`.

Ver logs em tempo real:

```bash
journalctl -u whatsapp-finance-bot -f
```

Deve mostrar:
```
Iniciando WhatsApp Finance Bot
WhatsApp conectado
```

### 4. Testar no grupo

Mandar no grupo do WhatsApp:
```
!ajuda
```

Se responder, tá tudo certo.

---

## Se o banco não conectar

Verificar se o container Postgres está rodando:

```bash
docker ps
```

Se não estiver:

```bash
cd /opt/whatsapp-finance-bot
docker compose up -d
```

Testar conexão:

```bash
docker exec postgres-lab17 pg_isready -U postgres
```

---

## Se a sessão do WhatsApp expirar

Sintoma: bot sobe mas não responde, ou log mostra "Sessão encerrada".

```bash
sudo systemctl stop whatsapp-finance-bot
cd /opt/whatsapp-finance-bot
rm -rf auth_info
npm run dev
```

Escanear o QR que aparecer no terminal com o WhatsApp.

Depois que conectar, Ctrl+C e:

```bash
sudo systemctl start whatsapp-finance-bot
```

---

## Se a VM reiniciou e mudou de IP

O IP da VM muda com DHCP. Para descobrir o novo IP:

1. Acessar o painel Proxmox no browser: `https://<ip-do-proxmox>:8006`
2. Clicar na VM 101 (whatsapp-bot)
3. Aba Console → fazer login com `wpp`
4. Rodar `ip addr show` pra ver o IP atual

Para fixar o IP (resolver de vez), editar na VM:

```bash
sudo nano /etc/network/interfaces
```

Trocar a linha `iface ens18 inet dhcp` por:

```
iface ens18 inet static
    address 192.168.1.145/24
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4
```

Salvar e reiniciar rede:

```bash
sudo systemctl restart networking
```

---

## Resumo em uma linha

```
[Windows] lint + build + commit + push  →  [VM] stop + pull + ci + build + migrate + start
```
