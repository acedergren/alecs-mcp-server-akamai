# Akamai API Contract Reference

This document provides a comprehensive reference for all Akamai APIs integrated with the ALECS MCP Server, including required parameters, authentication, and request/response formats.

## Table of Contents

1. [Authentication](#authentication)
2. [Property Manager API (PAPI)](#property-manager-api-papi)
3. [Edge DNS API](#edge-dns-api)
4. [Certificate Provisioning System (CPS)](#certificate-provisioning-system-cps)
5. [Application Security API](#application-security-api)
6. [Network Lists API](#network-lists-api)
7. [Fast Purge API](#fast-purge-api)
8. [Reporting API](#reporting-api)

## Authentication

All Akamai APIs use EdgeGrid authentication with the following requirements:

### Required Headers
```
Authorization: EG1-HMAC-SHA256 
  client_token={client_token};
  access_token={access_token};
  timestamp={timestamp};
  nonce={nonce};
  auth={signature}
```

### Optional Headers
```
AKAMAI-ACCOUNT-SWITCH-KEY: {account_switch_key}
```

### Authentication Parameters
- **client_token**: From .edgerc file
- **access_token**: From .edgerc file
- **client_secret**: From .edgerc file (used for signature)
- **host**: API endpoint host
- **account_switch_key**: Optional, for multi-account access

## Property Manager API (PAPI)

Base URL: `https://{host}/papi/v1`

### List Properties
**Endpoint**: `GET /papi/v1/properties`

**MCP Function**: `property.list`

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| contractId | string | No | All | Filter by contract |
| groupId | string | No | All | Filter by group |

**Response Format**:
```json
{
  "properties": {
    "items": [{
      "propertyId": "prp_123456",
      "propertyName": "example.com",
      "contractId": "ctr_1-2ABC3D",
      "groupId": "grp_12345",
      "latestVersion": 5,
      "stagingVersion": 4,
      "productionVersion": 3
    }]
  }
}
```

### Get Property
**Endpoint**: `GET /papi/v1/properties/{propertyId}`

**MCP Function**: `property.get`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| propertyId | string | Yes | Property ID (prp_xxxxx) |

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| contractId | string | Yes | - | Contract ID |
| groupId | string | Yes | - | Group ID |

### Create Property
**Endpoint**: `POST /papi/v1/properties`

**MCP Function**: `property.create`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| contractId | string | Yes | Contract ID |
| groupId | string | Yes | Group ID |

**Request Body**:
```json
{
  "propertyName": "example.com",
  "productId": "prd_Web_Accel",
  "ruleFormat": "latest"
}
```

### Get Property Versions
**Endpoint**: `GET /papi/v1/properties/{propertyId}/versions`

**MCP Function**: `property.version.list`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| propertyId | string | Yes | Property ID |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| contractId | string | Yes | Contract ID |
| groupId | string | Yes | Group ID |
| limit | number | No | Max results (default: 100) |
| offset | number | No | Pagination offset |

### Get Rule Tree
**Endpoint**: `GET /papi/v1/properties/{propertyId}/versions/{version}/rules`

**MCP Function**: `property.rules.get`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| propertyId | string | Yes | Property ID |
| version | number | Yes | Version number |

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| contractId | string | Yes | - | Contract ID |
| groupId | string | Yes | - | Group ID |
| validateRules | boolean | No | true | Validate rules |
| validateMode | string | No | fast | Validation mode |

**Response Format**:
```json
{
  "rules": {
    "name": "default",
    "children": [],
    "behaviors": [],
    "criteria": [],
    "criteriaMustSatisfy": "all"
  },
  "ruleFormat": "v2023-10-30",
  "warnings": [],
  "errors": []
}
```

### Update Rule Tree
**Endpoint**: `PUT /papi/v1/properties/{propertyId}/versions/{version}/rules`

**MCP Function**: `property.rules.update`

**Request Body**:
```json
{
  "rules": {
    "name": "default",
    "children": [],
    "behaviors": [],
    "criteria": []
  },
  "ruleFormat": "latest"
}
```

### Create Property Activation
**Endpoint**: `POST /papi/v1/properties/{propertyId}/activations`

**MCP Function**: `property.activate`

**Request Body**:
```json
{
  "propertyVersion": 1,
  "network": "STAGING",
  "activationType": "ACTIVATE",
  "notifyEmails": ["email@example.com"],
  "acknowledgeWarnings": ["msg_123"],
  "complianceRecord": {
    "nonComplianceReason": "NO_PRODUCTION"
  }
}
```

## Edge DNS API

Base URL: `https://{host}/config-dns/v2`

### List DNS Zones
**Endpoint**: `GET /config-dns/v2/zones`

**MCP Function**: `dns.zone.list`

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| search | string | No | - | Search term |
| types | string | No | all | Zone types (primary,secondary,alias) |
| contractIds | string | No | - | Filter by contracts |
| showAll | boolean | No | false | Show all zones |
| sortBy | string | No | NAME | Sort field |
| order | string | No | ASC | Sort order |
| limit | number | No | 100 | Results per page |
| offset | number | No | 0 | Pagination offset |

### Create DNS Zone
**Endpoint**: `POST /config-dns/v2/zones`

**MCP Function**: `dns.zone.create`

**Request Body**:
```json
{
  "zone": "example.com",
  "type": "PRIMARY",
  "comment": "Created via MCP",
  "signAndServe": false,
  "contractId": "1-2ABC3D",
  "masters": []
}
```

### Get Zone Records
**Endpoint**: `GET /config-dns/v2/zones/{zone}/recordsets`

**MCP Function**: `dns.record.list`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| zone | string | Yes | Zone name |

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| types | string | No | all | Record types |
| search | string | No | - | Search in names |
| sortBy | string | No | NAME | Sort field |
| order | string | No | ASC | Sort order |
| limit | number | No | 500 | Results limit |
| offset | number | No | 0 | Pagination offset |

### Create/Update DNS Record
**Endpoint**: `PUT /config-dns/v2/zones/{zone}/recordsets/{name}/{type}`

**MCP Function**: `dns.record.create` / `dns.record.update`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| zone | string | Yes | Zone name |
| name | string | Yes | Record name |
| type | string | Yes | Record type (A, AAAA, CNAME, etc.) |

**Request Body**:
```json
{
  "name": "www",
  "type": "A",
  "ttl": 300,
  "rdata": ["192.0.2.1"]
}
```

## Certificate Provisioning System (CPS)

Base URL: `https://{host}/cps/v2`

### List Certificate Enrollments
**Endpoint**: `GET /cps/v2/enrollments`

**MCP Function**: `certs.enrollment.list`

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| contractId | string | No | - | Filter by contract |

**Response Format**:
```json
{
  "enrollments": [{
    "enrollmentId": 12345,
    "cn": "example.com",
    "sans": ["www.example.com"],
    "validationType": "dv",
    "certificateType": "san",
    "networkConfiguration": {
      "geography": "core",
      "secureNetwork": "enhanced-tls",
      "mustHaveCiphers": "ak-akamai-default"
    }
  }]
}
```

### Create Certificate Enrollment
**Endpoint**: `POST /cps/v2/enrollments`

**MCP Function**: `certs.enrollment.create`

**Request Body**:
```json
{
  "csr": {
    "cn": "example.com",
    "c": "US",
    "st": "MA",
    "l": "Cambridge",
    "o": "Example Inc",
    "ou": "IT",
    "sans": ["www.example.com", "api.example.com"]
  },
  "validationType": "dv",
  "certificateType": "san",
  "networkConfiguration": {
    "geography": "core",
    "secureNetwork": "enhanced-tls",
    "mustHaveCiphers": "ak-akamai-default",
    "preferredCiphers": "ak-akamai-default",
    "disallowedTlsVersions": ["TLSv1", "TLSv1_1"]
  },
  "signatureAlgorithm": "SHA-256",
  "techContact": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-1234"
  },
  "adminContact": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@example.com",
    "phone": "+1-555-5678"
  },
  "org": {
    "name": "Example Inc",
    "addressLineOne": "123 Main St",
    "city": "Cambridge",
    "region": "MA",
    "postalCode": "02142",
    "country": "US",
    "phone": "+1-555-0000"
  }
}
```

### Deploy Certificate
**Endpoint**: `POST /cps/v2/enrollments/{enrollmentId}/deployments`

**MCP Function**: `certs.deployment.create`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| enrollmentId | number | Yes | Enrollment ID |

**Request Body**:
```json
{
  "networkConfiguration": {
    "geography": "core",
    "secureNetwork": "enhanced-tls",
    "mustHaveCiphers": "ak-akamai-default",
    "preferredCiphers": "ak-akamai-default",
    "disallowedTlsVersions": ["TLSv1", "TLSv1_1"]
  }
}
```

## Application Security API

Base URL: `https://{host}/appsec/v1`

### List Security Configurations
**Endpoint**: `GET /appsec/v1/configs`

**MCP Function**: `security.config.list`

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| detail | boolean | No | false | Include details |
| offset | number | No | 0 | Pagination offset |
| limit | number | No | 100 | Results limit |

### Create Security Configuration
**Endpoint**: `POST /appsec/v1/configs`

**MCP Function**: `security.config.create`

**Request Body**:
```json
{
  "name": "Example Security Config",
  "description": "Security configuration for example.com",
  "contractId": "1-2ABC3D",
  "groupId": 12345,
  "hostnames": ["example.com", "www.example.com"],
  "notes": "Initial configuration"
}
```

### Get Security Policy
**Endpoint**: `GET /appsec/v1/configs/{configId}/versions/{version}/security-policies/{policyId}`

**MCP Function**: `security.policy.get`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| configId | number | Yes | Configuration ID |
| version | number | Yes | Version number |
| policyId | string | Yes | Policy ID |

### Create WAF Rule Action
**Endpoint**: `PUT /appsec/v1/configs/{configId}/versions/{version}/security-policies/{policyId}/rules/{ruleId}/rule-actions`

**MCP Function**: `security.waf.rule.action.update`

**Request Body**:
```json
{
  "action": "alert",
  "conditionException": {
    "conditions": [{
      "type": "requestHeaderValueMatch",
      "positiveMatch": true,
      "header": "User-Agent",
      "value": ["bot", "crawler"],
      "valueCase": false,
      "valueWildcard": true
    }]
  }
}
```

## Network Lists API

Base URL: `https://{host}/network-list/v2`

### List Network Lists
**Endpoint**: `GET /network-list/v2/network-lists`

**MCP Function**: `security.network-list.list`

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| search | string | No | - | Search term |
| listType | string | No | - | List type (IP, GEO) |
| includeElements | boolean | No | false | Include list elements |

### Create Network List
**Endpoint**: `POST /network-list/v2/network-lists`

**MCP Function**: `security.network-list.create`

**Request Body**:
```json
{
  "name": "Blocked IPs",
  "type": "IP",
  "description": "List of blocked IP addresses",
  "list": ["192.0.2.0/24", "198.51.100.0/24"]
}
```

### Update Network List
**Endpoint**: `PUT /network-list/v2/network-lists/{uniqueId}`

**MCP Function**: `security.network-list.update`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| uniqueId | string | Yes | Network list ID |

**Request Body**:
```json
{
  "name": "Updated Blocked IPs",
  "type": "IP",
  "description": "Updated list of blocked IP addresses",
  "list": ["192.0.2.0/24", "198.51.100.0/24", "203.0.113.0/24"],
  "syncPoint": 1
}
```

## Fast Purge API

Base URL: `https://{host}/ccu/v3`

### Invalidate by URL
**Endpoint**: `POST /ccu/v3/invalidate/url/{network}`

**MCP Function**: `purge.cache.invalidate.url`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | string | Yes | Network (staging/production) |

**Request Body**:
```json
{
  "objects": [
    "https://example.com/path/to/file.js",
    "https://example.com/images/logo.png"
  ]
}
```

### Invalidate by CP Code
**Endpoint**: `POST /ccu/v3/invalidate/cpcode/{network}`

**MCP Function**: `purge.cache.invalidate.cpcode`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | string | Yes | Network (staging/production) |

**Request Body**:
```json
{
  "objects": [123456, 789012]
}
```

### Get Purge Status
**Endpoint**: `GET /ccu/v3/purges/{purgeId}`

**MCP Function**: `purge.status`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| purgeId | string | Yes | Purge request ID |

**Response Format**:
```json
{
  "purgeId": "12345678-1234-1234-1234-123456789012",
  "purgeStatus": "Done",
  "submittedBy": "user@example.com",
  "submissionTime": "2024-01-15T10:30:00Z",
  "completionTime": "2024-01-15T10:35:00Z"
}
```

## Reporting API

Base URL: `https://{host}/reporting/v1`

### Get Bandwidth Report
**Endpoint**: `GET /reporting/v1/reports/bandwidth`

**MCP Function**: `reporting.bandwidth`

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| start | string | Yes | - | Start time (ISO 8601) |
| end | string | Yes | - | End time (ISO 8601) |
| interval | string | No | HOUR | Time interval |
| cpCodes | string | No | - | CP codes (comma-separated) |
| metrics | string | No | all | Metrics to include |

**Response Format**:
```json
{
  "data": [{
    "cpcode": 123456,
    "time": "2024-01-15T10:00:00Z",
    "bandwidth": {
      "edge": 1234567890,
      "origin": 123456789
    }
  }],
  "summaries": {
    "edge": {
      "total": 9876543210,
      "average": 123456789,
      "peak": 234567890
    }
  }
}
```

### Get Cache Hit Ratio
**Endpoint**: `GET /reporting/v1/reports/cache-metrics`

**MCP Function**: `reporting.cache.metrics`

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| start | string | Yes | - | Start time |
| end | string | Yes | - | End time |
| interval | string | No | HOUR | Time interval |
| cpCodes | string | No | - | CP codes |
| metrics | string | No | all | Metrics to include |

### Get Error Statistics
**Endpoint**: `GET /reporting/v1/reports/errors`

**MCP Function**: `reporting.errors`

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| start | string | Yes | - | Start time |
| end | string | Yes | - | End time |
| errorClass | string | No | all | Error class filter |
| cpCodes | string | No | - | CP codes |

## Common Response Codes

All APIs use standard HTTP response codes:

| Code | Description | Common Causes |
|------|-------------|---------------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 204 | No Content | Successful deletion |
| 400 | Bad Request | Invalid parameters or request body |
| 401 | Unauthorized | Invalid or missing authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource state conflict |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Temporary service issue |

## Rate Limiting

All APIs implement rate limiting:
- Default: 300 requests per minute per client
- Burst: Up to 50 requests in 10 seconds
- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Response Format

All APIs return errors in a consistent format:

```json
{
  "type": "/problem-types/invalid-parameter",
  "title": "Invalid Parameter",
  "status": 400,
  "detail": "The propertyId parameter is invalid",
  "instance": "/papi/v1/properties/invalid-id",
  "errors": [{
    "type": "/problem-types/invalid-format",
    "title": "Invalid Format",
    "detail": "propertyId must start with 'prp_'",
    "field": "propertyId"
  }]
}
```

## Best Practices

1. **Always include contractId and groupId** for PAPI operations
2. **Use account switching** for multi-tenant operations
3. **Implement exponential backoff** for rate limit handling
4. **Validate parameters client-side** to reduce API errors
5. **Use bulk operations** where available
6. **Cache responses** appropriately (respect Cache-Control headers)
7. **Monitor rate limit headers** to avoid 429 errors
8. **Use pagination** for large result sets
9. **Handle async operations** with polling
10. **Log request IDs** for troubleshooting