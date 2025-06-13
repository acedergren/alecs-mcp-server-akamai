# Akamai MCP Server - Infrastructure Requirements

## For Local Development (Your Laptop)
- **Minimum**: 4GB RAM, 2 CPU cores
- **Storage**: 5GB free space
- **Node.js**: v18+ 
- **OS**: macOS, Linux, or WSL2 on Windows

## For Running the MCP Server

### Option 1: Minimal (Recommended for MVP)
```yaml
# docker-compose.yml
version: '3.8'
services:
  akamai-mcp:
    build: .
    environment:
      - NODE_ENV=production
    volumes:
      - ./config:/app/config
    mem_limit: 512m
    cpus: '1.0'
```

**Cost**: Can run on free tier of most cloud providers

### Option 2: Production-Ready (Later)
- **Server**: 2 vCPU, 4GB RAM
- **Database**: SQLite (file-based) or PostgreSQL
- **Cache**: Redis (optional, 512MB)
- **Estimated Cost**: ~$20-40/month

## Deployment Options for Your Customers

### 1. Single Binary (Simplest)
```bash
# Package with pkg or nexe
npx pkg . --targets node18-macos-x64,node18-linux-x64,node18-win-x64
```

### 2. Docker Image
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "dist/index.js"]
```

### 3. Claude Desktop Integration
```json
{
  "mcpServers": {
    "akamai": {
      "command": "npx",
      "args": ["akamai-mcp"],
      "env": {
        "AKAMAI_HOST": "your-host",
        "AKAMAI_CLIENT_TOKEN": "your-token",
        "AKAMAI_CLIENT_SECRET": "your-secret",
        "AKAMAI_ACCESS_TOKEN": "your-access"
      }
    }
  }
}
```

## Quick Deployment Script
```bash
#!/bin/bash
# deploy.sh - One-click deployment

# Build
npm run build

# Package
docker build -t akamai-mcp:latest .

# Push to registry (optional)
# docker push your-registry/akamai-mcp:latest

echo "Deployment complete! Run with:"
echo "docker run -it --env-file .env akamai-mcp:latest"
```

## Infrastructure You DON'T Need (Yet)
- ❌ Kubernetes
- ❌ Service mesh
- ❌ Multiple databases
- ❌ Message queues
- ❌ Monitoring stack
- ❌ CI/CD pipeline

Keep it simple for the MVP!