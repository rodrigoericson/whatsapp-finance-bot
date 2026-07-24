# Checklist de Code Review

## Correção

- [ ] A mudança resolve o problema certo?
- [ ] Casos de borda foram considerados?
- [ ] Erros são tratados no nível correto?
- [ ] Não há regressão óbvia?

## Simplicidade

- [ ] Não há overengineering?
- [ ] Não há abstração prematura?
- [ ] Código morto foi evitado/removido?
- [ ] Nomes são claros?

## Segurança

- [ ] Inputs externos são validados?
- [ ] Secrets não são logados/retornados?
- [ ] Auth/autorização está correta?
- [ ] Não há path traversal, command injection, SQL injection, XSS, SSRF?

## Testes

- [ ] Testes cobrem fluxo feliz?
- [ ] Testes cobrem falhas importantes?
- [ ] Testes não mockam demais?
- [ ] Testes são determinísticos?

## Frontend/UI

- [ ] Estados loading/error/empty existem?
- [ ] Formulários validam corretamente?
- [ ] Acessibilidade básica está ok?
- [ ] Foi testado no browser?

## Operação

- [ ] Logs são úteis e não expõem dados sensíveis?
- [ ] Métricas/auditoria necessárias foram consideradas?
- [ ] Migrações são reversíveis?
- [ ] Configuração/deploy foram atualizados?
