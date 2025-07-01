# Solution for "Cannot find module 'index-full.js'" Error

## The Problem

Your Claude Desktop configuration is pointing to `index-full.js` which doesn't exist. The correct file is `index.js`.

## Quick Fix

1. **Edit your Claude Desktop configuration file:**
   ```
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

2. **Change this:**
   ```json
   {
     "mcpServers": {
       "alecs-akamai": {
         "command": "node",
         "args": ["/Users/sseifert/code/AI/alecs-mcp-server-akamai/dist/index-full.js"]
       }
     }
   }
   ```

3. **To this:**
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

   Note: Changed `index-full.js` to `index.js`

## Alternative: Use NPM Global Install (Easier)

1. **Install globally:**
   ```bash
   npm install -g alecs-mcp-server-akamai
   ```

2. **Use this simpler configuration:**
   ```json
   {
     "mcpServers": {
       "alecs-akamai": {
         "command": "alecs"
       }
     }
   }
   ```

3. **Restart Claude Desktop**

## If Running from Source

Make sure you've built the project:

```bash
cd /Users/sseifert/code/AI/alecs-mcp-server-akamai
npm install
npm run build
```

This creates the `dist/index.js` file.

## Important Notes

- ALECS is an MCP server, not a Claude Desktop extension
- The error "Extension alecs-akamai not found" suggests it's configured in the wrong section
- Make sure it's under `mcpServers`, not `extensions`
- Always restart Claude Desktop after configuration changes

That should fix your issue!