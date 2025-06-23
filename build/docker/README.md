# Docker Build Guide

This directory contains Docker configurations for different deployment scenarios of the Alecs MCP
Server.

## Available Images

### 1. Main Image (All-in-One)

- **Dockerfile**: `Dockerfile`
- **Description**: Contains all server types, runs with PM2
- **Use Case**: Development or when you want everything in one container
- **Size**: ~300MB
- **Ports**: 3000-3013, 8082

### 2. Essential Image

- **Dockerfile**: `Dockerfile.essential`
- **Description**: Lightweight image with only essential tools (Property & DNS)
- **Use Case**: Production deployments with basic Akamai management
- **Size**: ~150MB
- **Port**: 3001

### 3. WebSocket Image

- **Dockerfile**: `Dockerfile.websocket`
- **Description**: WebSocket transport for remote MCP access
- **Use Case**: Remote access from Claude Desktop or other MCP clients
- **Size**: ~180MB
- **Port**: 8082

### 4. SSE Image

- **Dockerfile**: `Dockerfile.sse`
- **Description**: Server-Sent Events transport for HTTP-based MCP access
- **Use Case**: Claude Desktop compatibility, firewall-friendly
- **Size**: ~180MB
- **Port**: 3013

## Building Images

### Build All Images

```bash
make docker-build
```

### Build Individual Images

```bash
make docker-build-main       # Main all-in-one image
make docker-build-essential  # Essential tools only
make docker-build-websocket  # WebSocket server
make docker-build-sse        # SSE server
```

## Running Containers

### Docker Compose Files

1. **docker-compose.yml** (in root)

   - Runs the main all-in-one container
   - Includes all server types

2. **docker-compose.essential.yml**

   - Runs only the essential server
   - Minimal resource usage

3. **docker-compose.remote.yml**
   - Runs WebSocket and SSE servers
   - For remote MCP access

### Run Commands

```bash
# Main server (all features)
docker-compose up -d

# Essential server only
docker-compose -f build/docker/docker-compose.essential.yml up -d

# Remote access servers (WebSocket + SSE)
docker-compose -f build/docker/docker-compose.remote.yml up -d
```

## CI/CD Integration

The GitHub Actions workflow automatically builds and publishes all Docker images on release:

- `ghcr.io/acedergren/alecs-mcp-server-akamai:latest`
- `ghcr.io/acedergren/alecs-mcp-server-akamai:essential-latest`
- `ghcr.io/acedergren/alecs-mcp-server-akamai:websocket-latest`
- `ghcr.io/acedergren/alecs-mcp-server-akamai:sse-latest`

Version-tagged images are also created (e.g., `essential-1.4.3`).

## Environment Variables

### Common

- `NODE_ENV`: production/development
- `EDGERC_PATH`: Path to .edgerc file (for Akamai auth)

### Remote Access

- `TOKEN_MASTER_KEY`: Master key for token generation
- `ALECS_WS_PORT`: WebSocket port (default: 8082)
- `ALECS_SSE_PORT`: SSE port (default: 3013)

## Deployment Examples

### Local Development

```bash
# Build and run everything
make docker-build-main
docker-compose up
```

### Production - Essential Only

```bash
# Pull from registry
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:essential-latest

# Or build locally
make docker-build-essential
docker-compose -f build/docker/docker-compose.essential.yml up -d
```

### Remote Access Setup

```bash
# For Claude Desktop access
make docker-build-websocket docker-build-sse
docker-compose -f build/docker/docker-compose.remote.yml up -d

# Check logs
docker logs alecs-mcp-websocket
docker logs alecs-mcp-sse
```

## Health Checks

All images include health checks:

- Main: `http://localhost:3000/health`
- Essential: `http://localhost:3001/health`
- WebSocket: `http://localhost:8082/health`
- SSE: `http://localhost:3013/health`

## Optimization Tips

1. **Use specific images** instead of the all-in-one for production
2. **Mount .edgerc** as read-only volume for security
3. **Use environment variables** for configuration
4. **Enable Docker BuildKit** for faster builds: `DOCKER_BUILDKIT=1`
5. **Use multi-stage builds** to reduce image size (already implemented)
