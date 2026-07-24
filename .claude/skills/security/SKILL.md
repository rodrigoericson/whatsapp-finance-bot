---
name: security
description: Use para revisar autenticação, autorização, secrets, criptografia, validação de entrada, logs sensíveis, OWASP e integrações externas.
---

# Security Skill

## Regras absolutas

- Nunca commitar secrets.
- Nunca logar senha, token, chave privada ou connection string.
- Nunca retornar secrets em DTO/API.
- Nunca expor stack trace em produção.
- Validar entradas nas fronteiras externas.

## Checklist OWASP prático

1. **Broken Access Control** — endpoint tem autorização correta?
2. **Cryptographic Failures** — secrets protegidos? TLS? hashing correto?
3. **Injection** — SQL/command/path/template injection?
4. **Insecure Design** — fluxo permite abuso mesmo sem bug técnico?
5. **Security Misconfiguration** — CORS, headers, debug, env vars?
6. **Vulnerable Components** — libs atualizadas?
7. **Auth Failures** — lockout, expiração, sessão, MFA quando necessário?
8. **Data Integrity** — idempotência, auditoria, replay?
9. **Logging Failures** — logs úteis e seguros?
10. **SSRF** — URLs/hosts externos controlados por usuário?

## Validação de entrada

- Preferir allowlist quando possível.
- Paths: bloquear traversal por segmento, não só substring ingênua.
- Regex: evitar regex arbitrária do usuário; preferir glob simples.
- URLs: validar esquema, host permitido e redirects.
- Arquivos: validar extensão/tamanho/local seguro.

## Mensagens de erro

Cliente recebe:

```text
Erro ao executar operação. Verifique permissões e configuração.
```

Servidor loga detalhe técnico.

## Credenciais

- Dev: arquivo local gitignored.
- Prod: env var, secret manager ou vault.
- Rotacionar credencial colada em chat, issue ou log.
- Em integração externa, registrar só identificador não sensível.

## Code review de segurança

Sempre revisar quando mexer em:

- auth/login/JWT/session
- upload/download/arquivos
- comandos externos/processos
- conexão com banco
- integrações HTTP/FTP/SFTP/FTPS
- permissões/roles
- logs/auditoria
