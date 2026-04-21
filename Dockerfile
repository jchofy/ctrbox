# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM mcr.microsoft.com/playwright:v1.52.0-noble AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy Next.js standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Rebuild better-sqlite3 native module for this image
COPY --from=deps /app/package.json /app/package-lock.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm rebuild better-sqlite3 && \
    cp -r node_modules/better-sqlite3 .next/server/node_modules/better-sqlite3 2>/dev/null || true

# Create persistent data directory
RUN mkdir -p /app/data/profiles

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["node", "server.js"]
