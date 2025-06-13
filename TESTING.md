# Akamai MCP Server Testing Instructions

## Prerequisites

1. **Node.js 18+** installed
2. **Akamai API credentials** configured in `~/.edgerc`
3. **Claude Desktop** or Claude CLI installed

## Step 1: Verify EdgeGrid Credentials

First, ensure you have a valid `.edgerc` file in your home directory:

```bash
cat ~/.edgerc
```

It should look like this:

```ini
[default]
client_secret = xxxx
host = xxxx.luna.akamaiapis.net
access_token = xxxx
client_token = xxxx
```

If you don't have this file, create it with your Akamai API credentials:
- Log into Akamai Control Center
- Navigate to Identity & Access Management → API Credentials
- Create new API client with Property Manager read/write access

## Step 2: Build and Test the Server

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Test the server starts correctly
npm run dev
```

You should see:
```
🚀 Akamai MCP Server starting...
📍 Looking for credentials in ~/.edgerc
✅ Server ready, waiting for connections...
```

Press Ctrl+C to stop.

## Step 3: Add to Claude Desktop (macOS)

Edit Claude Desktop configuration:

```bash
# Open Claude Desktop config
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Add the MCP server configuration:

```json
{
  "mcpServers": {
    "akamai-mcp": {
      "command": "node",
      "args": ["/path/to/akamai-mcp/dist/index.js"]
    }
  }
}
```

Replace `/path/to/akamai-mcp` with the actual path to your project.

## Step 4: Add to Claude CLI

If using Claude CLI instead:

```bash
# Add the server
claude mcp add akamai-mcp -s project -- npx tsx src/index.ts

# Or if you built it:
claude mcp add akamai-mcp -s project -- node dist/index.js
```

## Step 5: Test with Claude

Start a new Claude conversation and test the tools:

### Test 1: List Groups
```
"What Akamai groups do I have access to?"
```

Expected: Claude should use the `list_groups` tool and show your available groups and contracts.

### Test 2: List Properties
```
"Show me all my CDN properties"
```

Expected: Claude should use the `list_properties` tool and display your properties with their status.

### Test 3: Get Property Details
```
"Give me details about property prp_12345" (use a real property ID)
```

Expected: Claude should use the `get_property` tool and show comprehensive property information.

### Test 4: Create Property (be careful - this creates real resources)
```
"Create a new test property called test-mcp-property in group grp_XXX with contract ctr_XXX"
```

Expected: Claude should use the `create_property` tool and create the property.

## Troubleshooting

### Server won't start
- Check Node.js version: `node --version` (should be 18+)
- Verify TypeScript built successfully: `npm run build`
- Check for port conflicts

### Claude can't connect
- Restart Claude Desktop after config changes
- Check the path in config is absolute, not relative
- Look for errors in Claude's developer console

### Authentication errors
- Verify `.edgerc` file exists and has correct permissions
- Test credentials with Akamai CLI if available
- Ensure API client has Property Manager permissions

### No properties showing
- Check if the account actually has properties
- Verify the API client has read access to the contract/group
- Try with a different section in `.edgerc` if available

## Success Criteria Checklist

- ✅ `npm install` completes without errors
- ✅ `npm run build` completes without TypeScript errors
- ✅ Server starts and waits for MCP protocol input via stdio
- ✅ EdgeGrid authentication loads credentials from ~/.edgerc
- ✅ All 4 tools are registered and visible to Claude Desktop
- ✅ Graceful error handling for missing/invalid credentials
- ✅ Clean console output with helpful startup messages