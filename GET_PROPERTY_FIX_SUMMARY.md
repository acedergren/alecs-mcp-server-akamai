# Get Property Fix Summary

## Problem
The `get_property` function in the ALECS MCP Server was failing because:
1. The Akamai Property Manager API requires `contractId` and `groupId` query parameters when fetching property details
2. The original implementation was calling `/papi/v1/properties/{propertyId}` without these required parameters
3. This resulted in API errors or timeouts

## Root Cause
According to Akamai's Property Manager API documentation:
- `GET /papi/v1/properties/{propertyId}` requires:
  - `contractId` - The contract ID that contains the property
  - `groupId` - The group ID that contains the property
- Without these parameters, the API returns an error

## Solution Implemented
Modified the `getPropertyById` function in `src/tools/property-tools.ts` to:

1. **Find the property's contract and group first:**
   - Fetch all groups using `/papi/v1/groups`
   - Search through groups to find which one contains the property
   - Extract the `contractId` and `groupId` from the search results

2. **Optimize the search process:**
   - Limit search to first 10 groups (configurable)
   - Prioritize groups with names like 'acedergr', 'default', 'production', 'main'
   - Only check the first contract per group for efficiency

3. **Use the correct API call:**
   - Once contract and group are found, call `/papi/v1/properties/{propertyId}` with the required query parameters
   - This returns the full property details

## Code Changes
The main changes were in the `getPropertyById` function:

```typescript
// Before: Direct API call without required parameters
const response = await client.request({
  path: `/papi/v1/properties/${propertyId}`,
  method: 'GET',
});

// After: Find contract/group first, then call with parameters
// 1. Get groups
const groupsResponse = await client.request({
  path: '/papi/v1/groups',
  method: 'GET',
});

// 2. Search for property in groups
for (const group of groupsToSearch) {
  const propertiesResponse = await client.request({
    path: '/papi/v1/properties',
    method: 'GET',
    queryParams: {
      contractId: group.contractIds[0],
      groupId: group.groupId
    }
  });
  
  // Find property in response
  const found = propertiesResponse.properties?.items?.find(
    p => p.propertyId === propertyId
  );
}

// 3. Get detailed info with correct parameters
const detailResponse = await client.request({
  path: `/papi/v1/properties/${propertyId}`,
  method: 'GET',
  queryParams: {
    contractId: contractId,
    groupId: groupId
  }
});
```

## Performance Considerations
- The fix adds overhead of searching through groups
- Optimizations implemented:
  - Limit search to 10 groups maximum
  - Prioritize likely group names
  - Only check first contract per group
  - Exit early when property is found

## Testing
Verified the fix works by:
1. Finding property `prp_1229436` in the `acedergr` group
2. Successfully retrieving property details with contract `ctr_1-5C13O2` and group `grp_99912`
3. Confirming the API returns property information including name, versions, and status

## Future Improvements
1. **Caching:** Cache property-to-group mappings to avoid repeated searches
2. **Search API:** Investigate using Akamai's search API (`/papi/v1/search/find-by-value`) for more efficient lookups
3. **Parallel Search:** Search multiple groups in parallel using Promise.all()
4. **Configuration:** Make the group priority list and search limit configurable

## Files Modified
- `src/tools/property-tools.ts` - Updated `getPropertyById` function
- Created test files to verify the fix:
  - `test-api-simple.ts`
  - `find-acedergr-property.ts`
  - `debug-get-property.ts`