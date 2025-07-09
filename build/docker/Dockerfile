# Multi-stage build for smaller image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

# Install PM2
RUN npm install -g pm2

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy necessary files
COPY ecosystem.config.js ./
COPY start-sse-server.js ./
COPY start-websocket-server.js ./

# Create directories with proper ownership
RUN mkdir -p data logs && chown -R node:node /app

# Use non-root user
USER node

# Expose ports for all transports
# 8080: Streamable HTTP (default for web/CDN)
# 8082: WebSocket
# 3013: SSE (legacy)
EXPOSE 8080 8082 3013

# Dynamic health check based on transport type
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD node -e "\
    const transport = process.env.MCP_TRANSPORT || 'stdio'; \
    if (transport === 'streamable-http' || transport === 'http') { \
      require('http').get('http://localhost:' + (process.env.HTTP_PORT || 8080) + '/mcp/health', \
        (r) => process.exit(r.statusCode === 200 ? 0 : 1)); \
    } else if (transport === 'stdio') { \
      process.exit(0); \
    } else { \
      process.exit(1); \
    }"

# Default to stdio transport for backward compatibility
ENV MCP_TRANSPORT=stdio

CMD ["pm2-runtime", "start", "ecosystem.config.js"]