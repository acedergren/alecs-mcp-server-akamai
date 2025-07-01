# Claude Desktop Setup Guide for ALECS MCP Server

## Installation Issues and Solutions

### Error: Cannot find module 'index-full.js'

If you're seeing this error:
```
Error: Cannot find module '/path/to/alecs-mcp-server-akamai/dist/index-full.js'
```

**Solution:** The correct file is `index.js`, not `index-full.js`. Update your Claude Desktop configuration.

## Correct Setup Instructions

### 1. Install from NPM (Recommended)
```bash
npm install -g alecs-mcp-server-akamai
```

### 2. Configure Claude Desktop

Edit your Claude Desktop configuration file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "node",
      "args": ["/path/to/alecs-mcp-server-akamai/dist/index.js"]
    }
  }
}
```

**Important:** Use `index.js`, NOT `index-full.js`

### 3. For Global NPM Installation

If you installed globally with npm, use:

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "alecs"
    }
  }
}
```

### 4. For Local Development

If you're running from source:

```bash
# First build the project
cd /path/to/alecs-mcp-server-akamai
npm install
npm run build

# Then use this configuration
```

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "node",
      "args": ["/path/to/alecs-mcp-server-akamai/dist/index.js"]
    }
  }
}
```

### 5. Verify Your Setup

1. Check that the file exists:
   ```bash
   ls -la /path/to/alecs-mcp-server-akamai/dist/index.js
   ```

2. Test the server directly:
   ```bash
   node /path/to/alecs-mcp-server-akamai/dist/index.js
   ```
   
   You should see: `Server running on stdio`

3. Restart Claude Desktop after updating the configuration

## Common Issues

### Issue: Module not found errors
- Make sure you've run `npm install` and `npm run build`
- Verify the path in your configuration is correct
- Use absolute paths, not relative paths

### Issue: Server starts but immediately disconnects
- Check that you have a valid `.edgerc` file in your home directory
- Ensure Node.js version is 18 or higher
- Check the Claude Desktop logs for specific errors

### Issue: Permission denied
- On macOS/Linux, you may need to make the file executable:
  ```bash
  chmod +x /path/to/alecs-mcp-server-akamai/dist/index.js
  ```

## Need Help?

1. Check the [main README](README.md) for detailed setup instructions
2. Review the [troubleshooting guide](docs/TROUBLESHOOTING.md)
3. Open an issue on GitHub with:
   - Your Claude Desktop configuration
   - The exact error message
   - Your Node.js version (`node --version`)
   - Your operating system