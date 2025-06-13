# Multi-stage build for ALECS MCP Server
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm ci --only=development

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -g 1001 -S alecs && \
    adduser -S alecs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy additional files
COPY README.md ./
COPY LICENSE ./
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create directory for .edgerc
RUN mkdir -p /home/alecs/.akamai && \
    chown -R alecs:alecs /home/alecs/.akamai

# Switch to non-root user
USER alecs

# Use tini as init system with custom entrypoint
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]

# Run the application
CMD ["node", "dist/index.js"]

# Labels
LABEL org.opencontainers.image.source="https://github.com/acedergren/alecs-mcp-server-akamai"
LABEL org.opencontainers.image.description="ALECS - MCP Server for Akamai"
LABEL org.opencontainers.image.licenses="MIT"