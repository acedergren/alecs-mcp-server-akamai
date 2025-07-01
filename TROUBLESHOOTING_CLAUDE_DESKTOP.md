# Troubleshooting ALECS MCP Server in Claude Desktop

## Issue: "Extension alecs-akamai not found in installed extensions"

This error indicates that Claude Desktop is not properly configured to use ALECS MCP Server.

## Solution Steps

### 1. Verify Installation Method

ALECS MCP Server is an **MCP server**, not a Claude Desktop extension. It needs to be configured in the MCP servers section of your Claude Desktop configuration.

### 2. Correct Configuration Location

Find your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 3. Fix the Configuration

Your configuration should look like this:

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "node",
      "args": ["/Users/sseifert/code/AI/alecs-mcp-server-akamai/dist/index.js"]
    }
  }
}
```

**Important Changes:**
1. Change `index-full.js` to `index.js`
2. Make sure it's under `mcpServers`, not `extensions`

### 4. For NPM Global Installation

If you installed via NPM globally:

```bash
npm install -g alecs-mcp-server-akamai
```

Then use this simpler configuration:

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "alecs"
    }
  }
}
```

### 5. Build from Source (if using local development)

If you're running from source code:

```bash
cd /Users/sseifert/code/AI/alecs-mcp-server-akamai
npm install
npm run build
```

This will create the `dist/index.js` file.

### 6. Verify the File Exists

Check that the file is actually there:

```bash
ls -la /Users/sseifert/code/AI/alecs-mcp-server-akamai/dist/
```

You should see `index.js` in the output.

### 7. Test the Server Directly

Before using in Claude Desktop, test that the server works:

```bash
node /Users/sseifert/code/AI/alecs-mcp-server-akamai/dist/index.js
```

You should see:
```
Server running on stdio
```

Press Ctrl+C to stop.

### 8. Check .edgerc Configuration

Make sure you have an `.edgerc` file in your home directory:

```bash
ls -la ~/.edgerc
```

If not, create one with your Akamai credentials:

```ini
[default]
host = your-host.luna.akamaiapis.net
client_token = your-client-token
client_secret = your-client-secret
access_token = your-access-token
```

### 9. Restart Claude Desktop

After making these changes:
1. Completely quit Claude Desktop (not just close the window)
2. Restart Claude Desktop
3. Check if ALECS tools are available

## Complete Working Example

Here's a complete working configuration for local development:

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "node",
      "args": ["/Users/sseifert/code/AI/alecs-mcp-server-akamai/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Still Having Issues?

1. **Check Claude Desktop logs**: Look for more detailed error messages
2. **Verify Node.js version**: Run `node --version` (should be 18 or higher)
3. **Check file permissions**: The dist/index.js file should be readable
4. **Try absolute paths**: Always use full paths starting with /
5. **Environment variables**: Make sure PATH includes node binary location

## Debug Commands

Run these to help diagnose:

```bash
# Check Node.js installation
which node
node --version

# Check if project is built
ls -la /Users/sseifert/code/AI/alecs-mcp-server-akamai/dist/

# Check if .edgerc exists
ls -la ~/.edgerc

# Test the server
cd /Users/sseifert/code/AI/alecs-mcp-server-akamai
npm run dev
```

## Report an Issue

If you're still having problems, please open an issue with:
- Your exact configuration file contents
- The full error message from Claude Desktop logs
- Output of the debug commands above
- Your operating system and version