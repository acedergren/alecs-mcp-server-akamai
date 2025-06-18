# Akamai MCP Server - API Calls and Parameter Mapping

This document details all the actual API calls being made to Akamai's APIs and how MCP function parameters map to API parameters.

## Authentication

All API calls use EdgeGrid authentication with the following headers:
- `Authorization: EG1-HMAC-SHA256 client_token=xxx;access_token=xxx;timestamp=xxx;nonce=xxx;signature=xxx`
- `AKAMAI-ACCOUNT-SWITCH-KEY: ACC-XXXX` (if account switching is enabled)
- `User-Agent: Akamai-MCP-Server/1.0`

## Property Management API (PAPI v1)

### List Properties
**MCP Function**: `list-properties`
```typescript
// API Call
GET /papi/v1/properties?contractId={contractId}&groupId={groupId}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  contractId?: string -> queryParams.contractId (auto-prefixed with 'ctr_')
  groupId?: string -> queryParams.groupId (auto-prefixed with 'grp_')
  limit?: number -> Used for client-side filtering (not API param)
}
```

### Get Property Details
**MCP Function**: `get-property`
```typescript
// API Call
GET /papi/v1/properties/{propertyId}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  propertyId: string -> path parameter (auto-prefixed with 'prp_')
}
```

### Create Property
**MCP Function**: `create-property`
```typescript
// API Call
POST /papi/v1/properties?contractId={contractId}&groupId={groupId}
Content-Type: application/json

// Request Body
{
  "propertyName": "{propertyName}",
  "productId": "{productId}",
  "ruleFormat": "{ruleFormat}"
}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  propertyName: string -> body.propertyName
  productId: string -> body.productId (auto-prefixed with 'prd_')
  contractId: string -> queryParams.contractId (auto-prefixed with 'ctr_')
  groupId: string -> queryParams.groupId (auto-prefixed with 'grp_')
  ruleFormat?: string -> body.ruleFormat (defaults to latest)
}
```

### Get Property Rules
**MCP Function**: `get-property-rules`
```typescript
// API Call
GET /papi/v1/properties/{propertyId}/versions/{version}/rules
Accept: application/vnd.akamai.papirules.v2023-10-30+json

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  propertyId: string -> path parameter
  version?: number -> path parameter (defaults to latest)
}
```

### Update Property Rules
**MCP Function**: `update-property-rules`
```typescript
// API Call
PUT /papi/v1/properties/{propertyId}/versions/{version}/rules
Content-Type: application/vnd.akamai.papirules.v2023-10-30+json

// Request Body
{
  "rules": {
    "name": "default",
    "children": [...],
    "behaviors": [...],
    "criteria": [...]
  },
  "ruleFormat": "{ruleFormat}"
}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  propertyId: string -> path parameter
  version?: number -> path parameter (defaults to latest)
  rules: object -> body.rules
  note?: string -> Used in separate PATCH call to update version note
}
```

### Create Property Version
**MCP Function**: `create-property-version`
```typescript
// API Call
POST /papi/v1/properties/{propertyId}/versions
Content-Type: application/json

// Request Body
{
  "createFromVersion": {baseVersion},
  "createFromVersionEtag": ""
}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  propertyId: string -> path parameter
  baseVersion?: number -> body.createFromVersion (defaults to latest)
  note?: string -> Used in separate PATCH call to update version note
}
```

### Activate Property
**MCP Function**: `activate-property`
```typescript
// API Call
POST /papi/v1/properties/{propertyId}/activations
Content-Type: application/json

// Request Body
{
  "propertyVersion": {version},
  "network": "{network}",
  "note": "{note}",
  "notifyEmails": ["{emails}"],
  "acknowledgeWarnings": ["{warnings}"],
  "activationType": "{activationType}",
  "fastPush": {fastPush},
  "ignoreHttpErrors": {ignoreHttpErrors}
}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  propertyId: string -> path parameter
  version: number -> body.propertyVersion
  network: 'STAGING'|'PRODUCTION' -> body.network
  note?: string -> body.note
  notifyEmails?: string[] -> body.notifyEmails
  acknowledgeWarnings?: string[] -> body.acknowledgeWarnings
  activationType?: string -> body.activationType (default: 'ACTIVATE')
  fastPush?: boolean -> body.fastPush
  ignoreHttpErrors?: boolean -> body.ignoreHttpErrors
}
```

## Edge DNS API (v2)

### List DNS Zones
**MCP Function**: `list-zones`
```typescript
// API Call
GET /config-dns/v2/zones?contractIds={ids}&includeAliases={bool}&search={term}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  contractIds?: string[] -> queryParams.contractIds (joined with comma)
  includeAliases?: boolean -> queryParams.includeAliases
  search?: string -> queryParams.search
}
```

### Create DNS Zone
**MCP Function**: `create-zone`
```typescript
// API Call
POST /config-dns/v2/zones?contractId={contractId}&gid={groupId}
Content-Type: application/json

// Request Body
{
  "zone": "{zone}",
  "type": "{type}",
  "comment": "{comment}",
  "masters": ["{masters}"],  // For SECONDARY zones
  "target": "{target}"       // For ALIAS zones
}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  zone: string -> body.zone
  type: 'PRIMARY'|'SECONDARY'|'ALIAS' -> body.type
  comment?: string -> body.comment
  contractId?: string -> queryParams.contractId
  groupId?: string -> queryParams.gid
  masters?: string[] -> body.masters (SECONDARY only)
  target?: string -> body.target (ALIAS only)
}
```

### List DNS Records
**MCP Function**: `list-records`
```typescript
// API Call
GET /config-dns/v2/zones/{zone}/recordsets?search={search}&types={types}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  zone: string -> path parameter
  search?: string -> queryParams.search
  types?: string[] -> queryParams.types (joined with comma)
}
```

### Create DNS Record
**MCP Function**: `create-record`
```typescript
// API Calls (2-step process)
// 1. Get current records
GET /config-dns/v2/zones/{zone}

// 2. Submit updated zone with new record
POST /config-dns/v2/zones/{zone}/zone-file
Content-Type: text/dns

// Zone file format
$ORIGIN {zone}.
{name} {ttl} IN {type} {rdata}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  zone: string -> path parameter
  name: string -> Record name in zone file
  type: string -> Record type (A, AAAA, CNAME, etc.)
  ttl: number -> TTL value
  rdata: string[] -> Record data values
}
```

## Certificate Provisioning System (CPS v2)

### Create DV Certificate Enrollment
**MCP Function**: `create-dv-enrollment`
```typescript
// API Call
POST /cps/v2/enrollments?contractId={contractId}
Content-Type: application/vnd.akamai.cps.enrollment.v11+json
Accept: application/vnd.akamai.cps.enrollment-status.v1+json

// Request Body
{
  "id": 0,
  "ra": "lets-encrypt",
  "validationType": "dv",
  "certificateType": "san" | "single",
  "certificateChainType": "default",
  "networkConfiguration": {
    "geography": "core",
    "quicEnabled": {quicEnabled},
    "secureNetwork": "enhanced-tls" | "standard-tls",
    "sniOnly": true
  },
  "signatureAlgorithm": "SHA256withRSA",
  "changeManagement": false,
  "csr": {
    "cn": "{commonName}",
    "sans": ["{sans}"],
    "c": "US",
    "o": "Akamai Technologies",
    "ou": "Secure Platform"
  },
  "adminContact": {adminContact},
  "techContact": {techContact}
}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  commonName: string -> body.csr.cn
  sans?: string[] -> body.csr.sans
  adminContact: Contact -> body.adminContact
  techContact: Contact -> body.techContact
  contractId: string -> queryParams.contractId
  enhancedTLS?: boolean -> body.networkConfiguration.secureNetwork
  quicEnabled?: boolean -> body.networkConfiguration.quicEnabled
}
```

### Get DV Validation Challenges
**MCP Function**: `get-dv-validation-challenges`
```typescript
// API Call
GET /cps/v2/enrollments/{enrollmentId}
Accept: application/vnd.akamai.cps.enrollment-status.v1+json

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  enrollmentId: number -> path parameter
}
```

## Application Security (APPSEC v1)

### List Security Configurations
**MCP Function**: `list-appsec-configurations`
```typescript
// API Call
GET /appsec/v1/configs

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
}
```

### Create WAF Policy
**MCP Function**: `create-waf-policy`
```typescript
// API Call
POST /appsec/v1/configs/{configId}/versions/1/security-policies
Content-Type: application/json

// Request Body
{
  "policyName": "{policyName}",
  "policyMode": "{policyMode}",
  "paranoidLevel": {paranoidLevel}
}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  configId: number -> path parameter
  policyName: string -> body.policyName
  policyMode: 'ASE_AUTO'|'ASE_MANUAL'|'KRS' -> body.policyMode
  paranoidLevel?: number -> body.paranoidLevel (1-4)
}
```

### Get Security Events
**MCP Function**: `get-security-events`
```typescript
// API Call
GET /appsec/v1/configs/{configId}/security-events?from={from}&to={to}&limit={limit}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  configId: number -> path parameter
  from: string -> queryParams.from (ISO 8601 format)
  to: string -> queryParams.to (ISO 8601 format)
  limit?: number -> queryParams.limit (max 1000)
}
```

### Activate Security Configuration
**MCP Function**: `activate-appsec-configuration`
```typescript
// API Call
POST /appsec/v1/activations
Content-Type: application/json

// Request Body
{
  "configId": {configId},
  "network": "{network}",
  "note": "{note}",
  "notificationEmails": ["{emails}"],
  "activationConfigs": [{
    "configId": {configId},
    "configVersion": {version}
  }]
}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  configId: number -> body.configId
  version: number -> body.activationConfigs[0].configVersion
  network: 'STAGING'|'PRODUCTION' -> body.network
  note?: string -> body.note
  notificationEmails?: string[] -> body.notificationEmails
}
```

## Network Lists API (v2)

### List Network Lists
**MCP Function**: `list-network-lists`
```typescript
// API Call
GET /network-list/v2/network-lists?listType={type}&includeElements={bool}&search={term}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  listType?: 'IP'|'GEO' -> queryParams.listType
  includeElements?: boolean -> queryParams.includeElements
  search?: string -> queryParams.search
}
```

### Create Network List
**MCP Function**: `create-network-list`
```typescript
// API Call
POST /network-list/v2/network-lists
Content-Type: application/json

// Request Body
{
  "name": "{name}",
  "type": "{type}",
  "description": "{description}",
  "list": ["{elements}"]
}

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  name: string -> body.name
  type: 'IP'|'GEO' -> body.type
  description?: string -> body.description
  elements?: string[] -> body.list
}
```

## Reporting API (v1)

### Get Traffic Data
**MCP Function**: Internal reporting service methods
```typescript
// API Call
GET /reporting/v1/reports/{reportType}/versions/{version}/report-data?start={start}&end={end}&interval={interval}&objectIds={ids}&metrics={metrics}

// Common Report Types:
// - traffic-by-responseclass
// - traffic-by-time
// - performance-by-time
// - cache-by-time

// Parameter Mapping
{
  customer: string -> Used to select .edgerc section
  reportType: string -> path parameter
  version: number -> path parameter (usually 1)
  start: string -> queryParams.start (ISO 8601)
  end: string -> queryParams.end (ISO 8601)
  interval: string -> queryParams.interval (HOUR, DAY, etc.)
  objectIds: string[] -> queryParams.objectIds (CP codes)
  metrics: string[] -> queryParams.metrics (comma-separated)
}
```

## Common Patterns

### 1. Customer Parameter
- Always maps to `.edgerc` section selection
- Determines which credentials and account-switch-key to use
- Default value: "default"

### 2. ID Prefixing
- Property IDs: Auto-prefixed with `prp_`
- Contract IDs: Auto-prefixed with `ctr_`
- Group IDs: Auto-prefixed with `grp_`
- Product IDs: Auto-prefixed with `prd_`

### 3. Network Parameter
- Always either `STAGING` or `PRODUCTION`
- Used for activations across all APIs

### 4. Error Handling
- HTTP 4xx/5xx errors are caught and wrapped with context
- Rate limiting (429) triggers exponential backoff
- Network errors trigger retries (max 3 attempts)

### 5. Response Headers
- `X-Request-ID`: Used for tracing
- `X-RateLimit-*`: Rate limit information
- Standard HTTP headers

### 6. Content Types
- Most APIs use `application/json`
- PAPI rules use versioned content types like `application/vnd.akamai.papirules.v2023-10-30+json`
- CPS uses versioned types like `application/vnd.akamai.cps.enrollment.v11+json`
- DNS zone files use `text/dns`