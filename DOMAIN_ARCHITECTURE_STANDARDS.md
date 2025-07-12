# Domain Architecture Standards

## Overview

This document defines the **Snow Leopard Architecture** standards for domain organization in the ALECS MCP Server. Following these standards ensures consistency, maintainability, and proper auto-discovery by the unified registry.

## Snow Leopard Architecture Principles

The Snow Leopard Architecture is named after Apple's Snow Leopard OS release, which focused on **refinement, performance, and architectural consistency** rather than new features. Our implementation emphasizes:

### 1. **Unified Execution Pattern**
- All operations must use `AkamaiOperation.execute()` 
- No direct API calls or custom execution patterns
- Consistent error handling and response formatting

### 2. **Single Export Pattern**
- Each domain exports **exactly one** operations registry object
- No circular imports or competing export patterns
- Clean `index.ts` files with minimal complexity

### 3. **Type Safety First**
- All operations must have Zod schema validation
- No `any` types or unsafe type assertions
- Runtime validation matches compile-time types

## Domain Structure Standards

### Required Files

Each domain **MUST** have the following structure:

```
src/tools/{domain}/
├── index.ts           # Single export point (REQUIRED)
├── api.ts            # Schemas and endpoints (RECOMMENDED)
├── {domain}.ts       # Main implementation (REQUIRED)
└── types.ts          # Domain-specific types (OPTIONAL)
```

### File Specifications

#### 1. `index.ts` - Export Point
**MUST** follow this exact pattern:

```typescript
/**
 * {Domain} Domain - Index
 * 
 * Unified {domain} operations export for registry auto-discovery
 * 
 * ARCHITECTURE NOTES:
 * - Uses standard domain pattern matching other domains
 * - Single export point to prevent circular imports
 * - Consolidates all {domain} operations into one registry
 */

import { {domain}Operations } from './{domain}';

export { {domain}Operations };
```

**Requirements:**
- File must be < 20 lines
- Must export exactly one operations object
- Must NOT have circular imports
- Must NOT have duplicate imports

#### 2. `{domain}.ts` - Implementation
**MUST** include:

```typescript
/**
 * {Domain} Operations Registry
 * 
 * Comprehensive {domain} operations for the unified registry
 */
export const {domain}Operations = {
  {domain}_{operation}_name: {
    name: '{domain}_{operation}_name',
    description: 'Clear description of what this operation does',
    inputSchema: {Domain}ToolSchemas.{operation},
    handler: {operationFunction}
  },
  // ... more operations
};
```

**Requirements:**
- All functions must use `AkamaiOperation.execute()`
- All operations must have inputSchema (Zod validation)
- Operations registry must be exported at the end
- Operation names must follow `{domain}_{action}` pattern

#### 3. `api.ts` - Schemas (Recommended)
**SHOULD** include:

```typescript
export const {Domain}ToolSchemas = {
  {operation}: z.object({
    // Zod schema definition
  }),
  // ... more schemas
};

export const {Domain}Endpoints = {
  {operation}: () => '/api/path',
  // ... more endpoints
};
```

## Registry Integration

### Auto-Discovery Requirements

For automatic discovery by the unified registry:

1. **Directory Structure**: Domain must be in `src/tools/{domain}/`
2. **Index File**: Must have `index.ts` that exports operations
3. **Naming Convention**: Operations object must end with `Operations`
4. **No Circular Imports**: Clean import/export chains

### Tool Registration Format

Each tool in the operations registry must follow:

```typescript
{
  name: string;                    // Tool identifier
  description: string;             // Human-readable description  
  inputSchema: ZodSchema;          // Zod validation schema
  handler: Function;               // Implementation function
}
```

## Quality Standards

### A+ Grade Requirements

To achieve A+ grade, domains must:

✅ **Architecture Compliance**
- Follow Snow Leopard Architecture exactly
- Use AkamaiOperation.execute() for all operations
- Have proper error handling and type safety

✅ **Code Quality**
- No TypeScript compilation errors
- No circular imports or complex dependencies
- Clean, readable, well-documented code

✅ **Registry Integration**  
- Auto-discoverable by unified registry
- All operations properly registered
- Follows standard naming conventions

✅ **Testing**
- All functions tested and working
- Integration tests pass
- No broken or incomplete implementations

## Migration Checklist

When upgrading existing domains to Snow Leopard Architecture:

### Phase 1: Structure
- [ ] Create standard file structure
- [ ] Move operations to proper files
- [ ] Remove duplicate/legacy files

### Phase 2: Standardization  
- [ ] Convert all functions to AkamaiOperation.execute()
- [ ] Create unified operations registry
- [ ] Simplify index.ts exports

### Phase 3: Validation
- [ ] Run domain validation script
- [ ] Fix compilation errors
- [ ] Test auto-discovery

### Phase 4: Quality Assurance
- [ ] Run integration tests
- [ ] Verify all operations work
- [ ] Document any special considerations

## Examples

### ✅ Good Example - Certificates Domain

```typescript
// src/tools/certificates/index.ts
import { certificateOperations } from './certificates';
export { certificateOperations };

// src/tools/certificates/certificates.ts  
export const certificateOperations = {
  certificate_list: {
    name: 'certificate_list',
    description: 'List all certificate enrollments',
    inputSchema: CertificateToolSchemas.listCertificates,
    handler: listCertificates
  },
  // ... more operations
};
```

### ❌ Bad Example - Legacy Pattern

```typescript
// DON'T DO THIS - Multiple exports, circular imports
export { listCerts, createCert } from './certs';
export { CertSchemas } from './api';
import { someFunction } from './other-file';
export const operations = { /* mixed patterns */ };
```

## Validation Tools

### Automated Validation

```bash
# Validate all domains
npm run validate:domains

# Test registry auto-discovery  
npm test src/__tests__/registry/domain-auto-discovery.test.ts
```

### CI/CD Integration

GitHub Actions automatically validates:
- Domain structure compliance
- Registry auto-discovery
- Architecture standards
- Integration test passage

## Benefits

Following these standards provides:

### 🚀 **Performance**
- Faster registry initialization
- Efficient tool discovery  
- Reduced memory usage

### 🔧 **Maintainability**
- Consistent patterns across domains
- Easy to onboard new developers
- Simple to add new operations

### 🛡️ **Reliability**  
- Type safety prevents runtime errors
- Standardized error handling
- Comprehensive validation

### 📈 **Scalability**
- Auto-discovery supports growth
- Modular architecture
- Clean separation of concerns

## Support

For questions about domain architecture standards:

1. Check existing domains (certificates, dns, diagnostics) for examples
2. Run validation tools to identify issues
3. Review this documentation for guidance
4. Follow the migration checklist for upgrades

---

**Last Updated**: January 2025  
**Architecture Version**: Snow Leopard v1.0  
**Compliance Level**: Production Ready