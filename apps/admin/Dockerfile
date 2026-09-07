# =============================================================================
# Backoffice / Mini CRM (Nuxt 4 · SPA) — imagem multi-estágio de produção.
# ssr:false, mas servido pelo servidor Nitro para ler a config em runtime.
# O contexto de build é a raiz do monorepo (por causa do workspace @alson/shared).
# =============================================================================

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Dependências ------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --no-frozen-lockfile

# --- Build -------------------------------------------------------------------
FROM deps AS builder
COPY . .
RUN pnpm --filter @alson/shared build \
 && pnpm --filter @alson/admin build

# --- Produção ----------------------------------------------------------------
FROM base AS production
ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/apps/admin/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
