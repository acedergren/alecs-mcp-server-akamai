# Property Tools Deletion Plan

## Tools to Delete

### 1. searchProperties Functions
Found in multiple files - all download entire property list then filter client-side:
- `src/tools/property-manager-advanced-tools.ts` - searchProperties
- `src/tools/property-manager.ts` - searchProperties  
- `src/tools/property-operations-advanced.ts` - searchPropertiesAdvanced
- `src/tools/property-search-optimized.ts` - searchPropertiesOptimized

**Action**: Delete these functions and update imports/exports

### 2. listAllHostnames Function
Found in:
- `src/tools/property-manager-advanced-tools.ts`

**Action**: Delete this O(N) operation

### 3. Certificate Update Functions
Found in:
- `src/tools/property-manager-tools.ts`
  - updatePropertyWithDefaultDV
  - updatePropertyWithCPSCertificate

**Action**: Delete or rewrite with proper CPS API

## Files to Update

### 1. src/tools/all-tools-registry.ts
Remove registrations for:
- searchProperties (line 44, 657)
- searchPropertiesAdvanced (line 214, 663)
- listAllHostnames (line 49)

### 2. src/servers/property-server.ts
Remove or replace:
- searchPropertiesOptimized import and usage (line 60, 1062-1075)

### 3. Import cleanup in various files

## Replacement Strategy

Use `universalSearchWithCacheHandler` which is already implemented and provides:
- Proper caching mechanism
- Efficient search without downloading all properties
- Better performance

## Implementation Steps

1. **Phase 1**: Remove functions from source files
2. **Phase 2**: Update all-tools-registry.ts
3. **Phase 3**: Update server files
4. **Phase 4**: Run tests and fix any breaking changes
5. **Phase 5**: Update documentation