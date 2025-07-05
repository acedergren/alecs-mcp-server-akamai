# Generic Error Analysis Report

## Overview
This report identifies patterns where generic `throw new Error()` statements could be replaced with more specific error types to improve error handling, debugging, and user experience.

## Available Error Types

### 1. Custom Error Classes (from `src/utils/errors.ts`)
- `AkamaiError` - Base error class with statusCode, errorCode, and reference tracking
- `ErrorTranslator` - Comprehensive error translation system
- `ErrorRecovery` - Retry logic and error recovery utilities

### 2. BaseAkamaiClient HTTP Errors (from `src/services/BaseAkamaiClient.ts`)
- `HttpError` - Base HTTP error with status code and response data
- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `RateLimitError` (429)
- `InternalServerError` (500)
- `ServiceUnavailableError` (503)

### 3. MCP Protocol Errors
- `McpError` from `@modelcontextprotocol/sdk`
- Error codes: InvalidParams, InvalidRequest, MethodNotFound, InternalError

### 4. Configuration Errors
- `ConfigurationError` with specific error types
- `EdgeGridAuthError` for authentication issues

## Identified Patterns and Recommendations

### Pattern 1: API Response Validation Errors
**Current:**
```typescript
throw new Error('Invalid property response structure');
throw new Error('Property not found');
throw new Error('Invalid response: expected PropertyVersionCreateResponse');
```

**Recommendation:** Create specific validation error classes
```typescript
class ValidationError extends AkamaiError {
  constructor(expected: string, received?: any) {
    super(
      `Invalid response structure: expected ${expected}`,
      422,
      'VALIDATION_ERROR',
      { expected, received }
    );
  }
}

class ResourceNotFoundError extends NotFoundError {
  constructor(resourceType: string, resourceId: string) {
    super(
      `${resourceType} not found: ${resourceId}`,
      { type: resourceType, id: resourceId }
    );
  }
}
```

### Pattern 2: Permission and Access Errors
**Current:**
```typescript
throw new Error('Permission denied: You do not have access to view changelists.');
throw new Error('Access denied: You do not have permission to view contract information.');
```

**Recommendation:** Use ForbiddenError with specific context
```typescript
throw new ForbiddenError(
  'You do not have access to view changelists',
  {
    type: 'INSUFFICIENT_PERMISSIONS',
    requiredPermission: 'changelist:read',
    resource: 'changelists'
  }
);
```

### Pattern 3: Rate Limiting Errors
**Current:**
```typescript
throw new Error('Rate limit exceeded. Please wait before retrying.');
```

**Recommendation:** Use RateLimitError with retry information
```typescript
throw new RateLimitError(
  'Rate limit exceeded',
  {
    limit: response.headers['x-ratelimit-limit'],
    remaining: 0,
    reset: parseInt(response.headers['x-ratelimit-reset']),
    window: 3600
  }
);
```

### Pattern 4: Operation State Errors
**Current:**
```typescript
throw new Error(`Deployment already in progress for enrollment ${enrollmentId}`);
throw new Error(`No active deployment found for enrollment ${enrollmentId}`);
```

**Recommendation:** Create operation-specific error classes
```typescript
class OperationInProgressError extends ConflictError {
  constructor(operation: string, resourceId: string) {
    super(
      `${operation} already in progress for ${resourceId}`,
      {
        type: 'OPERATION_IN_PROGRESS',
        operation,
        resourceId
      }
    );
  }
}

class OperationNotFoundError extends NotFoundError {
  constructor(operation: string, resourceId: string) {
    super(
      `No active ${operation} found for ${resourceId}`,
      {
        type: 'OPERATION_NOT_FOUND',
        operation,
        resourceId
      }
    );
  }
}
```

### Pattern 5: Configuration and Setup Errors
**Current:**
```typescript
throw new Error(`Zone ${args.zone} not found. It may have already been deleted.`);
throw new Error(`Cannot delete zone ${args.zone}: It may have active dependencies`);
```

**Recommendation:** Create domain-specific error classes
```typescript
class ZoneNotFoundError extends ResourceNotFoundError {
  constructor(zone: string, hint?: string) {
    super('DNS Zone', zone);
    if (hint) {
      this.details = { ...this.details, hint };
    }
  }
}

class DependencyConflictError extends ConflictError {
  constructor(resource: string, dependencies: string[]) {
    super(
      `Cannot delete ${resource}: active dependencies exist`,
      {
        type: 'DEPENDENCY_CONFLICT',
        resource,
        dependencies
      }
    );
  }
}
```

## Files with High Priority for Refactoring

### Critical Files (Most generic errors):
1. **src/tools/property-manager-tools.ts** - 30+ generic errors
   - Mix of validation, API, and state errors
   - Would benefit from PropertyManagerError hierarchy

2. **src/tools/dns-operations-priority.ts** - 25+ generic errors
   - Many permission and not-found errors
   - Would benefit from DNSOperationError hierarchy

3. **src/services/certificate-deployment-coordinator.ts** - 7 generic errors
   - State management errors
   - Would benefit from CertificateDeploymentError hierarchy

### Medium Priority Files:
4. **src/tools/property-tools.ts**
5. **src/tools/property-activation-advanced.ts**
6. **src/tools/cpcode-tools.ts**
7. **src/tools/dns-tools.ts**
8. **src/tools/cps-tools.ts**

### Utility Files:
9. **src/utils/api-response-validator.ts**
10. **src/utils/parameter-validation.ts**

## Implementation Strategy

### Step 1: Create Domain-Specific Error Hierarchies
Create error class files for each major domain:
- `src/errors/property-errors.ts`
- `src/errors/dns-errors.ts`
- `src/errors/certificate-errors.ts`
- `src/errors/validation-errors.ts`

### Step 2: Update Error Creation Patterns
Replace generic errors with specific types while maintaining backwards compatibility:
```typescript
// Before
throw new Error('Property not found');

// After
throw new PropertyNotFoundError(propertyId, 'Use property.list to find available properties');
```

### Step 3: Enhanced Error Context
Ensure all custom errors include:
- Specific error codes for programmatic handling
- User-friendly messages
- Actionable suggestions
- Request/operation context
- Support references where applicable

### Step 4: Integration with MCP Protocol
Map custom errors to appropriate MCP error codes:
```typescript
// In error handlers
if (error instanceof ValidationError) {
  throw new McpError(ErrorCode.InvalidParams, error.message, error.details);
} else if (error instanceof ResourceNotFoundError) {
  throw new McpError(ErrorCode.MethodNotFound, error.message, error.details);
}
```

## Benefits of This Refactoring

1. **Better Debugging**: Specific error types make it easier to identify issues
2. **Improved User Experience**: More helpful error messages and suggestions
3. **Type Safety**: TypeScript can better infer error types in catch blocks
4. **Consistent Error Handling**: Standardized error responses across the codebase
5. **MCP Compliance**: Proper error codes for Claude Desktop integration
6. **Monitoring**: Easier to track and categorize errors in production

## Next Steps

1. Create the base error class hierarchies
2. Start with high-priority files for refactoring
3. Update error handling in catch blocks to use instanceof checks
4. Add comprehensive tests for error scenarios
5. Update documentation with error handling guidelines