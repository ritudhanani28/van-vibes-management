# ==============================================================================
# Production Multi-Stage Dockerfile (Next.js Standalone - Management Portal)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies Caching
# ------------------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json .npmrc* ./
RUN npm ci --legacy-peer-deps

# ------------------------------------------------------------------------------
# Stage 2: Application Build
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

ARG NEXT_PUBLIC_API_URL=http://localhost:9000/api/v1
ARG NEXT_PUBLIC_WS_URL=ws://localhost:9000/api/v1/ws/orders
ARG NEXT_PUBLIC_CUSTOMER_FRONTEND_URL=http://localhost:4000

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
    NEXT_PUBLIC_CUSTOMER_FRONTEND_URL=${NEXT_PUBLIC_CUSTOMER_FRONTEND_URL}

RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Runtime (Port 4001)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4001 \
    HOSTNAME="0.0.0.0"

# Create non-root user for security hardening
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone server bundle
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 4001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:4001/api/health || exit 1

CMD ["node", "server.js"]
