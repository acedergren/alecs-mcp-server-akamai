# Docker Build Guide

This directory contains Docker configurations for different deployment scenarios of the ALECS MCP Server.

## 🎯 Recommended: Modular Images

**Use modular images to load only the tools you need:**

```bash
# For domain-specific servers (Property, DNS, Security)
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:modular-latest

# For minimal Property-only operations  
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:essential-latest
```

Modular deployment prevents tool overload and gives you precise control over which Akamai services to expose.

## Available Images

### 1. Main Image (PM2 All-in-One)

- **Dockerfile**: `Dockerfile`
- **Description**: Contains all server types, runs with PM2 process manager
- **Use Case**: Development or when you want everything in one container
- **Size**: ~300MB
- **Ports**: 3000-3013, 8082

### 2. Full Image (180+ Tools) - Advanced Use Cases

- **Dockerfile**: `Dockerfile.full`
- **Description**: Complete single-process server with all 180+ tools
- **Use Case**: Advanced scenarios, works well with Claude Code but may overwhelm Claude Desktop
- **Size**: ~250MB
- **Port**: 3000
- **Note**: Best for Claude Code with its higher context limits, comprehensive API exploration

### 3. Essential Image (15 Tools)

- **Dockerfile**: `Dockerfile.essential`
- **Description**: Lightweight image with core tools (Property, DNS, Certificates, FastPurge,
  Reporting)
- **Use Case**: Production deployments with basic Akamai management
- **Size**: ~150MB
- **Port**: 3001

### 4. Modular Image (Domain-Specific)

- **Dockerfile**: `Dockerfile.modular`
- **Description**: Runs 3 focused servers: Property (3010), DNS (3011), Security (3012)
- **Use Case**: Microservices architecture, isolated functionality
- **Size**: ~200MB
- **Ports**: 3010, 3011, 3012

### 5. Minimal Image (3 Tools)

- **Dockerfile**: `Dockerfile.minimal`
- **Description**: Ultra-lightweight with only 3 basic property tools
- **Use Case**: Testing, troubleshooting, minimal deployments
- **Size**: ~100MB
- **Port**: 3002

### 6. WebSocket Image

- **Dockerfile**: `Dockerfile.websocket`
- **Description**: WebSocket transport for remote MCP access
- **Use Case**: Remote access from Claude Desktop or other MCP clients
- **Size**: ~180MB
- **Port**: 8082

### 7. SSE Image

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
make docker-build-main       # Main PM2 all-in-one image
make docker-build-full       # Full server (180+ tools)
make docker-build-essential  # Essential tools (15 tools)
make docker-build-modular    # Modular servers (domain-specific)
make docker-build-minimal    # Minimal server (3 tools)
make docker-build-websocket  # WebSocket server
make docker-build-sse        # SSE server
```

## Running Containers

### Docker Compose Files

1. **docker-compose.yml** (in root) - Main PM2 all-in-one container
2. **docker-compose.full.yml** - Full server (180+ tools)
3. **docker-compose.essential.yml** - Essential server (15 tools)
4. **docker-compose.modular.yml** - Modular servers (Property/DNS/Security)
5. **docker-compose.minimal.yml** - Minimal server (3 tools)
6. **docker-compose.remote.yml** - Remote access (WebSocket + SSE)

### Run Commands

```bash
# Main server (PM2 all features)
make docker-run

# Full server (single process, 180+ tools)
make docker-run-full

# Essential server (15 core tools)
make docker-run-essential

# Modular servers (domain-specific)
make docker-run-modular

# Minimal server (3 tools for testing)
make docker-run-minimal

# Remote access servers (WebSocket + SSE)
make docker-run-remote
```

## CI/CD Integration

The GitHub Actions workflow automatically builds and publishes all Docker images on release:

- `ghcr.io/acedergren/alecs-mcp-server-akamai:latest` (Main PM2)
- `ghcr.io/acedergren/alecs-mcp-server-akamai:full-latest` (180+ tools)
- `ghcr.io/acedergren/alecs-mcp-server-akamai:essential-latest` (15 tools)
- `ghcr.io/acedergren/alecs-mcp-server-akamai:modular-latest` (Domain-specific)
- `ghcr.io/acedergren/alecs-mcp-server-akamai:minimal-latest` (3 tools)
- `ghcr.io/acedergren/alecs-mcp-server-akamai:websocket-latest` (Remote WebSocket)
- `ghcr.io/acedergren/alecs-mcp-server-akamai:sse-latest` (Remote SSE)

Version-tagged images are also created (e.g., `essential-1.4.3`, `full-1.4.3`).

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
