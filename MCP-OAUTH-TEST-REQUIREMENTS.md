# MCP OAuth Test Requirements

## Test Coverage Goals
- Unit Test Coverage: 95%+
- Integration Test Coverage: 90%+
- End-to-End Test Coverage: 85%+
- Security Test Coverage: 100%

## Test Categories

### 1. OAuth Resource Server Tests

#### 1.1 Discovery Endpoint Tests
```typescript
describe('OAuth Discovery Endpoints', () => {
  test('GET /.well-known/oauth-resource-server returns valid metadata');
  test('GET /resources returns protected resource listing');
  test('Discovery endpoints are accessible without authentication');
  test('Discovery endpoints include proper CORS headers');
  test('Invalid discovery paths return 404');
});
```

#### 1.2 Resource Metadata Tests
```typescript
describe('Resource Metadata', () => {
  test('Resource URIs follow correct format');
  test('Resource types are properly defined');
  test('Resource scopes are correctly generated');
  test('Resource versioning is supported');
  test('Invalid resource URIs are rejected');
});
```

### 2. Token Validation Tests

#### 2.1 Access Token Tests
```typescript
describe('Access Token Validation', () => {
  test('Valid JWT tokens are accepted');
  test('Expired tokens are rejected with 401');
  test('Tokens with invalid signatures are rejected');
  test('Token introspection validates active status');
  test('Token audience validation works correctly');
  test('Token scope validation per resource');
});
```

#### 2.2 Token Binding Tests
```typescript
describe('Sender-Constrained Tokens', () => {
  test('DPoP tokens are validated correctly');
  test('mTLS certificate binding is enforced');
  test('Certificate thumbprint mismatch is rejected');
  test('Missing binding when required returns 401');
  test('Token replay attacks are prevented');
});
```

### 3. Resource Indicator Tests

#### 3.1 RFC 8707 Compliance
```typescript
describe('Resource Indicators', () => {
  test('Single resource indicator is validated');
  test('Multiple resource indicators are supported');
  test('Invalid resource URIs are rejected');
  test('Resource type mismatches are caught');
  test('Unauthorized resource access is blocked');
  test('Resource indicators in token match request');
});
```

### 4. Authorization Tests

#### 4.1 Tool Authorization
```typescript
describe('Tool Authorization', () => {
  test('Public tools accessible without auth');
  test('Protected tools require valid token');
  test('Tool-specific scopes are enforced');
  test('Insufficient scopes return 403');
  test('Customer context isolation works');
});
```

#### 4.2 Multi-Tenant Tests
```typescript
describe('Multi-Tenant Authorization', () => {
  test('Tokens are isolated per customer');
  test('Cross-tenant access is blocked');
  test('Customer-specific resources are protected');
  test('Admin tokens can access all customers');
});
```

### 5. MCP Protocol Tests

#### 5.1 Request/Response Tests
```typescript
describe('MCP OAuth Integration', () => {
  test('Authorization header extracted from requests');
  test('_meta field preserves OAuth context');
  test('Tool calls include auth context');
  test('Error responses follow MCP format');
  test('Rate limiting per authenticated client');
});
```

#### 5.2 Transport Tests
```typescript
describe('HTTP Transport with OAuth', () => {
  test('HTTP transport extracts OAuth headers');
  test('STDIO transport bypasses OAuth');
  test('WebSocket transport handles auth');
  test('Transport errors preserve context');
});
```

### 6. Security Tests

#### 6.1 Attack Prevention
```typescript
describe('Security Attack Prevention', () => {
  test('SQL injection attempts are blocked');
  test('XSS attempts are sanitized');
  test('CSRF tokens are validated');
  test('Open redirect attempts are blocked');
  test('Token replay attacks fail');
});
```

#### 6.2 Rate Limiting
```typescript
describe('Rate Limiting', () => {
  test('Per-client rate limits enforced');
  test('Per-resource rate limits work');
  test('Rate limit headers included');
  test('429 responses on limit exceeded');
  test('Rate limits reset correctly');
});
```

### 7. Integration Tests

#### 7.1 External Auth Server
```typescript
describe('External Authorization Server Integration', () => {
  test('Auth0 integration works correctly');
  test('Keycloak integration works correctly');
  test('Custom auth server integration');
  test('JWKS rotation handled properly');
  test('Token refresh flows work');
});
```

#### 7.2 Full Flow Tests
```typescript
describe('End-to-End OAuth Flows', () => {
  test('Authorization code flow completes');
  test('Client credentials flow works');
  test('Token refresh maintains session');
  test('Logout invalidates tokens');
  test('Multi-step operations maintain auth');
});
```

### 8. Error Handling Tests

#### 8.1 OAuth Error Responses
```typescript
describe('OAuth Error Handling', () => {
  test('401 for missing authorization');
  test('401 for invalid tokens');
  test('403 for insufficient scopes');
  test('400 for malformed requests');
  test('500 errors don't leak info');
});
```

### 9. Performance Tests

#### 9.1 Token Validation Performance
```typescript
describe('Performance Tests', () => {
  test('Token validation < 50ms');
  test('Cached token validation < 5ms');
  test('Concurrent requests handled efficiently');
  test('No memory leaks under load');
  test('Circuit breaker activates properly');
});
```

### 10. Compliance Tests

#### 10.1 Specification Compliance
```typescript
describe('MCP 2025-06-18 Compliance', () => {
  test('All required endpoints implemented');
  test('OAuth 2.1 requirements met');
  test('Resource indicators implemented');
  test('Discovery metadata complete');
  test('Security requirements satisfied');
});
```

## Test Implementation Strategy

### Phase 1: Unit Tests (Days 1-3)
- Implement core OAuth component tests
- Mock external dependencies
- Achieve 95% code coverage

### Phase 2: Integration Tests (Days 4-6)
- Test with real Authorization Servers
- Test database and cache integration
- Test multi-component workflows

### Phase 3: Security Tests (Days 7-8)
- Implement penetration test scenarios
- Test all OWASP Top 10 vulnerabilities
- Validate cryptographic implementations

### Phase 4: Performance Tests (Days 9-10)
- Load testing with k6 or Artillery
- Stress testing token validation
- Memory and CPU profiling

### Phase 5: E2E Tests (Days 11-12)
- Full customer journey tests
- Multi-tenant scenario tests
- Failure recovery tests

## Test Data Requirements

### 1. Test Tokens
- Valid tokens with various scopes
- Expired tokens
- Tokens with invalid signatures
- Tokens with different binding types

### 2. Test Resources
- Multiple resource types
- Various customer contexts
- Different permission levels
- Edge case resource URIs

### 3. Test Clients
- Confidential clients
- Public clients
- Clients with different scopes
- Rate-limited clients

## Continuous Integration

### CI Pipeline
1. Run unit tests on every commit
2. Run integration tests on PR
3. Run security tests nightly
4. Run performance tests weekly
5. Generate coverage reports

### Quality Gates
- No merge if coverage drops below 90%
- No merge if security tests fail
- No merge if performance degrades
- All tests must pass in CI

## Test Documentation

Each test suite should include:
1. Clear test descriptions
2. Setup and teardown procedures
3. Expected outcomes
4. Error scenarios covered
5. Performance baselines