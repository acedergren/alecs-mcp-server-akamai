# MCP 2025-06-18 OAuth Compliance Test Plan

## Overview
This document outlines the specific tests needed to verify 100% compliance with the MCP 2025-06-18 OAuth Resource Server specification.

## Test Implementation Strategy

### Phase 1: Analyze Existing Implementation
1. Review current OAuth implementation
2. Identify gaps with MCP 2025-06-18 spec
3. Create compliance checklist

### Phase 2: Create Compliance Tests
1. Write tests for each requirement
2. Run tests to identify failures
3. Document non-compliant areas

### Phase 3: Fix & Verify Loop
1. Fix failing tests
2. Verify fixes
3. Repeat until 100% pass rate

## Required Compliance Tests

### 1. Resource Server Metadata Tests (RFC 9728)

```typescript
describe('MCP 2025-06-18 Resource Server Metadata Compliance', () => {
  test('GET /.well-known/oauth-resource-server returns valid metadata', async () => {
    const response = await fetch('/.well-known/oauth-resource-server');
    const metadata = await response.json();
    
    // Required fields per RFC 9728
    expect(metadata).toMatchObject({
      resource: expect.any(String), // Resource identifier
      authorization_servers: expect.arrayContaining([expect.any(String)]),
      bearer_methods_supported: expect.arrayContaining(['header']),
      resource_documentation: expect.any(String),
      resource_policy_uri: expect.any(String),
      resource_tos_uri: expect.any(String),
      features_supported: expect.arrayContaining(['bearer-token', 'resource-indicators'])
    });
  });

  test('Resource metadata endpoint is publicly accessible', async () => {
    const response = await fetch('/.well-known/oauth-resource-server');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  test('Resource metadata includes MCP-specific fields', async () => {
    const response = await fetch('/.well-known/oauth-resource-server');
    const metadata = await response.json();
    
    expect(metadata.mcp_version).toBe('2025-06-18');
    expect(metadata.mcp_features).toContain('tools');
  });
});
```

### 2. Resource Indicators Tests (RFC 8707)

```typescript
describe('MCP 2025-06-18 Resource Indicators Compliance', () => {
  test('Token validation includes resource indicator check', async () => {
    const token = 'valid-token-with-resource';
    const resource = 'akamai://property/123/prop_456';
    
    const result = await tokenValidator.validateWithResource(token, resource);
    
    expect(result.valid).toBe(true);
    expect(result.resource).toBe(resource);
  });

  test('Token rejected when resource indicator mismatch', async () => {
    const token = 'token-for-different-resource';
    const resource = 'akamai://property/123/prop_456';
    
    const result = await tokenValidator.validateWithResource(token, resource);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Resource indicator mismatch');
  });

  test('Multiple resource indicators supported', async () => {
    const token = 'token-with-multiple-resources';
    const resources = [
      'akamai://property/123/*',
      'akamai://dns/123/*'
    ];
    
    const result = await tokenValidator.validateWithResources(token, resources);
    
    expect(result.valid).toBe(true);
    expect(result.authorizedResources).toEqual(resources);
  });

  test('Resource URI format validation', async () => {
    const invalidResources = [
      'http://invalid-scheme/resource',
      'akamai://invalid-format',
      'akamai://property//missing-id',
      'akamai://unknown-type/123/456'
    ];
    
    for (const resource of invalidResources) {
      expect(() => ResourceUri.parse(resource)).toThrow();
    }
  });
});
```

### 3. Token Validation Tests

```typescript
describe('MCP 2025-06-18 Token Validation Compliance', () => {
  test('WWW-Authenticate header included in 401 responses', async () => {
    const response = await makeAuthenticatedRequest('/tools/list', '');
    
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toMatch(
      /Bearer realm="[^"]+", error="invalid_token"/
    );
  });

  test('Token audience validation per RFC 8707', async () => {
    const tokenWithWrongAudience = createToken({
      aud: 'https://different-server.com'
    });
    
    const result = await tokenValidator.validate(tokenWithWrongAudience);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid audience');
  });

  test('Token binding validation enforced', async () => {
    const token = 'token-with-dpop-binding';
    const request = createMcpRequest({
      headers: {
        'Authorization': `Bearer ${token}`,
        // Missing DPoP header
      }
    });
    
    const result = await oauthMiddleware.authenticate(request);
    
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('Missing required token binding');
  });

  test('Expired tokens return 401', async () => {
    const expiredToken = createToken({ exp: Math.floor(Date.now() / 1000) - 3600 });
    
    const response = await makeAuthenticatedRequest('/tools/list', expiredToken);
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('invalid_token');
    expect(response.body.error_description).toContain('expired');
  });
});
```

### 4. MCP Protocol Integration Tests

```typescript
describe('MCP 2025-06-18 OAuth Protocol Integration', () => {
  test('Authorization header extracted from MCP request _meta', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'list-properties',
        arguments: {}
      },
      _meta: {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      }
    };
    
    const authContext = await oauthMiddleware.authenticate(request);
    
    expect(authContext).toBeDefined();
    expect(authContext.token).toBe('valid-token');
  });

  test('Tool authorization enforced based on scopes', async () => {
    const tokenWithLimitedScopes = createToken({ scope: 'property:read' });
    
    const request = createToolRequest('create-property', {}, tokenWithLimitedScopes);
    
    await expect(oauthMiddleware.authorize(request)).rejects.toThrow(
      expect.objectContaining({
        code: 403,
        message: expect.stringContaining('Insufficient scopes')
      })
    );
  });

  test('Public tools accessible without authentication', async () => {
    const request = createToolRequest('list-tools', {});
    
    const response = await server.handleRequest(request);
    
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });

  test('Protected tools require authentication', async () => {
    const request = createToolRequest('list-properties', {});
    
    const response = await server.handleRequest(request);
    
    expect(response.success).toBe(false);
    expect(response.error).toContain('Authentication required');
  });
});
```

### 5. Discovery Endpoint Tests

```typescript
describe('MCP 2025-06-18 Discovery Endpoints', () => {
  test('Authorization server discovery via resource metadata', async () => {
    const resourceMetadata = await fetch('/.well-known/oauth-resource-server');
    const data = await resourceMetadata.json();
    
    expect(data.authorization_servers).toContain(process.env.OAUTH_AUTH_SERVER);
    
    // Verify auth server is reachable
    const authServerMeta = await fetch(
      `${data.authorization_servers[0]}/.well-known/oauth-authorization-server`
    );
    expect(authServerMeta.status).toBe(200);
  });

  test('Resource listing endpoint', async () => {
    const response = await fetch('/resources');
    const resources = await response.json();
    
    expect(resources).toMatchObject({
      resources: expect.arrayContaining([
        expect.objectContaining({
          uri: expect.stringMatching(/^akamai:\/\//),
          type: expect.any(String),
          scopes: expect.any(Array),
          description: expect.any(String)
        })
      ])
    });
  });

  test('CORS headers on discovery endpoints', async () => {
    const response = await fetch('/.well-known/oauth-resource-server', {
      headers: { 'Origin': 'https://example.com' }
    });
    
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });
});
```

### 6. Error Response Tests

```typescript
describe('MCP 2025-06-18 OAuth Error Responses', () => {
  test('401 response format complies with OAuth 2.1', async () => {
    const response = await makeUnauthenticatedRequest('/tools/list');
    
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toMatch(
      /Bearer realm="[^"]+"/
    );
    expect(response.body).toMatchObject({
      error: 'invalid_token',
      error_description: expect.any(String),
      error_uri: expect.stringMatching(/^https:\/\//)
    });
  });

  test('403 response for insufficient permissions', async () => {
    const tokenWithReadOnly = createToken({ scope: 'property:read' });
    const response = await makeAuthenticatedRequest(
      '/tools/call',
      tokenWithReadOnly,
      { name: 'create-property', arguments: {} }
    );
    
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      error: 'insufficient_scope',
      error_description: expect.stringContaining('property:write'),
      scope: 'property:write'
    });
  });

  test('400 response for malformed requests', async () => {
    const response = await makeAuthenticatedRequest('/tools/call', 'valid-token', {
      // Missing required 'name' field
      arguments: {}
    });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_request');
  });
});
```

### 7. Security Tests

```typescript
describe('MCP 2025-06-18 OAuth Security', () => {
  test('Token replay attack prevention', async () => {
    const token = 'one-time-use-token';
    
    const response1 = await makeAuthenticatedRequest('/tools/list', token);
    expect(response1.status).toBe(200);
    
    const response2 = await makeAuthenticatedRequest('/tools/list', token);
    expect(response2.status).toBe(401);
    expect(response2.body.error_description).toContain('Token already used');
  });

  test('Cross-resource access prevention', async () => {
    const tokenForProperty123 = createToken({
      scope: 'property:read',
      resource: 'akamai://property/123/*'
    });
    
    const request = createToolRequest('get-property', {
      propertyId: 'prop_456',
      customer: 'customer-456'
    }, tokenForProperty123);
    
    const response = await server.handleRequest(request);
    
    expect(response.success).toBe(false);
    expect(response.error).toContain('Access denied to resource');
  });

  test('HTTPS enforcement on all endpoints', async () => {
    const response = await fetch('http://localhost/.well-known/oauth-resource-server');
    
    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toMatch(/^https:\/\//);
  });
});
```

## Test Execution Plan

### Step 1: Create Test Suite
```bash
# Create new test file
touch __tests__/mcp-2025-oauth-compliance.test.ts

# Add test configuration
npm install --save-dev @types/jest jest-extended
```

### Step 2: Run Compliance Tests
```bash
# Run only compliance tests
npm test -- __tests__/mcp-2025-oauth-compliance.test.ts

# Generate coverage report
npm test -- --coverage __tests__/mcp-2025-oauth-compliance.test.ts
```

### Step 3: Fix Failures Iteratively
1. Run tests and capture failures
2. Fix one category at a time
3. Re-run tests after each fix
4. Document changes made

### Step 4: Verify 100% Compliance
```bash
# Final verification
npm test -- __tests__/mcp-2025-oauth-compliance.test.ts --verbose

# Expected output:
# PASS __tests__/mcp-2025-oauth-compliance.test.ts
#  ✓ MCP 2025-06-18 Resource Server Metadata Compliance (3 tests)
#  ✓ MCP 2025-06-18 Resource Indicators Compliance (4 tests)
#  ✓ MCP 2025-06-18 Token Validation Compliance (4 tests)
#  ✓ MCP 2025-06-18 OAuth Protocol Integration (4 tests)
#  ✓ MCP 2025-06-18 Discovery Endpoints (3 tests)
#  ✓ MCP 2025-06-18 OAuth Error Responses (3 tests)
#  ✓ MCP 2025-06-18 OAuth Security (3 tests)
# 
# Test Suites: 1 passed, 1 total
# Tests:       24 passed, 24 total
```

## Success Metrics

1. **All tests pass**: 100% of compliance tests must pass
2. **No regressions**: Existing OAuth tests must continue to pass
3. **Performance**: Token validation < 50ms (p99)
4. **Security**: No vulnerabilities in OAuth implementation
5. **Documentation**: All changes documented

## Implementation Timeline

- Day 1: Create compliance test suite
- Day 2: Run tests and identify gaps
- Day 3-5: Fix implementation issues
- Day 6: Final verification and documentation
- Day 7: Security review and performance testing