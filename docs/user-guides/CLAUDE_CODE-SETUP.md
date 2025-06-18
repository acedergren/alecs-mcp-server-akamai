# Claude Configuration Setup

## For Claude Code

You can configure this with:
```bash
claude mcp add alecs -s project -- npx tsx src/index.ts
```

This creates `.mcp.json` in your project directory. To verify:

```bash
# List configured servers
claude mcp list

# Start Claude with the MCP server
claude
```

## For Claude Desktop (macOS)

### 1. Find your config file location:
```bash
# Config location on macOS
~/Library/Application Support/Claude/claude_desktop_config.json
```

### 2. Edit the configuration:

```bash
# Open in your editor
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### 3. Add this configuration:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["/Users/acedergr/alecs-mcp-server-akamai/dist/index.js"],
      "env": {}
    }
  }
}
```

**Alternative using npx tsx (if you prefer development mode):**

```json
{
  "mcpServers": {
    "alecs": {
      "command": "npx",
      "args": ["tsx", "/Users/acedergr/alecs-mcp-server-akamai/src/index.ts"],
      "env": {}
    }
  }
}
```

### 4. Optional environment variables:

If your `.edgerc` file is not in the default location (`~/.edgerc`), add:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["/Users/acedergr/alecs-mcp-server-akamai/dist/index.js"],
      "env": {
        "EDGERC_PATH": "/path/to/your/.edgerc"
      }
    }
  }
}
```

### 5. Restart Claude Desktop:
- Quit Claude Desktop completely (Cmd+Q)
- Start Claude Desktop again
- The MCP server will start automatically

## For Windows (Claude Desktop)

Location: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["C:\\Users\\YourName\\alecs-mcp-server-akamai\\dist\\index.js"],
      "env": {}
    }
  }
}
```

## For Linux (Claude Desktop)

Location: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["/home/username/alecs-mcp-server-akamai/dist/index.js"],
      "env": {}
    }
  }
}
```

## Verifying the Connection

### In Claude Desktop:
1. Start a new conversation
2. Look for a small "Connected" indicator
3. Test with: "What Akamai tools are available?"

### In Claude CLI:
1. Run `claude`
2. The server should start automatically (you'll see startup messages)
3. Test with: "List my Akamai groups"

## Troubleshooting

### Server not connecting:
1. Check the path is absolute, not relative
2. Ensure the file exists: `ls -la /Users/acedergr/alecs-mcp-server-akamai/dist/index.js`
3. Build the project first: `cd /Users/acedergr/alecs-mcp-server-akamai && npm run build`

### Permission issues:
```bash
chmod +x /Users/acedergr/alecs-mcp-server-akamai/dist/index.js
```

### Debug mode:
Add logging to see what's happening:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["/Users/acedergr/alecs-mcp-server-akamai/dist/index.js"],
      "env": {
        "DEBUG": "1"
      }
    }
  }
}
```

## Testing Commands

Once connected, try these commands:

1. **List groups**: "What Akamai groups do I have access to?"
2. **List properties**: "Show me all my CDN properties"
3. **Filter properties**: "List properties in group grp_12345"
4. **Get details**: "Show me details for property prp_12345"
5. **Create property**: "Create a new test property in group grp_12345"

## Important Notes

- The server runs as a subprocess of Claude
- Each conversation gets its own server instance
- Server starts when you begin a conversation
- Server stops when you close the conversation
- Check Claude's developer console for error messages if issues occur