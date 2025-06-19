# OAuth Implementation Task List for MCP 2025-06-18 Compliance

## Overview
Per MCP 2025-06-18 spec: OAuth is **ONLY required for HTTP transport**, not STDIO. However, we'll implement full OAuth support for enhanced security and future HTTP transport capability.

## Phase 1: Fix Compilation Errors (Priority: HIGH)

### Task 1.1: Fix Type Import Issues ❌
- [ ] Fix `import type` vs `import` for enums in AuthorizationManager.ts
- [ ] Fix `import type` vs `import` for enums in SecureCredentialManager.ts
- [ ] Remove duplicate enum exports in auth/index.ts
- [ ] Fix missing module imports (OAuthManager, etc.)

### Task 1.2: Fix Missing Dependencies ❌
- [ ] Add missing CacheService export to cache-service.ts
- [ ] Fix crypto API issues (getAuthTag method)
- [ ] Update Express type definitions to v5
- [ ] Fix MCP SDK type issues (handleRequest, callTool methods)

### Task 1.3: Fix OAuth Middleware Errors ❌
- [ ] Update McpError imports (remove type-only imports)
- [ ] Fix Express request/response type issues
- [ ] Update tool scope mappings to use snake_case
- [ ] Fix rate limiter integration

## Phase 2: Core OAuth Implementation (Priority: HIGH)

### Task 2.1: Token Validation Infrastructure ❌
- [ ] Implement token introspection client
- [ ] Add JWT validation with JWKS support
- [ ] Implement token caching with Redis
- [ ] Add DPoP (Demonstrating Proof of Possession) support
- [ ] Create token validation middleware

### Task 2.2: Resource Server Endpoints ❌
- [ ] Implement `/.well-known/oauth-authorization-server`
- [ ] Implement `/.well-known/oauth-resource-server`
- [ ] Create `/resources` discovery endpoint
- [ ] Add OAuth error responses (RFC 6750)
- [ ] Implement WWW-Authenticate headers

### Task 2.3: Resource Indicators (RFC 8707) ❌
- [ ] Validate resource URI format
- [ ] Implement resource type validation
- [ ] Add account/contract ID validation
- [ ] Support hierarchical resources
- [ ] Create resource-to-scope mapping

## Phase 3: Integration with MCP (Priority: HIGH)

### Task 3.1: HTTP Transport OAuth ❌
- [ ] Create OAuth-enabled HTTP transport
- [ ] Add Bearer token extraction from headers
- [ ] Implement _meta field OAuth support
- [ ] Add MCP-Protocol-Version header support
- [ ] Create OAuth context propagation

### Task 3.2: Tool Authorization ❌
- [ ] Map all tools to required scopes
- [ ] Implement scope validation per tool
- [ ] Add resource-level authorization
- [ ] Create permission inheritance
- [ ] Add operation-based access control

### Task 3.3: Customer Context Integration ❌
- [ ] Link OAuth subjects to customers
- [ ] Implement customer isolation
- [ ] Add multi-tenant support
- [ ] Create customer switching with OAuth
- [ ] Secure credential access per customer

## Phase 4: Security Enhancements (Priority: MEDIUM)

### Task 4.1: OAuth 2.1 Compliance ❌
- [ ] Implement PKCE for all flows
- [ ] Add S256 challenge validation
- [ ] Remove implicit grant support
- [ ] Add authorization code one-time use
- [ ] Implement anti-phishing measures

### Task 4.2: Advanced Security ❌
- [ ] Add rate limiting per client
- [ ] Implement token binding
- [ ] Add mTLS support
- [ ] Create audit logging
- [ ] Add security event monitoring

### Task 4.3: Credential Security ❌
- [ ] Encrypt credentials at rest
- [ ] Implement credential rotation
- [ ] Add secure key derivation
- [ ] Create credential access logs
- [ ] Add automatic rotation schedules

## Phase 5: Testing Infrastructure (Priority: HIGH)

### Task 5.1: Unit Tests ❌
- [ ] Test token validation logic
- [ ] Test resource indicator validation
- [ ] Test scope enforcement
- [ ] Test customer isolation
- [ ] Test error responses

### Task 5.2: Integration Tests ❌
- [ ] Test OAuth login flow
- [ ] Test token refresh
- [ ] Test customer switching
- [ ] Test resource access
- [ ] Test multi-customer scenarios

### Task 5.3: E2E Tests ❌
- [ ] Test complete OAuth flow with MCP
- [ ] Test tool execution with auth
- [ ] Test unauthorized access
- [ ] Test scope escalation attempts
- [ ] Test resource boundary violations

### Task 5.4: Compliance Tests ❌
- [ ] RFC 6749 compliance tests
- [ ] RFC 6750 compliance tests
- [ ] RFC 8707 compliance tests
- [ ] RFC 8414 compliance tests
- [ ] MCP 2025-06-18 compliance tests

## Phase 6: Documentation & Deployment (Priority: MEDIUM)

### Task 6.1: Documentation ❌
- [ ] API documentation for OAuth endpoints
- [ ] Security configuration guide
- [ ] Migration guide from non-OAuth
- [ ] Troubleshooting guide
- [ ] Performance tuning guide

### Task 6.2: Deployment ❌
- [ ] Update Docker configuration
- [ ] Add OAuth environment variables
- [ ] Create health check endpoints
- [ ] Add monitoring metrics
- [ ] Create deployment scripts

## Implementation Order

1. **Week 1**: Fix all compilation errors (Phase 1)
2. **Week 2**: Implement core OAuth infrastructure (Phase 2)
3. **Week 3**: Integrate with MCP and tools (Phase 3)
4. **Week 4**: Add security enhancements (Phase 4)
5. **Week 5**: Complete testing suite (Phase 5)
6. **Week 6**: Documentation and deployment (Phase 6)

## Success Criteria

- [ ] All TypeScript compilation errors resolved
- [ ] 100% unit test coverage for OAuth code
- [ ] All integration tests passing
- [ ] Full RFC compliance validated
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Documentation complete

## Test Coverage Goals

```
├── Token Validation: 100%
├── Resource Indicators: 100%
├── Scope Enforcement: 100%
├── Customer Isolation: 100%
├── Error Handling: 100%
├── Security Features: 100%
└── MCP Integration: 100%
```

## Verification Checklist

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test:oauth` passes all tests
- [ ] `npm run test:security` passes all tests
- [ ] `npm run test:compliance` validates all RFCs
- [ ] `npm run lint` shows no errors
- [ ] `npm audit` shows no vulnerabilities
- [ ] Manual testing with real OAuth provider works
- [ ] Performance tests meet SLA requirements

## Next Steps

1. Start with fixing compilation errors in order
2. Set up test environment with mock OAuth server
3. Implement fixes incrementally with tests
4. Run compliance validation after each phase
5. Document changes and update examples
6. Deploy to staging for integration testing