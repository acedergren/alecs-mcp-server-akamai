# DEEP ANALYSIS: Akamai Property Manager API (PAPI) v1

## Executive Summary
After analyzing the Akamai PAPI documentation, examples, and structure, I've identified critical patterns and corrections needed for our implementation.

## 🔑 KEY DISCOVERIES

### 1. **ID Format Standards**
All Akamai resources follow strict ID patterns:
```
Properties:        prp_XXXXXX      (e.g., prp_173136)
Contracts:         ctr_X-XXXXXXX   (e.g., ctr_C-0N7RAC7)
Groups:            grp_XXXXX       (e.g., grp_15225)
Edge Hostnames:    ehn_XXXXXX      (e.g., ehn_895822)
Activations:       atv_XXXXXXX     (e.g., atv_1696985)
CP Codes:          cpc_XXXXX       (e.g., cpc_33190)
Accounts:          act_X-XXXXXXX   (e.g., act_A-CCT5678)
```

### 2. **API Organization**
PAPI is organized into 8 logical modules:
1. **Prerequisites** (`01-prerequisites.yaml`) - Contracts, Groups, Products
2. **Includes** (`02-includes.yaml`) - Reusable configuration snippets
3. **Property Hostnames** (`03-property-hostnames.yaml`) - Hostname management
4. **Properties** (`04-properties.yaml`) - Core property CRUD
5. **Custom** (`05-custom.yaml`) - Custom behaviors and overrides
6. **Bulk** (`06-bulk.yaml`) - Batch operations
7. **Search** (`07-search.yaml`) - Property discovery
8. **Utilities** (`08-utilities.yaml`) - Helper functions

### 3. **Response Envelope Patterns**
```json
// List responses
{
  "properties": {
    "items": [
      {
        "propertyId": "prp_173136",
        "propertyName": "example.com",
        // ...
      }
    ]
  }
}

// Single resource
{
  "propertyId": "prp_173136",
  "propertyName": "example.com",
  "contractId": "ctr_C-0N7RAC7",
  "groupId": "grp_15225",
  // ...
}

// Link responses
{
  "propertyLink": "/papi/v1/properties/prp_173136?contractId=ctr_C-0N7RAC7&groupId=grp_15225"
}
```

### 4. **Error Response Standard (RFC 7807)**
```json
{
  "type": "https://problems.luna.akamaiapis.net/papi/v1/property_not_found",
  "title": "Property Not Found",
  "detail": "The requested property does not exist or you don't have permission to access it",
  "instance": "/papi/v1/properties/prp_999999",
  "status": 404,
  "errors": [
    {
      "type": "property_not_found",
      "title": "Property Not Found",
      "detail": "Property prp_999999 not found"
    }
  ]
}
```

### 5. **Hostname Management Insights**
- Hostnames have SEPARATE staging and production edge hostname IDs
- Certificate types: `DEFAULT` (DV), `CPS_MANAGED`, `THIRD_PARTY`
- Edge hostname suffixes: `.edgekey.net`, `.edgesuite.net`, `.akamaized.net`
- Hostnames must be added to property versions, not properties directly

### 6. **Activation Workflow**
```json
// Request
{
  "propertyVersion": 1,
  "network": "STAGING",  // or "PRODUCTION"
  "note": "Deployment note",
  "notifyEmails": ["user@example.com"],
  "acknowledgeWarnings": ["msg_XXXXX"],  // Required for warnings
  "acknowledgeAllWarnings": true  // Alternative to listing all
}

// Status values
"PENDING"    -> "ACTIVE"     (success)
"PENDING"    -> "FAILED"     (failure)
"PENDING"    -> "ABORTED"    (cancelled)
"PENDING"    -> "DEACTIVATED" (deactivated)
```

### 7. **Rule Tree Structure**
```json
{
  "rules": {
    "name": "default",
    "criteria": [],
    "behaviors": [
      {
        "name": "origin",
        "options": {
          "hostname": "origin.example.com",
          "httpPort": 80,
          "httpsPort": 443
        }
      }
    ],
    "children": [
      {
        "name": "Performance",
        "criteria": [],
        "behaviors": [],
        "children": []
      }
    ]
  }
}
```

## 🚨 CRITICAL CORRECTIONS NEEDED

### 1. **Fix Fake Search Implementation**
```typescript
// ❌ CURRENT (FAKE - Downloads everything)
export async function searchProperties() {
  const allProperties = await getAllProperties();
  return clientSideFilter(allProperties);
}

// ✅ CORRECT (Use real search API)
export async function searchProperties() {
  return await client.request({
    path: '/papi/v1/search/find-by-value',
    method: 'POST',
    body: {
      propertyName: searchTerm
    }
  });
}
```

### 2. **Fix Certificate Management**
```typescript
// ❌ CURRENT (Misleading)
export async function updatePropertyWithDefaultDV() {
  // Creates edge hostname but doesn't actually manage certs
}

// ✅ CORRECT
export async function createSecureEdgeHostname() {
  return await client.request({
    path: '/papi/v1/edgehostnames',
    method: 'POST',
    body: {
      domainPrefix: 'www-example-com',
      domainSuffix: 'edgekey.net',
      secure: true,
      ipVersionBehavior: 'IPV4_IPV6',
      certificateEnrollmentId: null // null = Default DV
    }
  });
}
```

### 3. **Implement Proper Response Envelopes**
```typescript
// ❌ CURRENT
return { properties: [...] };

// ✅ CORRECT
return {
  properties: {
    items: [...]
  }
};
```

### 4. **Add ETag Support**
```typescript
// ✅ CORRECT
const response = await client.request({
  path: `/papi/v1/properties/${propertyId}/versions/${version}/rules`,
  method: 'PUT',
  headers: {
    'If-Match': etag  // Required for updates
  },
  body: rulesTree
});
```

### 5. **Use Proper ID Validation**
```typescript
// ✅ Add validation
function validatePropertyId(id: string): boolean {
  return /^prp_\d+$/.test(id);
}

function validateContractId(id: string): boolean {
  return /^ctr_[A-Z]-[A-Z0-9]+$/.test(id);
}
```

## 📊 REPORTING SERVER SEPARATION

### Why Separation is Correct:
1. **Different API**: Reporting API v1 vs Property Manager API v1
2. **Different Base Path**: `/reporting-api/v1` vs `/papi/v1`
3. **Different Operations**: Read-only analytics vs CRUD configuration
4. **Different Data Models**: Time-series metrics vs configuration objects
5. **Different Rate Limits**: Analytics can be more intensive

### Reporting API Endpoints:
```
/reporting-api/v1/reports/traffic/edge-hits-by-time
/reporting-api/v1/reports/traffic/edge-bandwidth-by-time
/reporting-api/v1/reports/performance/http-status-codes-by-time
/reporting-api/v1/reports/offload/origin-offload-by-time
/reporting-api/v1/reports/urls/top-urls-by-hits
```

## 🎯 IMPLEMENTATION RECOMMENDATIONS

### 1. **Property Manager Consolidation**
- Remove fake `searchProperties` - implement real search API
- Fix certificate functions to use proper enrollment
- Add ETag support for all update operations
- Use proper ID format validation
- Implement proper response envelopes

### 2. **Missing Functionality to Add**
- **Property Search API** (`/papi/v1/search/find-by-value`)
- **Bulk Operations** (legitimate bulk APIs exist)
- **Include Management** (reusable rule snippets)
- **Custom Behaviors** (advanced configurations)

### 3. **Architecture Improvements**
```typescript
// Organize by Akamai's modules
src/tools/
  ├── prerequisites/        // Contracts, groups, products
  ├── properties/          // Core property CRUD
  ├── hostnames/          // Hostname management
  ├── rules/              // Rule configuration
  ├── activations/        // Deployment management
  ├── search/             // Discovery operations
  └── utilities/          // Helper functions
```

### 4. **Error Handling Enhancement**
```typescript
class AkamaiError extends Error {
  constructor(
    public type: string,
    public title: string,
    public detail: string,
    public status: number,
    public instance?: string,
    public errors?: any[]
  ) {
    super(detail);
  }

  toRFC7807() {
    return {
      type: `https://problems.luna.akamaiapis.net/papi/v1/${this.type}`,
      title: this.title,
      detail: this.detail,
      status: this.status,
      instance: this.instance,
      errors: this.errors
    };
  }
}
```

## 📈 FINAL TOOL COUNT RECOMMENDATION

Based on PAPI structure, realistic property server scope:

### Core Property Management (25 tools)
- Property CRUD (5)
- Version Management (6)
- Rule Management (5)
- Hostname Management (5)
- Prerequisites (4)

### Activation & Deployment (10 tools)
- Create/Cancel Activation (2)
- Monitor Status (2)
- List Activations (2)
- Validation (4)

### Search & Discovery (5 tools)
- Find by Property Name
- Find by Hostname
- Find by Edge Hostname
- Advanced Search
- List Recent

### Edge Hostname Management (8 tools)
- Create/Delete (2)
- List/Get (2)
- Certificate Status (2)
- Domain Validation (2)

### Utilities & Helpers (7 tools)
- Format Validation
- Rule Diff
- Hostname Validation
- CP Code Management
- Client Settings

**TOTAL: 55 HIGH-QUALITY TOOLS** (not 90 mediocre ones)

## 🚀 NEXT STEPS

1. **Fix Existing Fakes**: Remove/rewrite the 5 identified fake functions
2. **Implement Real Search**: Add proper search API integration
3. **Add ETag Support**: Critical for concurrent updates
4. **Separate Reporting**: Complete the reporting server with proper endpoints
5. **Validate IDs**: Add format validation for all Akamai IDs
6. **Error Standards**: Implement RFC 7807 compliant errors

This analysis shows we need quality over quantity - 55 real tools that follow Akamai's actual API patterns, not 90 tools with 35% fake functionality.