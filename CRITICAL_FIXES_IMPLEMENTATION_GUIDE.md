# Critical Fixes Implementation Guide - ALECS MCP Server

## Overview

This guide provides detailed implementation instructions for fixing the critical issues identified in the codebase analysis. Each fix includes specific Akamai API documentation references and acceptance criteria.

## CRITICAL Priority Fixes (Immediate Action Required)

### 1. Security: Remove Production Debug Code

**Issue**: 24 files contain console.log statements exposing sensitive data
**Risk**: Data breach, PII exposure, security vulnerabilities
**Estimated Time**: 2 days

#### Files to Fix:
```
src/tools/universal-search-simplified.ts:55-56
src/middleware/oauth-authorization.ts:246
src/akamai-client.ts:207-210
src/tools/property-tools.ts:42-44
[+ 20 more files]
```

#### Implementation:
1. **Replace console.log with structured logging**:
```typescript
// BAD
console.log('Authorization granted:', decision.audit);
console.error(`[SEARCH] Universal search for: "${args.query}"`);

// GOOD
logger.info('Authorization granted', { 
  timestamp: new Date().toISOString(),
  // Remove sensitive audit data
});
logger.info('Search initiated', { 
  queryType: getQueryType(args.query),
  // Do not log actual query content (PII risk)
});
```

2. **Implement PII-safe logging utility**:
```typescript
/**
 * Secure logger that filters PII and sensitive Akamai data
 * @akamai-note Follows Akamai security guidelines for logging
 * @see https://techdocs.akamai.com/developer/docs/security-best-practices
 */
export class SecureLogger {
  private static readonly PII_PATTERNS = [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit cards
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Emails
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  ];
  
  static sanitize(data: any): any {
    // Implementation with PII filtering
  }
}
```

#### Acceptance Criteria:
- [ ] Zero console.log/console.error statements in production code
- [ ] All logging goes through structured logger
- [ ] PII filtering implemented and tested
- [ ] No sensitive Akamai credentials in logs

### 2. Memory Leaks: Fix Middleware Cleanup

**Issue**: setInterval in security.ts:85 without cleanup causes memory leaks
**Risk**: Server instability, resource exhaustion
**Estimated Time**: 1 day

#### Implementation:
```typescript
/**
 * Security middleware with proper lifecycle management
 * @akamai-note Ensures proper cleanup for long-running Akamai API connections
 */
export class SecurityMiddleware {
  private cleanupInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor() {
    // Proper cleanup on process signals
    process.once('SIGTERM', this.cleanup.bind(this));
    process.once('SIGINT', this.cleanup.bind(this));
  }

  startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      if (this.isShuttingDown) return;
      this.performCleanup();
    }, 30000);
  }

  async cleanup(): Promise<void> {
    this.isShuttingDown = true;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}
```

#### Acceptance Criteria:
- [ ] All setInterval/setTimeout have corresponding cleanup
- [ ] Process signal handlers implemented
- [ ] Memory leak tests pass
- [ ] No hanging intervals after server shutdown

### 3. Type Safety: Fix Unsafe Type Assertions

**Issue**: 138 files with unsafe type assertions (as T)
**Risk**: Runtime errors, data corruption, API failures
**Estimated Time**: 15 days

#### Priority Files:
1. `src/akamai-client.ts:206-212` - Critical API response parsing
2. `src/tools/consolidated/workflow-orchestrator.ts:55` - Property updates
3. All tool files with Akamai API interactions

#### Implementation for Akamai API Responses:

**Reference Akamai API Documentation**:
- Property Manager API: https://techdocs.akamai.com/property-mgr/reference/api
- Edge DNS API: https://techdocs.akamai.com/edge-dns/reference/api  
- Certificate Provisioning: https://techdocs.akamai.com/cps/reference/api

```typescript
/**
 * Type-safe Akamai API response parser
 * @akamai-api Property Manager API v1
 * @see https://techdocs.akamai.com/property-mgr/reference/get-properties
 */
export function parsePropertyListResponse(body: string): PropertyListResponse {
  try {
    const parsed = JSON.parse(body);
    
    // Validate against Akamai API schema
    if (!isPropertyListResponse(parsed)) {
      throw new Error('Invalid Property Manager API response format');
    }
    
    return parsed;
  } catch (error) {
    logger.error('Failed to parse Property Manager response', { 
      error: error.message,
      bodyLength: body.length 
    });
    throw new AkamaiAPIError('Property list parsing failed', error);
  }
}

/**
 * Type guard for Akamai Property Manager responses
 * @akamai-validation Based on PAPI OpenAPI specification
 */
function isPropertyListResponse(obj: unknown): obj is PropertyListResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'properties' in obj &&
    Array.isArray((obj as any).properties.items)
  );
}
```

#### Acceptance Criteria:
- [ ] Zero `as any` or `as T` assertions in API parsing code
- [ ] Type guards implemented for all Akamai API responses
- [ ] Proper error handling for type validation failures
- [ ] Runtime type validation matches API documentation

### 4. Architecture: Break Down God Classes

**Issue**: Massive files violating single responsibility principle
**Risk**: Unmaintainable code, difficult debugging, merge conflicts
**Estimated Time**: 20 days

#### Target Files:
1. `property-manager-tools.ts` (2,096 lines) → Break into Akamai PAPI domains
2. `property-operations-advanced.ts` (1,885 lines) → Break by operation type
3. `rule-tree-management.ts` (1,791 lines) → Break by rule categories

#### Implementation Strategy (Property Manager Example):

**Reference**: https://techdocs.akamai.com/property-mgr/docs/api-summary

Break down by Akamai API domains:
```
src/tools/property-manager/
├── core/
│   ├── property-lifecycle.ts     # Create, versions, activations
│   ├── property-configuration.ts # Rules, behaviors, criteria
│   └── property-validation.ts    # Validation, testing
├── hostnames/
│   ├── edge-hostname-manager.ts  # Edge hostnames
│   └── certificate-manager.ts    # Certificate associations
├── rules/
│   ├── rule-tree-builder.ts      # Rule tree construction
│   ├── behavior-manager.ts       # Behavior definitions
│   └── criteria-manager.ts       # Match criteria
└── operations/
    ├── bulk-operations.ts         # Bulk property operations
    ├── deployment-manager.ts      # Staging/production deployments
    └── monitoring-manager.ts      # Health checks, reporting
```

#### Implementation for Property Lifecycle:
```typescript
/**
 * @fileoverview Property Lifecycle Management
 * @module PropertyLifecycleManager
 * 
 * @description
 * Manages the complete lifecycle of Akamai properties including creation,
 * versioning, and activation workflows.
 * 
 * @akamai-api Property Manager API v1
 * @akamai-concepts Properties, Versions, Activations, Networks
 * @see https://techdocs.akamai.com/property-mgr/reference/post-properties
 * 
 * @business-context
 * Properties are the fundamental unit of CDN configuration in Akamai.
 * They contain rules that determine how content is cached and delivered.
 */
export class PropertyLifecycleManager {
  /**
   * Creates a new property following Akamai best practices
   * 
   * @akamai-api POST /papi/v1/properties
   * @param config Property configuration per PAPI specification
   * @returns Promise<Property> The created property object
   * 
   * @example
   * ```typescript
   * const property = await manager.createProperty({
   *   name: 'www.example.com',
   *   productId: 'prd_Site_Accel',
   *   contractId: 'ctr_C-1234',
   *   groupId: 'grp_5678'
   * });
   * ```
   */
  async createProperty(config: PropertyCreateConfig): Promise<Property> {
    // Implementation with proper types and error handling
  }
}
```

#### Acceptance Criteria:
- [ ] No single file exceeds 500 lines
- [ ] Each module has single responsibility aligned with Akamai API structure
- [ ] Proper dependency injection between modules
- [ ] Comprehensive unit tests for each module
- [ ] Documentation follows CODE_ANNOTATION_STANDARDS.md

## Implementation Timeline

### Week 1: Critical Security Fixes
- Day 1-2: Remove all console.log statements
- Day 3-4: Implement secure logging framework
- Day 5: Fix memory leaks in middleware

### Week 2: Type Safety Foundation
- Day 1-3: Create Akamai API type definitions
- Day 4-5: Implement type guards and validation

### Weeks 3-5: God Class Decomposition
- Week 3: Property Manager tools breakdown
- Week 4: Operations and rules breakdown  
- Week 5: Testing and integration

### Week 6: Performance & Polish
- Day 1-3: Fix async patterns and wildcard imports
- Day 4-5: Performance testing and optimization

## Monitoring and Validation

### Automated Checks:
```bash
# Type safety validation
npx tsc --noEmit --strict

# Security scanning
npm audit
snyk test

# Memory leak detection
node --inspect --max-old-space-size=512 dist/index.js

# Performance monitoring
npm run test:performance
```

### Success Metrics:
1. **Security**: 0 console.log statements, 0 PII exposure
2. **Type Safety**: 0 `any` types, 100% type coverage
3. **Architecture**: Max 500 lines per file, clear separation of concerns
4. **Performance**: No memory leaks, <100ms response times
5. **Quality**: 95%+ test coverage, 0 ESLint errors

## Conclusion

These critical fixes are essential for transforming the ALECS MCP Server into an enterprise-grade solution worthy of Akamai's standards. The "Snow Leopard" philosophy of no shortcuts and perfect software must guide every implementation decision.

Each fix must be thoroughly tested, documented, and validated against Akamai's API specifications before deployment to production.