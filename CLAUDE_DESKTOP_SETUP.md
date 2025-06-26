# Claude Desktop Setup Guide for ALECS MCP Server

This guide will help you set up the ALECS MCP Server with Claude Desktop.

## Prerequisites

1. **Claude Desktop** installed on your system
2. **Node.js** v18 or higher
3. **Akamai API credentials** in `~/.edgerc` file

## Installation Steps

### 1. Build the Project

```bash
cd /Users/acedergr/Projects/alecs-mcp-server-akamai/alecs-mcp-server-akamai
npm install
npm run build
```

### 2. Test Your Credentials

```bash
# Create a test script
cat > test-connection.js << 'EOF'
const EdgeGrid = require('akamai-edgegrid');
const eg = new EdgeGrid({
  path: process.env.HOME + '/.edgerc',
  section: 'default'
});

eg.auth({ path: '/papi/v1/contracts', method: 'GET', headers: {} });
eg.send((err, response, body) => {
  if (err) {
    console.log('❌ Connection failed:', err.message);
  } else {
    console.log('✅ Connection successful!');
    console.log('Account:', JSON.parse(body).accountId);
  }
});
EOF

# Run the test
node test-connection.js
```

### 3. Configure Claude Desktop

Add the following to your Claude Desktop configuration file:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**

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
    }
  }
}
```

For the full version with all tools:

```json
{
  "mcpServers": {
    "alecs-akamai-full": {
      "command": "node",
      "args": [
        "/Users/acedergr/Projects/alecs-mcp-server-akamai/alecs-mcp-server-akamai/dist/index-full.js"
      ],
      "env": {
        "DEBUG": "0"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

After saving the configuration, completely quit and restart Claude Desktop.

## Verification

Once Claude Desktop restarts, you should see the MCP tools available. Try these commands:

1. **List your properties:**
   ```
   "Show me all my Akamai properties"
   ```

2. **List contracts:**
   ```
   "List my Akamai contracts"
   ```

3. **Get property details:**
   ```
   "Get details for property prp_123456"
   ```

## Available Tools

### Minimal Server (index.js) - 7 tools:
- `list-properties` - List all CDN properties
- `get-property` - Get property details
- `create-property` - Create new property
- `activate-property` - Activate to staging/production
- `list-contracts` - List contracts
- `create-zone` - Create DNS zone
- `create-record` - Create DNS record

### Full Server (index-full.js) - ~198 tools:
All minimal tools plus:
- Certificate management
- Security configurations
- Fast purge
- Reporting and analytics
- Network lists
- WAF rules
- And much more...

## Troubleshooting

### Server doesn't appear in Claude Desktop

1. **Check logs:**
   ```bash
   # macOS
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

2. **Test server directly:**
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
   ```

3. **Verify paths are correct:**
   - Ensure the path in config matches your actual installation
   - Use absolute paths, not relative

### Authentication errors

1. **Check .edgerc file:**
   ```bash
   cat ~/.edgerc
   ```

2. **Verify credentials are active:**
   - Log into Akamai Control Center
   - Go to Identity & Access → API Users
   - Check if your credentials are active

3. **Test with minimal permissions:**
   - Property Manager: READ
   - Contracts: READ

### Performance issues

Use the minimal server instead of full if you only need basic functionality:
- Minimal: ~50ms startup, 7 tools
- Full: ~200ms startup, 198 tools

## Support

For issues or questions:
1. Check the [GitHub repository](https://github.com/your-repo/alecs-mcp-server-akamai)
2. Review logs in `~/.alecs/logs/`
3. Run with DEBUG=1 for verbose output