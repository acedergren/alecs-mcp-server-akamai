# ALECS Configuration Guide

## Configuration Files

ALECS provides multiple configuration options for different use cases:

### 1. Minimal Setup (`.mcp.json`)

The simplest configuration for getting started:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"]
    }
  }
}
```

**Use when:** Just getting started, development, or simple setups.

### 2. Advanced Setup (`.mcp.advanced.json`)

Full configuration with multiple environments and custom settings:

```json
{
  "mcpServers": {
    "alecs-dev": {
      "command": "npx", 
      "args": ["tsx", "src/index.ts"],
      "env": {
        "ALECS_LOG_LEVEL": "INFO",
        "ALECS_LOG_FORMAT": "json",
        "ALECS_DASHBOARD_PORT": "8080"
      }
    },
    "alecs-production": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "ALECS_LOG_LEVEL": "WARN"
      }
    }
  }
}
```

**Use when:** Production deployments, multiple environments, or custom logging needs.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ALECS_LOG_LEVEL` | `INFO` | Logging level: `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `ALECS_LOG_FORMAT` | `json` | Log format: `json` or `human` |
| `ALECS_DASHBOARD_PORT` | `8080` | Debug dashboard port |
| `NODE_ENV` | - | Environment: `development`, `production`, `testing` |

## Akamai Credentials (`.edgerc`)

ALECS supports multi-customer configurations:

```ini
[default]
client_secret = your_client_secret
host = your_host.luna.akamaiapis.net
access_token = your_access_token  
client_token = your_client_token

[production]
client_secret = prod_client_secret
host = prod_host.luna.akamaiapis.net
access_token = prod_access_token
client_token = prod_client_token
account_key = 1-ABCDEF

[testing]
client_secret = test_client_secret
host = test_host.luna.akamaiapis.net  
access_token = test_access_token
client_token = test_client_token
```

Use the `customer` parameter in tools to switch between accounts:
- `customer: "default"` (default)
- `customer: "production"`  
- `customer: "testing"`

## Claude Desktop Integration

### Location of config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Basic Configuration:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "npx",
      "args": ["alecs-mcp-server-akamai"]
    }
  }
}
```

### Development Configuration:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "env": {
        "ALECS_LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

## Features by Configuration

| Feature | Minimal | Advanced |
|---------|---------|----------|
| Property Management | ✅ | ✅ |
| DNS Management | ✅ | ✅ |
| Certificate Management | ✅ | ✅ |
| Multi-Customer Support | ✅ | ✅ |
| Debug Dashboard | ❌ | ✅ |
| Custom Logging | ❌ | ✅ |
| Performance Tracking | ❌ | ✅ |
| Environment Separation | ❌ | ✅ |

## Migration Between Configs

**From Minimal to Advanced:**
1. Copy `.mcp.advanced.json` to your Claude config
2. Customize environment variables as needed
3. Restart Claude Desktop

**From Advanced to Minimal:**
1. Replace with minimal config from `.mcp.json`
2. Restart Claude Desktop

## Troubleshooting

**Config not loading?**
- Check JSON syntax with a validator
- Ensure file permissions are readable
- Restart Claude Desktop after changes

**Environment variables not working?**
- Verify spelling and case sensitivity
- Check that the MCP server is using the right config
- Use `ALECS_LOG_LEVEL=DEBUG` to see more details

**Multiple ALECS instances?**
- Each server needs a unique name in `mcpServers`
- Use different ports for dashboards
- Consider different `.edgerc` sections for different purposes