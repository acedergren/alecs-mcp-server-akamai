# Installation & Setup

This guide walks you through installing and configuring ALECS for your environment.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
- [Configuration](#configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Memory**: 512MB minimum
- **OS**: Linux, macOS, or Windows (WSL recommended)

### Akamai Requirements
- Active Akamai account
- API credentials with appropriate permissions
- `.edgerc` file configured

## Installation Methods

### Method 1: npm (Recommended)

```bash
# Install globally
npm install -g alecs-mcp-server-akamai

# Verify installation
alecs --version
```

### Method 2: From Source

```bash
# Clone repository
git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai

# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

### Method 3: Docker - Modular Approach (Recommended)

```bash
# Pull modular image - run only what you need
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:modular-latest

# Run with specific modules
docker run -it \
  -v ~/.edgerc:/root/.edgerc:ro \
  -p 3010:3010 -p 3011:3011 -p 3012:3012 \
  ghcr.io/acedergren/alecs-mcp-server-akamai:modular-latest
```

This runs three focused servers:
- **Property Server** (port 3010) - CDN configuration
- **DNS Server** (port 3011) - DNS management  
- **Security Server** (port 3012) - WAF and security

<details>
<summary>Other Docker variants (click to expand)</summary>

```bash
# Essential - Property tools only (15 tools)
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:essential-latest

# Full server with 180+ tools (best for Claude Code)
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:full-latest

# Remote access support (WebSocket + SSE)
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:remote-latest
```

**Note**: The full server works well with Claude Code's higher context limits but may overwhelm Claude Desktop. Start with modular servers and expand as needed.
</details>

### Method 4: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  alecs:
    image: ghcr.io/acedergren/alecs-mcp-server-akamai:latest
    volumes:
      - ~/.edgerc:/root/.edgerc:ro
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
```

## Configuration

### Step 1: Akamai Credentials

Create or update your `.edgerc` file:

```ini
[default]
client_secret = your-client-secret
host = your-host.luna.akamaiapis.net
access_token = your-access-token
client_token = your-client-token

[production]
client_secret = prod-client-secret
host = prod-host.luna.akamaiapis.net
access_token = prod-access-token
client_token = prod-client-token
```

**Security Notes:**
- Set file permissions: `chmod 600 ~/.edgerc`
- Never commit `.edgerc` to version control
- Use environment-specific sections

### Step 2: Environment Variables

Create a `.env` file for ALECS configuration:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Akamai Configuration
EDGERC_SECTION=default
EDGERC_PATH=~/.edgerc

# Security
TOKEN_MASTER_KEY=your-secure-master-key
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Multi-Customer (Optional)
MULTI_CUSTOMER_ENABLED=false
```

### Step 3: MCP Client Configuration

Configure your MCP client (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "alecs": {
      "command": "alecs",
      "args": [],
      "env": {
        "EDGERC_SECTION": "production"
      }
    }
  }
}
```

## Verification

### Test Basic Connectivity

```bash
# List available tools
alecs list-tools

# Test Akamai connection
alecs test-connection
```

### Test with MCP Client

1. Start ALECS server
2. Connect your MCP client
3. Try a simple command:
   ```
   List all Akamai properties
   ```

### Verify Logs

Check logs for successful initialization:

```bash
tail -f ~/.alecs/logs/alecs.log
```

You should see:
```
[INFO] ALECS server starting...
[INFO] Loaded 200+ tools
[INFO] Connected to Akamai APIs
[INFO] MCP server ready on port 3000
```

## Advanced Configuration

### Multi-Customer Setup

For managing multiple Akamai accounts:

```json
{
  "customers": {
    "customer1": {
      "edgercSection": "customer1",
      "description": "Production Account"
    },
    "customer2": {
      "edgercSection": "customer2",
      "description": "Staging Account"
    }
  }
}
```

See [[Multi-Customer Configuration]] for details.

### Custom Tool Selection

Load only specific tool sets:

```bash
# Load only property and DNS tools
alecs --tools property,dns

# Load essential tools only
alecs --mode essentials
```

### Performance Tuning

For large-scale operations:

```bash
# Increase memory allocation
NODE_OPTIONS="--max-old-space-size=4096" alecs

# Enable caching
CACHE_ENABLED=true alecs
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
```
Error: Invalid credentials
```
**Solution**: Verify `.edgerc` permissions and content

#### 2. Permission Denied
```
Error: Access denied to API
```
**Solution**: Check API permissions in Akamai Control Center

#### 3. Rate Limiting
```
Error: 429 Too Many Requests
```
**Solution**: Reduce request frequency or contact Akamai

### Debug Mode

Enable verbose logging:

```bash
LOG_LEVEL=debug alecs
```

### Health Check

Verify server health:

```bash
curl http://localhost:3000/health
```

## Next Steps

- [[Quick Start Guide]] - Start using ALECS
- [[API Reference]] - Explore available tools
- [[Security & Authentication]] - Secure your setup
- [[Troubleshooting]] - Detailed troubleshooting guide

---

Need help? [Open an issue](https://github.com/acedergren/alecs-mcp-server-akamai/issues) or check our [FAQ](Troubleshooting#faq).