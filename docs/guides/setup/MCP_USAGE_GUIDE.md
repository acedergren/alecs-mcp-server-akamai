# MCP Server Usage Guide

> **Note**: This guide uses placeholder paths. Replace:
> - `<USER_HOME>` with your actual home directory (e.g., `/home/username` or `/Users/username`)
> - `<PROJECT_ROOT>` with the actual project directory path

## 🚀 Property Onboarding with MCP

The MCP server is now ready to use for property onboarding! Here's how to use it:

### Method 1: Claude Desktop Configuration

Add this to your Claude Desktop config:

```json
{
  "mcpServers": {
    "akamai-property": {
      "command": "node",
      "args": [
        "<PROJECT_ROOT>/dist/servers/property-server.js"
      ],
      "env": {
        "AKAMAI_EDGERC": "<USER_HOME>/.edgerc",
        "AKAMAI_SECTION": "default"
      }
    }
  }
}
```

Then in Claude, you can say:
- "Use the akamai-property server to onboard code.solutionsedge.io"
- "Create a new CDN property for api.example.com with origin api-origin.example.com"

### Method 2: Direct MCP Protocol

Start the server:
```bash
node dist/servers/property-server.js
```

Send MCP requests via stdin:

#### Check Available Tools
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
```

#### Run Onboarding Wizard
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "onboard-property-wizard",
    "arguments": {
      "hostname": "code.solutionsedge.io"
    }
  }
}
```

#### Run Full Onboarding
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "onboard-property",
    "arguments": {
      "hostname": "code.solutionsedge.io",
      "originHostname": "origin-code.solutionsedge.io",
      "contractId": "ctr_1-5C13O2",
      "groupId": "grp_18543",
      "useCase": "web-app",
      "notificationEmails": ["ops@solutionsedge.io"],
      "dnsProvider": "edge-dns"
    }
  }
}
```

### Method 3: Interactive Launcher

Use the interactive launcher for a menu-driven experience:

```bash
npm start
# or
node dist/interactive-launcher.js
```

Select "Property Server" and then use the onboarding tools.

## 📊 What Happens During Onboarding

1. **Validation** - Checks configuration and origin hostname
2. **Pre-flight** - Verifies property doesn't already exist
3. **Product Selection** - Chooses Ion Standard for web-app/api
4. **CP Code Creation** - Creates code-solutionsedge-io
5. **Property Creation** - Creates the CDN property
6. **Edge Hostname** - Creates code.solutionsedge.io.edgekey.net
7. **Rule Configuration** - Applies Ion Standard template
8. **DNS Setup** - Creates records or provides guidance
9. **Staging Activation** - Activates to staging network
10. **Next Steps** - Provides production activation command

## 🎯 Example Use Cases

### Web Application (Auto-detects Ion Standard)
```json
{
  "hostname": "www.example.com",
  "originHostname": "origin.example.com",
  "contractId": "ctr_YOUR-CONTRACT",
  "groupId": "grp_YOUR-GROUP"
}
```

### API Endpoint (Auto-detects Ion Standard)
```json
{
  "hostname": "api.example.com",
  "originHostname": "api-origin.example.com",
  "contractId": "ctr_YOUR-CONTRACT",
  "groupId": "grp_YOUR-GROUP"
}
```

### Download Site
```json
{
  "hostname": "downloads.example.com",
  "originHostname": "origin-downloads.example.com",
  "contractId": "ctr_YOUR-CONTRACT",
  "groupId": "grp_YOUR-GROUP",
  "useCase": "download"
}
```

## 🔧 Troubleshooting

### Timeout Issues
The onboarding process can take 30-60 seconds as it creates multiple resources. This is normal.

### Authentication
Ensure your `.edgerc` file has valid credentials:
```bash
cat ~/.edgerc
```

### Check Logs
The server logs to stderr:
```bash
node dist/servers/property-server.js 2>server.log
```

## 🎉 Success Indicators

When successful, you'll see:
- ✅ Property ID: prp_XXXXXX
- ✅ CP Code: XXXXXXX (code-solutionsedge-io)
- ✅ Edge Hostname: code.solutionsedge.io.edgekey.net
- ✅ Activation: STAGING network
- ✅ Next steps for production

The entire process is automated and includes comprehensive error handling!