# Use Node.js LTS version
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src ./src

# Build the application
RUN npm run build

# Remove dev dependencies and source files to reduce image size
RUN npm prune --production && \
    rm -rf src tsconfig.json

# Create non-root user
RUN useradd -r -u 1001 -g root mcp-user && \
    chown -R mcp-user:root /app

# Switch to non-root user
USER mcp-user

# Expose the port (MCP uses stdio, but this is for documentation)
EXPOSE 3000

# Run the server
CMD ["node", "dist/index.js"]