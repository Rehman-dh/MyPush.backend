# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for the push-notification dashboard/API.
# Pattern copied from DH-HRMS's self-hosted Next.js Dockerfile
# (Devhouse-assets/Web.Frontend.DH-HRMS).
#
# Build context is the repo root's `dashboard/` folder (see ../docker-compose.yml).

# ── Stage 1: dependencies ─────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ── Stage 2: build ────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars must be present at build time (baked into the JS bundle).
# Server-only secrets (SUPABASE_SERVICE_ROLE_KEY, CREDENTIALS_ENCRYPTION_KEY,
# etc.) are NOT needed here — read from env at runtime.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NODE_ENV=production

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ── Stage 3: runtime ──────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# copy the minimal standalone output (next.config.mjs sets output: "standalone")
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
