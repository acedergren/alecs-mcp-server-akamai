# MICRO-FOCUSED API REPAIR PLAN
## One Function → One Akamai API Endpoint → One Perfect Implementation

> **Principle**: Each section focuses on a single tool function mapped to one specific Akamai API endpoint with precise documentation validation.

---

## 🎯 **METHODOLOGY: MICRO-PRECISION APPROACH**

### **Section Structure**
```
SECTION [N]: [TOOL_FUNCTION_NAME]
├── Akamai API Endpoint: [EXACT_ENDPOINT]
├── Official Documentation: [AKAMAI_DOCS_URL]
├── Current Implementation Issues: [SPECIFIC_PROBLEMS]
├── Precise Type Definition: [TYPESCRIPT_INTERFACE]
├── Implementation Fix: [CODE_CHANGES]
├── Test Validation: [LIVE_API_TEST]
└── Success Criteria: [MEASURABLE_OUTCOMES]
```

### **Work Session Scope**
- **Duration**: 30-60 minutes per section
- **Focus**: Single function only
- **Output**: One perfect, type-safe, tested function
- **Validation**: Live API call confirms implementation

---

## 📊 **SECTION BREAKDOWN: DNS TOOLS**

### **SECTION 1: DNS Zone Listing**
- **Function**: `listZones()` in `src/tools/dns-tools.ts`
- **API Endpoint**: `GET /edge-dns/v1/zones`
- **Documentation**: https://techdocs.akamai.com/edge-dns/reference/get-zones
- **Scope**: List all DNS zones for account

#### **Current Issues**
```typescript
// PROBLEM: Generic unknown type, no validation
const response = await client.request({
  path: '/edge-dns/v1/zones',
  method: 'GET'
});
// response is type 'unknown' - no type safety
```

#### **API Documentation Analysis**
```json
// Official Response Structure from Akamai Docs
{
  "zones": [
    {
      "zone": "example.com",
      "type": "PRIMARY",
      "masters": [],
      "comment": "Primary zone for example.com",
      "signAndServe": false,
      "signAndServeAlgorithm": null,
      "tsigKey": null,
      "target": null,
      "endCustomerId": "12345",
      "contractId": "ctr_C-1234567",
      "lastActivationDate": "2024-01-15T10:30:00Z",
      "activationState": "ACTIVE",
      "lastModifiedBy": "user@example.com",
      "lastModifiedDate": "2024-01-15T10:30:00Z",
      "versionId": "v1.0"
    }
  ]
}
```

#### **Precise Type Definition**
```typescript
// src/types/api-responses/edge-dns-zones.ts
interface EdgeDnsZone {
  zone: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  masters?: string[];
  comment?: string;
  signAndServe: boolean;
  signAndServeAlgorithm?: number | null;
  tsigKey?: {
    name: string;
    algorithm: string;
    secret: string;
  } | null;
  target?: string | null;
  endCustomerId?: string;
  contractId: string;
  lastActivationDate?: string;
  activationState: 'PENDING' | 'ACTIVE' | 'FAILED';
  lastModifiedBy?: string;
  lastModifiedDate?: string;
  versionId?: string;
}

interface EdgeDnsZoneListResponse {
  zones: EdgeDnsZone[];
}
```

#### **Implementation Fix**
```typescript
import { EdgeDnsZoneListResponse } from '../types/api-responses/edge-dns-zones';

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

    // PRECISION: Type-safe validation against documented structure
    const typedResponse = response as EdgeDnsZoneListResponse;
    
    if (!typedResponse.zones || !Array.isArray(typedResponse.zones)) {
      throw new Error('Invalid API response: zones array missing');
    }

    // Format response for MCP
    let output = `# DNS Zones (${typedResponse.zones.length} found)\n\n`;
    
    typedResponse.zones.forEach(zone => {
      output += `## ${zone.zone}\n`;
      output += `- **Type**: ${zone.type}\n`;
      output += `- **Status**: ${zone.activationState}\n`;
      output += `- **Contract**: ${zone.contractId}\n`;
      if (zone.comment) output += `- **Comment**: ${zone.comment}\n`;
      output += '\n';
    });

    return {
      content: [{ type: 'text', text: output }]
    };
  } catch (error) {
    return handleEdgeDnsError(error, 'list zones');
  }
}
```

#### **Test Validation**
```bash
# Live API Test
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "list-zones", "arguments": {}}}' | node dist/index.js

# Expected: Successfully returns zones with proper typing
# Verify: Response structure matches EdgeDnsZoneListResponse
```

#### **Success Criteria**
- [ ] TypeScript compilation with zero errors
- [ ] Live API call returns expected zone data
- [ ] Response structure matches documented API format
- [ ] Error handling covers documented error codes (400, 403, 404)

---

### **SECTION 2: DNS Zone Creation**
- **Function**: `createZone()` in `src/tools/dns-tools.ts`
- **API Endpoint**: `POST /edge-dns/v1/zones`
- **Documentation**: https://techdocs.akamai.com/edge-dns/reference/post-zones

#### **API Documentation Analysis**
```json
// Request Body Structure
{
  "zone": "newexample.com",
  "type": "PRIMARY",
  "masters": [],
  "comment": "New primary zone",
  "signAndServe": false,
  "endCustomerId": "12345",
  "contractId": "ctr_C-1234567"
}

// Response Structure  
{
  "zone": "newexample.com",
  "type": "PRIMARY",
  "activationState": "PENDING",
  "lastModifiedDate": "2024-01-15T10:35:00Z"
}
```

#### **Precise Type Definition**
```typescript
interface EdgeDnsZoneCreateRequest {
  zone: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  masters?: string[];
  comment?: string;
  signAndServe?: boolean;
  endCustomerId?: string;
  contractId: string;
  target?: string; // For ALIAS zones
}

interface EdgeDnsZoneCreateResponse {
  zone: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  activationState: 'PENDING' | 'ACTIVE' | 'FAILED';
  lastModifiedDate: string;
  versionId?: string;
}
```

#### **Implementation & Testing**
[Similar detailed structure for zone creation]

---

### **SECTION 3: DNS Record Creation**
- **Function**: `createRecord()` in `src/tools/dns-tools.ts`
- **API Endpoint**: `POST /edge-dns/v1/zones/{zoneId}/dns_records`
- **Documentation**: https://techdocs.akamai.com/edge-dns/reference/post-zones-zoneid-dns-records

#### **API Documentation Analysis**
```json
// Request Body Structure
{
  "name": "www",
  "type": "A",
  "ttl": 3600,
  "rdata": ["192.168.1.1"]
}

// Response Structure
{
  "name": "www.example.com",
  "type": "A", 
  "ttl": 3600,
  "rdata": ["192.168.1.1"],
  "recordId": 123456
}
```

[Continue with detailed implementation...]

---

## 🗂️ **COMPLETE SECTION INVENTORY**

### **DNS TOOLS (7 Sections)**
1. ✅ **SECTION 1**: `listZones()` → `GET /edge-dns/v1/zones`
2. **SECTION 2**: `createZone()` → `POST /edge-dns/v1/zones`
3. **SECTION 3**: `createRecord()` → `POST /edge-dns/v1/zones/{zoneId}/dns_records`
4. **SECTION 4**: `deleteRecord()` → `DELETE /edge-dns/v1/zones/{zoneId}/dns_records/{recordId}`
5. **SECTION 5**: `getZone()` → `GET /edge-dns/v1/zones/{zoneId}`
6. **SECTION 6**: `activateZoneChanges()` → `POST /edge-dns/v1/zones/{zoneId}/activate`
7. **SECTION 7**: `listRecords()` → `GET /edge-dns/v1/zones/{zoneId}/dns_records`

### **PROPERTY TOOLS (12 Sections)**
8. **SECTION 8**: `listProperties()` → `GET /papi/v1/properties`
9. **SECTION 9**: `getProperty()` → `GET /papi/v1/properties/{propertyId}`
10. **SECTION 10**: `createProperty()` → `POST /papi/v1/properties`
11. **SECTION 11**: `listContracts()` → `GET /papi/v1/contracts`
12. **SECTION 12**: `listGroups()` → `GET /papi/v1/groups`
13. [Continue mapping each function...]

### **NETWORK LISTS TOOLS (8 Sections)**
20. **SECTION 20**: `listNetworkLists()` → `GET /network-list/v2/network-lists`
21. **SECTION 21**: `createNetworkList()` → `POST /network-list/v2/network-lists`
22. [Continue...]

### **CPS CERTIFICATE TOOLS (6 Sections)**
28. **SECTION 28**: `listEnrollments()` → `GET /cps/v2/enrollments`
29. **SECTION 29**: `createDvEnrollment()` → `POST /cps/v2/enrollments`
30. [Continue...]

---

## 🚀 **EXECUTION WORKFLOW**

### **Per-Section Workflow (30-60 minutes)**
1. **Research** (10 min): Study official Akamai docs for the specific endpoint
2. **Type Creation** (15 min): Create precise TypeScript interfaces
3. **Implementation** (20 min): Update function with type-safe code  
4. **Testing** (10 min): Live API validation
5. **Documentation** (5 min): Update progress and learnings

### **Session Planning**
- **Sessions per day**: 4-6 sections (2-4 hours total)
- **Tool completion**: 1-2 tools per day
- **Quality gate**: Each section must pass live API test

### **Progress Tracking**
```markdown
## Progress Dashboard
- ✅ **SECTION 1**: DNS listZones() - COMPLETED
- 🔄 **SECTION 2**: DNS createZone() - IN PROGRESS  
- ⏳ **SECTION 3**: DNS createRecord() - PENDING
- ⏳ **SECTION 4**: DNS deleteRecord() - PENDING
```

---

## 🎯 **IMMEDIATE NEXT ACTION**

**START**: **SECTION 1 - DNS Zone Listing**

1. **Research Phase** (10 minutes):
   ```bash
   # Extract current listZones implementation
   grep -A 20 "listZones" src/tools/dns-tools.ts
   
   # Study official docs: https://techdocs.akamai.com/edge-dns/reference/get-zones
   ```

2. **Create Type** (15 minutes):
   - Create `src/types/api-responses/edge-dns-zones.ts`
   - Define `EdgeDnsZoneListResponse` interface

3. **Implement Fix** (20 minutes):
   - Update `listZones()` function with precise typing
   - Add proper error handling

4. **Live Test** (10 minutes):
   - Test with real API call
   - Verify response structure

**Expected Outcome**: One perfectly typed, tested DNS function ready for production.

This micro-focused approach ensures **surgical precision** - each function becomes a **perfectly implemented, type-safe, documented** integration with the corresponding Akamai API endpoint.