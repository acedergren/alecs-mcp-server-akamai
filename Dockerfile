# Lightweight Docker image for ALECS MCP Server
# Supports all transport types: stdio, streamable-http, websocket, sse

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

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy transport modules if they exist
COPY --from=builder /app/src/transport ./src/transport

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R node:node /app

# Use non-root user
USER node

# Expose ports for all transports
EXPOSE 8080 8082 3013

# Set default environment variables
ENV NODE_ENV=production \
    MCP_TRANSPORT=streamable-http \
    HTTP_PORT=8080 \
    HTTP_HOST=0.0.0.0 \
    HTTP_PATH=/mcp \
    CORS_ENABLED=true \
    LOG_LEVEL=info

# Health check that adapts to transport type
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "\
    const transport = process.env.MCP_TRANSPORT || 'stdio'; \
    if (transport === 'streamable-http' || transport === 'http') { \
      const http = require('http'); \
      const port = process.env.HTTP_PORT || 8080; \
      const path = (process.env.HTTP_PATH || '/mcp') + '/health'; \
      http.get('http://localhost:' + port + path, (res) => { \
        process.exit(res.statusCode === 200 ? 0 : 1); \
      }).on('error', () => process.exit(1)); \
    } else if (transport === 'stdio') { \
      process.exit(0); \
    } else if (transport === 'websocket') { \
      const port = process.env.WS_PORT || 8082; \
      require('net').createConnection(port, 'localhost') \
        .on('connect', function() { this.end(); process.exit(0); }) \
        .on('error', () => process.exit(1)); \
    } else { \
      process.exit(1); \
    }"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run the server
CMD ["node", "dist/index.js"]