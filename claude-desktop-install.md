# Claude Desktop Configuration

To use the ALECS MCP Server with Claude Desktop, add the following configuration to your Claude Desktop config file.

## Location

The Claude Desktop configuration file is typically located at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## Configuration

Add these entries to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "node",
      "args": [
        "/Users/acedergr/Projects/alecs-mcp-server-akamai/alecs-mcp-server-akamai/dist/index.js"
      ],
      "env": {
        "DEBUG": "0"
      }
    },
    "alecs-akamai-essentials": {
      "command": "node",
      "args": [
        "/Users/acedergr/Projects/alecs-mcp-server-akamai/alecs-mcp-server-akamai/dist/index-essential.js"
      ],
      "env": {
        "DEBUG": "0"
      }
    }
  }
}
```

## Available Servers

1. **alecs-akamai**: Minimal server with 7 core tools
   - Property management (list, get, create)
   - Property activation
   - DNS zones and records
   - Contract listing

2. **alecs-akamai-full**: Complete server with ALL tools
   - All core tools plus:
   - Certificate enrollment (DV/EV/OV)
   - Fast purge capabilities
   - Reporting and analytics
   - Security configurations (WAF, Network Lists)
   - Advanced property management
   - Workflow assistants

## Usage

After adding the configuration:
1. Restart Claude Desktop
2. The servers will appear in the MCP tool list
3. You can use commands like:
   - "List my Akamai properties"
   - "Create a DNS zone"
   - "Activate property to staging"
   - "Check certificate enrollment status"

## Troubleshooting

If the servers don't appear:
1. Check that the file paths are correct
2. Ensure the project is built: `npm run build`
3. Check Claude Desktop logs for errors
4. Verify your `.edgerc` file has valid Akamai credentials