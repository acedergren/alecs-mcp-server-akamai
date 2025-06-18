# Installation Guide

This guide walks you through installing and setting up the ALECS MCP Server for Akamai.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
- [Configuration](#configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **Operating System**: macOS, Linux, or Windows (with WSL)
- **Memory**: Minimum 512MB RAM
- **Network**: Internet connection for API access

### Akamai Requirements
- Active Akamai account
- API credentials configured in `.edgerc` file
- Appropriate permissions for desired operations

### MCP Client
- Claude Desktop (recommended)
- Or any MCP-compatible client

## Installation Methods

### Method 1: NPM Installation (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm run dev
```

### Method 2: Docker Installation

```bash
# Pull the Docker image
docker pull alecs/mcp-server-akamai:latest

# Run with environment variables
docker run -it \
  -v ~/.edgerc:/home/node/.edgerc:ro \
  --env-file .env \
  alecs/mcp-server-akamai:latest
```

### Method 3: Binary Installation

Download pre-built binaries from the releases page:

```bash
# macOS
curl -L https://github.com/your-org/alecs/releases/latest/download/alecs-macos-x64 -o alecs
chmod +x alecs

# Linux
curl -L https://github.com/your-org/alecs/releases/latest/download/alecs-linux-x64 -o alecs
chmod +x alecs

# Windows (PowerShell)
Invoke-WebRequest -Uri https://github.com/your-org/alecs/releases/latest/download/alecs-win-x64.exe -OutFile alecs.exe
```

## Configuration

### Step 1: Akamai Credentials

Create or update your `~/.edgerc` file:

```ini
[default]
client_secret = your-client-secret
host = akab-host.luna.akamaiapis.net
access_token = akab-access-token
client_token = akab-client-token
max-body = 131072

[customer1]
client_secret = customer1-secret
host = akab-customer1.luna.akamaiapis.net
access_token = akab-customer1-token
client_token = akab-customer1-token
account-switch-key = ACCOUNT-KEY-1

[customer2]
client_secret = customer2-secret
host = akab-customer2.luna.akamaiapis.net
access_token = akab-customer2-token
client_token = akab-customer2-token
account-switch-key = ACCOUNT-KEY-2
```

### Step 2: Claude Desktop Configuration

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "node",
      "args": [
        "/path/to/alecs-mcp-server-akamai/dist/index.js"
      ],
      "env": {
        "AKAMAI_EDGERC_PATH": "~/.edgerc",
        "AKAMAI_DEFAULT_SECTION": "default"
      }
    }
  }
}
```

### Step 3: Environment Variables (Optional)

Create a `.env` file for additional configuration:

```bash
# Logging
LOG_LEVEL=info

# Default customer section
AKAMAI_DEFAULT_SECTION=default

# API rate limiting (requests per second)
API_RATE_LIMIT=10

# Timeout settings (milliseconds)
API_TIMEOUT=30000
ACTIVATION_POLL_INTERVAL=30000
```

## Verification

### Test Basic Connection

1. Start Claude Desktop
2. Open a new conversation
3. Test with a simple command:

```
List all Akamai properties
```

Expected response: A list of properties from your default account

### Test Multi-Customer Setup

```
List properties for customer1
```

Expected response: Properties from the customer1 account

### Test Tool Discovery

```
What Akamai tools are available?
```

Expected response: Complete list of available tools

## Troubleshooting

### Common Issues

#### 1. Server Not Starting

**Error**: `Cannot find module '@modelcontextprotocol/sdk'`

**Solution**:
```bash
npm install
npm run build
```

#### 2. Authentication Errors

**Error**: `401 Unauthorized`

**Solution**:
- Verify `.edgerc` credentials
- Check API permissions in Akamai Control Center
- Ensure correct section name in customer parameter

#### 3. Connection Issues

**Error**: `ECONNREFUSED`

**Solution**:
- Check if server is running: `ps aux | grep alecs`
- Verify Claude Desktop configuration path
- Check firewall settings

#### 4. Missing Tools

**Error**: `Tool not found`

**Solution**:
- Rebuild the project: `npm run build`
- Restart Claude Desktop
- Check server logs for registration errors

### Debug Mode

Enable detailed logging:

```bash
# Set environment variable
export LOG_LEVEL=debug

# Or in .env file
LOG_LEVEL=debug
```

### Log Locations

- **Server logs**: `./logs/alecs-server.log`
- **Claude Desktop logs**: `~/Library/Logs/Claude/`
- **Docker logs**: `docker logs <container-id>`

## Next Steps

- Read the [Quick Start Tutorial](./Quick-Start-Tutorial.md)
- Configure [Multi-Customer Support](./Configuration-Guide.md#multi-customer-setup)
- Explore [Available Tools](../api-reference/README.md)

## Getting Help

- **Documentation**: Check other guides in this wiki
- **Issues**: Report bugs on GitHub
- **Community**: Join our Discord server
- **Support**: Contact support@your-org.com

---

*Last Updated: January 2025*