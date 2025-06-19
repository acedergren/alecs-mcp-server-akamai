# OAuth 2.0 Resource Server Implementation for ALECS MCP Server

## Overview

This implementation provides a complete OAuth 2.0 Resource Server for the ALECS MCP Server, following OAuth 2.0 specifications and RFC 8707 (Resource Indicators). The implementation enables fine-grained access control to Akamai resources through OAuth 2.0 tokens.

## Key Components

### 1. Protected Resource Metadata Structure (`src/types/oauth.ts`)

- **Resource Types**: Properties, Hostnames, Certificates, DNS Zones, DNS Records, Network Lists, Purge, Reports, Security Configs
- **Resource URI Scheme**: `akamai://{resource-type}/{account-id}/{resource-id}[/{sub-path}]`
- **Resource Metadata**: Includes name, description, required scopes, owner information, timestamps, and allowed operations

### 2. Authorization Server Discovery (`src/services/oauth-resource-server.ts`)

- **Well-Known Endpoints**:
  - `/.well-known/oauth-authorization-server` - Authorization server metadata (RFC 8414)
  - `/.well-known/oauth-resource-server` - Resource server metadata
  - `/resources` - Resource discovery endpoint

- **Metadata Includes**:
  - Issuer, endpoints (authorization, token, introspection, JWKS)
  - Supported scopes, response types, grant types
  - Resource indicators support (RFC 8707)

### 3. Resource Indicators Validation (`src/utils/oauth-resource-indicators.ts`)

- **RFC 8707 Compliance**: Full support for resource indicators in token requests
- **Validation Features**:
  - Resource URI format validation
  - Resource type validation
  - Account/Contract ID validation
  - Sub-path validation for hierarchical resources
  - Scope consistency checking

### 4. OAuth Middleware (`src/middleware/oauth-authorization.ts`)

- **Authentication**: Bearer token extraction and validation
- **Token Introspection**: Validates token status and claims
- **Resource Authorization**: Fine-grained access control based on scopes and resource ownership
- **Error Handling**: RFC 6750 compliant error responses with WWW-Authenticate headers

## Resource URI Examples

```
# Property Resource
akamai://property/acc_123456/prp_789012
akamai://property/acc_123456/prp_789012/versions/3

# DNS Zone Resource
akamai://dns_zone/acc_123456/example.com
akamai://dns_zone/acc_123456/example.com/records

# Certificate Resource
akamai://certificate/acc_123456/12345

# Network List Resource
akamai://network_list/acc_123456/1234_BLOCKLIST
```

## Scope Structure

### Base Scopes
- `akamai:read` - Read access to all resources
- `akamai:write` - Write access to all resources
- `property:read` - Read all properties
- `property:write` - Write all properties
- `property:activate` - Activate properties
- `dns:read` - Read DNS zones
- `dns:write` - Write DNS zones
- `certificate:read` - Read certificates
- `certificate:manage` - Manage certificates
- `network_list:read` - Read network lists
- `network_list:write` - Write network lists
- `purge:execute` - Execute purge operations
- `report:read` - Read reports
- `security:read` - Read security configs
- `security:write` - Write security configs

### Resource-Specific Scopes
- `property:prp_789012:read` - Read specific property
- `property:prp_789012:write` - Write specific property
- `property:prp_789012:activate` - Activate specific property
- `dns_zone:example.com:read` - Read specific DNS zone
- `dns_zone:example.com:write` - Write specific DNS zone
- `certificate:12345:renew` - Renew specific certificate
- `network_list:1234_BLOCKLIST:activate` - Activate specific network list

## Usage Example

```typescript
import { OAuthResourceServer } from '@/services/oauth-resource-server';
import { OAuthMiddlewareFactory } from '@/middleware/oauth-authorization';

// Initialize Resource Server
const resourceServer = new OAuthResourceServer({
  baseUrl: 'https://api.akamai.mcp.local',
  authServerUrl: 'https://auth.akamai.com',
  resourceIdentifier: 'akamai-mcp-api',
});

// Create middleware factory
const oauth = new OAuthMiddlewareFactory(resourceServer);

// Apply to Express routes
app.use('/api', oauth.authenticate());

app.get('/api/properties/:id', 
  oauth.authorizeResource(ResourceType.PROPERTY, 'read'),
  (req, res) => {
    // Access authorized resource via req.oauth.resource
  }
);

app.post('/api/properties/:id/activate',
  oauth.authorizeResource(ResourceType.PROPERTY, 'activate'),
  (req, res) => {
    // Activation logic
  }
);
```

## Resource Registration

Resources are automatically registered when accessed through MCP tools:

```typescript
// When listing properties
const properties = await mcpServer.callTool('list_properties', { customer: 'default' });
// Each property is automatically registered as a protected resource

// When getting a specific property
const property = await mcpServer.callTool('get_property', { 
  propertyId: 'prp_789012',
  customer: 'default' 
});
// The property is registered with its metadata and required scopes
```

## Token Requirements

Access tokens must include:
- `aud` (audience): Must include the resource server identifier
- `scope`: Space-separated list of granted scopes
- `akamai.account_id`: Account ID for resource ownership validation
- `akamai.contract_ids`: Optional contract IDs for access control
- `akamai.group_ids`: Optional group IDs for access control

## Error Responses

The implementation returns RFC 6750 compliant error responses:

```json
{
  "error": "insufficient_scope",
  "error_description": "Required scopes: property:write",
  "error_uri": "https://api.akamai.mcp.local/docs/errors#insufficient_scope"
}
```

With appropriate WWW-Authenticate headers:
```
WWW-Authenticate: Bearer realm="Akamai API", error="insufficient_scope", error_description="Required scopes: property:write"
```

## Security Considerations

1. **Token Validation**: All tokens are validated through introspection
2. **Resource Ownership**: Access is restricted to resources owned by the token's account
3. **Scope Enforcement**: Fine-grained scopes enable least-privilege access
4. **Audit Logging**: All authorization decisions are logged with timestamps and reasons
5. **HTTPS Required**: All endpoints must be served over HTTPS in production

## Testing

Run the OAuth Resource Server tests:

```bash
npx tsx __tests__/manual/test-oauth-resource-server.ts
```

The test suite validates:
- Authorization server discovery
- Resource server discovery
- Resource URI parsing
- Protected resource registration
- Resource indicator validation
- Token introspection
- Access authorization decisions
- Scope validation
- Resource discovery