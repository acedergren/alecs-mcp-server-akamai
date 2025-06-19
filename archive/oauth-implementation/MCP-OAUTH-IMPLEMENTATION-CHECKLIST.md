# MCP OAuth Implementation Checklist

## Immediate Actions Required

### 1. Fix Critical OAuth Issues

#### Resource Server Implementation
- [ ] Convert `OAuthResourceServer` from auth server to pure resource server
- [ ] Remove authorization endpoint implementations
- [ ] Add RFC 9728 Protected Resource Metadata support
- [ ] Implement proper resource URI validation

#### Token Validation
- [ ] Update `TokenValidator` to validate resource indicators
- [ ] Add support for token binding validation
- [ ] Implement proper audience validation
- [ ] Add resource-scoped token validation

### 2. MCP Protocol Updates

#### Request Handling
- [ ] Extract Authorization header from MCP requests
- [ ] Pass auth context through _meta field
- [ ] Update tool handlers to receive auth context
- [ ] Implement proper error responses (401, 403)

#### Discovery Endpoints
- [ ] Create `/.well-known/oauth-resource-server` endpoint
- [ ] Implement `/resources` endpoint
- [ ] Add proper CORS headers
- [ ] Return correct content types

### 3. Security Fixes

#### Token Binding
- [ ] Implement DPoP support
- [ ] Add mTLS certificate validation
- [ ] Validate certificate thumbprints
- [ ] Prevent token replay attacks

#### Input Validation
- [ ] Validate all resource URIs
- [ ] Sanitize scope parameters
- [ ] Check redirect URI formats
- [ ] Validate token formats

## Implementation Order

### Week 1: Core OAuth Infrastructure

#### Day 1-2: Resource Server Refactor
```typescript
// Update OAuthResourceServer.ts
class OAuthResourceServer {
  // Remove auth server methods
  // Add resource metadata
  async getResourceServerMetadata(): Promise<OAuthResourceServerMetadata> {
    return {
      resource: this.config.resourceIdentifier,
      authorization_servers: [this.config.authServerUrl],
      bearer_methods_supported: ['header'],
      resource_documentation: `${this.config.baseUrl}/docs`,
      resource_policy_uri: `${this.config.baseUrl}/policy`,
      resource_tos_uri: `${this.config.baseUrl}/tos`,
      features_supported: ['bearer-token', 'resource-indicators'],
    };
  }
}
```

#### Day 3-4: Resource Indicators
```typescript
// Create ResourceIndicatorValidator.ts
class ResourceIndicatorValidator {
  validate(indicators: string[], token: OAuthToken): ValidationResult {
    // Implement RFC 8707 validation
  }
}
```

#### Day 5: Token Updates
```typescript
// Update TokenValidator.ts
class TokenValidator {
  async validateWithResource(token: string, resource: string): Promise<ValidationResult> {
    // Add resource-specific validation
  }
}
```

### Week 2: MCP Integration

#### Day 6-7: OAuth Middleware
```typescript
// Update OAuthMiddleware.ts
class OAuthMiddleware {
  async authenticate(request: McpRequest): Promise<AuthContext | null> {
    const token = this.extractToken(request);
    const resource = this.extractResource(request);
    return this.validateTokenForResource(token, resource);
  }
}
```

#### Day 8-9: Tool Authorization
```typescript
// Update tool definitions
const TOOL_AUTHORIZATION = {
  'list-properties': {
    scopes: ['property:read'],
    resource: 'akamai://property/{account}/*'
  },
  'create-property': {
    scopes: ['property:write'],
    resource: 'akamai://property/{account}/*'
  }
};
```

#### Day 10: Error Handling
```typescript
// Implement proper OAuth error responses
class OAuthErrorHandler {
  handle401(error: OAuthError): McpError {
    return new McpError(401, 'Unauthorized', {
      error: error.code,
      error_description: error.description,
      error_uri: error.uri
    });
  }
}
```

### Week 3: Testing and Validation

#### Day 11-12: Unit Tests
- [ ] Test all OAuth components
- [ ] Mock external dependencies
- [ ] Achieve 95% coverage

#### Day 13-14: Integration Tests
- [ ] Test with Auth0
- [ ] Test with Keycloak
- [ ] Test token flows

#### Day 15: Security Tests
- [ ] Penetration testing
- [ ] Token replay tests
- [ ] Input validation tests

## Validation Checklist

### OAuth 2.1 Compliance
- [ ] PKCE required for all flows
- [ ] No implicit grant support
- [ ] Refresh tokens rotate
- [ ] Access tokens short-lived

### MCP 2025-06-18 Compliance
- [ ] Resource server metadata endpoint
- [ ] Resource indicators support
- [ ] Protected resource metadata
- [ ] Authorization server discovery

### Security Requirements
- [ ] HTTPS only
- [ ] Token binding enforced
- [ ] Rate limiting active
- [ ] Audit logging enabled

### Performance Requirements
- [ ] Token validation < 50ms
- [ ] Discovery endpoints < 100ms
- [ ] No memory leaks
- [ ] Efficient caching

## Testing Verification

### Unit Test Coverage
```bash
npm test -- --coverage
# Must show > 95% coverage for:
# - src/auth/
# - src/services/oauth-resource-server.ts
# - src/middleware/
```

### Integration Test Suite
```bash
npm run test:integration:oauth
# All tests must pass
```

### Security Audit
```bash
npm run security:audit
# No high/critical vulnerabilities
```

### Performance Benchmark
```bash
npm run benchmark:oauth
# Token validation: < 50ms p99
# Discovery: < 100ms p99
```

## Documentation Requirements

### API Documentation
- [ ] Document all OAuth endpoints
- [ ] Provide curl examples
- [ ] Include error responses
- [ ] Add security notes

### Integration Guide
- [ ] Auth0 setup guide
- [ ] Keycloak setup guide
- [ ] Custom auth server guide
- [ ] Troubleshooting section

### Developer Documentation
- [ ] Architecture overview
- [ ] Component documentation
- [ ] Test documentation
- [ ] Security documentation

## Release Checklist

### Pre-Release
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Security audit passed
- [ ] Performance benchmarks met

### Release
- [ ] Version bump
- [ ] CHANGELOG updated
- [ ] Migration guide created
- [ ] Breaking changes documented

### Post-Release
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Plan improvements