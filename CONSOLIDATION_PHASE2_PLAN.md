# ALECS MCP Server - Phase 2 Consolidation Plan

## Executive Summary

After Phase 1 consolidation (50% error reduction), we've identified additional opportunities to reduce complexity by another 40-50% through strategic consolidation of duplicate functionality.

## Current State Analysis

### TypeScript Errors by Category
- **Tool Files**: 1,200+ errors (75% of total)
- **Property Tools**: 450+ errors across 8 files
- **DNS Tools**: 200+ errors across 5 files
- **Cache Implementations**: 6 redundant implementations
- **Error Handlers**: 11 competing systems

### Code Duplication Metrics
- **Property Operations**: 8,000+ duplicate lines
- **DNS Operations**: 3,000+ duplicate lines
- **Cache Logic**: 2,000+ duplicate lines
- **Error Handling**: 4,000+ duplicate lines
- **Generated Types**: 35,000+ unused lines

## Consolidation Strategy

### Phase 2.1: Cache Layer Simplification (Day 1)

**Action**: Keep only SmartCache, remove all wrappers

```bash
# Archive redundant cache implementations
mv src/services/cache-*.ts .archive/legacy-cache/
mv src/services/akamai-cache-service.ts .archive/legacy-cache/
mv src/utils/customer-aware-cache.ts .archive/legacy-cache/

# Update imports to use SmartCache directly
```

**Benefits**:
- Remove 3,000+ lines of redundant code
- Single source of truth for caching
- Better performance (fewer abstraction layers)

### Phase 2.2: Error System Unification (Day 1)

**Action**: Consolidate to RFC 7807 standard

```typescript
// src/errors/index.ts - Single error system
export { RFC7807Error } from './rfc7807-handler';
export * from './domain-errors';

// Archive all other error utilities
```

**Benefits**:
- Consistent error handling across all tools
- Remove 4,000+ lines of duplicate error logic
- Better error messages for users

### Phase 2.3: Property Tools Consolidation (Days 2-3)

**Action**: Create organized module structure

```
src/tools/property/
├── index.ts                    // Public API
├── core-operations.ts          // CRUD operations
├── version-management.ts       // Versions & activations
├── rule-management.ts          // Rules & behaviors
├── hostname-management.ts      // Hostnames & edge hostnames
└── advanced-features.ts        // Search, bulk operations
```

**Migration Plan**:
1. Create base class with common patterns
2. Move functions to appropriate modules
3. Update ALECSCore server imports
4. Archive original files

**Benefits**:
- Reduce 8 files to 5 organized modules
- Remove 4,000+ duplicate lines
- Clear separation of concerns

### Phase 2.4: DNS Tools Consolidation (Day 4)

**Action**: Merge 5 files into 2 modules

```
src/tools/dns/
├── index.ts              // Public API
├── zone-management.ts    // Zones, records, DNSSEC
└── migration-tools.ts    // Import/export, bulk operations
```

**Benefits**:
- Remove 2,000+ duplicate lines
- Consistent DNS operation patterns
- Easier to maintain and test

### Phase 2.5: Certificate Tools Consolidation (Day 4)

**Action**: Merge 3 files into 1 module

```typescript
// src/tools/certificate-tools.ts
export * from './enrollment';
export * from './validation';
export * from './deployment';
```

**Benefits**:
- Remove 1,000+ duplicate lines
- Single location for all certificate operations

### Phase 2.6: Type Optimization (Day 5)

**Action**: Extract only used types from generated files

```typescript
// src/types/akamai-types.ts - Curated types
export interface Property { /* only used fields */ }
export interface Zone { /* only used fields */ }
// Remove 35,000+ unused generated lines
```

## Implementation Approach

### Step 1: Create Base Tool Class
```typescript
// src/tools/base-tool.ts
export abstract class BaseTool {
  protected cache = getCacheService();
  
  protected async executeWithStandardHandling<T>(
    operation: string,
    customer: string | undefined,
    fn: () => Promise<T>
  ): Promise<MCPToolResponse> {
    try {
      const result = await fn();
      return { type: 'json', data: result };
    } catch (error) {
      throw new RFC7807Error(error);
    }
  }
}
```

### Step 2: Gradual Migration
1. Start with cache layer (lowest risk)
2. Then error handling (improves all tools)
3. Property tools (highest impact)
4. Other tools (apply learned patterns)

### Step 3: Validation
- Run TypeScript compiler after each consolidation
- Ensure all ALECSCore servers still work
- Update tests for new structure

## Expected Outcomes

### Code Quality Improvements
- **TypeScript Errors**: 1,590 → ~500 (70% reduction)
- **Code Volume**: 150,000 → ~90,000 lines (40% reduction)
- **Build Time**: 30s → ~15s (50% faster)
- **Test Coverage**: Easier to achieve 80%+

### Architecture Benefits
- Clear module boundaries
- Consistent patterns across all tools
- Single source of truth for each domain
- Easier onboarding for new developers

### Risk Mitigation
- All changes preserve API compatibility
- Original files archived (not deleted)
- Incremental approach allows rollback
- Each phase independently valuable

## Success Metrics
1. TypeScript compilation: 0 errors
2. All existing tests pass
3. SonarCloud quality gate: Pass
4. Bundle size: 30% reduction
5. Developer feedback: Positive

## Timeline
- **Day 1**: Cache + Error consolidation
- **Days 2-3**: Property tools consolidation
- **Day 4**: DNS + Certificate consolidation
- **Day 5**: Type optimization + cleanup
- **Day 6**: Testing + documentation

This plan aligns with ALECS principles:
- **A**PI-first design maintained
- **L**ean implementation (less code)
- **E**rror handling improved
- **C**aching optimized
- **S**ecurity unchanged