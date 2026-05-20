# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: Builder
# Prisma generates its client at build time — we pass a dummy DATABASE_URL
# so `prisma generate` succeeds. The real URL is injected at runtime only.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy DATABASE_URL used ONLY for `prisma generate` — never baked into image
ARG DATABASE_URL="postgresql://build:build@build/build"
ENV DATABASE_URL=$DATABASE_URL

# Generate Prisma client (requires DATABASE_URL format, not actual connection)
RUN npx prisma generate

# Build Next.js — NEXTAUTH_SECRET/URL not needed at build time for App Router
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3: Runtime image
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only what's needed for production
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Real DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL must be provided at runtime
# e.g. docker run -e DATABASE_URL=... -e NEXTAUTH_SECRET=... -e NEXTAUTH_URL=...
CMD ["node", "server.js"]
