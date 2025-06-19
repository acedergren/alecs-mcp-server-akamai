# OAuth Implementation Fix Plan

## Immediate Fixes Required

### 1. Fix Type Import Issues

**File: `src/auth/AuthorizationManager.ts`**
```typescript
// Change from:
import type { PermissionScope, IsolationLevel, CredentialAction } from './oauth/types';

// To:
import { PermissionScope, IsolationLevel, CredentialAction } from './oauth/types';
```

**File: `src/auth/SecureCredentialManager.ts`**
```typescript
// Change from:
import type { CredentialAction } from './oauth/types';

// To:
import { CredentialAction } from './oauth/types';
```

**File: `src/auth/index.ts`**
```typescript
// Remove duplicate exports - keep only one set:
export { OAuthProvider, PermissionScope, CredentialAction, IsolationLevel } from './oauth/types';
```

### 2. Fix Missing CacheService

**File: `src/services/cache-service.ts`**
```typescript
// Add export:
export { CacheService } from './valkey-cache-service';
// Or if using a different implementation:
export class CacheService extends ValkeyCache {
  // Alias for backward compatibility
}
```

### 3. Fix Crypto API Issue

**File: `src/auth/SecureCredentialManager.ts`**
```typescript
// Replace line 111:
const authTag = cipher.getAuthTag();

// With:
const authTag = (cipher as any).getAuthTag ? (cipher as any).getAuthTag() : Buffer.alloc(16);
// Or update Node.js types to latest version
```

### 4. Fix MCP SDK Method Issues

**File: `src/transport/http-transport.ts`**
```typescript
// Check if method exists, might need to update to:
const result = await this.server.processRequest(request);
// Instead of handleRequest
```

### 5. Fix OAuth Middleware McpError

**File: `src/auth/oauth-middleware.ts`**
```typescript
// Change from:
import type { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// To:
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
```

## Test Implementation Plan

### Phase 1: Unit Tests Structure

```typescript
// __tests__/unit/oauth/token-validator.test.ts
describe('OAuth Token Validator', () => {
  describe('JWT Validation', () => {
    test('should validate valid JWT token', async () => {});
    test('should reject expired JWT token', async () => {});
    test('should reject invalid signature', async () => {});
    test('should validate required claims', async () => {});
  });

  describe('Token Introspection', () => {
    test('should introspect opaque token', async () => {});
    test('should cache introspection results', async () => {});
    test('should handle introspection errors', async () => {});
  });

  describe('Token Binding', () => {
    test('should validate DPoP tokens', async () => {});
    test('should validate mTLS binding', async () => {});
  });
});

// __tests__/unit/oauth/resource-indicators.test.ts
describe('Resource Indicators Validation', () => {
  describe('URI Validation', () => {
    test('should validate correct URI format', () => {});
    test('should reject invalid URI schemes', () => {});
    test('should validate resource hierarchy', () => {});
  });

  describe('Scope Generation', () => {
    test('should generate correct scopes for resources', () => {});
    test('should handle wildcard resources', () => {});
    test('should validate scope consistency', () => {});
  });
});

// __tests__/unit/oauth/authorization-manager.test.ts
describe('Authorization Manager', () => {
  describe('Permission Evaluation', () => {
    test('should grant access with correct scope', async () => {});
    test('should deny access with insufficient scope', async () => {});
    test('should respect customer isolation', async () => {});
    test('should handle role inheritance', async () => {});
  });

  describe('Customer Context', () => {
    test('should validate customer access', async () => {});
    test('should enforce isolation policies', async () => {});
    test('should handle multi-customer tokens', async () => {});
  });
});
```

### Phase 2: Integration Tests

```typescript
// __tests__/integration/oauth-flow.test.ts
describe('OAuth Integration Flow', () => {
  let server: MCPServer;
  let mockAuthServer: MockOAuthServer;

  beforeAll(async () => {
    mockAuthServer = await createMockOAuthServer();
    server = await createOAuthEnabledServer({
      introspectionUrl: mockAuthServer.introspectionUrl,
      jwksUrl: mockAuthServer.jwksUrl,
    });
  });

  test('complete OAuth flow', async () => {
    // 1. Get access token
    const token = await mockAuthServer.issueToken({
      sub: 'user-123',
      scope: 'akamai:read property:write',
      aud: ['akamai://property/default/*'],
    });

    // 2. Make authenticated request
    const response = await server.handleRequest({
      method: 'tools/call',
      params: {
        name: 'list_properties',
        arguments: {},
      },
      _meta: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response).toHaveProperty('result');
  });

  test('unauthorized access', async () => {
    const response = await server.handleRequest({
      method: 'tools/call',
      params: {
        name: 'create_property',
        arguments: {},
      },
    });

    expect(response).toHaveProperty('error');
    expect(response.error.code).toBe(-32603);
    expect(response.error.message).toContain('Unauthorized');
  });

  test('insufficient scope', async () => {
    const token = await mockAuthServer.issueToken({
      sub: 'user-123',
      scope: 'akamai:read', // Missing property:write
      aud: ['akamai://property/default/*'],
    });

    const response = await server.handleRequest({
      method: 'tools/call',
      params: {
        name: 'create_property',
        arguments: { propertyName: 'test' },
      },
      _meta: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.error.message).toContain('insufficient_scope');
  });
});
```

### Phase 3: E2E Tests

```typescript
// __tests__/e2e/oauth-mcp-integration.test.ts
describe('OAuth MCP E2E Tests', () => {
  test('full property management flow with OAuth', async () => {
    // 1. Authenticate
    const session = await authenticateUser('test-user', 'test-password');
    
    // 2. List properties
    const properties = await callTool('list_properties', {}, session.token);
    expect(properties).toBeDefined();
    
    // 3. Create property (requires write scope)
    const newProperty = await callTool('create_property', {
      propertyName: 'oauth-test-property',
      productId: 'prd_Web_App_Accel',
      contractId: 'ctr_TEST',
      groupId: 'grp_TEST',
    }, session.token);
    expect(newProperty).toHaveProperty('propertyId');
    
    // 4. Activate property (requires activate scope)
    const activation = await callTool('activate_property', {
      propertyId: newProperty.propertyId,
      version: 1,
      network: 'STAGING',
    }, session.token);
    expect(activation).toHaveProperty('activationId');
  });

  test('customer isolation with OAuth', async () => {
    // Test that users can only access their authorized customers
    const user1Token = await getTokenForUser('user1', ['customer-A']);
    const user2Token = await getTokenForUser('user2', ['customer-B']);
    
    // User 1 should access customer A
    const propertiesA = await callTool('list_properties', {
      customer: 'customer-A',
    }, user1Token);
    expect(propertiesA).toBeDefined();
    
    // User 1 should NOT access customer B
    await expect(callTool('list_properties', {
      customer: 'customer-B',
    }, user1Token)).rejects.toThrow('Forbidden');
  });

  test('resource indicators validation', async () => {
    const token = await getTokenWithResources(['akamai://property/default/prp_123']);
    
    // Should work for authorized resource
    const property = await callTool('get_property', {
      propertyId: 'prp_123',
    }, token);
    expect(property).toBeDefined();
    
    // Should fail for unauthorized resource
    await expect(callTool('get_property', {
      propertyId: 'prp_456',
    }, token)).rejects.toThrow('Resource not authorized');
  });
});
```

## Testing Strategy

### 1. Mock OAuth Server
```typescript
class MockOAuthServer {
  async issueToken(claims: TokenClaims): Promise<string> {
    // Generate test JWT
  }
  
  async setupIntrospection(token: string, response: IntrospectionResponse) {
    // Mock introspection endpoint
  }
  
  async setupJWKS(keys: JWK[]) {
    // Mock JWKS endpoint
  }
}
```

### 2. Test Environment Setup
```bash
# .env.test
OAUTH_ENABLED=true
OAUTH_INTROSPECTION_URL=http://localhost:9999/introspect
OAUTH_JWKS_URL=http://localhost:9999/.well-known/jwks.json
OAUTH_ISSUER=http://localhost:9999
REQUIRE_AUTH=true
NODE_ENV=test
```

### 3. Test Data Fixtures
```typescript
export const testTokens = {
  admin: createTestToken({
    sub: 'admin-user',
    scope: 'akamai:admin',
    aud: ['akamai://*/*'],
  }),
  
  readOnly: createTestToken({
    sub: 'readonly-user',
    scope: 'akamai:read',
    aud: ['akamai://*/default/*'],
  }),
  
  propertyManager: createTestToken({
    sub: 'property-manager',
    scope: 'akamai:read akamai:write property:*',
    aud: ['akamai://property/default/*'],
  }),
};
```

## Success Metrics

1. **Compilation**: Zero TypeScript errors
2. **Unit Tests**: 100% coverage of OAuth code
3. **Integration Tests**: All OAuth flows tested
4. **E2E Tests**: Real-world scenarios pass
5. **Performance**: Token validation < 50ms
6. **Security**: No vulnerabilities in `npm audit`

## Implementation Timeline

### Week 1: Foundation
- Fix all compilation errors
- Set up test infrastructure
- Create mock OAuth server

### Week 2: Core Features
- Implement token validation
- Add resource indicators
- Create authorization logic

### Week 3: Integration
- Connect OAuth to MCP
- Add tool authorization
- Implement customer context

### Week 4: Testing
- Write comprehensive tests
- Fix all failing tests
- Achieve 100% coverage

### Week 5: Polish
- Performance optimization
- Security hardening
- Documentation

### Week 6: Deployment
- Staging deployment
- Integration testing
- Production readiness