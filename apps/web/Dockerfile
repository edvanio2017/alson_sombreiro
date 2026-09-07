# =============================================================================
# Site institucional (Nuxt 4 · SSR) — imagem multi-estágio de produção.
# O contexto de build é a raiz do monorepo (por causa do workspace @alson/shared).
# =============================================================================

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Dependências ------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --no-frozen-lockfile

# --- Build -------------------------------------------------------------------
FROM deps AS builder
COPY . .
RUN pnpm --filter @alson/shared build \
 && pnpm --filter @alson/web build

# --- Produção ----------------------------------------------------------------
# O `.output` do Nuxt/Nitro é auto-contido: já traz os node_modules de runtime.
FROM base AS production
ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/apps/web/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
