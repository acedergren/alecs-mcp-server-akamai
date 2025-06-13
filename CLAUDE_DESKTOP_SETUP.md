# Claude Desktop Setup Guide for ALECS

This guide helps you configure Claude Desktop to work with ALECS MCP Server.

## Prerequisites

1. **Claude Desktop** installed on your machine
2. **Node.js 20+** installed
3. **`.edgerc` file** with your Akamai credentials
4. **ALECS repository** cloned locally

## Quick Setup

### 1. Build the Project

```bash
cd /Users/acedergr/Akamai-MCP
make setup  # This installs dependencies and builds
```

### 2. Configure Claude Desktop

The Claude Desktop configuration file location varies by OS:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 3. Configuration Options

You have three ways to run ALECS in Claude Desktop:

#### Option 1: Production Build (Recommended)

```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["/Users/acedergr/Akamai-MCP/dist/index.js"],
      "env": {
        "DEBUG": "0",
        "DEFAULT_CUSTOMER": "default"
      }
    }
  }
}
```

#### Option 2: Development Mode (Hot Reload)

```json
{
  "mcpServers": {
    "alecs-dev": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/Users/acedergr/Akamai-MCP",
      "env": {
        "DEBUG": "1"
      }
    }
  }
}
```

#### Option 3: Docker Container

```json
{
  "mcpServers": {
    "alecs-docker": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "/Users/acedergr/.edgerc:/home/alecs/.edgerc:ro",
        "alecs-mcp-server-akamai"
      ],
      "env": {}
    }
  }
}
```

## Step-by-Step Setup

### For Development

1. **Clone and setup the project:**
   ```bash
   git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
   cd alecs-mcp-server-akamai
   make setup
   ```

2. **Create or update your `.edgerc` file:**
   ```bash
   # Location: ~/.edgerc
   [default]
   client_secret = your_client_secret
   host = your_host.luna.akamaiapis.net
   access_token = your_access_token
   client_token = your_client_token
   
   [staging]
   client_secret = staging_client_secret
   host = staging_host.luna.akamaiapis.net
   access_token = staging_access_token
   client_token = staging_client_token
   ```

3. **Update Claude Desktop config:**
   - Copy the appropriate configuration from above
   - Update paths to match your system
   - Save the file

4. **Restart Claude Desktop:**
   - Quit Claude Desktop completely
   - Start Claude Desktop again
   - The ALECS server should appear in the MCP menu

### For Production Use

1. **Build the production version:**
   ```bash
   cd /Users/acedergr/Akamai-MCP
   make build
   ```

2. **Use the production configuration** (Option 1 above)

3. **Optional: Create a shell script wrapper:**
   ```bash
   # Create ~/bin/alecs-mcp
   #!/bin/bash
   cd /Users/acedergr/Akamai-MCP && node dist/index.js
   
   # Make it executable
   chmod +x ~/bin/alecs-mcp
   ```

   Then use in Claude config:
   ```json
   {
     "mcpServers": {
       "alecs": {
         "command": "/Users/acedergr/bin/alecs-mcp",
         "args": [],
         "env": {}
       }
     }
   }
   ```

## Verification

1. **Check if ALECS is running:**
   - Open Claude Desktop
   - Look for the MCP icon (🔌) in the interface
   - Click it to see available servers
   - "alecs" should be listed

2. **Test the connection:**
   - In Claude, type: "List my Akamai properties"
   - You should see a response with your properties

3. **Check logs (development mode):**
   - Logs appear in Claude Desktop's developer console
   - Access via: View → Toggle Developer Tools (macOS)

## Troubleshooting

### Server doesn't appear in Claude

1. **Check file paths:**
   ```bash
   # Verify the dist folder exists
   ls -la /Users/acedergr/Akamai-MCP/dist/index.js
   ```

2. **Validate JSON syntax:**
   ```bash
   # Check if config is valid JSON
   python3 -m json.tool < ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. **Check Node.js version:**
   ```bash
   node --version  # Should be v20 or higher
   ```

### Permission errors

1. **Check .edgerc permissions:**
   ```bash
   chmod 600 ~/.edgerc
   ```

2. **Verify .edgerc location:**
   ```bash
   ls -la ~/.edgerc
   ```

### Connection issues

1. **Test manually:**
   ```bash
   cd /Users/acedergr/Akamai-MCP
   npm run dev
   # Should see "MCP server running on stdio"
   ```

2. **Enable debug mode:**
   Add `"DEBUG": "1"` to the env section in config

## Environment Variables

You can customize behavior with these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Enable debug logging (0 or 1) | `0` |
| `DEFAULT_CUSTOMER` | Default .edgerc section | `default` |
| `EDGERC_PATH` | Custom .edgerc location | `~/.edgerc` |

Example with custom settings:
```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["/Users/acedergr/Akamai-MCP/dist/index.js"],
      "env": {
        "DEBUG": "1",
        "DEFAULT_CUSTOMER": "production",
        "EDGERC_PATH": "/Users/acedergr/.akamai/.edgerc"
      }
    }
  }
}
```

## Multiple Configurations

You can have multiple ALECS configurations for different purposes:

```json
{
  "mcpServers": {
    "alecs-prod": {
      "command": "node",
      "args": ["/Users/acedergr/Akamai-MCP/dist/index.js"],
      "env": {
        "DEFAULT_CUSTOMER": "production"
      }
    },
    "alecs-staging": {
      "command": "node",
      "args": ["/Users/acedergr/Akamai-MCP/dist/index.js"],
      "env": {
        "DEFAULT_CUSTOMER": "staging"
      }
    },
    "alecs-dev": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/Users/acedergr/Akamai-MCP",
      "env": {
        "DEBUG": "1",
        "DEFAULT_CUSTOMER": "development"
      }
    }
  }
}
```

## Next Steps

1. **Test basic operations:**
   - List properties
   - Get property details
   - List DNS zones

2. **Try advanced features:**
   - Create property from template
   - Import DNS zone from Cloudflare
   - Create SSL certificate

3. **Read the documentation:**
   - [Features Overview](./docs/features-overview.md)
   - [CDN Provisioning Guide](./docs/cdn-provisioning-guide.md)
   - [DNS Migration Guide](./docs/dns-migration-guide.md)

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Enable debug mode for more information
3. Open an issue on GitHub with:
   - Your configuration (without secrets)
   - Error messages
   - Steps to reproduce