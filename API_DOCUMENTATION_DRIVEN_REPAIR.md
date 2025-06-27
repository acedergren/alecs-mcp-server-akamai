# API Documentation-Driven Tool Repair
## ALECS MCP Server - Precision Type Safety Implementation

> **Methodology**: One tool at a time, validate every API endpoint against official Akamai documentation to create precise TypeScript response definitions.

---

## 🎯 **REFINED CODE KAI APPROACH**

### **Phase 1: API Documentation Research**
1. **Identify All API Endpoints** used in the tool
2. **Research Official Akamai API Docs** for each endpoint
3. **Document Expected Response Structure** from official specs
4. **Create Precise TypeScript Interfaces** based on documentation
5. **Validate Current Implementation** against documented behavior

### **Phase 2: Type-Safe Implementation**
1. **Create Specific Response Types** (not generic `unknown`)
2. **Implement Endpoint-Specific Validation** 
3. **Add Parameter Validation** based on API requirements
4. **Update Error Handling** with API-documented error codes
5. **Test Against Real API** to verify response structure

### **Phase 3: Documentation & Testing**
1. **Document API Endpoint Mapping**
2. **Create Type-Safe Test Cases**
3. **Validate Response Structure** matches documentation
4. **Verify Error Scenarios** handle documented error codes

---

## 🔍 **TOOL ANALYSIS TEMPLATE**

### **Per-Tool Analysis Structure**
```markdown
## [TOOL_NAME] API Analysis

### API Endpoints Used:
1. **Endpoint**: `GET /papi/v1/properties`
   - **Documentation**: https://techdocs.akamai.com/property-mgr/reference/get-properties
   - **Parameters**: contractId (required), groupId (required)
   - **Response Structure**: 
     ```typescript
     interface PropertiesResponse {
       properties: {
         items: Array<{
           propertyId: string;
           propertyName: string;
           latestVersion: number;
           stagingVersion?: number;
           productionVersion?: number;
           // ... complete structure from docs
         }>;
       };
     }
     ```
   - **Error Codes**: 400, 403, 404, 500
   - **Current Implementation Issues**: Using `unknown` type, missing validation

2. **Endpoint**: `GET /papi/v1/groups`
   - **Documentation**: https://techdocs.akamai.com/property-mgr/reference/get-groups
   - **Response Structure**: [Define based on docs]
   - **Current Issues**: [Identify gaps]

### Implementation Plan:
- [ ] Create precise response interfaces
- [ ] Update API calls with proper typing
- [ ] Add parameter validation
- [ ] Test with real API
```

---

## 🚀 **EXECUTION PLAN: DNS Tools First**

### **TOOL 1: dns-tools.ts - API Documentation Analysis**

#### **Step 1: Research Phase (30 minutes)**
```bash
# Research all Edge DNS API endpoints used in dns-tools.ts
grep -n "client.request" src/tools/dns-tools.ts
grep -n "/edge-dns/" src/tools/dns-tools.ts
```

**Expected Endpoints:**
1. `GET /edge-dns/v1/zones` - List zones
2. `POST /edge-dns/v1/zones` - Create zone  
3. `GET /edge-dns/v1/zones/{zoneId}` - Get zone details
4. `POST /edge-dns/v1/zones/{zoneId}/dns_records` - Create DNS record
5. `DELETE /edge-dns/v1/zones/{zoneId}/dns_records/{recordId}` - Delete record

#### **Step 2: Documentation Research**
For each endpoint, research:
- **Official Akamai Docs**: https://techdocs.akamai.com/edge-dns/reference/
- **Request Parameters**: Required vs optional, validation rules
- **Response Structure**: Exact JSON schema
- **Error Codes**: Documented error responses
- **Rate Limits**: API constraints

#### **Step 3: Create Precise Types**
```typescript
// src/types/api-responses/edge-dns-precise.ts

/**
 * Edge DNS API Response Types
 * Based on official Akamai documentation: https://techdocs.akamai.com/edge-dns/reference/
 */

// Zone List Response - GET /edge-dns/v1/zones
interface EdgeDnsZoneListResponse {
  zones: Array<{
    zone: string;
    type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
    masters?: string[];
    comment?: string;
    signAndServe: boolean;
    signAndServeAlgorithm?: number;
    tsigKey?: {
      name: string;
      algorithm: string;
      secret: string;
    };
    target?: string;
    endCustomerId?: string;
    contractId: string;
    lastActivationDate?: string;
    activationState: 'PENDING' | 'ACTIVE' | 'FAILED';
    lastModifiedBy?: string;
    lastModifiedDate?: string;
    versionId?: string;
  }>;
}

// Zone Details Response - GET /edge-dns/v1/zones/{zoneId}
interface EdgeDnsZoneDetailsResponse {
  zone: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  masters?: string[];
  comment?: string;
  signAndServe: boolean;
  signAndServeAlgorithm?: number;
  // ... complete structure from official docs
}

// DNS Record Creation Response - POST /edge-dns/v1/zones/{zoneId}/dns_records
interface EdgeDnsRecordResponse {
  name: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA' | 'PTR';
  ttl: number;
  rdata: string[];
  recordId?: number;
}

// Error Response Structure
interface EdgeDnsErrorResponse {
  type: string;
  title: string;
  detail: string;
  instance?: string;
  status: number;
  errors?: Array<{
    type: string;
    title: string;
    detail: string;
  }>;
}
```

#### **Step 4: Update dns-tools.ts Implementation**
```typescript
// Apply precise types to each function

import { EdgeDnsZoneListResponse, EdgeDnsZoneDetailsResponse } from '../types/api-responses/edge-dns-precise';

export async function listZones(
  client: AkamaiClient,
  args: { contractId?: string }
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: '/edge-dns/v1/zones',
      method: 'GET',
      queryParams: args.contractId ? { contractId: args.contractId } : {}
    });

    // Precise type validation based on API documentation
    const typedResponse = response as EdgeDnsZoneListResponse;
    
    // Validate response structure matches documentation
    if (!typedResponse.zones || !Array.isArray(typedResponse.zones)) {
      throw new Error('Invalid API response: zones array missing');
    }

    // Continue with type-safe implementation...
  } catch (error) {
    // Handle documented error codes (400, 403, 404, 500)
    return handleEdgeDnsError(error);
  }
}
```

#### **Step 5: Live Testing & Validation**
```bash
# Test each endpoint with real API calls
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "list-zones", "arguments": {}}}' | node dist/index.js

# Verify response structure matches our TypeScript definitions
# Compare actual API response with our type definitions
```

---

## 📋 **SYSTEMATIC EXECUTION CHECKLIST**

### **Per-Tool Completion Criteria:**
- [ ] **API Research Complete**: All endpoints documented with official Akamai specs
- [ ] **Types Created**: Precise TypeScript interfaces for all responses  
- [ ] **Implementation Updated**: All `unknown` types replaced with specific interfaces
- [ ] **Error Handling**: API-documented error codes properly handled
- [ ] **Live Testing**: Real API calls validate response structure
- [ ] **Documentation**: API endpoint mapping documented

### **Quality Gates:**
1. **Type Safety**: Zero `unknown` or `any` types in API responses
2. **API Compliance**: Response structure matches official documentation
3. **Error Handling**: All documented error codes handled appropriately
4. **Live Validation**: Real API calls succeed with expected response structure

---

## 🎯 **IMMEDIATE NEXT STEPS**

### **DNS Tools Deep Dive - Start Now**

1. **Research Phase** (Next 30 minutes):
   ```bash
   # Extract all API endpoints from dns-tools.ts
   grep -A 5 -B 5 "client.request" src/tools/dns-tools.ts
   
   # Research official Akamai Edge DNS documentation
   # Document each endpoint's expected response structure
   ```

2. **Type Creation** (Next 60 minutes):
   - Create `src/types/api-responses/edge-dns-precise.ts`
   - Define exact interfaces based on API documentation
   - Include all documented fields and their types

3. **Implementation Update** (Next 90 minutes):
   - Update each function in dns-tools.ts
   - Apply precise type validation
   - Replace generic error handling with API-specific errors

4. **Live Testing** (Next 30 minutes):
   - Test each DNS operation with real API calls
   - Verify response structure matches our type definitions
   - Validate error scenarios

**Total Time Investment**: ~3 hours for complete DNS tools transformation

This approach ensures **precision over speed** - each tool becomes a **perfectly typed, API-compliant, thoroughly tested** implementation rather than a quick fix.

---

## 🔄 **ITERATIVE IMPROVEMENT**

After DNS tools completion:
1. **Apply same methodology** to next highest priority tool
2. **Refine process** based on lessons learned  
3. **Build library** of precise API response types
4. **Create reusable patterns** for API validation

This systematic approach creates a **foundation of precise, documented, type-safe API integrations** that will serve as the gold standard for the entire codebase.