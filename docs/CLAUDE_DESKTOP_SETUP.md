# Claude Desktop Setup Guide for ALECS v2.0

## 📋 Prerequisites

1. **ALECS Installed and Built**
   ```bash
   # Install ALECS globally
   npm install -g alecs-mcp-server-akamai@2.0.0
   
   # Or build from source
   cd /path/to/alecs-mcp-server-akamai
   npm install
   npm run build
   ```

2. **Akamai EdgeRC Configuration**
   Ensure you have `~/.edgerc` configured:
   ```ini
   [default]
   client_secret = your_client_secret
   host = your_host.luna.akamaiapis.net
   access_token = your_access_token
   client_token = your_client_token
   account_key = your_account_key  # Optional: for multi-account access
   ```

## 🚀 Quick Setup

### Option 1: Automatic Setup (Recommended)

```bash
# Run the installation script
curl -sSL https://raw.githubusercontent.com/acedergren/alecs-mcp-server-akamai/main/scripts/install-claude-desktop.sh | bash
```

### Option 2: Manual Setup

1. **Edit Claude Desktop Configuration**
   ```bash
   # Open the config file
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Add ALECS Configuration**
   ```json
   {
     "mcpServers": {
       "alecs": {
         "command": "node",
         "args": ["/Users/YOUR_USERNAME/Projects/alecs-mcp-server-akamai/dist/index.js"],
         "env": {
           "MCP_TRANSPORT": "stdio",
           "DEFAULT_CUSTOMER": "default"
         }
       }
     }
   }
   ```

   **Important**: Replace `/Users/YOUR_USERNAME/Projects/alecs-mcp-server-akamai` with your actual path.

3. **For NPM Global Installation**
   If you installed ALECS globally via npm:
   ```json
   {
     "mcpServers": {
       "alecs": {
         "command": "alecs",
         "args": [],
         "env": {
           "MCP_TRANSPORT": "stdio",
           "DEFAULT_CUSTOMER": "default"
         }
       }
     }
   }
   ```

## 🔧 Configuration Options

### Environment Variables

- **MCP_TRANSPORT**: Always set to `"stdio"` for Claude Desktop
- **DEFAULT_CUSTOMER**: The default .edgerc section to use (default: `"default"`)
- **LOG_LEVEL**: Set to `"debug"` for troubleshooting (optional)
- **SECTION**: Override the .edgerc section (optional)

### Advanced Configuration Examples

#### Multiple Customer Sections
```json
{
  "mcpServers": {
    "alecs-prod": {
      "command": "node",
      "args": ["/path/to/alecs/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "DEFAULT_CUSTOMER": "production"
      }
    },
    "alecs-staging": {
      "command": "node",
      "args": ["/path/to/alecs/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "DEFAULT_CUSTOMER": "staging"
      }
    }
  }
}
```

#### With Debug Logging
```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["/path/to/alecs/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "DEFAULT_CUSTOMER": "default",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

## ✅ Verification Steps

1. **Restart Claude Desktop**
   - Quit Claude Desktop completely
   - Reopen Claude Desktop

2. **Check Server Status**
   In Claude, type:
   ```
   Can you check what MCP servers are available?
   ```

3. **Test Basic Functionality**
   ```
   List my Akamai properties
   ```

   Expected response: Claude should list your Akamai properties using the `property_list` tool.

## 🐛 Troubleshooting

### Server Not Appearing in Claude

1. **Check JSON Syntax**
   ```bash
   # Validate the JSON file
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
   ```

2. **Verify Build**
   ```bash
   # Check if the server runs standalone
   node /path/to/alecs/dist/index.js --help
   ```

3. **Check Logs**
   Claude Desktop logs can be found in:
   - macOS: `~/Library/Logs/Claude/`
   - Look for MCP-related errors

### Common Issues

#### "Command not found"
- Ensure the path in `args` is absolute and correct
- Verify the dist folder exists and contains index.js

#### "No tools available"
- Check your .edgerc file exists and is properly formatted
- Verify the DEFAULT_CUSTOMER section exists in .edgerc

#### "Authentication failed"
- Ensure your Akamai credentials in .edgerc are valid
- Test with Akamai CLI: `akamai property list`

## 📊 Usage Examples

Once configured, you can use natural language with Claude:

### Property Management
```
Show me all my Akamai properties
Create a new property called "test-site"
What's the configuration for property "www.example.com"?
```

### DNS Management
```
List all DNS zones
Show DNS records for example.com
Add a CNAME record pointing test.example.com to cdn.example.com
```

### Security
```
Show me all network lists
Create an IP blocklist for these addresses: 192.168.1.0/24
Check my WAF policies
```

### Billing & Reporting
```
Show my Akamai billing summary
What's my bandwidth usage for the last 7 days?
Get traffic report for property "www.example.com"
```

## 🎯 Best Practices

1. **Use Specific Sections**: Create different .edgerc sections for different environments
2. **Enable Debug Logging**: When troubleshooting, add `"LOG_LEVEL": "debug"`
3. **Regular Updates**: Keep ALECS updated with `npm update -g alecs-mcp-server-akamai`
4. **Security**: Never share your .edgerc file or expose credentials

## 📚 Additional Resources

- [ALECS Documentation](../README.md)
- [MCP Protocol Documentation](https://www.anthropic.com/docs/mcp)
- [Akamai EdgeRC Setup](https://techdocs.akamai.com/developer/docs/set-up-authentication-credentials)