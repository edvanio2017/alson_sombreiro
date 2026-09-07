# =============================================================================
# API NestJS: imagem multi-estágio
# O contexto de build é a raiz do monorepo (ver docker-compose.yml).
# =============================================================================

FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache openssl
WORKDIR /app

# --- Dependências ------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --no-frozen-lockfile

# --- Desenvolvimento ---------------------------------------------------------
FROM deps AS development
COPY . .
RUN pnpm --filter @alson/shared build \
 && pnpm --filter @alson/api prisma:generate
WORKDIR /app/apps/api
EXPOSE 3333
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm dev"]

# --- Build de produção -------------------------------------------------------
FROM deps AS builder
COPY . .
RUN pnpm --filter @alson/shared build \
 && pnpm --filter @alson/api prisma:generate \
 && pnpm --filter @alson/api build

# --- Produção ----------------------------------------------------------------
FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
WORKDIR /app/apps/api
EXPOSE 3333
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
