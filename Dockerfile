# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build (TypeScript → JavaScript)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL deps (including devDeps needed for tsc)
RUN npm ci --legacy-peer-deps

# Copy source
COPY src/ ./src/
COPY public/ ./public/

# Compile TypeScript
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Production image (lean)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Set prod environment
ENV NODE_ENV=production

# Copy manifests and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy compiled output + static assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Cloud Run injects PORT at runtime (defaults to 8080)
# Our server reads process.env.PORT, so this just works.
EXPOSE 8080

# Use compiled JS entrypoint
CMD ["node", "dist/index.js"]
