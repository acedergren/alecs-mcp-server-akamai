# TypeScript Type Safety Quick Fixes

## Summary
- Starting errors: 417
- Current errors: 402 
- Fixed: 15 errors (3.6% improvement)

## Fixes Applied

### 1. property-manager.ts Type Casts
Added type casts for API responses to fix "response is of type 'unknown'" errors:

```typescript
// Before:
const response = await client.request({ path: '...' });

// After:
const response = await client.request({ path: '...' }) as PropertyListResponse;
```

Fixed responses:
- `/papi/v1/properties/${propertyId}/activations` → ActivationListResponse
- `/papi/v1/properties/${propertyId}/versions/${version}/hostnames` → HostnameListResponse
- `/papi/v1/contracts` → ContractListResponse

### 2. Removed Unused Import
- Removed unused `ProgressManager` import from property-manager.ts

## Quick Fix Strategy for Remaining Errors

### Priority 1: Type Cast Unknown Responses
Search for `error TS18046: 'response' is of type 'unknown'` and add appropriate type casts:

```bash
# Find all unknown response errors
npx tsc --noEmit 2>&1 | grep "18046.*response.*unknown" | head -20
```

Common patterns:
- PropertyListResponse - for `/papi/v1/properties`
- GroupListResponse - for `/papi/v1/groups`
- ProductListResponse - for `/papi/v1/products`
- CpCodeListResponse - for `/papi/v1/cpcodes`

### Priority 2: Index Signature Access (TS4111)
Replace dot notation with bracket notation:

```typescript
// Before:
queryParams.contractId = args.contractId;

// After:
queryParams['contractId'] = args.contractId;
```

### Priority 3: Optional Property Assignment (TS2375/TS2379)
Handle undefined values properly:

```typescript
// Before:
const options = {
  validateRules: args.validateRules, // could be undefined
};

// After:
const options: { validateRules?: boolean } = {};
if (args.validateRules !== undefined) {
  options.validateRules = args.validateRules;
}
```

## Emergency Escape Hatches

If stuck on a complex error:

```typescript
// Quick fix 1: Type assertion
const response = await client.request(...) as any;

// Quick fix 2: Ignore line
// @ts-ignore
const value = response.unknownProperty;

// Quick fix 3: Use any temporarily with TODO
const data: any = response; // TODO: Add proper types
```

## Next Steps

1. Continue fixing `property-manager.ts` (still has ~35 errors)
2. Fix `property-manager-tools.ts` (35 errors)
3. Fix `dns-tools.ts` (29 errors)
4. Focus on files actually used in production

Remember: Working code > Perfect types!