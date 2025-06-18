# MCP Property Onboarding Demo

> **Note**: This guide uses placeholder paths. Replace:
> - `<USER_HOME>` with your actual home directory (e.g., `/home/username` or `/Users/username`)
> - `<PROJECT_ROOT>` with the actual project directory path

## Starting the MCP Server

The MCP server can be started in different modes:

### Interactive Mode (Recommended)
```bash
npm start
# or
node dist/interactive-launcher.js
```

### Direct Property Server Mode
```bash
node dist/servers/property-server.js
```

## MCP Commands for Property Onboarding

### 1. First, check available groups
```json
{
  "method": "tools/call",
  "params": {
    "name": "property.groups.list",
    "arguments": {}
  }
}
```

### 2. Search for existing property
```json
{
  "method": "tools/call",
  "params": {
    "name": "property.search",
    "arguments": {
      "hostname": "code.solutionsedge.io"
    }
  }
}
```

### 3. Run the onboarding workflow
```json
{
  "method": "tools/call",
  "params": {
    "name": "property.onboard",
    "arguments": {
      "hostname": "code.solutionsedge.io",
      "originHostname": "origin-code.solutionsedge.io",
      "contractId": "ctr_1-5C13O2",
      "groupId": "grp_18543",
      "useCase": "web-app",
      "notificationEmails": ["test@solutionsedge.io"],
      "dnsProvider": "edge-dns"
    }
  }
}
```

### 4. Check onboarding status
```json
{
  "method": "tools/call",
  "params": {
    "name": "property.onboarding.status",
    "arguments": {
      "hostname": "code.solutionsedge.io"
    }
  }
}
```

### 5. After staging validation, activate to production
```json
{
  "method": "tools/call",
  "params": {
    "name": "property.activate",
    "arguments": {
      "propertyId": "prp_XXXXXX",
      "version": 1,
      "network": "PRODUCTION",
      "note": "Production activation after staging validation",
      "notifyEmails": ["ops@solutionsedge.io"]
    }
  }
}
```

## Using with Claude Desktop

If you're using Claude Desktop, the configuration would be:

```json
{
  "mcpServers": {
    "akamai": {
      "command": "node",
      "args": ["<PROJECT_ROOT>/dist/index.js"],
      "env": {
        "AKAMAI_EDGERC": "<USER_HOME>/.edgerc",
        "AKAMAI_SECTION": "default"
      }
    }
  }
}
```

## Command Line Usage

You can also use the MCP server from the command line:

```bash
# List available tools
echo '{"method":"tools/list"}' | node dist/index.js

# Call a specific tool
echo '{"method":"tools/call","params":{"name":"property.onboard","arguments":{"hostname":"code.solutionsedge.io","originHostname":"origin-code.solutionsedge.io","contractId":"ctr_1-5C13O2","groupId":"grp_18543"}}}' | node dist/index.js
```

## Expected Output

When successful, you'll see:
- Property ID created
- CP Code ID created
- Edge hostname created
- Activation ID for staging
- DNS setup instructions or confirmation
- Next steps for production activation