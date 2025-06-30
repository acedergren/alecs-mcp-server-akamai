# CODE KAI PRINCIPLES
## Micro-Focused API Integration Methodology

> **CODE KAI** = **C**ode **O**perational **D**efense **E**ngineering - **K**aizen **A**PI **I**ntegration  
> **Philosophy**: One function, one API endpoint, one perfect implementation

---

## 🎯 **CORE PRINCIPLES**

### **1. MICRO-PRECISION SCOPE**
- **One Function**: Focus on a single tool function per work session
- **One Endpoint**: Map function to exactly one Akamai API endpoint  
- **One Perfect Result**: Achieve complete type safety and validation
- **Context Window Optimization**: Each section fits within single Claude context

### **2. DOCUMENTATION-DRIVEN DEVELOPMENT**
- **Official API Docs First**: Always start with official Akamai API documentation
- **Exact Response Mapping**: TypeScript interfaces must match documented API responses
- **No Assumptions**: Validate every field, type, and optional property
- **API-First Design**: Implementation follows API specification exactly

### **3. TYPE SAFETY OBSESSION**
- **Zero `any` Types**: Eliminate all unknown/any types with precise interfaces
- **Runtime Validation**: Add type guards for API response validation
- **Null Safety**: Handle all nullable fields explicitly
- **Enum Enforcement**: Use literal types for constrained values

### **4. DEFENSIVE ERROR HANDLING**
- **API Error Categorization**: Map all documented error codes to user-friendly messages
- **Input Validation**: Validate all parameters before API calls
- **Network Resilience**: Handle timeouts, rate limits, and connection failures
- **User Guidance**: Provide actionable error messages with next steps

### **5. SYSTEMATIC VALIDATION**
- **Live API Testing**: Every implementation must pass real API test
- **Type Compilation**: Zero TypeScript errors required
- **Response Structure**: Validate actual API responses match type definitions
- **Edge Case Coverage**: Test error conditions and boundary values

---

## 🔧 **IMPLEMENTATION METHODOLOGY**

### **PHASE 1: RESEARCH & ANALYSIS (10 minutes)**
```bash
# 1. Extract current implementation
grep -A 30 "functionName" src/tools/[tool]-tools.ts

# 2. Study official Akamai documentation
# URL: https://techdocs.akamai.com/[service]/reference/[endpoint]

# 3. Document current issues
# - Unknown types
# - Missing validation  
# - Error handling gaps
```

### **PHASE 2: TYPE DEFINITION (15 minutes)**
```typescript
// Create: src/types/api-responses/[service]-[feature].ts

interface [Service][Feature]Response {
  // Map every field from official API docs
  field1: string;
  field2?: number | null;  // Handle optional/nullable fields
  field3: 'VALUE1' | 'VALUE2';  // Use literal types for enums
}

// Create type guards for runtime validation
export function is[Service][Feature]Response(obj: unknown): obj is [Service][Feature]Response {
  return obj !== null && 
         typeof obj === 'object' &&
         'field1' in obj &&
         typeof (obj as any).field1 === 'string';
}
```

### **PHASE 3: IMPLEMENTATION (20 minutes)**
```typescript
import { [Service][Feature]Response, is[Service][Feature]Response } from '../types/api-responses/[service]-[feature]';

export async function [functionName](
  client: AkamaiClient,
  args: { /* typed parameters */ }
): Promise<MCPToolResponse> {
  try {
    // 1. Parameter validation
    if (!args.requiredParam) {
      throw new Error('Missing required parameter: requiredParam');
    }

    // 2. API call with exact endpoint from docs
    const rawResponse = await client.request({
      path: '/api/v1/exact-endpoint',  // From official docs
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      queryParams: buildQueryParams(args)
    });

    // 3. Type-safe validation
    if (!is[Service][Feature]Response(rawResponse)) {
      throw new Error('Invalid API response structure');
    }

    const typedResponse = rawResponse as [Service][Feature]Response;

    // 4. Format response for MCP
    return {
      content: [{ 
        type: 'text', 
        text: formatResponse(typedResponse) 
      }]
    };

  } catch (error) {
    return handleSpecificError(error, '[operation context]');
  }
}
```

### **PHASE 4: TESTING & VALIDATION (10 minutes)**
```bash
# 1. TypeScript compilation
npm run typecheck

# 2. Live API test
echo '{
  "jsonrpc": "2.0", 
  "id": 1, 
  "method": "tools/call", 
  "params": {
    "name": "[tool-name]", 
    "arguments": { "test": "parameters" }
  }
}' | node dist/index.js

# 3. Verify response structure matches types
# 4. Test error conditions
```

---

## 📊 **QUALITY GATES**

### **COMPLETION CRITERIA**
- [ ] **TypeScript**: Zero compilation errors
- [ ] **API Test**: Live API call returns expected data
- [ ] **Type Validation**: Response structure matches interface
- [ ] **Error Handling**: All documented error codes handled
- [ ] **Documentation**: Function has comprehensive JSDoc

### **ANTI-PATTERNS TO AVOID**
- ❌ Using `any` or `unknown` types without validation
- ❌ Direct type casting `as Type` without guards
- ❌ Ignoring optional/nullable fields in API responses
- ❌ Generic error messages without user guidance
- ❌ Skipping live API validation tests

### **SUCCESS INDICATORS**
- ✅ Function compiles with strict TypeScript
- ✅ Live API test passes consistently
- ✅ Error messages provide actionable guidance
- ✅ Type definitions match actual API responses
- ✅ Implementation handles all edge cases

---

## 🎯 **SECTION STRUCTURE TEMPLATE**

```markdown
## SECTION [N]: [FUNCTION_NAME]

### **API MAPPING**
- **Function**: `[functionName]()` in `src/tools/[service]-tools.ts`
- **Endpoint**: `[METHOD] /api/v1/endpoint`
- **Documentation**: https://techdocs.akamai.com/[service]/reference/[endpoint]

### **CURRENT ISSUES**
```typescript
// PROBLEM: Identify specific type safety issues
const response = await client.request(config);
// response is 'unknown' - no type safety
```

### **API DOCUMENTATION ANALYSIS**
```json
// Official response structure from Akamai docs
{
  "field1": "value",
  "field2": 123,
  "field3": ["array", "values"]
}
```

### **PRECISE TYPE DEFINITION**
```typescript
interface [Service][Feature]Response {
  field1: string;
  field2: number;
  field3: string[];
}
```

### **IMPLEMENTATION FIX**
```typescript
// Complete implementation with type safety
```

### **SUCCESS VALIDATION**
- [ ] TypeScript compilation: 0 errors
- [ ] Live API test: Pass
- [ ] Response validation: Match types
- [ ] Error handling: Complete
```

---

## 🚀 **WORKFLOW EXECUTION**

### **PER-SESSION FOCUS**
1. **Single Tool**: Work on one tool file at a time
2. **Single Function**: Complete one function per session
3. **Complete Implementation**: Don't leave partial work
4. **Immediate Testing**: Validate with live API calls

### **PROGRESS TRACKING**
```markdown
## CODE KAI Progress Dashboard
### DNS Tools (7 functions)
- ✅ **listZones()** - COMPLETED - GET /edge-dns/v1/zones
- 🔄 **createZone()** - IN PROGRESS - POST /edge-dns/v1/zones  
- ⏳ **listRecords()** - PENDING - GET /edge-dns/v1/zones/{id}/records

### Property Tools (12 functions)  
- ✅ **listProperties()** - COMPLETED - GET /papi/v1/properties
- ✅ **getProperty()** - COMPLETED - GET /papi/v1/properties/{id}
- [Continue tracking...]
```

### **DAILY TARGETS**
- **2-4 Sections**: Complete 2-4 functions per day
- **1-2 Tools**: Finish 1-2 complete tool files per day
- **Quality Over Speed**: Perfect implementation over rushed delivery

---

## 🎯 **IMMEDIATE APPLICATION**

**NEXT FOCUS**: DNS-TOOLS SECTION 1 - listZones()

Apply CODE KAI principles to transform the current `listZones()` implementation:
1. Research official Edge DNS API documentation
2. Create precise `EdgeDnsZoneListResponse` interface  
3. Replace `as EdgeDNSZonesResponse` cast with type-safe validation
4. Test with live API call to verify implementation

**Expected Outcome**: One perfectly typed, validated, tested DNS function ready for production use.

---

*CODE KAI ensures every function becomes a surgical precision implementation - no shortcuts, no assumptions, no compromises on type safety or API compliance.*