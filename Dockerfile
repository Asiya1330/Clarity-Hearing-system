# syntax=docker/dockerfile:1

# =============================================================================
# OViz — production-grade, multi-stage image for the Next.js 16 app (npm).
# Runs Next.js "standalone" output as a non-root user on a minimal Alpine base.
# Node 20-alpine satisfies package.json engines ("node": ">=20.9.0").
# =============================================================================

# ---- Stage 1: deps — install full dependencies (dev included; build needs them)
FROM node:20-alpine AS deps
# libc6-compat: some npm packages expect glibc symbols on musl/Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app
# Copy only manifests first for a cache-friendly, reproducible install.
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: builder — compile the Next.js app -----------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public, build-time env. NEXT_PUBLIC_* is INLINED into the client bundle at
# build, so it must be present here. Pass real values via --build-arg or
# docker-compose build.args. (These are public, non-secret values.)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
# Optional: provide SENTRY_AUTH_TOKEN to upload source maps during the build.
ARG SENTRY_AUTH_TOKEN
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN} \
    NEXT_PUBLIC_SENTRY_ENVIRONMENT=${NEXT_PUBLIC_SENTRY_ENVIRONMENT} \
    SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN} \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Stage 3: runner — minimal, non-root runtime ----------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Dedicated non-root user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy ONLY what the standalone server needs. Standalone tracing already bundles
# the minimal node_modules into .next/standalone, so no separate prod install is
# needed — this is what keeps the final image small.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Container health via the app's own probe (200 healthy / 503 if DB unreachable).
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

# Standalone output produces its own server.js (do NOT use `next start` here).
CMD ["node", "server.js"]
