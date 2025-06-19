# OAuth 2.1 Security Implementation for ALECS MCP Server

## Overview

This document describes the OAuth 2.1 compliance layer implemented for the ALECS MCP Server, providing comprehensive security features including PKCE, sender-constrained tokens, and protection against malicious authorization servers.

## Implementation Components

### 1. OAuth 2.1 Compliance Layer (`src/auth/oauth21-compliance.ts`)

The compliance layer implements:

- **PKCE (Proof Key for Code Exchange)** - RFC 7636
  - Cryptographically secure code verifier generation (43-128 characters)
  - S256 code challenge method (SHA256) as required by OAuth 2.1
  - Timing-safe comparison for PKCE validation
  - Deprecated PLAIN method supported for backwards compatibility only

- **Security Features**
  - State parameter generation and validation for CSRF protection
  - Nonce support for OpenID Connect
  - Authorization server metadata validation (RFC 8414)
  - Anti-phishing protection with redirect URI validation

- **Removed Features** (OAuth 2.1 compliance)
  - No implicit grant support
  - No resource owner password credentials grant
  - Security-focused configuration only

### 2. Token Validator (`src/auth/token-validator.ts`)

Comprehensive token validation supporting:

- **JWT Validation**
  - JWKS-based signature verification
  - Algorithm restrictions (RS256, ES256 only)
  - Required claims validation
  - Clock skew tolerance

- **Token Introspection** (RFC 7662)
  - Support for opaque tokens
  - Client authentication for introspection endpoint
  - Response caching with configurable TTL

- **Token Binding Validation**
  - Certificate thumbprint binding (x5t#S256)
  - JWK thumbprint binding (jkt)
  - DPoP (Demonstrating Proof of Possession) support

### 3. OAuth Middleware (`src/auth/oauth-middleware.ts`)

MCP-specific OAuth integration:

- **Authentication & Authorization**
  - Bearer token extraction from request headers
  - Scope-based authorization for MCP tools
  - Public tool support (no auth required)
  - Auth context propagation

- **Rate Limiting**
  - Per-client rate limiting
  - Configurable windows and limits
  - Memory-efficient implementation

- **Integration Features**
  - Seamless MCP request/response wrapping
  - Tool-specific scope requirements
  - Metadata preservation

## Security Features

### 1. PKCE Implementation

```typescript
// Secure code verifier generation
- Uses crypto.randomBytes() for cryptographic randomness
- Variable length (43-128 chars) to prevent pattern analysis
- URL-safe character set only

// Code challenge generation
- SHA256 hashing only (S256 method)
- Base64url encoding without padding
- Timing-safe comparison to prevent timing attacks
```

### 2. Malicious Server Protection

```typescript
// Authorization server validation
- Trusted server whitelist
- Metadata validation via .well-known endpoint
- Required OAuth 2.1 feature checks:
  - S256 PKCE support
  - No implicit grant support
  - Valid JWKS endpoint

// Anti-phishing measures
- IP address detection in redirect URIs
- Suspicious TLD detection
- Homograph attack detection (non-ASCII characters)
- Pattern-based detection (-- or .. in domains)
```

### 3. Token Security

```typescript
// JWT Security
- Algorithm whitelist (RS256, ES256 only)
- Key ID (kid) requirement
- JWKS caching with expiration
- Required claims validation

// Token Binding
- TLS client certificate binding
- DPoP (Demonstrating Proof of Possession)
- Mutual TLS (mTLS) support
- Binding validation on each request
```

### 4. Caching & Performance

```typescript
// Intelligent caching
- Valid token cache (5 min default)
- Invalid token cache (1 min default)
- JWKS cache (1 hour default)
- Authorization server metadata cache

// Security considerations
- Token hashing for cache keys
- TTL-based expiration
- Memory-safe implementation
```

## Configuration

### Environment Variables

```bash
# Enable OAuth 2.1 protection
OAUTH_ENABLED=true

# Token validation endpoints
OAUTH_INTROSPECTION_ENDPOINT=https://auth.akamai.com/oauth/introspect
OAUTH_JWKS_URI=https://auth.akamai.com/.well-known/jwks.json

# Client credentials for introspection
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret

# Trusted authorization servers (comma-separated)
OAUTH_TRUSTED_SERVERS=https://auth.akamai.com,https://auth.example.com
```

### Tool-Specific Scopes

```typescript
const toolScopes = {
  // Property management
  'list-properties': ['property:read'],
  'get-property': ['property:read'],
  'create-property': ['property:write'],
  'activate-property': ['property:activate'],
  
  // DNS management
  'create-zone': ['dns:write'],
  'create-record': ['dns:write'],
  'delete-record': ['dns:write'],
  
  // Security configuration
  'create-network-list': ['security:write'],
  'update-network-list': ['security:write'],
  
  // Cache purging
  'purge-by-url': ['purge:execute'],
  'purge-by-tag': ['purge:execute'],
};
```

## Usage Examples

### 1. Authorization Code Flow with PKCE

```typescript
// Generate PKCE parameters
const pkce = oauth.generatePKCEParameters();

// Build authorization URL
const authUrl = oauth.buildAuthorizationUrl(authEndpoint, {
  responseType: 'code',
  clientId: 'my-client',
  redirectUri: 'https://app.com/callback',
  scope: 'property:read property:write',
  state: oauth.generateState(),
  codeChallenge: pkce.codeChallenge,
  codeChallengeMethod: CodeChallengeMethod.S256,
});

// After authorization, exchange code for tokens
const tokenRequest = {
  grantType: GrantType.AUTHORIZATION_CODE,
  code: authorizationCode,
  redirectUri: 'https://app.com/callback',
  codeVerifier: pkce.codeVerifier,
  clientId: 'my-client',
  clientSecret: 'my-secret',
};
```

### 2. Making Authenticated MCP Calls

```typescript
// Include bearer token in request metadata
const mcpRequest = {
  method: 'tools/call',
  params: {
    name: 'list-properties',
    arguments: { customer: 'production' },
  },
  _meta: {
    headers: {
      'Authorization': 'Bearer <access-token>',
      'DPoP': '<dpop-proof>', // If using DPoP
    },
  },
};
```

### 3. Token Validation

```typescript
// Validate access token with required scopes
const result = await validator.validateAccessToken(
  token,
  ['property:read', 'property:write']
);

if (result.valid) {
  console.log('Token valid for user:', result.claims.sub);
  console.log('Granted scopes:', result.claims.scope);
}
```

## Security Best Practices

1. **Always use HTTPS** for all OAuth endpoints
2. **Rotate client secrets** regularly
3. **Implement token rotation** for refresh tokens
4. **Monitor for suspicious patterns** in redirect URIs
5. **Use short-lived access tokens** (1 hour recommended)
6. **Implement proper error handling** without leaking sensitive info
7. **Log security events** for audit trails
8. **Validate all inputs** including tokens and parameters

## Compliance

This implementation complies with:

- OAuth 2.1 draft specification
- RFC 6749 (OAuth 2.0 Framework)
- RFC 6750 (Bearer Token Usage)
- RFC 7636 (PKCE)
- RFC 7662 (Token Introspection)
- RFC 8414 (Authorization Server Metadata)
- RFC 9207 (OAuth 2.1 Security Best Practices)

## Testing

Run the OAuth examples to test the implementation:

```bash
npm run example:oauth
```

This will demonstrate:
- PKCE flow
- Token validation
- Anti-phishing protection
- Authorization server validation
- Authenticated MCP calls

## Future Enhancements

1. **Enhanced DPoP Support** - Full RFC implementation
2. **Token Revocation** (RFC 7009) - Active revocation support
3. **PAR (Pushed Authorization Requests)** - Enhanced security
4. **RAR (Rich Authorization Requests)** - Fine-grained permissions
5. **FAPI 2.0 Compliance** - Financial-grade API security