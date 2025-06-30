# Multi-stage build for smaller image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files  
COPY package*.json ./

# Copy source code and configs first
COPY . .

# Install all dependencies
RUN npm ci

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

# Install PM2
RUN npm install -g pm2

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (skip prepare script)
ENV NPM_CONFIG_IGNORE_SCRIPTS=true
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy necessary files
COPY ecosystem.config.js ./
COPY start-sse-server.js ./
COPY start-websocket-server.js ./

# Create directories
RUN mkdir -p data logs

# Use non-root user
USER node

# Expose ports
EXPOSE 3000 3010 3011 3012 3013 8082

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["pm2-runtime", "start", "ecosystem.config.js"]