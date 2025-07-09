# ALECS API Reference

## Overview

ALECS (Akamai Labs Edge Configuration Service) provides 156 tools across 14 domains for managing Akamai's CDN and edge services. All tools follow a consistent pattern using snake_case naming convention: `domain_action_target`.

### Authentication

All tools support multi-customer authentication through the `customer` parameter, which references a section in your `.edgerc` configuration file. If not specified, the default section is used.

### Common Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `customer` | string (optional) | Customer configuration section from .edgerc |

### Response Format

All tools return a consistent MCPToolResponse structure:
```json
{
  "data": {}, // Tool-specific response data
  "metadata": {
    "customer": "default",
    "executionTime": 1234,
    "cacheStatus": "miss",
    "apiCallsCount": 1
  }
}
```

## Property Management Tools (25 tools)

The Property Manager domain provides comprehensive tools for managing CDN properties, including creation, configuration, activation, and bulk operations.

### property_list
List all properties with optional filtering

**Parameters:**
- `customer` (string, optional): Customer configuration section
- `contractId` (string, optional): Filter by contract ID (format: ctr_C-XXXXXX)
- `groupId` (string, optional): Filter by group ID (format: grp_123456)
- `limit` (number, optional): Maximum results (default: 100, max: 1000)
- `offset` (number, optional): Pagination offset

**Example:**
```json
{
  "customer": "production",
  "contractId": "ctr_C-1FRYVV3",
  "limit": 50
}
```

### property_create
Create a new property

**Parameters:**
- `propertyName` (string, required): Name for the new property
- `contractId` (string, required): Contract ID (format: ctr_C-XXXXXX)
- `groupId` (string, required): Group ID (format: grp_123456)
- `productId` (string, required): Product ID (e.g., prd_Web_App_Accel)
- `ruleFormat` (string, optional): Rule format version
- `customer` (string, optional): Customer configuration section

**Validation:**
- Property name must be unique within the contract
- Contract must have the specified product available
- User must have write permissions for the group

### property_get
Get property details

**Parameters:**
- `propertyId` (string, required): Property ID (format: prp_123456)
- `version` (number, optional): Specific version to retrieve (latest if not specified)
- `customer` (string, optional): Customer configuration section

### property_activate
Activate property to staging or production

**Parameters:**
- `propertyId` (string, required): Property ID (format: prp_123456)
- `version` (number, required): Version number to activate
- `network` (string, required): Target network (STAGING or PRODUCTION)
- `notes` (string, optional): Activation notes
- `notifyEmails` (array[string], optional): Email addresses for notifications
- `acknowledgeWarnings` (boolean, optional): Acknowledge validation warnings
- `customer` (string, optional): Customer configuration section

**Important Notes:**
- Staging activation is required before production
- Production activation may require compliance record
- Activation is asynchronous - use property_activation_status to track

### property_rules_update
Update property rules

**Parameters:**
- `propertyId` (string, required): Property ID
- `version` (number, required): Version to update
- `rules` (object, required): Complete rule tree structure
- `validateRules` (boolean, optional): Validate before saving (default: true)
- `customer` (string, optional): Customer configuration section

**Rule Tree Structure:**
```json
{
  "name": "default",
  "children": [],
  "behaviors": [
    {
      "name": "origin",
      "options": {
        "originType": "CUSTOMER",
        "hostname": "origin.example.com"
      }
    }
  ]
}
```

### property_bulk_activate
Bulk activate multiple properties

**Parameters:**
- `propertyIds` (array[string], required): List of property IDs
- `network` (string, required): Target network
- `notes` (string, optional): Activation notes
- `customer` (string, optional): Customer configuration section

## DNS Management Tools (12 tools)

Edge DNS tools provide complete zone and record management capabilities with DNSSEC support.

### dns_zones_list
List all DNS zones

**Parameters:**
- `contractIds` (array[string], optional): Filter by contracts
- `types` (array[string], optional): Filter by zone types (PRIMARY, SECONDARY, ALIAS)
- `search` (string, optional): Search by zone name
- `showAll` (boolean, optional): Include all zones
- `customer` (string, optional): Customer configuration section

### dns_zone_create
Create a new DNS zone

**Parameters:**
- `zone` (string, required): Zone name (e.g., example.com)
- `type` (string, required): Zone type (PRIMARY, SECONDARY, or ALIAS)
- `contractId` (string, required): Contract ID
- `groupId` (number, optional): Group ID
- `comment` (string, optional): Zone comment
- `signAndServe` (boolean, optional): Enable DNSSEC
- `masters` (array[string], optional): Master IPs for SECONDARY zones
- `tsigKey` (object, optional): TSIG authentication for SECONDARY zones
- `target` (string, optional): Target zone for ALIAS zones
- `customer` (string, optional): Customer configuration section

**Validation:**
- Zone name must be valid DNS format
- SECONDARY zones require masters array
- ALIAS zones require target zone

### dns_record_upsert
Create or update a DNS record

**Parameters:**
- `zone` (string, required): Zone name
- `name` (string, required): Record name (e.g., www, @)
- `type` (string, required): Record type (A, AAAA, CNAME, MX, TXT, etc.)
- `ttl` (number, required): Time to live (30-86400)
- `rdata` (array[string], required): Record data values
- `comment` (string, optional): Record comment
- `customer` (string, optional): Customer configuration section

**Record Type Examples:**
- A: `["192.0.2.1"]`
- CNAME: `["target.example.com"]`
- MX: `["10 mail.example.com"]`
- TXT: `["v=spf1 include:_spf.example.com ~all"]`

### dns_zone_activate
Activate pending zone changes

**Parameters:**
- `zone` (string, required): Zone name
- `comment` (string, optional): Activation comment
- `customer` (string, optional): Customer configuration section

## Certificate Management Tools (8 tools)

Manage SSL/TLS certificates with focus on Domain Validation (DV) certificates.

### certificate_dv_create
Create a Domain Validated (DV) certificate enrollment

**Parameters:**
- `contractId` (string, required): Contract ID
- `csr` (object, required): Certificate signing request details
  - `cn` (string): Common name
  - `c` (string): Country code
  - `st` (string): State
  - `l` (string): Locality
  - `o` (string): Organization
  - `ou` (string, optional): Organizational unit
  - `sans` (array[string], optional): Subject alternative names
- `validationType` (string, required): Validation type (dv)
- `networkConfiguration` (object, required): Network configuration
  - `geography` (string): Geographic scope (core, china+core, russia+core)
  - `networkType` (string): Network type (standard-tls, enhanced-tls)
- `signatureAlgorithm` (string, optional): Algorithm (SHA-256, SHA-1)
- `customer` (string, optional): Customer configuration section

### certificate_validation_get
Get domain validation challenges

**Parameters:**
- `enrollmentId` (number, required): Certificate enrollment ID
- `customer` (string, optional): Customer configuration section

**Response includes:**
- DNS validation records to create
- HTTP validation tokens
- Validation status per domain

## Security Tools (47 tools)

Comprehensive security configuration including WAF, bot management, rate controls, and network lists.

### security_waf_policy_create
Create new WAF security policy

**Parameters:**
- `configId` (number, required): Security configuration ID
- `version` (number, optional): Version number
- `policyName` (string, required): WAF policy name
- `customer` (string, optional): Customer configuration section

### security_network_list_create
Create a new network list

**Parameters:**
- `name` (string, required): Network list name
- `type` (string, required): List type (IP, GEO, ASN)
- `description` (string, required): List description
- `elements` (array[string], required): Initial elements
- `contractId` (string, optional): Contract ID
- `groupId` (number, optional): Group ID
- `customer` (string, optional): Customer configuration section

**Element Formats:**
- IP: `["192.0.2.0/24", "198.51.100.1"]`
- GEO: `["US", "CA", "GB"]`
- ASN: `["AS13335", "AS32934"]`

### security_rate_control_create
Create rate control policy for DDoS protection

**Parameters:**
- `configId` (number, required): Security configuration ID
- `version` (number, optional): Version number
- `policyName` (string, required): Rate control policy name
- `hostnames` (array[string], required): Protected hostnames
- `averageThreshold` (number, required): Average rate threshold
- `burstThreshold` (number, required): Burst rate threshold
- `clientIdentifier` (string, optional): Client identification method
- `pathPatterns` (array[string], optional): Protected paths
- `customer` (string, optional): Customer configuration section

### security_bot_configure
Configure Bot Management settings

**Parameters:**
- `configId` (number, required): Security configuration ID
- `version` (number, optional): Version number
- `policyId` (string, required): Security policy ID
- `javascriptInjection` (boolean, required): Enable JS injection
- `botManagementCookies` (boolean, required): Enable bot cookies
- `customer` (string, optional): Customer configuration section

## Fast Purge Tools (8 tools)

Content invalidation and cache management tools.

### fastpurge_url
Purge content by URL

**Parameters:**
- `urls` (array[string], required): URLs to purge (max 50)
- `action` (string, optional): Purge action (invalidate or delete, default: invalidate)
- `customer` (string, optional): Customer configuration section

**Example:**
```json
{
  "urls": [
    "https://www.example.com/image.jpg",
    "https://www.example.com/style.css"
  ],
  "action": "invalidate"
}
```

### fastpurge_cpcode
Purge content by CP code

**Parameters:**
- `cpcode` (number, required): CP code to purge
- `customer` (string, optional): Customer configuration section

### fastpurge_tag
Purge content by cache tag

**Parameters:**
- `tags` (array[string], required): Cache tags to purge
- `customer` (string, optional): Customer configuration section

## Reporting Tools (9 tools)

Analytics and performance reporting across various metrics.

### reporting_traffic
Get traffic analytics report

**Parameters:**
- `startDate` (string, required): Start date (ISO format)
- `endDate` (string, required): End date (ISO format)
- `metrics` (array[string], optional): Specific metrics to include
- `dimensions` (array[string], optional): Group by dimensions
- `filters` (object, optional): Filter criteria
- `customer` (string, optional): Customer configuration section

**Available Metrics:**
- edgeHits, edgeBandwidth, originHits, originBandwidth
- edgeStatusCodeDistribution, cacheHitRatio
- averageResponseTime, peakBandwidth

### reporting_real_time
Get real-time traffic and performance metrics

**Parameters:**
- `cpcode` (number, optional): Filter by CP code
- `propertyId` (string, optional): Filter by property
- `duration` (string, optional): Time window (5m, 15m, 1h)
- `customer` (string, optional): Customer configuration section

### reporting_security_threats
Get security threat analysis report

**Parameters:**
- `startDate` (string, required): Start date
- `endDate` (string, required): End date
- `configId` (number, optional): Security configuration ID
- `threatTypes` (array[string], optional): Specific threat types
- `customer` (string, optional): Customer configuration section

## Orchestration Tools (7 tools)

Workflow automation for complex multi-step operations.

### workflow_site_migration
Migrate a complete site to Akamai

**Parameters:**
- `siteDomain` (string, required): Domain to migrate
- `originHostname` (string, required): Origin server hostname
- `contractId` (string, required): Target contract
- `groupId` (string, required): Target group
- `productId` (string, required): CDN product
- `edgeHostnameDomain` (string, optional): Edge hostname domain
- `includeDNS` (boolean, optional): Migrate DNS (default: true)
- `includeSSL` (boolean, optional): Setup SSL (default: true)
- `customer` (string, optional): Customer configuration section

### workflow_deployment_zero_downtime
Deploy changes with automatic rollback

**Parameters:**
- `propertyId` (string, required): Property to deploy
- `version` (number, required): Version to deploy
- `healthCheckUrl` (string, required): URL for health checks
- `healthCheckInterval` (number, optional): Check interval in seconds
- `rollbackThreshold` (number, optional): Error threshold for rollback
- `customer` (string, optional): Customer configuration section

## Error Handling

All tools follow consistent error handling patterns:

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| 400 | Bad Request | Check parameter validation |
| 401 | Authentication Failed | Verify .edgerc credentials |
| 403 | Forbidden | Check permissions for resource |
| 404 | Not Found | Verify resource ID exists |
| 429 | Rate Limited | Implement retry with backoff |
| 500 | Server Error | Contact support if persistent |

### Error Response Format
```json
{
  "error": {
    "type": "https://problems.akamai.com/api/errors/forbidden",
    "title": "Forbidden",
    "status": 403,
    "detail": "You do not have permission to access this property",
    "instance": "/papi/v1/properties/prp_123456"
  }
}
```

## Best Practices

1. **Authentication**: Always specify the correct `customer` parameter for multi-tenant environments
2. **Validation**: Use the schema validation to catch errors before API calls
3. **Async Operations**: Check status of long-running operations (activations, purges)
4. **Rate Limiting**: Implement exponential backoff for 429 errors
5. **Bulk Operations**: Use bulk tools when operating on multiple resources
6. **Error Handling**: Always handle specific error codes appropriately

## Additional Resources

- [Akamai API Documentation](https://techdocs.akamai.com/home/page/products-tools-a-z)
- [Property Manager API](https://techdocs.akamai.com/property-mgr/reference/api)
- [Edge DNS API](https://techdocs.akamai.com/edge-dns/reference/api)
- [Application Security API](https://techdocs.akamai.com/application-security/reference/api)