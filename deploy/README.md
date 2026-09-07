# Deploy — Alson Sombreiro

Pipeline **build no GitHub → GHCR → servidor puxa e arranca**.

## Fluxo

1. Push para qualquer branch → workflow **CI** (`.github/workflows/ci.yml`): lint, build, testes.
2. Push para a branch **`prod`** → workflow **Deploy** (`.github/workflows/deploy.yml`):
   - Constrói as 3 imagens (`api`, `web`, `admin`) e publica no GHCR.
   - Liga-se por SSH ao servidor `2.28.31.222` e corre `docker compose pull && up -d`.

Para publicar: fazer merge/push do que está em `main` para `prod`.

```bash
git checkout prod && git merge main && git push origin prod
```

## Servidor (2.28.31.222)

- Ubuntu 26.04, Docker + Compose instalados.
- Aplicação em `/opt/alson/` (`docker-compose.prod.yml`, `Caddyfile`, `.env`).
- **Caddy** termina o TLS com HTTPS automático (Let's Encrypt):
  - `alsonsombreiro.ao` / `www` → site (web)
  - `admin.alsonsombreiro.ao` → backoffice (admin)
  - `api.alsonsombreiro.ao` → API
- Os certificados só são emitidos depois de o DNS de cada domínio apontar para o servidor.

## Segredos do GitHub (Settings → Secrets → Actions)

| Segredo | Valor |
|---------|-------|
| `SSH_HOST` | `2.28.31.222` |
| `SSH_USER` | `root` |
| `SSH_PRIVATE_KEY` | chave privada de deploy (par ed25519) |

`GITHUB_TOKEN` (automático) autentica o pull das imagens do GHCR — não precisa de PAT.

## Variáveis de produção

Ver `deploy/.env.production.example`. O ficheiro real vive em `/opt/alson/.env`
no servidor e **não** é versionado. Falta preencher o **SMTP** (`MAIL_*`) para os
e-mails do formulário de contacto funcionarem.

## Operação manual no servidor

```bash
cd /opt/alson
docker compose -f docker-compose.prod.yml --env-file .env ps
docker compose -f docker-compose.prod.yml --env-file .env logs -f api
docker compose -f docker-compose.prod.yml --env-file .env up -d   # aplicar alterações
```
