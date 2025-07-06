# Tool Consolidation Implementation Plan

## Current vs. Target Architecture

### Property Domain (12 → 6 files)

```
CURRENT STRUCTURE:
property-tools.ts (31KB) ─────────────┐
property-manager.ts ──────────────────┤
property-manager-tools.ts ────────────┼─→ property-core.ts
property-tools-paginated.ts ──────────┘

property-manager-advanced-tools.ts ───┐
property-operations-advanced.ts ──────┼─→ property-advanced.ts
property-version-management.ts ───────┘

property-activation-advanced.ts ──────→ property-activation.ts (keep)

property-manager-rules-tools.ts ──────┐
rule-tree-management.ts ──────────────┼─→ property-rules.ts
rule-tree-advanced.ts ────────────────┘

property-search-optimized.ts ─────────→ property-search.ts (keep)

property-error-handling-tools.ts ─────┐
property-onboarding-tools.ts ─────────┼─→ property-utils.ts
(common functions from all) ──────────┘
```

### Network Lists Domain (5 → 3 files)

```
CURRENT STRUCTURE:
network-lists-tools.ts ───────────────→ network-lists-core.ts

network-lists-activation.ts ──────────┐
network-lists-bulk.ts ────────────────┼─→ network-lists-operations.ts
network-lists-integration.ts ─────────┘

network-lists-geo-asn.ts ─────────────→ network-lists-geo-asn.ts (keep)
```

### Common Utilities (New Structure)

```
NEW STRUCTURE:
src/tools/common/
├── utils.ts (formatError, MCPToolResponse helpers)
├── validation.ts (isValidHostname, validateIPAddress, etc.)
├── types.ts (shared type definitions)
└── constants.ts (shared constants)
```

## Detailed Consolidation by File

### 1. Property Core Consolidation

**Target File**: `src/tools/property/property-core.ts`

**Functions to Consolidate**:
```typescript
// From property-tools.ts & property-manager.ts (eliminate duplicates)
- listProperties() 
- getProperty()
- createProperty()
- createPropertyVersion()
- listPropertyVersions()
- getPropertyVersion()
- removeProperty()

// From property-manager-tools.ts (unique functions)
- createPropertyVersionEnhanced()
- getVersionDiff()
- listPropertyVersionsEnhanced()
- rollbackPropertyVersion()
- batchVersionOperations()

// From property-tools-paginated.ts
- listPropertiesPaginated()
- listPropertyVersionsPaginated()
```

### 2. Property Advanced Consolidation

**Target File**: `src/tools/property/property-advanced.ts`

**Functions to Consolidate**:
```typescript
// From property-operations-advanced.ts
- compareProperties()
- checkPropertyHealth()
- detectConfigurationDrift()
- bulkUpdateProperties()

// From property-manager-advanced-tools.ts
- cloneProperty()
- cancelPropertyActivation() // deduplicate
- listPropertyVersionHostnames()

// From property-version-management.ts
- comparePropertyVersions()
- batchCreateVersions()
- getVersionTimeline()
- updateVersionMetadata()
- mergePropertyVersions()
```

### 3. Property Rules Consolidation

**Target File**: `src/tools/property/property-rules.ts`

**Functions to Consolidate**:
```typescript
// Core rule operations (deduplicate from multiple files)
- getPropertyRules()
- updatePropertyRules()
- updatePropertyRulesEnhanced()

// From property-manager-rules-tools.ts
- listAvailableBehaviors()
- listAvailableCriteria()
- patchPropertyRules()
- bulkSearchProperties()

// From rule-tree-management.ts
- createRuleFromTemplate()
- validateRuleTree()
- mergeRuleTrees()
- optimizeRuleTree()
- listRuleTemplates()

// From rule-tree-advanced.ts
- createRuleTreeFromTemplate()
- analyzeRuleTreePerformance()
- detectRuleConflicts()
```

### 4. Common Utilities Extraction

**Target File**: `src/tools/common/utils.ts`

**Functions to Extract**:
```typescript
// formatError (from 8 different files)
export function formatError(operation: string, error: unknown): MCPToolResponse {
  // Consolidated implementation
}

// Common response builders
export function buildSuccessResponse(data: unknown, metadata?: unknown): MCPToolResponse
export function buildErrorResponse(error: unknown, operation: string): MCPToolResponse

// Common helpers
export function validateCustomer(customer?: string): void
export function extractErrorMessage(error: unknown): string
```

**Target File**: `src/tools/common/validation.ts`

**Functions to Extract**:
```typescript
// From multiple files
export function isValidHostname(hostname: string): boolean
export function validateIPAddress(ip: string): boolean
export function validateGeoCode(code: string): boolean
export function validateASN(asn: string): boolean
export function validateUrls(urls: string[]): void
export function validateCpCodes(cpCodes: string[]): void
```

## Migration Steps

### Step 1: Create Common Utilities (Day 1-2)
```bash
# Create directory structure
mkdir -p src/tools/common
mkdir -p src/tools/property
mkdir -p src/tools/network-lists

# Create common files
touch src/tools/common/utils.ts
touch src/tools/common/validation.ts
touch src/tools/common/types.ts
```

### Step 2: Extract Common Functions (Day 3-4)
1. Move all `formatError` implementations to `common/utils.ts`
2. Move all validation functions to `common/validation.ts`
3. Update imports in all affected files
4. Run tests to ensure nothing breaks

### Step 3: Property Domain Consolidation (Week 2)
1. Create `property/property-core.ts`
2. Move and deduplicate functions
3. Update imports
4. Test each consolidated module
5. Mark old files as deprecated

### Step 4: Network Lists Consolidation (Week 3)
1. Create consolidated network-lists files
2. Merge functionality
3. Test thoroughly
4. Update documentation

### Step 5: Cleanup (Week 4)
1. Remove deprecated files
2. Update all imports
3. Run full test suite
4. Update documentation

## Testing Strategy

### Unit Tests Required
- Test each consolidated function
- Ensure backwards compatibility
- Verify no functionality lost

### Integration Tests Required
- Test tool definitions still work
- Test MCP server can find all tools
- Test customer parameter handling

### Regression Tests
- Run existing test suite
- Add new tests for consolidated modules
- Performance benchmarks

## Rollback Strategy

1. Keep all original files with `.deprecated` suffix
2. Use feature branches for each domain
3. Tag releases before major changes
4. Maintain import maps for gradual migration

## Success Criteria

- [ ] All tests passing (100%)
- [ ] Code duplication < 5%
- [ ] File count reduced by 40%
- [ ] Build time improved by 15%
- [ ] No breaking changes to API
- [ ] Documentation updated
- [ ] Team trained on new structure