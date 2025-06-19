# MCP 2025-06-18 Dependency Update Issues

## Overview
This document tracks all dependency updates required for full MCP 2025-06-18 specification compliance. Each issue is categorized by priority and includes specific action items.

## Critical Issues (Must Fix)

### Issue #1: Missing OAuth 2.0 Resource Server Dependencies
**Priority**: 🔴 CRITICAL  
**Description**: MCP 2025-06-18 specification requires OAuth 2.0 Resource Server implementation for HTTP transport  
**Missing Dependencies**:
- `oauth2-server@^3.1.1` - Core OAuth 2.0 server implementation
- `express-oauth-server@^2.0.0` - Express middleware integration
- `node-jose@^2.2.0` - JWT validation and key management
- `openid-client@^5.7.1` - OAuth introspection support
- `@panva/oauth4webapi@^3.1.0` - Resource Indicators (RFC 8707) support

**Action**:
```bash
npm install oauth2-server express-oauth-server node-jose openid-client @panva/oauth4webapi
```

### Issue #2: Schema Conversion Implementation
**Priority**: 🔴 CRITICAL  
**Description**: Current Zod-to-JSON-Schema conversion is simplified and incomplete  
**Missing Dependency**:
- `zod-to-json-schema@^3.23.5` - Proper Zod to JSON Schema converter

**Action**:
```bash
npm install zod-to-json-schema
```

## High Priority Issues

### Issue #3: Security Middleware Dependencies
**Priority**: 🟠 HIGH  
**Description**: Missing essential security middleware for production deployment  
**Missing Dependencies**:
- `express-bearer-token@^3.0.0` - Bearer token parsing
- `express-rate-limit@^7.5.0` - Rate limiting protection
- `cors@^2.8.5` - CORS support for HTTP transport
- `helmet@^8.0.0` - Security headers

**Action**:
```bash
npm install express-bearer-token express-rate-limit cors helmet
```

### Issue #4: Audit Logging Infrastructure
**Priority**: 🟠 HIGH  
**Description**: No structured audit logging for security events  
**Missing Dependencies**:
- `winston@^3.18.0` - Structured logging
- `winston-transport-rotating-file@^5.1.3` - Log rotation

**Action**:
```bash
npm install winston winston-transport-rotating-file
```

### Issue #5: Request ID Tracking & Deduplication
**Priority**: 🟠 HIGH  
**Description**: MCP 2025 requires request ID tracking and deduplication  
**Missing Dependencies**:
- `node-cache@^5.1.2` - In-memory cache for deduplication
- `uuid@^11.0.5` - UUID generation for request IDs
- `cls-hooked@^4.2.2` - Request context tracking

**Action**:
```bash
npm install node-cache uuid cls-hooked
```

## Medium Priority Issues

### Issue #6: JSON-RPC 2.0 Protocol Enhancements
**Priority**: 🟡 MEDIUM  
**Description**: Better JSON-RPC 2.0 compliance and error handling  
**Missing Dependency**:
- `jayson@^4.1.3` - Enhanced JSON-RPC handling

**Action**:
```bash
npm install jayson
```

### Issue #7: Metadata Validation
**Priority**: 🟡 MEDIUM  
**Description**: Need robust JSON Schema validation for metadata  
**Missing Dependency**:
- `ajv@^8.17.1` - JSON Schema validation

**Action**:
```bash
npm install ajv
```

### Issue #8: Development Dependencies Version Mismatch
**Priority**: 🟡 MEDIUM  
**Description**: package.json lists outdated versions that don't match installed  
**Required Updates**:
```json
{
  "@typescript-eslint/eslint-plugin": "^8.34.1",
  "@typescript-eslint/parser": "^8.34.1",
  "eslint": "^9.29.0",
  "eslint-plugin-jest": "^29.0.1"
}
```

**Action**: Update package.json to reflect actual versions

## Low Priority Issues

### Issue #9: Type Definition Updates
**Priority**: 🟢 LOW  
**Description**: Minor version updates available  
**Updates Available**:
- `@types/ioredis@^5.0.0` (currently 4.28.10)

**Action**:
```bash
npm install @types/ioredis@^5.0.0 --save-dev
```

### Issue #10: Performance Monitoring
**Priority**: 🟢 LOW  
**Description**: Optional performance monitoring capabilities  
**Optional Dependencies**:
- `prom-client@^16.0.0` - Prometheus metrics
- `@godaddy/terminus@^4.12.1` - Graceful shutdown and health checks

**Action** (Optional):
```bash
npm install prom-client @godaddy/terminus
```

## Implementation Plan

### Phase 1: Critical Security (Week 1)
1. Install OAuth 2.0 dependencies (Issue #1)
2. Install security middleware (Issue #3)
3. Install audit logging (Issue #4)

### Phase 2: Protocol Compliance (Week 2)
1. Install schema conversion (Issue #2)
2. Install request tracking (Issue #5)
3. Install metadata validation (Issue #7)

### Phase 3: Optimization (Week 3)
1. Update development dependencies (Issue #8)
2. Install JSON-RPC enhancements (Issue #6)
3. Update type definitions (Issue #9)

### Phase 4: Production Readiness (Week 4)
1. Install performance monitoring (Issue #10)
2. Complete integration testing
3. Security audit

## Testing Requirements

After each phase:
1. Run `npm run typecheck` to ensure no TypeScript errors
2. Run `npm test` to ensure all tests pass
3. Run `npm run lint` to ensure code quality
4. Run `npm audit` to check for security vulnerabilities

## Success Criteria

- [ ] All OAuth 2.0 dependencies installed and configured
- [ ] Schema conversion working properly
- [ ] Security middleware integrated
- [ ] Audit logging operational
- [ ] Request ID tracking implemented
- [ ] All tests passing with 100% coverage
- [ ] No security vulnerabilities in `npm audit`
- [ ] Full MCP 2025-06-18 specification compliance

## Notes

- Prioritize security-related dependencies first
- Test OAuth implementation thoroughly before production
- Consider staging environment for testing updates
- Document all configuration changes
- Update CI/CD pipelines as needed