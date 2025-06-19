# MCP SDK 2025-06-18 OAuth Implementation Plan

## Overview
This document outlines the comprehensive implementation plan for integrating OAuth 2.1 Resource Server functionality into the ALECS MCP Server according to the 2025-06-18 specification.

## Key Requirements Summary

### 1. OAuth 2.1 Resource Server Architecture
- MCP servers are now classified as OAuth Resource Servers (not Authorization Servers)
- Must implement OAuth 2.0 Protected Resource Metadata (RFC 9728)
- Must support Resource Indicators (RFC 8707)
- Must delegate authentication to external Authorization Servers

### 2. Core OAuth Requirements
- MUST implement OAuth 2.1 with PKCE for all clients
- MUST support Authorization Server Metadata (RFC 8414)
- SHOULD support Dynamic Client Registration (RFC 7591)
- MUST use Authorization header for access tokens (no query parameters)
- MUST validate tokens through introspection or JWT validation

### 3. Security Requirements
- All endpoints MUST be served over HTTPS
- MUST implement sender-constrained tokens (DPoP, mTLS, or certificate binding)
- MUST validate redirect URIs
- MUST enforce token expiration and rotation
- MUST implement proper rate limiting

## Implementation Tasks

### Phase 1: Core OAuth Infrastructure (Priority: High)

#### 1.1 Update OAuth Resource Server Implementation
- [ ] Refactor `OAuthResourceServer` to implement RFC 9728 Protected Resource Metadata
- [ ] Add support for `/.well-known/oauth-resource-server` discovery endpoint
- [ ] Implement proper resource URI format: `akamai://{resource-type}/{account-id}/{resource-id}`
- [ ] Add resource-specific scope generation based on resource types

#### 1.2 Implement Resource Indicators (RFC 8707)
- [ ] Create `ResourceIndicatorValidator` class
- [ ] Implement validation for resource URIs in token requests
- [ ] Add support for multiple resource indicators per request
- [ ] Ensure clients can only access authorized resources

#### 1.3 Update Token Validation
- [ ] Enhance `TokenValidator` to support resource-specific validation
- [ ] Implement token binding validation (sender-constrained tokens)
- [ ] Add support for JWT validation with JWKS
- [ ] Implement token introspection with resource validation

### Phase 2: MCP SDK Integration (Priority: High)

#### 2.1 Update MCP Server Transport
- [ ] Implement HTTP transport with OAuth support
- [ ] Add OAuth headers extraction from MCP requests
- [ ] Implement proper error responses (401 Unauthorized)
- [ ] Add _meta field support for OAuth context

#### 2.2 OAuth Middleware Enhancement
- [ ] Update `OAuthMiddleware` to act as resource server middleware
- [ ] Remove authorization server functionality
- [ ] Add resource-based authorization checks
- [ ] Implement proper scope validation per tool

#### 2.3 Tool Authorization Mapping
- [ ] Map each MCP tool to required OAuth scopes
- [ ] Implement resource-based authorization for tools
- [ ] Add tool metadata with OAuth requirements
- [ ] Create public/protected tool registry

### Phase 3: Discovery and Metadata (Priority: Medium)

#### 3.1 Discovery Endpoints
- [ ] Implement `/.well-known/oauth-resource-server` endpoint
- [ ] Add resource listing at `/resources` endpoint
- [ ] Implement Authorization Server discovery
- [ ] Add CORS support for discovery endpoints

#### 3.2 Resource Metadata
- [ ] Define resource types (property, dns, certificate, etc.)
- [ ] Create resource scope templates
- [ ] Implement resource-specific metadata
- [ ] Add resource versioning support

### Phase 4: Security Enhancements (Priority: High)

#### 4.1 Sender-Constrained Tokens
- [ ] Implement DPoP (Demonstration of Proof of Possession) support
- [ ] Add mTLS certificate binding
- [ ] Implement certificate thumbprint validation
- [ ] Add token binding type configuration

#### 4.2 Rate Limiting and Protection
- [ ] Implement per-client rate limiting
- [ ] Add per-resource rate limits
- [ ] Implement circuit breaker patterns
- [ ] Add security event logging

### Phase 5: Testing and Validation (Priority: Critical)

#### 5.1 Unit Tests
- [ ] Test OAuth Resource Server implementation
- [ ] Test Resource Indicator validation
- [ ] Test token validation with various binding types
- [ ] Test discovery endpoints

#### 5.2 Integration Tests
- [ ] Test full OAuth flow with external Authorization Server
- [ ] Test multi-tenant scenarios
- [ ] Test error handling and edge cases
- [ ] Test rate limiting and security features

#### 5.3 End-to-End Tests
- [ ] Test with MCP client using OAuth
- [ ] Test tool authorization flows
- [ ] Test resource access controls
- [ ] Test token refresh and expiration

#### 5.4 Security Tests
- [ ] Test token replay attacks
- [ ] Test unauthorized resource access
- [ ] Test CORS and CSRF protection
- [ ] Test input validation and injection attacks

### Phase 6: Documentation and Examples (Priority: Medium)

#### 6.1 Implementation Documentation
- [ ] Document OAuth configuration options
- [ ] Create setup guide for Authorization Servers
- [ ] Document resource URI format
- [ ] Create troubleshooting guide

#### 6.2 Example Implementations
- [ ] Create example with Auth0 as Authorization Server
- [ ] Create example with Keycloak
- [ ] Create example with AWS Cognito
- [ ] Create client implementation examples

## Success Criteria

1. **100% Test Coverage**: All OAuth-related code must have comprehensive test coverage
2. **Specification Compliance**: Full compliance with MCP 2025-06-18 specification
3. **Security Validation**: Pass security audit for OAuth implementation
4. **Performance**: Token validation must complete within 50ms
5. **Documentation**: Complete API documentation and examples

## Timeline Estimate

- Phase 1: 2-3 days
- Phase 2: 3-4 days
- Phase 3: 1-2 days
- Phase 4: 2-3 days
- Phase 5: 3-4 days
- Phase 6: 1-2 days

**Total: 12-18 days**

## Dependencies

1. MCP SDK with 2025-06-18 specification support
2. External Authorization Server for testing (Auth0, Keycloak, etc.)
3. Redis/Valkey for token caching
4. Testing framework updates for OAuth flows

## Risk Mitigation

1. **Risk**: Breaking changes in existing implementation
   - **Mitigation**: Create feature flags for gradual rollout

2. **Risk**: Performance impact from token validation
   - **Mitigation**: Implement aggressive caching strategies

3. **Risk**: Complex OAuth flows confusing users
   - **Mitigation**: Provide clear documentation and examples

4. **Risk**: Security vulnerabilities
   - **Mitigation**: Regular security audits and penetration testing