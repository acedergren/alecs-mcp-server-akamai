# Remote Authentication Architecture for ALECS MCP Server

## Overview

This document describes the secure architecture for enabling remote access to ALECS MCP Server without exposing .edgerc credentials.

## Security Principles

1. **Never transmit .edgerc credentials** - These stay on the server
2. **Use derived tokens** - Generate specific tokens for remote clients
3. **Implement least privilege** - Tokens have minimal required permissions
4. **Enable auditability** - Track all actions by token/client
5. **Support revocation** - Instantly revoke compromised tokens

## Architecture Diagram

```mermaid
graph TB
    subgraph "Remote Clients"
        C1[Claude Desktop<br/>Remote]
        C2[API Client]
        C3[CI/CD Pipeline]
    end
    
    subgraph "ALECS MCP Server"
        subgraph "Authentication Layer"
            TM[Token Manager]
            TV[Token Validator]
            AL[Audit Logger]
        end
        
        subgraph "Authorization Layer" 
            CP[Customer Policy]
            TP[Tool Permissions]
            RL[Rate Limiter]
        end
        
        subgraph "Core Services"
            AK[Akamai Client]
            EC[EdgeGrid Config<br/>.edgerc]
            TS[Tool Services]
        end
    end
    
    subgraph "Akamai APIs"
        API[Akamai API]
    end
    
    C1 & C2 & C3 -->|"Bearer Token"| TV
    TV -->|"Validate"| TM
    TV -->|"Log"| AL
    TM -->|"Check Permissions"| CP
    CP -->|"Apply Policies"| TP
    TP -->|"Rate Check"| RL
    RL -->|"Authorized Request"| TS
    TS -->|"Local Access"| EC
    AK -->|"EdgeGrid Auth"| API
    
    style TM fill:#90EE90
    style EC fill:#FFB6C1
    style TV fill:#87CEEB
```

## Implementation Components

### 1. Token Generation & Management

```typescript
// Extended Token Manager with customer binding
interface RemoteAccessToken {
  id: string;
  hash: string;
  metadata: {
    description: string;
    createdAt: Date;
    expiresAt?: Date;
    lastUsedAt?: Date;
    // Remote access specific
    allowedCustomers: string[];      // Which .edgerc sections
    allowedTools: string[];           // Which MCP tools
    allowedNetworks?: string[];       // IP restrictions
    rateLimitPerHour?: number;        // Request limits
  };
}
```

### 2. Authentication Flow

```typescript
// 1. Admin generates token for remote client
POST /api/tokens/generate
{
  "description": "Production CI/CD Pipeline",
  "expiresInDays": 90,
  "allowedCustomers": ["production"],
  "allowedTools": ["property.list", "property.activate"],
  "allowedNetworks": ["10.0.0.0/8"],
  "rateLimitPerHour": 100
}

// 2. Response includes token (shown once)
{
  "token": "alecs_prod_7f3a9b2c5d...",
  "id": "tok_123",
  "expiresAt": "2024-03-01T00:00:00Z"
}

// 3. Client uses token for MCP requests
Authorization: Bearer alecs_prod_7f3a9b2c5d...
```

### 3. WebSocket Authentication

```typescript
// WebSocket connection with token auth
class AuthenticatedWebSocketTransport extends WebSocketTransport {
  async connect(url: string, token: string) {
    const ws = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    ws.on('open', () => {
      // Send auth verification
      ws.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
    });
  }
}
```

### 4. Customer Context Enforcement

```typescript
// Middleware to enforce customer restrictions
async function enforceCustomerContext(
  token: RemoteAccessToken,
  requestedCustomer: string
): Promise<void> {
  if (!token.metadata.allowedCustomers.includes(requestedCustomer)) {
    throw new UnauthorizedError(
      `Token not authorized for customer: ${requestedCustomer}`
    );
  }
}
```

### 5. Tool Permission Matrix

```typescript
// Define permission levels
enum PermissionLevel {
  READ = 'read',      // List, get operations
  WRITE = 'write',    // Create, update operations  
  ACTIVATE = 'activate', // Activation operations
  DELETE = 'delete'   // Deletion operations
}

// Tool permission mapping
const TOOL_PERMISSIONS: Record<string, PermissionLevel> = {
  'property.list': PermissionLevel.READ,
  'property.create': PermissionLevel.WRITE,
  'property.activate': PermissionLevel.ACTIVATE,
  'property.remove': PermissionLevel.DELETE,
  // ... etc
};
```

## Security Features

### 1. Token Security
- SHA-256 hashing for storage
- Cryptographically secure generation
- One-way hashing (tokens can't be recovered)
- Automatic expiration

### 2. Rate Limiting
```typescript
// Per-token rate limiting
const rateLimiter = new RateLimiter({
  keyGenerator: (req) => req.token.id,
  points: req.token.metadata.rateLimitPerHour || 1000,
  duration: 3600, // 1 hour
});
```

### 3. Audit Logging
```typescript
// Comprehensive audit trail
interface AuditLog {
  timestamp: Date;
  tokenId: string;
  clientIp: string;
  customer: string;
  tool: string;
  parameters: any;
  result: 'success' | 'denied' | 'error';
  errorDetails?: string;
}
```

### 4. Token Rotation
```typescript
// Automatic token rotation for long-lived tokens
async function rotateTokenIfNeeded(token: RemoteAccessToken): Promise<string | null> {
  const daysSinceCreation = daysBetween(token.metadata.createdAt, new Date());
  
  if (daysSinceCreation > 60) { // Rotate after 60 days
    const newToken = await tokenManager.rotateToken(token.id);
    await notifyTokenRotation(token, newToken);
    return newToken;
  }
  
  return null;
}
```

## Deployment Options

### Option 1: Standalone Remote Server
```yaml
# docker-compose.yml
version: '3.8'
services:
  alecs-remote:
    image: alecs-mcp-server-akamai:latest
    environment:
      - MCP_TRANSPORT=websocket
      - AUTH_MODE=token
      - EDGERC_PATH=/secrets/.edgerc
    volumes:
      - ./secrets/.edgerc:/secrets/.edgerc:ro
      - ./data:/app/data
    ports:
      - "8080:8080"
```

### Option 2: Kubernetes with Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: alecs-edgerc
type: Opaque
data:
  .edgerc: <base64-encoded-edgerc>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alecs-mcp-server
spec:
  template:
    spec:
      containers:
      - name: alecs
        image: alecs-mcp-server-akamai:latest
        env:
        - name: AUTH_MODE
          value: "token"
        volumeMounts:
        - name: edgerc
          mountPath: /secrets
          readOnly: true
      volumes:
      - name: edgerc
        secret:
          secretName: alecs-edgerc
```

### Option 3: AWS Lambda (Serverless)
```typescript
// Serverless function with Secrets Manager
import { SecretsManager } from 'aws-sdk';

const sm = new SecretsManager();

export async function handler(event: APIGatewayEvent) {
  // Validate token
  const token = validateBearerToken(event.headers.Authorization);
  
  // Get .edgerc from Secrets Manager (cached)
  const edgerc = await sm.getSecretValue({
    SecretId: 'alecs/edgerc'
  }).promise();
  
  // Process MCP request with customer context
  return processMCPRequest(event.body, token, edgerc);
}
```

## Migration Path

### Phase 1: Local Enhancement (Current)
- ✅ Token Manager implementation
- ✅ Basic authentication/authorization
- ✅ Audit logging

### Phase 2: Remote Enablement (Proposed)
- Add token-based auth to WebSocket transport
- Implement customer/tool restrictions
- Add rate limiting per token
- Create admin API for token management

### Phase 3: Enterprise Features
- SAML/OAuth integration
- Multi-factor authentication
- Role-based access control (RBAC)
- Compliance reporting (SOC2, etc.)

### Phase 4: Cloud Native
- Kubernetes operators
- Service mesh integration
- Distributed rate limiting
- Global token replication

## Security Checklist

- [ ] Never log or transmit .edgerc contents
- [ ] Use TLS for all remote connections
- [ ] Implement token expiration
- [ ] Add rate limiting per token
- [ ] Enable comprehensive audit logging
- [ ] Support instant token revocation
- [ ] Implement IP whitelisting
- [ ] Add anomaly detection
- [ ] Regular security audits
- [ ] Penetration testing

## Example: Remote Client Setup

```bash
# 1. Admin generates token on server
alecs-admin generate-token \
  --description "GitHub Actions CI" \
  --expires-days 90 \
  --customers production \
  --tools "property.list,property.activate" \
  --rate-limit 1000

# Output: alecs_prod_7f3a9b2c5d8e4f1a...

# 2. Client configures Claude Desktop
{
  "mcpServers": {
    "alecs-remote": {
      "command": "npx",
      "args": ["alecs-mcp-client"],
      "env": {
        "ALECS_SERVER_URL": "wss://alecs.company.com",
        "ALECS_TOKEN": "alecs_prod_7f3a9b2c5d8e4f1a...",
        "MCP_TRANSPORT": "websocket"
      }
    }
  }
}

# 3. Client connects securely without ever seeing .edgerc
```

## Conclusion

Using .edgerc directly for remote authentication is **not recommended** due to severe security risks. Instead, the proposed token-based architecture provides:

1. **Zero credential exposure** - .edgerc never leaves the server
2. **Granular access control** - Per-customer, per-tool restrictions
3. **Complete auditability** - Every action is logged
4. **Enterprise security** - Rate limiting, IP restrictions, expiration
5. **Easy revocation** - Instantly revoke compromised tokens

This architecture maintains the security principle of least privilege while enabling legitimate remote access use cases.