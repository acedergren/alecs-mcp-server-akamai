# Multi-stage Dockerfile for ALECS MCP Server
# Stage 1: Builder
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Stage 2: Production dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 3: Final runtime image
FROM node:20-alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache tini

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S alecs && \
    adduser -S alecs -u 1001 -G alecs

# Copy built application and dependencies
COPY --from=deps --chown=alecs:alecs /app/node_modules ./node_modules
COPY --from=builder --chown=alecs:alecs /app/dist ./dist
COPY --chown=alecs:alecs package*.json ./

# Copy entrypoint script
COPY --chown=alecs:alecs build/docker/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create directories for .edgerc
RUN mkdir -p /home/alecs/.akamai && \
    chown -R alecs:alecs /home/alecs

# Switch to non-root user
USER alecs

# Set environment
ENV NODE_ENV=production
ENV EDGERC_PATH=/home/alecs/.edgerc

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]

# Default command (can be overridden)
CMD ["node", "dist/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Labels
LABEL org.opencontainers.image.source="https://github.com/acedergren/alecs-mcp-server-akamai"
LABEL org.opencontainers.image.description="ALECS - MCP Server for Akamai Edge & Cloud Services Management"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.version="1.4.0"
LABEL org.opencontainers.image.vendor="ALECS"
LABEL org.opencontainers.image.title="ALECS MCP Server"