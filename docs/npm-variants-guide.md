# NPM Package Variants Guide

## Overview

The `alecs-mcp-server-akamai` NPM package includes multiple server variants that can be started directly from the installed package. This guide explains how to run each variant.

## Installation

```bash
# Install globally
npm install -g alecs-mcp-server-akamai

# Or use npx (no installation required)
npx alecs-mcp-server-akamai
```

## Available Variants

### 1. Main Server (All Tools)
The default server includes all 198+ tools in a single process.

```bash
# Using global install
alecs

# Using npx
npx alecs-mcp-server-akamai

# With specific transport
MCP_TRANSPORT=stdio alecs
MCP_TRANSPORT=websocket alecs
MCP_TRANSPORT=sse alecs
```

### 2. Modular Servers (Service-Specific)
Run individual services for better resource management and scalability.

```bash
# Property Management Server
alecs start:property

# DNS Management Server  
alecs start:dns

# Certificate Management Server
alecs start:certs

# Reporting Server
alecs start:reporting

# Security Server (Network Lists)
alecs start:security

# Application Security Server
alecs start:appsec

# Fast Purge Server
alecs start:fastpurge

# Network Lists Server
alecs start:network-lists
```

Or using npx without installation:

```bash
npx alecs-mcp-server-akamai start:property
npx alecs-mcp-server-akamai start:dns
# ... etc
```

## Using npm scripts directly

If you've cloned the repository:

```bash
# Install dependencies first
npm install

# Build the project
npm run build

# Then run any variant
npm run start              # Main server
npm run start:stdio        # Main server with stdio transport
npm run start:websocket    # Main server with websocket transport
npm run start:sse          # Main server with SSE transport
npm run start:property     # Property management only
npm run start:dns          # DNS management only
# ... etc
```

## Configuration for AI Tools

### Claude Desktop - Main Server
```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "npx",
      "args": ["alecs-mcp-server-akamai"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### Claude Desktop - Modular Property Server
```json
{
  "mcpServers": {
    "alecs-property": {
      "command": "npx",
      "args": ["alecs-mcp-server-akamai", "start:property"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### Claude Desktop - Multiple Modular Servers
```json
{
  "mcpServers": {
    "alecs-property": {
      "command": "npx",
      "args": ["alecs-mcp-server-akamai", "start:property"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    },
    "alecs-dns": {
      "command": "npx",
      "args": ["alecs-mcp-server-akamai", "start:dns"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    },
    "alecs-certs": {
      "command": "npx",
      "args": ["alecs-mcp-server-akamai", "start:certs"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

## Transport Options

### STDIO (Default - Recommended for AI Tools)
```bash
MCP_TRANSPORT=stdio npx alecs-mcp-server-akamai
```

### WebSocket (For network-based clients)
```bash
MCP_TRANSPORT=websocket MCP_WEBSOCKET_PORT=8080 npx alecs-mcp-server-akamai
```

### Server-Sent Events (For web-based clients)
```bash
MCP_TRANSPORT=sse MCP_SSE_PORT=8081 npx alecs-mcp-server-akamai
```

## Environment Variables

All variants support these environment variables:

- `MCP_TRANSPORT`: Transport type (stdio, websocket, sse)
- `MCP_WEBSOCKET_PORT`: WebSocket server port (default: 8080)
- `MCP_SSE_PORT`: SSE server port (default: 8081)
- `EDGERC_PATH`: Path to .edgerc file (default: ~/.edgerc)
- `AKAMAI_CUSTOMER`: Default customer section (default: "default")
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Performance Considerations

### When to use Modular Servers

1. **Resource Constraints**: Each modular server uses ~50-100MB RAM vs ~256MB for the full server
2. **Specific Use Cases**: If you only need DNS management, run just the DNS server
3. **Scaling**: Run multiple instances of heavily-used services
4. **Security**: Limit tool exposure by running only needed services

### Recommended Configurations

**For Development**:
```bash
# Full server for complete functionality
npx alecs-mcp-server-akamai
```

**For Production - Light Usage**:
```bash
# Run only the services you need
npx alecs-mcp-server-akamai start:property
npx alecs-mcp-server-akamai start:dns
```

**For Production - Heavy Usage**:
Use Docker or PM2 for process management:
```bash
# Using PM2
pm2 start "npx alecs-mcp-server-akamai start:property" --name alecs-property
pm2 start "npx alecs-mcp-server-akamai start:dns" --name alecs-dns
```

## Troubleshooting

### Command not found
```bash
# Ensure global npm bin is in PATH
export PATH="$PATH:$(npm bin -g)"

# Or use npx directly
npx alecs-mcp-server-akamai
```

### Module not found errors
```bash
# Clear npm cache and reinstall
npm cache clean --force
npm install -g alecs-mcp-server-akamai
```

### Transport errors
```bash
# Explicitly set transport
MCP_TRANSPORT=stdio npx alecs-mcp-server-akamai
```

## Docker Alternatives

While NPM is the primary distribution method, Docker images are also available:

```bash
# Full server
docker run -it acedergren/alecs-mcp-server-akamai:latest

# Modular variant (when available)
docker run -it acedergren/alecs-mcp-server-akamai:latest-modular

# WebSocket variant (when available)  
docker run -it -p 8080:8080 acedergren/alecs-mcp-server-akamai:latest-websocket

# SSE variant (when available)
docker run -it -p 8081:8081 acedergren/alecs-mcp-server-akamai:latest-sse
```

Note: Docker variants with suffixes (-modular, -websocket, -sse) may not be available for all versions. Check Docker Hub for available tags.