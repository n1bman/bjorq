# ── Stage 1: Build frontend ──────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /build

# Install frontend dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source files needed for build
COPY src/ src/
COPY public/ public/
COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts tailwind.config.ts postcss.config.js ./

# Build frontend
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy built frontend
COPY --from=build /build/dist ./dist

# Copy server and install production deps
COPY server/ ./server/
RUN cd server && npm install --omit=dev

# Environment
ENV PORT=3000
ENV BJORQ_DATA_DIR=/data

# Expose dashboard port
EXPOSE 3000

# Start server
CMD ["node", "server/server.js"]
