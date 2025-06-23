FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --production

# Copy built application
COPY dist ./dist
COPY ecosystem.config.js ./
COPY start-sse-server.js ./
COPY start-websocket-server.js ./

# Create data directory
RUN mkdir -p data logs

# Expose ports
EXPOSE 3000 3010 3011 3012 3013 8082

# Use PM2 runtime
RUN npm install -g pm2

CMD ["pm2-runtime", "start", "ecosystem.config.js"]