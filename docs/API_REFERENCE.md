# ALECS API Reference

**Complete documentation for all 156 tools in ALECS MCP Server**

## 🎯 Overview

ALECS provides 156 tools across 15 service domains, following the `domain_action_target` naming convention. All tools support multi-customer authentication and return standardized responses.

### Authentication

All tools use Akamai EdgeGrid authentication via `.edgerc` customer sections:

```ini
[production]
client_secret = your_secret
host = your_host.luna.akamaiapis.net
access_token = your_token
client_token = your_client_token

[staging]
client_secret = staging_secret
host = staging-host.luna.akamaiapis.net
access_token = staging_token
client_token = staging_client_token
```

### Common Parameters

All tools accept these optional parameters:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `customer` | string | Customer section from `.edgerc` | `"default"` |
| `timeout` | number | Request timeout in milliseconds | `30000` |
| `retries` | number | Number of retry attempts | `3` |

### Response Format

All tools return standardized responses:

```typescript
interface MCPToolResponse {
  isSuccess: boolean;
  content: any;
  metadata?: {
    requestId: string;
    timestamp: string;
    cached?: boolean;
    duration?: number;
  };
  error?: {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
  };
}
```

## 🏢 Property Management (25 tools)

### property_list

Lists all properties for a customer account.

**Parameters:**
- `customer` (string, optional): Customer context
- `contractId` (string, optional): Filter by contract ID (`ctr_*`)
- `groupId` (string, optional): Filter by group ID (`grp_*`)
- `includeDetails` (boolean, optional): Include additional property details

**Example:**
```json
{
  "name": "property_list",
  "arguments": {
    "customer": "production",
    "contractId": "ctr_12345",
    "includeDetails": true
  }
}
```

**Response:**
```json
{
  "isSuccess": true,
  "content": {
    "properties": [
      {
        "id": "prp_123456",
        "name": "my-website",
        "accountId": "act_123",
        "contractId": "ctr_12345",
        "groupId": "grp_12345",
        "latestVersion": 3,
        "stagingVersion": 2,
        "productionVersion": 1,
        "status": "active"
      }
    ],
    "count": 1
  }
}
```

### property_create

Creates a new CDN property.

**Parameters:**
- `propertyName` (string, required): Property name (1-255 chars, alphanumeric)
- `productId` (string, optional): Product ID (defaults to `prd_Web_App_Accel`)
- `contractId` (string, optional): Contract ID
- `groupId` (string, optional): Group ID
- `cloneFrom` (object, optional): Clone from existing property
  - `propertyId` (string): Source property ID
  - `version` (number): Source version

**Example:**
```json
{
  "name": "property_create",
  "arguments": {
    "propertyName": "my-new-site",
    "customer": "production",
    "cloneFrom": {
      "propertyId": "prp_123456",
      "version": 1
    }
  }
}
```

### property_get

Retrieves detailed information about a specific property.

**Parameters:**
- `propertyId` (string, required): Property ID (`prp_*`)
- `includeRules` (boolean, optional): Include property rules
- `includeHostnames` (boolean, optional): Include hostname configuration

### property_version_create

Creates a new version of a property.

**Parameters:**
- `propertyId` (string, required): Property ID
- `createFromVersion` (number, required): Source version number
- `createFromEtag` (string, optional): Source version ETag

### property_activate

Activates a property version to staging or production.

**Parameters:**
- `propertyId` (string, required): Property ID
- `version` (number, required): Version to activate
- `network` (string, required): `"STAGING"` or `"PRODUCTION"`
- `note` (string, optional): Activation note
- `notifyEmails` (array, optional): Email notifications

**Example:**
```json
{
  "name": "property_activate",
  "arguments": {
    "propertyId": "prp_123456",
    "version": 2,
    "network": "STAGING",
    "note": "Testing new configuration",
    "notifyEmails": ["admin@example.com"]
  }
}
```

## 🌐 DNS Management (12 tools)

### dns_zone_list

Lists all DNS zones for a customer.

**Parameters:**
- `customer` (string, optional): Customer context
- `contractId` (string, optional): Filter by contract
- `search` (string, optional): Search zone names

**Example:**
```json
{
  "name": "dns_zone_list",
  "arguments": {
    "customer": "production",
    "search": "example.com"
  }
}
```

### dns_zone_create

Creates a new DNS zone.

**Parameters:**
- `zone` (string, required): Zone name (e.g., `example.com`)
- `type` (string, required): `"primary"` or `"secondary"`
- `contractId` (string, optional): Contract ID
- `groupId` (string, optional): Group ID
- `comment` (string, optional): Zone comment

**Example:**
```json
{
  "name": "dns_zone_create",
  "arguments": {
    "zone": "example.com",
    "type": "primary",
    "customer": "production",
    "comment": "Main website domain"
  }
}
```

### dns_record_create

Creates a DNS record in a zone.

**Parameters:**
- `zone` (string, required): Zone name
- `name` (string, required): Record name
- `type` (string, required): Record type (`A`, `AAAA`, `CNAME`, `MX`, `TXT`, etc.)
- `ttl` (number, required): Time to live in seconds
- `rdata` (array, required): Record data values

**Example:**
```json
{
  "name": "dns_record_create",
  "arguments": {
    "zone": "example.com",
    "name": "www",
    "type": "A",
    "ttl": 300,
    "rdata": ["192.0.2.1", "192.0.2.2"]
  }
}
```

### dns_record_update

Updates an existing DNS record.

**Parameters:**
- `zone` (string, required): Zone name
- `name` (string, required): Record name
- `type` (string, required): Record type
- `ttl` (number, required): New TTL value
- `rdata` (array, required): New record data

### dns_changelist_create

Creates a changelist for DNS modifications.

**Parameters:**
- `zone` (string, required): Zone name
- `comment` (string, optional): Changelist comment

### dns_changelist_submit

Submits a changelist for DNS activation.

**Parameters:**
- `zone` (string, required): Zone name
- `changelistId` (string, required): Changelist ID

## 🔐 Certificate Management (8 tools)

### certificate_list

Lists all certificates for a customer.

**Parameters:**
- `customer` (string, optional): Customer context
- `deploymentType` (string, optional): Filter by deployment type

**Example:**
```json
{
  "name": "certificate_list",
  "arguments": {
    "customer": "production",
    "deploymentType": "enhanced_tls"
  }
}
```

### certificate_create

Requests a new SSL/TLS certificate.

**Parameters:**
- `commonName` (string, required): Primary domain name
- `sans` (array, optional): Subject Alternative Names
- `certificateType` (string, required): `"DV"`, `"OV"`, or `"EV"`
- `validationType` (string, optional): Validation method
- `keyAlgorithm` (string, optional): Key algorithm (`RSA` or `ECDSA`)

**Example:**
```json
{
  "name": "certificate_create",
  "arguments": {
    "commonName": "www.example.com",
    "sans": ["example.com", "api.example.com"],
    "certificateType": "DV",
    "customer": "production"
  }
}
```

### certificate_get

Retrieves certificate details and status.

**Parameters:**
- `certificateId` (string, required): Certificate ID
- `includeValidation` (boolean, optional): Include validation details

### certificate_validate

Checks certificate validation status.

**Parameters:**
- `certificateId` (string, required): Certificate ID

## 🛡️ Security Tools (47 tools)

### security_policy_list

Lists all security policies.

**Parameters:**
- `customer` (string, optional): Customer context
- `configId` (string, optional): Configuration ID

### security_policy_create

Creates a new security policy.

**Parameters:**
- `policyName` (string, required): Policy name
- `configId` (string, required): Configuration ID
- `policyMode` (string, optional): `"ASE_AUTO"` or `"ASE_MANUAL"`

### waf_rule_list

Lists WAF rules for a security policy.

**Parameters:**
- `configId` (string, required): Configuration ID
- `policyId` (string, required): Policy ID
- `rulesetType` (string, optional): Ruleset type filter

### waf_rule_update

Updates WAF rule configuration.

**Parameters:**
- `configId` (string, required): Configuration ID
- `policyId` (string, required): Policy ID
- `ruleId` (string, required): Rule ID
- `action` (string, required): Rule action (`alert`, `deny`, `none`)

### network_list_create

Creates a new network list.

**Parameters:**
- `name` (string, required): List name
- `type` (string, required): `"IP"` or `"GEO"`
- `description` (string, optional): List description
- `items` (array, required): List items (IPs or country codes)

**Example:**
```json
{
  "name": "network_list_create",
  "arguments": {
    "name": "office-ips",
    "type": "IP",
    "description": "Office IP addresses",
    "items": ["192.168.1.0/24", "10.0.0.0/8"],
    "customer": "production"
  }
}
```

### network_list_activate

Activates a network list.

**Parameters:**
- `networkListId` (string, required): Network list ID
- `network` (string, required): `"STAGING"` or `"PRODUCTION"`
- `comment` (string, optional): Activation comment

### rate_policy_create

Creates a rate limiting policy.

**Parameters:**
- `policyName` (string, required): Policy name
- `configId` (string, required): Configuration ID
- `averageThreshold` (number, required): Average threshold
- `burstThreshold` (number, required): Burst threshold
- `clientIdentifier` (string, required): Client identifier method

### bot_management_policy_create

Creates a bot management policy.

**Parameters:**
- `policyName` (string, required): Policy name
- `configId` (string, required): Configuration ID
- `botDetectionAction` (string, required): Detection action

## ⚡ Fast Purge (8 tools)

### fastpurge_url

Purges content by URL.

**Parameters:**
- `urls` (array, required): URLs to purge
- `customer` (string, optional): Customer context

**Example:**
```json
{
  "name": "fastpurge_url",
  "arguments": {
    "urls": [
      "https://example.com/index.html",
      "https://example.com/styles.css"
    ],
    "customer": "production"
  }
}
```

### fastpurge_cpcode

Purges content by CP code.

**Parameters:**
- `cpcodes` (array, required): CP codes to purge
- `customer` (string, optional): Customer context

### fastpurge_tag

Purges content by cache tag.

**Parameters:**
- `tags` (array, required): Cache tags to purge
- `customer` (string, optional): Customer context

### fastpurge_status

Checks purge request status.

**Parameters:**
- `requestId` (string, required): Purge request ID

## 📊 Reporting (9 tools)

### traffic_report_get

Retrieves traffic analytics report.

**Parameters:**
- `startDate` (string, required): Start date (ISO format)
- `endDate` (string, required): End date (ISO format)
- `metrics` (array, optional): Metrics to include
- `filters` (object, optional): Report filters

**Example:**
```json
{
  "name": "traffic_report_get",
  "arguments": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-02T00:00:00Z",
    "metrics": ["bandwidth", "requests", "hits"],
    "customer": "production"
  }
}
```

### cache_report_get

Retrieves cache performance report.

**Parameters:**
- `startDate` (string, required): Start date
- `endDate` (string, required): End date
- `cpcodes` (array, optional): Filter by CP codes

### error_report_get

Retrieves error analysis report.

**Parameters:**
- `startDate` (string, required): Start date
- `endDate` (string, required): End date
- `statusCodes` (array, optional): Filter by status codes

## 🔄 Orchestration (7 tools)

### workflow_create

Creates a new workflow definition.

**Parameters:**
- `name` (string, required): Workflow name
- `description` (string, optional): Workflow description
- `steps` (array, required): Workflow steps
- `errorHandling` (object, optional): Error handling strategy

**Example:**
```json
{
  "name": "workflow_create",
  "arguments": {
    "name": "property-migration",
    "description": "Migrate property to new configuration",
    "steps": [
      {
        "id": "backup",
        "tool": "property_get",
        "args": {"propertyId": "${source_property}"}
      },
      {
        "id": "create",
        "tool": "property_create",
        "args": {"propertyName": "${target_name}"},
        "dependencies": ["backup"]
      }
    ]
  }
}
```

### workflow_execute

Executes a workflow with provided parameters.

**Parameters:**
- `workflowId` (string, required): Workflow ID
- `parameters` (object, required): Workflow parameters
- `dryRun` (boolean, optional): Execute in dry-run mode

### workflow_status

Checks workflow execution status.

**Parameters:**
- `executionId` (string, required): Execution ID

## 🔍 Utility Tools (12 tools)

### utility_validate_hostname

Validates hostname format and availability.

**Parameters:**
- `hostname` (string, required): Hostname to validate
- `checkDNS` (boolean, optional): Perform DNS validation

### utility_cpcode_list

Lists available CP codes.

**Parameters:**
- `customer` (string, optional): Customer context
- `contractId` (string, optional): Filter by contract

### utility_contract_list

Lists available contracts.

**Parameters:**
- `customer` (string, optional): Customer context

### utility_group_list

Lists available groups.

**Parameters:**
- `customer` (string, optional): Customer context
- `contractId` (string, optional): Filter by contract

## 🚨 Error Handling

### Common Error Codes

| Status | Type | Description | Resolution |
|--------|------|-------------|------------|
| **400** | `validation_error` | Invalid input parameters | Check parameter format and requirements |
| **401** | `authentication_error` | Invalid credentials | Verify `.edgerc` configuration |
| **403** | `authorization_error` | Insufficient permissions | Check API client permissions |
| **404** | `not_found_error` | Resource not found | Verify resource ID exists |
| **409** | `conflict_error` | Resource conflict | Check for existing resources |
| **429** | `rate_limit_error` | Too many requests | Implement exponential backoff |
| **500** | `internal_error` | Server error | Retry request or contact support |

### Error Response Format

```json
{
  "isSuccess": false,
  "error": {
    "type": "/errors/property-not-found",
    "title": "Property Not Found",
    "status": 404,
    "detail": "Property prp_123456 not found in customer account",
    "instance": "property/get"
  }
}
```

## 📋 Best Practices

### Multi-Customer Operations

```json
// Use customer parameter for multi-tenant deployments
{
  "name": "property_list",
  "arguments": {
    "customer": "production"  // or "staging", "development"
  }
}
```

### Async Operations

```json
// For long-running operations like activations
{
  "name": "property_activate",
  "arguments": {
    "propertyId": "prp_123456",
    "version": 2,
    "network": "STAGING"
  }
}

// Check status periodically
{
  "name": "property_activation_status",
  "arguments": {
    "propertyId": "prp_123456",
    "activationId": "atv_123456"
  }
}
```

### Bulk Operations

```json
// Use array parameters for bulk operations
{
  "name": "fastpurge_url",
  "arguments": {
    "urls": [
      "https://example.com/page1.html",
      "https://example.com/page2.html",
      "https://example.com/page3.html"
    ]
  }
}
```

### Rate Limiting

- Implement exponential backoff for retries
- Use bulk operations when available
- Monitor rate limit headers in responses
- Distribute requests across multiple time windows

---

This API reference provides comprehensive documentation for all 156 tools in ALECS. Each tool follows consistent patterns for authentication, validation, and response formatting, making integration straightforward and predictable.