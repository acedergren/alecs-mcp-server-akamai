# ALECS MVP Setup Guide

Get started with ALECS (Akamai MCP Server) in under 5 minutes!

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- Akamai API credentials (`.edgerc` file)
- Claude Desktop installed

### 2. Setup Your Credentials

Create `~/.edgerc` with your Akamai API credentials:

```ini
[default]
client_secret = your_client_secret
host = your_host.luna.akamaiapis.net  
access_token = your_access_token
client_token = your_client_token
```

### 3. Configure Claude Desktop

Add this minimal configuration to your Claude Desktop `claude_desktop_config.json`:

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

Or for development (if running from source):

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

### 4. Test Your Setup

Restart Claude Desktop and try these commands:

- "List my properties"
- "Show me my contracts and groups"  
- "List DNS zones"

## What You Can Do

With the MVP setup, you can:

✅ **Property Management**
- List and search CDN properties
- View property details and activation status
- Create new properties

✅ **DNS Management**  
- List and manage DNS zones
- Add/update/delete DNS records
- Import zones via AXFR

✅ **Certificate Management**
- Create DV certificates
- Check validation status
- Link certificates to properties

## Advanced Configuration

For production use, logging, or multiple environments, see `.mcp.advanced.json` for a complete configuration example with:

- Environment-specific configurations
- Custom logging levels  
- Debug dashboard
- Performance tracking

## Troubleshooting

**Common Issues:**

1. **"No contracts found"** → Check your `.edgerc` credentials
2. **"Command not found"** → Run `npm install -g alecs-mcp-server-akamai`
3. **"Permission denied"** → Verify your API client has the required permissions

**Getting Help:**

- Check logs in Claude Desktop developer console
- Use the debug dashboard at `http://localhost:8080` (if enabled)
- Review the [full documentation](../README.md)

## Next Steps

Once you're comfortable with the basics:

1. **Multi-Customer Setup**: Add additional sections to `.edgerc` for different Akamai accounts
2. **Advanced Features**: Enable the dashboard and performance tracking
3. **Automation**: Use ALECS for bulk operations and migrations

Ready to manage your Akamai infrastructure with AI! 🚀