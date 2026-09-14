# Multi-Stage Production Dockerfile for Bun Elysia Backend
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Step 1: Install dependencies
FROM base AS dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Step 2: Final minimal runtime image
FROM base AS runner
WORKDIR /app

# Create non-root user for security (Least Privilege Principle)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

ENV NODE_ENV=production
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["bun", "run", "src/index.ts"]
