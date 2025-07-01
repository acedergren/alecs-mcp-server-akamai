# Simple .edgerc Remote Authentication

## How to Use .edgerc for Remote Authentication

### Option 1: Direct Transmission (Simple but Less Secure)

```typescript
// Client sends .edgerc credentials
{
  "auth": {
    "type": "edgerc",
    "credentials": {
      "client_secret": "abc123...",
      "host": "akaa-xxx.luna.akamaiapis.net",
      "access_token": "akab-xxx",
      "client_token": "akab-yyy"
    }
  }
}

// Server validates and uses them
const edgeGrid = new EdgeGrid(
  credentials.client_token,
  credentials.client_secret,
  credentials.access_token,
  credentials.host
);
```

### Option 2: Customer Section Reference (Better)

```typescript
// Client sends which customer they are
{
  "auth": {
    "type": "customer",
    "customer": "acme-corp",
    "secret": "shared-secret-for-acme"
  }
}

// Server has .edgerc with multiple sections
[acme-corp]
client_secret = xxx
host = yyy
access_token = zzz
client_token = aaa

[beta-inc]
client_secret = bbb
...

// Server validates customer+secret, then uses their section
if (validateCustomerSecret(auth.customer, auth.secret)) {
  const client = new AkamaiClient(auth.customer);
}
```

### Option 3: Encrypted .edgerc Transmission

```typescript
// Client encrypts their .edgerc content
const encrypted = encrypt(edgercContent, serverPublicKey);

{
  "auth": {
    "type": "encrypted-edgerc",
    "data": encrypted
  }
}

// Server decrypts and uses
const edgercContent = decrypt(auth.data, serverPrivateKey);
const client = AkamaiClient.fromEdgeRc(edgercContent);
```

### Option 4: OAuth-Style with .edgerc

```typescript
// 1. Client requests access with their .edgerc
POST /auth/request-access
{
  "client_credentials": { /* .edgerc content */ },
  "requested_permissions": ["property.list", "dns.*"]
}

// 2. Server validates .edgerc works, returns session token
{
  "session_token": "sess_abc123",
  "expires_in": 3600
}

// 3. Client uses session token for all requests
Authorization: Bearer sess_abc123
```

## Architecture Comparison

| Method | Security | Complexity | Use Case |
|--------|----------|------------|----------|
| Direct | ⚠️ Low | Simple | Dev/Testing |
| Customer Ref | ✅ Medium | Medium | Multi-tenant |
| Encrypted | ✅ Good | Medium | Single tenant |
| OAuth-Style | ✅ Best | Complex | Production |

## Simple Implementation Example

```typescript
// Remote client configuration
{
  "mcpServers": {
    "alecs-remote": {
      "command": "npx",
      "args": ["alecs-mcp-client"],
      "env": {
        "ALECS_SERVER": "wss://alecs.company.com",
        "ALECS_AUTH_TYPE": "edgerc",
        "ALECS_EDGERC": "/path/to/.edgerc",
        "ALECS_CUSTOMER": "production"
      }
    }
  }
}

// Server accepts and validates
class RemoteAuthHandler {
  async authenticate(authData: any) {
    switch (authData.type) {
      case 'edgerc':
        // Direct validation
        return this.validateEdgeRC(authData.credentials);
        
      case 'customer':
        // Reference validation  
        return this.validateCustomerAuth(
          authData.customer,
          authData.secret
        );
    }
  }
}
```

## TL;DR

Yes, you CAN use .edgerc for remote auth. The simplest way is to have clients send their credentials directly, but it's better to use a reference system where the server holds the .edgerc and clients just identify which customer they are.