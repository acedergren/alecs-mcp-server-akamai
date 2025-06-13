# ALECS MCP Server - Setup Summary

## ✅ Current Setup Status

### 1. Development Server Configuration

The Claude Desktop is now configured to run ALECS in development mode:

**Configuration Location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "alecs-dev": {
      "command": "/Users/acedergr/Akamai-MCP/alecs-dev.sh",
      "args": [],
      "env": {
        "DEBUG": "0",
        "DEFAULT_CUSTOMER": "default"
      }
    }
  }
}
```

### 2. Wrapper Script

Created `/Users/acedergr/Akamai-MCP/alecs-dev.sh` to ensure proper working directory:

```bash
#!/bin/bash
cd /Users/acedergr/Akamai-MCP
exec npm run dev
```

### 3. Development Mode Benefits

- **No build required**: Uses `tsx` to run TypeScript directly
- **Hot reload**: Automatically restarts on file changes
- **Immediate testing**: Changes take effect immediately
- **Debug friendly**: Full error messages and stack traces

## 🚀 How to Use

### 1. Restart Claude Desktop

1. Quit Claude Desktop completely (Cmd+Q on macOS)
2. Start Claude Desktop again
3. Look for the MCP icon (🔌) in the interface
4. Click it to see "alecs-dev" listed

### 2. Test the Connection

Try these commands in Claude:

```
"List my Akamai properties"
"Show all DNS zones"
"Get details for property example.com"
```

### 3. Monitor Logs

If you need to see logs:
1. Open Claude Desktop
2. View → Toggle Developer Tools
3. Check the Console tab for server output

## 📝 Quick Reference

### Available Commands

| Purpose | Command |
|---------|---------|
| Start dev server manually | `npm run dev` |
| Build production version | `npm run build` |
| Run tests | `npm test` |
| View all available commands | `make help` |

### Key Files

- **Configuration**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Credentials**: `~/.edgerc`
- **Wrapper Script**: `/Users/acedergr/Akamai-MCP/alecs-dev.sh`
- **Main Entry**: `/Users/acedergr/Akamai-MCP/src/index.ts`

### Environment Variables

You can customize these in the Claude Desktop config:

- `DEBUG`: Set to "1" for debug output
- `DEFAULT_CUSTOMER`: Default .edgerc section (e.g., "production")
- `EDGERC_PATH`: Custom path to .edgerc file

## 🔧 Troubleshooting

### If ALECS doesn't appear in Claude

1. Check the wrapper script is executable:
   ```bash
   ls -la /Users/acedergr/Akamai-MCP/alecs-dev.sh
   # Should show -rwxr-xr-x permissions
   ```

2. Test the script manually:
   ```bash
   /Users/acedergr/Akamai-MCP/alecs-dev.sh
   # Should see "Server ready, waiting for connections..."
   ```

3. Verify Claude config:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

### If commands fail

1. Check .edgerc exists:
   ```bash
   ls -la ~/.edgerc
   ```

2. Verify .edgerc has valid credentials:
   ```bash
   grep -E "client_secret|host|access_token|client_token" ~/.edgerc
   ```

3. Enable debug mode by updating Claude config:
   ```json
   "env": {
     "DEBUG": "1",
     "DEFAULT_CUSTOMER": "default"
   }
   ```

## 🎯 Next Steps

1. **Test Basic Operations**:
   - List properties: "Show all my Akamai properties"
   - DNS zones: "List all DNS zones"
   - Property details: "Get info for property ID prp_12345"

2. **Try Advanced Features**:
   - Template creation: "Create a new static website property for example.com"
   - DNS migration: "Import DNS zone from Cloudflare for example.com"
   - Certificate creation: "Create a DV certificate for www.example.com"

3. **Production Build** (when ready):
   ```bash
   # Fix TypeScript errors first, then:
   make build
   
   # Update Claude config to use production build:
   "command": "node",
   "args": ["/Users/acedergr/Akamai-MCP/dist/index.js"]
   ```

## 📚 Documentation

- [Features Overview](./docs/features-overview.md)
- [CDN Provisioning Guide](./docs/cdn-provisioning-guide.md)
- [DNS Migration Guide](./docs/dns-migration-guide.md)
- [Docker Guide](./docs/docker-guide.md)
- [LLM Compatibility](./docs/llm-compatibility-guide.md)

## ✨ Working Features

All core MCP tools are working in dev mode:
- ✅ Property management (list, get, create)
- ✅ DNS zone management (CRUD operations)
- ✅ DNS record management (with hidden changelists)
- ✅ Certificate provisioning (CPS)
- ✅ Edge hostname management
- ✅ Template-based property creation
- ✅ Multi-customer support
- ✅ Progress tracking for long operations

The TypeScript build errors are only in the agent files and don't affect the core MCP functionality.