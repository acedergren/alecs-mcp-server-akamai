# Comprehensive Akamai API Endpoints Analysis for ALECS MCP Server

This document provides a complete analysis of all Akamai API endpoints used in the ALECS MCP Server codebase, organized by functional domain with detailed information about HTTP methods, URL patterns, authentication, and parameters.

## Table of Contents

1. [Authentication & Infrastructure](#authentication--infrastructure)
2. [Property Manager API (PAPI)](#property-manager-api-papi)
3. [Edge DNS API](#edge-dns-api)
4. [Certificate Provisioning System (CPS)](#certificate-provisioning-system-cps)
5. [FastPurge API (CCU v3)](#fastpurge-api-ccu-v3)
6. [Application Security API (APPSEC)](#application-security-api-appsec)
7. [Network Lists API](#network-lists-api)
8. [Reporting API](#reporting-api)
9. [Rate Limiting & Error Handling](#rate-limiting--error-handling)
10. [Summary Statistics](#summary-statistics)

---

## Authentication & Infrastructure

### Authentication Method
- **Type**: EdgeGrid Authentication (EG1-HMAC-SHA256)
- **Headers**: Authorization with client_token, access_token, timestamp, nonce, signature
- **Account Switching**: Optional `AKAMAI-ACCOUNT-SWITCH-KEY` header
- **Base URL Pattern**: `https://{hostname}.luna.akamaiapis.net`

### Multi-Customer Support
The ALECS MCP Server supports multiple customer configurations through:
- Customer-specific EdgeGrid credentials in `.edgerc` file sections
- Account switching keys for cross-account operations
- Customer parameter in all API calls for proper credential routing

---

## Property Manager API (PAPI)

**Base Path**: `/papi/v1/`
**Total Endpoints**: 18+

### Core Property Management

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/papi/v1/groups` | List groups and contracts | None |
| GET | `/papi/v1/contracts` | List contracts | None |
| GET | `/papi/v1/products` | List available products | `contractId` |
| GET | `/papi/v1/properties` | List properties | `contractId`, `groupId` |
| GET | `/papi/v1/properties/{propertyId}` | Get property details | `contractId`, `groupId` |
| POST | `/papi/v1/properties` | Create new property | `contractId`, `groupId` |

### Property Versions & Configuration

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/papi/v1/properties/{propertyId}/versions` | List property versions | None |
| GET | `/papi/v1/properties/{propertyId}/versions/{version}` | Get version details | None |
| POST | `/papi/v1/properties/{propertyId}/versions` | Create new version | `createFromVersion` |
| GET | `/papi/v1/properties/{propertyId}/versions/{version}/rules` | Get property rules | `validateRules`, `validateMode` |
| PUT | `/papi/v1/properties/{propertyId}/versions/{version}/rules` | Update property rules | rules (body) |

### Property Hostnames

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/papi/v1/properties/{propertyId}/hostnames` | Get property hostnames | None |
| GET | `/papi/v1/properties/{propertyId}/versions/{version}/hostnames` | Get version hostnames | None |
| PUT | `/papi/v1/properties/{propertyId}/versions/{version}/hostnames` | Update hostnames | hostnames (body) |

### Property Activations

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/papi/v1/properties/{propertyId}/activations` | List activations | None |
| POST | `/papi/v1/properties/{propertyId}/activations` | Activate property | `network`, `version`, `note` |
| GET | `/papi/v1/properties/{propertyId}/activations/{activationId}` | Get activation status | None |

### Edge Hostnames & Infrastructure

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/papi/v1/edgehostnames` | List edge hostnames | `contractId`, `groupId` |
| POST | `/papi/v1/edgehostnames` | Create edge hostname | `contractId`, `groupId` |
| GET | `/papi/v1/cpcodes` | List CP codes | `contractId`, `groupId` |
| POST | `/papi/v1/cpcodes` | Create CP code | `contractId`, `groupId` |
| GET | `/papi/v1/rule-formats` | List rule formats | None |

---

## Edge DNS API

**Base Path**: `/config-dns/v2/`
**Total Endpoints**: 12+

### Zone Management

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/config-dns/v2/zones` | List DNS zones | `contractIds`, `includeAliases`, `search` |
| GET | `/config-dns/v2/zones/{zone}` | Get zone details | None |
| POST | `/config-dns/v2/zones` | Create DNS zone | `contractId`, `gid` |
| DELETE | `/config-dns/v2/zones/{zone}` | Delete DNS zone | None |

### Record Management

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/config-dns/v2/zones/{zone}/recordsets` | List zone records | `search`, `types` |
| GET | `/config-dns/v2/zones/{zone}/recordsets/{name}/{type}` | Get specific record | None |
| PUT | `/config-dns/v2/zones/{zone}/recordsets/{name}/{type}` | Create/update record | record data (body) |
| DELETE | `/config-dns/v2/zones/{zone}/recordsets/{name}/{type}` | Delete record | None |

### Change List Workflow

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/config-dns/v2/changelists/{zone}` | Get zone changelist | None |
| POST | `/config-dns/v2/changelists` | Create changelist | `zone` |
| DELETE | `/config-dns/v2/changelists/{zone}` | Discard changelist | None |
| POST | `/config-dns/v2/changelists/{zone}/submit` | Submit changelist | `comment`, `validateOnly` |

### Zone Status & Monitoring

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/config-dns/v2/zones/{zone}/status` | Get zone activation status | None |

---

## Certificate Provisioning System (CPS)

**Base Path**: `/cps/v2/`
**Total Endpoints**: 8+

### Certificate Enrollments

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/cps/v2/enrollments` | List certificate enrollments | `contractId` |
| GET | `/cps/v2/enrollments/{enrollmentId}` | Get enrollment details | None |
| POST | `/cps/v2/enrollments` | Create new enrollment | `contractId` |

### Certificate Deployment

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/cps/v2/enrollments/{enrollmentId}/deployments/staging` | Get staging deployment | None |
| GET | `/cps/v2/enrollments/{enrollmentId}/deployments/production` | Get production deployment | None |
| POST | `/cps/v2/enrollments/{enrollmentId}/deployments` | Create deployment | None |

### Certificate History & Management

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/cps/v2/enrollments/{enrollmentId}/history/certificates` | Get certificate history | None |
| GET | `/cps/v2/enrollments/{enrollmentId}/change-management` | Get change management | None |

---

## FastPurge API (CCU v3)

**Base Path**: `/ccu/v3/`
**Total Endpoints**: 7+

### Invalidation Operations

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| POST | `/ccu/v3/invalidate/url/{network}` | Purge by URL | `network` (staging/production) |
| POST | `/ccu/v3/invalidate/cpcode/{network}` | Purge by CP code | `network` (staging/production) |
| POST | `/ccu/v3/invalidate/tag/{network}` | Purge by cache tag | `network` (staging/production) |

### Delete Operations

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| POST | `/ccu/v3/delete/url/{network}` | Delete by URL | `network` (staging/production) |
| POST | `/ccu/v3/delete/cpcode/{network}` | Delete by CP code | `network` (staging/production) |
| POST | `/ccu/v3/delete/tag/{network}` | Delete by cache tag | `network` (staging/production) |

### Status & Monitoring

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/ccu/v3/purges/{purgeId}` | Check purge status | None |

---

## Application Security API (APPSEC)

**Base Path**: `/appsec/v1/`
**Total Endpoints**: 12+

### Security Configurations

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/appsec/v1/configs` | List security configurations | None |
| GET | `/appsec/v1/configs/{configId}` | Get configuration details | `version` |
| POST | `/appsec/v1/configs` | Create security configuration | None |

### Security Policies

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/appsec/v1/configs/{configId}/versions/{version}/security-policies` | List policies | None |
| POST | `/appsec/v1/configs/{configId}/versions/{version}/security-policies` | Create WAF policy | None |
| GET | `/appsec/v1/configs/{configId}/versions/{version}/security-policies/{policyId}` | Get policy details | None |

### Configuration Activations

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/appsec/v1/configs/{configId}/activations` | List activations | None |
| POST | `/appsec/v1/configs/{configId}/versions/{version}/activations` | Activate configuration | None |
| GET | `/appsec/v1/configs/{configId}/activations/{activationId}` | Get activation status | None |

### Security Events & Monitoring

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/appsec/v1/configs/{configId}/security-events` | Get security events | `from`, `to`, `limit` |

### WAF Rules & Policies

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/appsec/v1/configs/{configId}/versions/{version}/security-policies/{policyId}/rules` | List WAF rules | None |
| PUT | `/appsec/v1/configs/{configId}/versions/{version}/security-policies/{policyId}/rules/{ruleId}` | Update WAF rule | None |

---

## Network Lists API

**Base Path**: `/network-list/v2/`
**Total Endpoints**: 8+

### Network List Management

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/network-list/v2/network-lists` | List network lists | `listType`, `search`, `includeElements` |
| GET | `/network-list/v2/network-lists/{uniqueId}` | Get network list details | `includeElements`, `extended` |
| POST | `/network-list/v2/network-lists` | Create network list | None |
| PUT | `/network-list/v2/network-lists/{uniqueId}` | Update network list | None |
| DELETE | `/network-list/v2/network-lists/{uniqueId}` | Delete network list | None |

### Network List Activations

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/network-list/v2/network-lists/activations` | List activations | None |
| POST | `/network-list/v2/network-lists/activations` | Activate network list | None |
| GET | `/network-list/v2/network-lists/activations/{activationId}` | Get activation status | None |

---

## Reporting API

**Base Path**: `/reporting/v1/`
**Total Endpoints**: 20+

### Traffic Analytics

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/reporting/v1/reports/bandwidth` | Get bandwidth data | `start`, `end`, `granularity` |
| GET | `/reporting/v1/reports/bandwidth-by-hostname` | Bandwidth by hostname | `start`, `end`, `granularity` |
| GET | `/reporting/v1/reports/bandwidth-by-region` | Bandwidth by region | `start`, `end`, `granularity` |
| GET | `/reporting/v1/reports/bandwidth-by-content-type` | Bandwidth by content type | `start`, `end`, `granularity` |
| GET | `/reporting/v1/reports/requests` | Get request data | `start`, `end`, `granularity` |
| GET | `/reporting/v1/reports/errors` | Get error data | `start`, `end`, `granularity` |

### Cache Performance

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/reporting/v1/reports/cache-metrics` | Cache performance metrics | `start`, `end`, `granularity` |
| GET | `/reporting/v1/reports/cache-miss-reasons` | Cache miss analysis | `start`, `end`, `granularity` |
| GET | `/reporting/v1/reports/cache-by-content-type` | Cache by content type | `start`, `end`, `granularity` |

### Request Analytics

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| GET | `/reporting/v1/reports/request-metrics` | Request performance | `start`, `end`, `granularity` |
| GET | `/reporting/v1/reports/requests-by-method` | Requests by HTTP method | `start`, `end`, `granularity` |
| GET | `/reporting/v1/reports/requests-by-status` | Requests by status code | `start`, `end`, `granularity` |
| GET | `/reporting/v1/reports/top-endpoints` | Top requested endpoints | `start`, `end`, `granularity` |
| GET | `/reporting/v1/reports/bot-traffic` | Bot traffic analysis | `start`, `end`, `granularity` |

### Dashboard & Configuration

| HTTP Method | Endpoint Pattern | Purpose | Key Parameters |
|-------------|------------------|---------|----------------|
| POST | `/reporting/v1/dashboards` | Create dashboard | None |
| GET | `/reporting/v1/dashboards/{id}` | Get dashboard | None |
| PUT | `/reporting/v1/dashboards/{id}` | Update dashboard | None |
| PUT | `/reporting/v1/alerts/configuration` | Configure alerts | None |
| GET | `/reporting/v1/alerts/configuration` | Get alert config | None |

---

## Rate Limiting & Error Handling

### Rate Limiting Headers
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets (Unix timestamp)
- `X-RateLimit-Window`: Rate limit window duration
- `Retry-After`: Seconds to wait when rate limited (429 responses)

### Error Response Format (RFC 7807)
```json
{
  "type": "https://problems.akamai.com/api-error-type",
  "title": "Error Title",
  "detail": "Detailed error description",
  "status": 400,
  "instance": "/api/v1/resource/123",
  "errors": [
    {
      "type": "validation-error",
      "title": "Invalid Parameter",
      "detail": "Parameter must be a valid format"
    }
  ]
}
```

### HTTP Status Codes Used
- **200**: Success
- **201**: Created
- **204**: No Content
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Unprocessable Entity
- **429**: Too Many Requests
- **500**: Internal Server Error
- **503**: Service Unavailable

---

## Summary Statistics

### Total API Endpoints by Domain
| API Domain | Endpoint Count | Primary Methods |
|------------|----------------|-----------------|
| Property Manager (PAPI) | 18+ | GET, POST, PUT |
| Edge DNS | 12+ | GET, POST, PUT, DELETE |
| Certificate Provisioning (CPS) | 8+ | GET, POST |
| FastPurge (CCU) | 7+ | GET, POST |
| Application Security | 12+ | GET, POST, PUT |
| Network Lists | 8+ | GET, POST, PUT, DELETE |
| Reporting | 20+ | GET, POST, PUT |
| **TOTAL** | **85+** | All REST methods |

### Authentication & Infrastructure
- **Authentication Method**: EdgeGrid (EG1-HMAC-SHA256)
- **Multi-Customer Support**: Yes (via .edgerc sections and account switching)
- **Rate Limiting**: Comprehensive across all APIs
- **Error Handling**: Standardized RFC 7807 format
- **Base URL Pattern**: `https://{hostname}.luna.akamaiapis.net`

### Key Features Supported
1. **CDN Property Management**: Complete CRUD operations
2. **DNS Zone & Record Management**: Full DNS lifecycle
3. **SSL/TLS Certificate Provisioning**: DV and EV certificates
4. **Content Cache Management**: URL, CP Code, and Tag-based purging
5. **Security Configuration**: WAF policies and network lists
6. **Analytics & Reporting**: Comprehensive traffic and performance metrics
7. **Multi-Tenant Operations**: Customer-specific credential management
8. **Asynchronous Operations**: Polling-based status monitoring

### Implementation Quality
- **Type Safety**: Full TypeScript typing for all endpoints
- **Error Recovery**: Exponential backoff and retry logic
- **Resilience**: Circuit breaker patterns and rate limiting
- **Monitoring**: Comprehensive logging and operation tracking
- **Testing**: Extensive test coverage for all API integrations

This analysis demonstrates that the ALECS MCP Server provides comprehensive coverage of Akamai's API ecosystem, enabling complete CDN, DNS, security, and certificate management workflows through a unified MCP interface.