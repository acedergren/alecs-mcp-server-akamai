# Docker Deployment Guide for ALECS MCP Server

This guide covers Docker deployment options for ALECS MCP Server with all supported transport types.

## Table of Contents
- [Quick Start](#quick-start)
- [Transport Types](#transport-types)
- [Docker Images](#docker-images)
- [Docker Compose Examples](#docker-compose-examples)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Build and Run with Default Transport (Streamable HTTP)

```bash
# Build the image
docker build -t alecs-mcp-server .

# Run with streamable HTTP transport (recommended for web/CDN)
docker run -d \
  --name alecs \
  -p 8080:8080 \
  -v ~/.edgerc:/root/.edgerc:ro \
  -e MCP_TRANSPORT=streamable-http \
  alecs-mcp-server
```

### Using Docker Compose

```bash
# Default configuration (streamable HTTP)
docker-compose up -d

# Specific transport
docker-compose -f docker-compose.websocket.yml up -d
```

## Transport Types

### 1. Streamable HTTP (Recommended for Web/CDN)

**Use Case**: Web applications, CDN deployment, browser-based clients

```bash
docker run -d \
  --name alecs-http \
  -p 8080:8080 \
  -e MCP_TRANSPORT=streamable-http \
  -e HTTP_PORT=8080 \
  -e CORS_ENABLED=true \
  alecs-mcp-server
```

**Features**:
- HTTP POST for client-to-server messages
- Server-Sent Events (SSE) for server-to-client streaming
- CORS support for browser clients
- Stateless design for CDN compatibility
- Built-in health check endpoint

### 2. STDIO (For Claude Desktop)

**Use Case**: Claude Desktop, CLI tools, local development

```bash
docker run -it \
  --name alecs-stdio \
  -v ~/.edgerc:/root/.edgerc:ro \
  -e MCP_TRANSPORT=stdio \
  alecs-mcp-server
```

**Features**:
- Standard input/output communication
- No network ports required
- Interactive terminal support
- Perfect for desktop integration

### 3. WebSocket

**Use Case**: Real-time applications, bidirectional communication

```bash
docker run -d \
  --name alecs-websocket \
  -p 8082:8082 \
  -e MCP_TRANSPORT=websocket \
  -e WS_PORT=8082 \
  -e AUTH_TYPE=token \
  -e TOKEN_MASTER_KEY=your-secret-key \
  alecs-mcp-server
```

**Features**:
- Full-duplex communication
- Low latency
- Session management
- Token authentication support

### 4. SSE (Legacy - Deprecated)

**Use Case**: Legacy compatibility only

```bash
docker run -d \
  --name alecs-sse \
  -p 3013:3013 \
  -e MCP_TRANSPORT=sse \
  alecs-mcp-server
```

## Docker Images

### Official Dockerfile

The main `Dockerfile` creates a lightweight Alpine-based image with:
- Multi-stage build for smaller size
- Non-root user execution
- Health check support
- All transport types included

### Building Custom Images

```bash
# Production build with specific base image
docker build \
  --build-arg NODE_VERSION=20 \
  --target production \
  -t alecs-mcp-server:custom .

# Development build with debugging tools
docker build \
  --target builder \
  -t alecs-mcp-server:dev .
```

## Docker Compose Examples

### Basic HTTP Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  alecs:
    image: alecs-mcp-server
    ports:
      - "8080:8080"
    environment:
      - MCP_TRANSPORT=streamable-http
    volumes:
      - ~/.edgerc:/root/.edgerc:ro
```

### Multi-Transport Deployment

```yaml
# docker-compose.multi.yml
version: '3.8'
services:
  alecs-http:
    image: alecs-mcp-server
    ports:
      - "8080:8080"
    environment:
      - MCP_TRANSPORT=streamable-http
      
  alecs-websocket:
    image: alecs-mcp-server
    ports:
      - "8082:8082"
    environment:
      - MCP_TRANSPORT=websocket
```

### Production with Traefik

See `docker-compose.production.yml` for a complete production setup with:
- Traefik reverse proxy
- SSL/TLS termination
- Load balancing
- Monitoring stack
- Log aggregation

## Environment Variables

### Core Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MCP_TRANSPORT` | Transport type | `streamable-http` |
| `LOG_LEVEL` | Logging level | `info` |
| `LOG_FORMAT` | Log format (json/pretty) | `json` |

### Streamable HTTP Transport

| Variable | Description | Default |
|----------|-------------|---------|
| `HTTP_PORT` | Server port | `8080` |
| `HTTP_HOST` | Bind address | `0.0.0.0` |
| `HTTP_PATH` | URL path prefix | `/mcp` |
| `CORS_ENABLED` | Enable CORS | `true` |
| `AUTH_TYPE` | Authentication type | `none` |

### WebSocket Transport

| Variable | Description | Default |
|----------|-------------|---------|
| `WS_PORT` | WebSocket port | `8082` |
| `WS_HOST` | Bind address | `0.0.0.0` |
| `WS_PATH` | WebSocket path | `/mcp` |
| `AUTH_TYPE` | Authentication type | `token` |
| `SSL_ENABLED` | Enable SSL/TLS | `false` |

### Akamai Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `EDGERC_PATH` | Path to .edgerc file | `/root/.edgerc` |
| `AKAMAI_CUSTOMER` | Default customer section | `default` |

## Health Checks

### Streamable HTTP Health Check

```bash
# Check health endpoint
curl http://localhost:8080/mcp/health

# Response
{
  "status": "healthy",
  "transport": "streamable-http",
  "sessionId": "...",
  "protocolVersion": "2025-06-18",
  "uptime": 123.456
}
```

### Docker Health Check

All transports include appropriate health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD [dynamic based on transport type]
```

## Production Deployment

### 1. Security Considerations

```yaml
# Use secrets for sensitive data
secrets:
  token_key:
    external: true
  edgerc:
    file: ~/.edgerc

services:
  alecs:
    secrets:
      - token_key
      - edgerc
```

### 2. Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 256M
```

### 3. Scaling

```bash
# Scale HTTP service
docker-compose up -d --scale alecs-http=3

# With Docker Swarm
docker service scale alecs_http=5
```

### 4. Monitoring

The production compose file includes:
- Prometheus for metrics
- Grafana for visualization
- Loki for log aggregation
- Promtail for log shipping

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :8080
   
   # Use different port
   docker run -p 8081:8080 -e HTTP_PORT=8080 alecs-mcp-server
   ```

2. **Permission Denied on .edgerc**
   ```bash
   # Fix permissions
   chmod 600 ~/.edgerc
   
   # Or copy to Docker-friendly location
   cp ~/.edgerc ./edgerc
   docker run -v ./edgerc:/root/.edgerc:ro alecs-mcp-server
   ```

3. **Health Check Failing**
   ```bash
   # Check logs
   docker logs alecs
   
   # Test health endpoint manually
   docker exec alecs wget -O- http://localhost:8080/mcp/health
   ```

### Debug Mode

```bash
# Run with debug logging
docker run -it \
  -e LOG_LEVEL=debug \
  -e NODE_ENV=development \
  alecs-mcp-server

# Interactive shell for debugging
docker run -it --entrypoint /bin/sh alecs-mcp-server
```

### Container Logs

```bash
# View logs
docker logs -f alecs

# Export logs
docker logs alecs > alecs.log 2>&1

# With timestamps
docker logs -t alecs
```

## Best Practices

1. **Always use specific image tags in production**
   ```yaml
   image: alecs-mcp-server:1.7.4
   ```

2. **Mount .edgerc as read-only**
   ```yaml
   volumes:
     - ~/.edgerc:/root/.edgerc:ro
   ```

3. **Use environment variable files**
   ```bash
   docker run --env-file .env alecs-mcp-server
   ```

4. **Regular health monitoring**
   ```bash
   # Monitor health status
   watch -n 5 'curl -s localhost:8080/mcp/health | jq .'
   ```

5. **Implement log rotation**
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

## Advanced Configurations

### Custom Network Configuration

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true

services:
  alecs:
    networks:
      - frontend
      - backend
```

### Using Docker Secrets

```bash
# Create secret
echo "my-token-key" | docker secret create token_key -

# Use in service
services:
  alecs:
    secrets:
      - token_key
    environment:
      - TOKEN_MASTER_KEY_FILE=/run/secrets/token_key
```

### Multi-Stage Deployment

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## Support

For issues or questions:
- Check logs: `docker logs alecs`
- Review health status: `curl http://localhost:8080/mcp/health`
- See [Transport Guide](./TRANSPORT_GUIDE.md) for transport-specific details
- Submit issues to the GitHub repository