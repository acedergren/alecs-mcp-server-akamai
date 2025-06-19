# OAuth Quick Start Guide for ALECS MCP Server

## 🚀 Quick Setup

### 1. Configure OAuth in Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "alecs-oauth": {
      "command": "node",
      "args": ["/path/to/alecs-mcp-server-akamai/dist/index-oauth.js"],
      "env": {
        "OAUTH_ENABLED": "true",
        "OAUTH_CLIENT_ID": "your-client-id",
        "OAUTH_CLIENT_SECRET": "your-client-secret",
        "MCP_AUTH_HEADER": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### 2. Obtain OAuth Token

```bash
# Get token from your OAuth provider
curl -X POST https://auth.akamai.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "scope=property:read property:write dns:read"
```

### 3. Use with Claude

**Public Tools (No Auth Required):**
- "Show me available tools" → Works immediately
- "Describe the list-properties tool" → Works immediately

**Protected Tools (Auth Required):**
- "List my Akamai properties" → Requires `property:read` scope
- "Create a new property" → Requires `property:write` scope
- "Activate to production" → Requires `property:activate` scope

## 📊 OAuth Scopes

| Scope | Description | Example Tools |
|-------|-------------|---------------|
| `property:read` | View properties and configurations | list-properties, get-property-version |
| `property:write` | Create/modify properties | create-property, update-rules |
| `property:activate` | Deploy to networks | activate-property |
| `dns:read` | View DNS zones and records | list-dns-zones, get-dns-record |
| `dns:write` | Modify DNS | create-dns-record, update-zone |
| `certificate:manage` | SSL/TLS operations | create-certificate, deploy-cert |
| `purge:submit` | Cache invalidation | purge-url, purge-tag |

## 🔐 Security Features

### Token Validation
- JWT validation with JWKS
- Token introspection via OAuth server
- Automatic token expiry handling

### Token Binding (Optional)
- DPoP (Demonstrating Proof of Possession)
- mTLS client certificates
- Certificate thumbprint binding

### Rate Limiting
- Per-client rate limits
- Configurable windows and limits
- Automatic 429 responses

## 🧪 Testing OAuth

### Test Without Auth (Should Fail)
```javascript
// MCP Request
{
  "method": "tools/call",
  "params": {
    "name": "list-properties",
    "arguments": {}
  }
}
// Response: 401 Unauthorized
```

### Test With Auth (Should Succeed)
```javascript
// MCP Request
{
  "method": "tools/call",
  "params": {
    "name": "list-properties",
    "arguments": {}
  },
  "_meta": {
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN"
    }
  }
}
// Response: 200 OK with properties
```

## 🚨 Troubleshooting

### "Authentication required"
- Check if tool is protected (not in public tools list)
- Verify MCP_AUTH_HEADER is set correctly
- Ensure token hasn't expired

### "Invalid token"
- Verify token format (should start with "Bearer ")
- Check token hasn't expired
- Validate token has required scopes

### "Insufficient scopes"
- Token is valid but missing required scope
- Request new token with additional scopes
- Check tool documentation for required scopes

## 📚 Resources

- [OAuth 2.1 Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-10)
- [MCP 2025-06-18 Specification](https://spec.modelcontextprotocol.io)
- [Test Suite](/__tests__/mcp-2025-oauth-compliance.test.ts)
- [Architecture Documentation](/docs/architecture/OAUTH21-SECURITY-IMPLEMENTATION.md)