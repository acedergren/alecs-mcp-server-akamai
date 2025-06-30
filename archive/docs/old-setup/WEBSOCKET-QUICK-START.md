# ALECS WebSocket Quick Start Guide

## 🚀 5-Minute Setup

### On Your Server

```bash
# 1. Start WebSocket server
npm run deploy:websocket

# 2. Generate token
npm run generate-token
# Save the token! Example: NJn6J0Z7Hq0WkXGCGnv5ESzGJZTiabHIe9I9u509OyI

# 3. Verify it's running
pm2 status
# Should show: mcp-akamai-websocket │ online
```

### On Claude Desktop

1. **Create config file**:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

2. **Add this configuration**:

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/ws-client", "ws://your-server:8082/mcp"],
      "env": {
        "AUTHORIZATION": "Bearer your-generated-token"
      }
    }
  }
}
```

3. **Restart Claude Desktop**

## 🔍 Test Your Connection

```bash
# On your server
node test-websocket-connection.js
```

## 📋 Your Connection Details

| Setting | Value |
|---------|-------|
| WebSocket URL | `ws://web01.cloud.solutionsedge.io:8082/mcp` |
| Token | `NJn6J0Z7Hq0WkXGCGnv5ESzGJZTiabHIe9I9u509OyI` |
| Server Status | ✅ Online |
| Available Tools | 180+ Akamai management tools |

## 🛠️ Common Commands

```bash
# Server Management
pm2 status                    # Check server status
pm2 logs mcp-akamai-websocket # View logs
pm2 restart mcp-akamai-websocket # Restart server

# Token Management
npm run generate-token        # Generate new token
npm run list-tokens          # List all tokens
npm run revoke-token         # Revoke a token
```

## ❓ Troubleshooting

**Can't connect?**
1. Check firewall: `sudo ufw allow 8082`
2. Verify server: `pm2 status`
3. Test locally: `ws://localhost:8082/mcp`

**Authentication failed?**
1. Check token has no extra spaces
2. Verify "Bearer " prefix in config
3. Generate new token if needed

## 🔒 Security Tips

1. **Always use tokens** - Never disable authentication
2. **Use HTTPS/WSS in production** - See full guide for SSL setup
3. **Rotate tokens regularly** - Set expiration dates
4. **Monitor access** - Check `pm2 logs` regularly

## 📚 More Resources

- [Full WebSocket Guide](./claude-desktop-websocket-guide.md)
- [Security Best Practices](../docs/security/)
- [API Documentation](../wiki/API-Reference.md)
- [Troubleshooting Guide](../wiki/Troubleshooting.md)