# Cache Invalidation Analysis Report

## Executive Summary

After analyzing the codebase, I found that **mutation operations do NOT properly invalidate cache entries**. The `AkamaiCacheService` has cache invalidation methods, but they are not being called by any mutation operations. This creates a significant risk of serving stale data after resources are modified.

## Current State

### Cache Service Capabilities
The `AkamaiCacheService` (located at `src/services/akamai-cache-service.ts`) provides:
- `invalidateProperty(propertyId, customer)` - Clears property-related cache entries
- `clearCache()` - Clears all cache entries
- `scanAndDelete(pattern)` - Deletes cache entries matching a pattern

### Cache Usage
Currently, only the `universal-search-with-cache.ts` tool uses the cache service for reading operations. No mutation operations use the cache service for invalidation.

## Mutation Operations Missing Cache Invalidation

### 1. Property Management Operations

#### File: `src/tools/property-manager-tools.ts`
- ❌ `createPropertyVersion` (line 135) - Creates new property version
- ❌ `updatePropertyRules` (line 439) - Updates property configuration
- ❌ `addPropertyHostname` (line 721) - Adds hostname to property
- ❌ `removePropertyHostname` (line 828) - Removes hostname from property
- ❌ `activateProperty` (line 953) - Activates property version

#### File: `src/tools/property-tools.ts`
- ❌ `createProperty` (line 1676) - Creates new property

#### File: `src/tools/property-manager.ts`
- ❌ `createProperty` (line 438) - Creates new property
- ❌ `createPropertyVersion` (line 558) - Creates new version
- ❌ `removeProperty` (line 524) - Deletes property
- ❌ `cloneProperty` (line 2485) - Clones existing property

#### File: `src/tools/property-manager-advanced-tools.ts`
- ❌ `cloneProperty` (line 298) - Advanced property cloning
- ❌ `removeProperty` (line 417) - Property deletion

### 2. DNS Operations

#### File: `src/tools/dns-tools.ts`
- ❌ `createZone` - Creates DNS zone
- ❌ `upsertRecord` - Creates/updates DNS record
- ❌ `deleteRecord` - Deletes DNS record
- ❌ `activateZoneChanges` - Activates DNS changes

#### File: `src/tools/dns-operations-priority.ts`
- ❌ DNS mutation operations without cache invalidation

### 3. Certificate Operations

#### File: `src/tools/cps-tools.ts`
- ❌ `createEnrollment` - Creates certificate enrollment
- ❌ `updateEnrollment` - Updates certificate
- ❌ `deleteCertificate` - Deletes certificate

### 4. Other Operations

#### File: `src/tools/edge-hostname-management.ts`
- ❌ `createEdgeHostname` - Creates edge hostname

#### File: `src/tools/cpcode-tools.ts`
- ❌ `createCPCode` - Creates CP code

#### File: `src/tools/security/network-lists-tools.ts`
- ❌ Network list mutation operations

## Impact Analysis

### Critical Issues
1. **Stale Search Results**: After creating/updating properties, hostnames, or DNS records, the universal search tool will return outdated results from cache
2. **Incorrect Property Details**: Property version changes won't be reflected in cached property details
3. **Missing Hostnames**: Added/removed hostnames won't appear in cached results
4. **Activation Status Confusion**: Activated properties may show old activation status

### Affected Cache Keys
Based on the cache service implementation, these cache keys need invalidation:
- `{customer}:property:{propertyId}` - Property details
- `{customer}:property:{propertyId}:hostnames` - Property hostnames
- `{customer}:property:{propertyId}:rules:*` - Property rules
- `{customer}:properties:all` - All properties list
- `{customer}:hostname:map` - Hostname mapping
- `{customer}:hostname:{hostname}` - Individual hostname entries
- `{customer}:search:*` - Search results

## Recommendations

### 1. Immediate Actions Needed

#### A. Inject Cache Service into Tool Handlers
The cache service needs to be made available to all mutation tools. Options:
1. Pass cache service as a parameter to tool handlers
2. Create a singleton cache service instance
3. Add cache service to the AkamaiClient

#### B. Add Cache Invalidation to Each Mutation

Example implementation for `createPropertyVersion`:
```typescript
export async function createPropertyVersion(
  client: AkamaiClient,
  args: { propertyId: string; /* ... */ },
  cacheService?: AkamaiCacheService
): Promise<MCPToolResponse> {
  try {
    // ... existing code ...
    
    // After successful creation
    if (cacheService) {
      await cacheService.invalidateProperty(args.propertyId, args.customer || 'default');
    }
    
    // ... return response ...
  } catch (error) {
    // ... error handling ...
  }
}
```

### 2. Implementation Priority

1. **High Priority** (affects search and common operations):
   - `createProperty`
   - `updatePropertyRules`
   - `addPropertyHostname`
   - `removePropertyHostname`
   - `activateProperty`
   - `createPropertyVersion`

2. **Medium Priority** (less frequent operations):
   - `cloneProperty`
   - `removeProperty`
   - DNS operations
   - Certificate operations

3. **Low Priority** (rarely affects cached data):
   - CP code operations
   - Network list operations

### 3. Additional Cache Methods Needed

The current `invalidateProperty` method is good for property operations, but we need:
- `invalidateDNSZone(zoneId, customer)` - For DNS mutations
- `invalidateCertificate(enrollmentId, customer)` - For certificate mutations
- `invalidateHostname(hostname, customer)` - For hostname-specific changes

### 4. Testing Strategy

1. Create integration tests that:
   - Perform a search operation (populating cache)
   - Execute a mutation operation
   - Verify cache was invalidated by searching again

2. Add cache metrics logging to track:
   - Cache invalidation calls
   - Cache hit/miss ratios before and after mutations

## Conclusion

The lack of cache invalidation in mutation operations is a critical issue that will lead to data inconsistency. The cache service infrastructure exists but is not being utilized by mutation operations. Implementing proper cache invalidation is essential for maintaining data integrity in the system.