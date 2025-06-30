# Property Manager TypeScript Kaizen Fix Examples

This document provides concrete, actionable fixes for each error category identified in the audit, following the Kaizen principle of continuous, incremental improvements.

## Quick Fix Reference

### 1. Unknown Type Access Pattern Fix

**Before (Error):**
```typescript
const response = await client.makeRequest(config);
console.log(response.data); // TS18046: 'response' is of type 'unknown'
```

**After (Fixed):**
```typescript
// Step 1: Import type guard
import { isPropertyResponse } from '../utils/type-guards';

// Step 2: Validate response
const response = await client.makeRequest(config);
if (!isPropertyResponse(response)) {
  throw new Error(`Invalid property response: ${JSON.stringify(response)}`);
}

// Step 3: Safe access
console.log(response.data);
```

### 2. Index Signature Access Pattern Fix

**Before (Error):**
```typescript
params.hostname = 'example.com'; // TS4111: Property comes from index signature
```

**After (Fixed):**
```typescript
params['hostname'] = 'example.com'; // Use bracket notation
```

**Batch Fix Script:**
```bash
# Find and replace all index signature violations
find src/tools -name "property-*.ts" -exec sed -i '' \
  -e 's/params\.hostname/params["hostname"]/g' \
  -e 's/response\.versions/response["versions"]/g' \
  -e 's/response\.items/response["items"]/g' \
  {} \;
```

### 3. Exact Optional Properties Pattern Fix

**Before (Error):**
```typescript
const config = {
  customer: args.customer, // Could be undefined
  autoActivate: true
}; // TS2379: Consider adding 'undefined' to the target's properties
```

**After (Fixed - Option 1: Filter Pattern):**
```typescript
const config = {
  ...(args.customer !== undefined && { customer: args.customer }),
  autoActivate: true
};
```

**After (Fixed - Option 2: Utility Function):**
```typescript
// Create utility function
function compactObject<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key as keyof T] = value;
    }
    return acc;
  }, {} as Partial<T>);
}

// Use it
const config = compactObject({
  customer: args.customer,
  autoActivate: true
});
```

### 4. Import Conflict Pattern Fix

**Before (Error):**
```typescript
import { ActivationStatus } from '../types/local';
import { ActivationStatus } from '../types/api-responses/papi-official';
// TS2440: Import declaration conflicts
```

**After (Fixed):**
```typescript
import { ActivationStatus as LocalActivationStatus } from '../types/local';
import { ActivationStatus as PapiActivationStatus } from '../types/api-responses/papi-official';

// Use with clarity
type MergedActivationStatus = LocalActivationStatus | PapiActivationStatus;
```

### 5. Type Guard Implementation Pattern

**Create type-guards.ts:**
```typescript
import { z } from 'zod';

// Define schemas for runtime validation
const PropertyResponseSchema = z.object({
  propertyId: z.string(),
  propertyName: z.string(),
  version: z.number(),
  data: z.unknown()
});

export type PropertyResponse = z.infer<typeof PropertyResponseSchema>;

// Type guard function
export function isPropertyResponse(value: unknown): value is PropertyResponse {
  try {
    PropertyResponseSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

// Batch type guards for common responses
export const ResponseGuards = {
  isPropertyResponse,
  isVersionResponse: (value: unknown): value is VersionResponse => {
    return VersionResponseSchema.safeParse(value).success;
  },
  isActivationResponse: (value: unknown): value is ActivationResponse => {
    return ActivationResponseSchema.safeParse(value).success;
  }
};
```

## File-Specific Kaizen Fixes

### property-manager.ts (35 errors)

**Key Fix 1: ProgressManager Method**
```typescript
// Add missing method to ProgressManager class
class ProgressManager {
  updateProgress(token: string, progress: number, message?: string): void {
    // Implementation
    this.progressMap.set(token, { progress, message, timestamp: Date.now() });
  }
}
```

**Key Fix 2: API Response Validation**
```typescript
// Before
const response = await this.makeRequest(config);
const property = response.property; // Error: unknown type

// After
const response = await this.makeRequest(config);
if (!isPropertyDetailsResponse(response)) {
  throw new Error('Invalid property details response');
}
const property = response.property; // Type safe!
```

### property-search-optimized.ts (21 errors)

**Batch Fix for Unknown Types:**
```typescript
// Create a response handler utility
async function handleApiResponse<T>(
  promise: Promise<unknown>,
  guard: (value: unknown) => value is T,
  errorMessage: string
): Promise<T> {
  const response = await promise;
  if (!guard(response)) {
    throw new Error(errorMessage);
  }
  return response;
}

// Usage
const groupsResponse = await handleApiResponse(
  client.makeRequest({ path: '/groups' }),
  isGroupsResponse,
  'Invalid groups response'
);
```

### property-onboarding-tools.ts (10 errors)

**Fix ErrorContext Type:**
```typescript
// Define proper type
interface ErrorContext {
  operation: string;
  endpoint: string;
  apiType: 'papi' | 'dns' | 'cps';
  customer?: string; // Make optional at type level
}

// Use with filtering
const context: ErrorContext = {
  operation: 'property.create',
  endpoint: '/properties',
  apiType: 'papi',
  ...(args.customer && { customer: args.customer })
};
```

## Automated Fix Implementation

### Step 1: Create Fix Script
```typescript
// scripts/fix-property-typescript-errors.ts
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const fixes = [
  // Fix index signatures
  {
    pattern: /(\w+)\.(\w+)(\s*=)/g,
    replacement: (match: string, obj: string, prop: string, rest: string) => {
      const indexProps = ['hostname', 'versions', 'items', 'contractId'];
      if (indexProps.includes(prop)) {
        return `${obj}['${prop}']${rest}`;
      }
      return match;
    }
  },
  // Add more patterns...
];

async function fixPropertyFiles() {
  const files = await glob('src/tools/property-*.ts');
  
  for (const file of files) {
    let content = readFileSync(file, 'utf-8');
    
    for (const fix of fixes) {
      content = content.replace(fix.pattern, fix.replacement);
    }
    
    writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  }
}

fixPropertyFiles().catch(console.error);
```

### Step 2: Type Guard Module
```typescript
// src/utils/property-type-guards.ts
export * from './type-guards/property-response';
export * from './type-guards/version-response';
export * from './type-guards/activation-response';
export * from './type-guards/hostname-response';
```

### Step 3: Update tsconfig.json (Optional)
If you want to temporarily relax strictness while fixing:
```json
{
  "compilerOptions": {
    // Temporarily disable while fixing
    "exactOptionalPropertyTypes": false,
    "noPropertyAccessFromIndexSignature": false,
    // Keep these enabled
    "strict": true,
    "strictNullChecks": true
  }
}
```

## Testing Your Fixes

```bash
# Test individual file compilation
npx tsc src/tools/property-manager.ts --noEmit

# Test all property files
npx tsc src/tools/property-*.ts --noEmit

# Run with specific checks disabled (temporary)
npx tsc --noPropertyAccessFromIndexSignature false src/tools/property-*.ts --noEmit
```

## Continuous Improvement Checklist

- [ ] Phase 1: Fix all index signature access (1 day)
- [ ] Phase 2: Implement type guards for all API responses (2 days)
- [ ] Phase 3: Fix optional property handling (2 days)
- [ ] Phase 4: Resolve import conflicts (1 day)
- [ ] Phase 5: Clean up unused variables (1 day)
- [ ] Phase 6: Add unit tests for type guards (2 days)
- [ ] Phase 7: Update documentation (1 day)

## Success Validation

```bash
# Final validation command
npm run type-check && echo "✅ All TypeScript errors fixed!"
```