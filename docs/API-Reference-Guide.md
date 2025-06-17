# API Reference Guide

This comprehensive reference guide documents all available MCP tools in the Akamai MCP server, organized by service category.

## Table of Contents

1. [Overview](#overview)
2. [Property Manager Tools](#property-manager-tools)
3. [Edge DNS Tools](#edge-dns-tools)
4. [FastPurge Tools](#fastpurge-tools)
5. [Certificate Management Tools](#certificate-management-tools)
6. [Hostname Management Tools](#hostname-management-tools)
7. [Bulk Operations Tools](#bulk-operations-tools)
8. [Monitoring and Analytics Tools](#monitoring-and-analytics-tools)
9. [Common Parameters](#common-parameters)
10. [Error Handling](#error-handling)

## Overview

The Akamai MCP server provides a comprehensive set of tools for managing Akamai CDN services. All tools follow the MCP (Model Context Protocol) specification and support multi-customer operations through the `customer` parameter.

### Authentication

All tools use Akamai EdgeGrid authentication configured in the `.edgerc` file. The `customer` parameter specifies which section of the `.edgerc` file to use for authentication.

### Common Response Format

All tools return responses in the following format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Operation result message"
    }
  ],
  "isError": false
}
```

For errors:

```json
{
  "content": [
    {
      "type": "text", 
      "text": "Error description"
    }
  ],
  "isError": true
}
```

## Property Manager Tools

### property_list

List all properties in the account.

**Parameters:**
- `contractId` (string, optional): Filter by contract ID
- `groupId` (string, optional): Filter by group ID
- `customer` (string, optional): Customer section from .edgerc (default: "default")

**Example:**
```json
{
  "contractId": "ctr_C-1234567",
  "groupId": "grp_12345", 
  "customer": "customer1"
}
```

### property_get

Get detailed information about a specific property.

**Parameters:**
- `propertyId` (string, required): Property ID, name, or hostname to search for
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "propertyId": "prp_12345",
  "customer": "customer1"
}
```

### property_create

Create a new CDN property.

**Parameters:**
- `propertyName` (string, required): Name for the new property
- `productId` (string, required): Product ID (e.g., "prd_fresca")
- `contractId` (string, required): Contract ID for billing
- `groupId` (string, required): Group ID for organization
- `ruleFormat` (string, optional): Rule format version
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "propertyName": "example-com-property",
  "productId": "prd_fresca",
  "contractId": "ctr_C-1234567",
  "groupId": "grp_12345",
  "customer": "customer1"
}
```

### property_get_rules

Get the rule tree for a property version.

**Parameters:**
- `propertyId` (string, required): Property ID
- `version` (number, optional): Version number (defaults to latest)
- `contractId` (string, optional): Contract ID
- `groupId` (string, optional): Group ID
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "propertyId": "prp_12345",
  "version": 1,
  "customer": "customer1"
}
```

### property_update_rules

Update the rule tree for a property version.

**Parameters:**
- `propertyId` (string, required): Property ID
- `contractId` (string, required): Contract ID
- `groupId` (string, required): Group ID
- `rules` (object, required): Complete rule tree
- `version` (number, optional): Version number (defaults to latest)
- `note` (string, optional): Update notes
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "propertyId": "prp_12345",
  "contractId": "ctr_C-1234567",
  "groupId": "grp_12345",
  "rules": {
    "name": "default",
    "criteria": [],
    "behaviors": [
      {
        "name": "origin",
        "options": {
          "originType": "CUSTOMER",
          "hostname": "origin.example.com"
        }
      }
    ],
    "children": []
  },
  "customer": "customer1"
}
```

### property_activate

Activate a property version to staging or production.

**Parameters:**
- `propertyId` (string, required): Property ID
- `network` (string, required): Target network ("STAGING" or "PRODUCTION")
- `version` (number, optional): Version to activate (defaults to latest)
- `note` (string, optional): Activation notes
- `notifyEmails` (array, optional): Email addresses to notify
- `acknowledgeAllWarnings` (boolean, optional): Acknowledge all warnings
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "propertyId": "prp_12345",
  "network": "STAGING",
  "note": "Staging deployment for testing",
  "notifyEmails": ["dev-team@example.com"],
  "customer": "customer1"
}
```

### property_get_activation_status

Get the status of a property activation.

**Parameters:**
- `propertyId` (string, required): Property ID
- `activationId` (string, required): Activation ID
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "propertyId": "prp_12345",
  "activationId": "atv_12345",
  "customer": "customer1"
}
```

### property_add_hostname

Add a hostname to a property.

**Parameters:**
- `propertyId` (string, required): Property ID
- `hostname` (string, required): Hostname to add
- `edgeHostname` (string, required): Edge hostname to map to
- `version` (number, optional): Version number (defaults to latest)
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "propertyId": "prp_12345",
  "hostname": "www.example.com",
  "edgeHostname": "www.example.com.edgesuite.net",
  "customer": "customer1"
}
```

### property_remove_hostname

Remove a hostname from a property.

**Parameters:**
- `propertyId` (string, required): Property ID
- `hostname` (string, required): Hostname to remove
- `version` (number, optional): Version number (defaults to latest)
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "propertyId": "prp_12345",
  "hostname": "old.example.com",
  "customer": "customer1"
}
```

## Edge DNS Tools

### dns_list_zones

List all DNS zones in the account.

**Parameters:**
- `search` (string, optional): Search for zones by name
- `contractIds` (array, optional): Filter by contract IDs
- `includeAliases` (boolean, optional): Include alias zones
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "search": "example",
  "contractIds": ["ctr_C-1234567"],
  "includeAliases": true,
  "customer": "customer1"
}
```

### dns_get_zone

Get details of a specific DNS zone.

**Parameters:**
- `zone` (string, required): Zone name (e.g., "example.com")
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "zone": "example.com",
  "customer": "customer1"
}
```

### dns_create_zone

Create a new DNS zone.

**Parameters:**
- `zone` (string, required): Zone name
- `type` (string, required): Zone type ("PRIMARY", "SECONDARY", or "ALIAS")
- `comment` (string, optional): Zone comment
- `contractId` (string, optional): Contract ID
- `groupId` (string, optional): Group ID
- `masters` (array, optional): Master servers (required for SECONDARY zones)
- `target` (string, optional): Target zone (required for ALIAS zones)
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "zone": "example.com",
  "type": "PRIMARY",
  "comment": "Primary zone for example.com",
  "contractId": "ctr_C-1234567",
  "groupId": "grp_12345",
  "customer": "customer1"
}
```

### dns_list_records

List DNS records in a zone.

**Parameters:**
- `zone` (string, required): Zone name
- `search` (string, optional): Search for records by name
- `types` (array, optional): Filter by record types
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "zone": "example.com",
  "search": "www",
  "types": ["A", "AAAA"],
  "customer": "customer1"
}
```

### dns_upsert_record

Create or update a DNS record.

**Parameters:**
- `zone` (string, required): Zone name
- `name` (string, required): Record name
- `type` (string, required): Record type
- `ttl` (number, required): Time to live in seconds
- `rdata` (array, required): Record data
- `comment` (string, optional): Change comment
- `force` (boolean, optional): Force discard existing changelist
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "zone": "example.com",
  "name": "www.example.com",
  "type": "A",
  "ttl": 3600,
  "rdata": ["192.0.2.100", "192.0.2.101"],
  "comment": "Load balanced web servers",
  "customer": "customer1"
}
```

### dns_delete_record

Delete a DNS record.

**Parameters:**
- `zone` (string, required): Zone name
- `name` (string, required): Record name
- `type` (string, required): Record type
- `comment` (string, optional): Change comment
- `force` (boolean, optional): Force discard existing changelist
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "zone": "example.com",
  "name": "old.example.com",
  "type": "A",
  "comment": "Removing deprecated subdomain",
  "customer": "customer1"
}
```

### dns_activate_changes

Activate pending DNS zone changes.

**Parameters:**
- `zone` (string, required): Zone name
- `comment` (string, optional): Comment for activation
- `validateOnly` (boolean, optional): Only validate changes without activating
- `waitForCompletion` (boolean, optional): Wait for activation to complete
- `timeout` (number, optional): Timeout in milliseconds for waiting
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "zone": "example.com",
  "comment": "Activating new record changes",
  "waitForCompletion": true,
  "timeout": 300000,
  "customer": "customer1"
}
```

## FastPurge Tools

### fastpurge_purge_urls

Purge content by URLs.

**Parameters:**
- `urls` (array, required): Array of URLs to purge
- `network` (string, optional): Target network ("staging" or "production", defaults to "production")
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "urls": [
    "https://example.com/page1",
    "https://example.com/page2"
  ],
  "network": "production",
  "customer": "customer1"
}
```

### fastpurge_purge_tags

Purge content by cache tags.

**Parameters:**
- `tags` (array, required): Array of cache tags to purge
- `network` (string, optional): Target network
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "tags": ["product-123", "category-electronics"],
  "network": "production",
  "customer": "customer1"
}
```

### fastpurge_purge_cpcodes

Purge content by CP codes.

**Parameters:**
- `cpCodes` (array, required): Array of CP codes to purge
- `network` (string, optional): Target network
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "cpCodes": [12345, 67890],
  "network": "production",
  "customer": "customer1"
}
```

### fastpurge_get_status

Get the status of a purge request.

**Parameters:**
- `purgeId` (string, required): Purge ID
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "purgeId": "12345678-1234-1234-1234-123456789012",
  "customer": "customer1"
}
```

### fastpurge_get_queue_status

Get the current queue status for purge operations.

**Parameters:**
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "customer": "customer1"
}
```

### fastpurge_bulk_purge

Perform multiple purge operations in a single request.

**Parameters:**
- `operations` (array, required): Array of purge operations
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "operations": [
    {
      "type": "url",
      "items": ["https://example.com/page1"],
      "network": "production"
    },
    {
      "type": "tag", 
      "items": ["product-123"],
      "network": "production"
    }
  ],
  "customer": "customer1"
}
```

## Certificate Management Tools

### certificate_create_dv_enrollment

Create a new Default DV certificate enrollment.

**Parameters:**
- `commonName` (string, required): Primary domain for the certificate
- `sans` (array, optional): Additional domains (Subject Alternative Names)
- `adminContact` (object, required): Administrative contact information
- `techContact` (object, required): Technical contact information
- `contractId` (string, required): Contract ID for billing
- `enhancedTLS` (boolean, optional): Deploy to Enhanced TLS network
- `quicEnabled` (boolean, optional): Enable QUIC/HTTP3 support
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "commonName": "www.example.com",
  "sans": ["example.com", "api.example.com"],
  "adminContact": {
    "firstName": "John",
    "lastName": "Doe", 
    "email": "admin@example.com",
    "phone": "+1-555-123-4567"
  },
  "techContact": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "tech@example.com", 
    "phone": "+1-555-987-6543"
  },
  "contractId": "ctr_C-1234567",
  "enhancedTLS": true,
  "customer": "customer1"
}
```

### certificate_get_dv_challenges

Get DV validation challenges for a certificate enrollment.

**Parameters:**
- `enrollmentId` (number, required): Certificate enrollment ID
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "enrollmentId": 12345,
  "customer": "customer1"
}
```

### certificate_check_enrollment_status

Check the status of a DV certificate enrollment.

**Parameters:**
- `enrollmentId` (number, required): Certificate enrollment ID
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "enrollmentId": 12345,
  "customer": "customer1"
}
```

## Hostname Management Tools

### hostname_generate_recommendations

Generate intelligent edge hostname recommendations.

**Parameters:**
- `hostnames` (array, required): Array of hostnames to generate recommendations for
- `forceSecure` (boolean, optional): Force secure edge hostnames
- `preferredSuffix` (string, optional): Preferred edge hostname suffix
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "hostnames": ["www.example.com", "api.example.com"],
  "forceSecure": true,
  "preferredSuffix": ".edgekey.net",
  "customer": "customer1"
}
```

### hostname_analyze_conflicts

Analyze hostnames for conflicts with existing properties.

**Parameters:**
- `targetHostnames` (array, required): List of hostnames to analyze
- `contractId` (string, optional): Contract ID for scoped analysis
- `groupId` (string, optional): Group ID for scoped analysis
- `includeCertificateAnalysis` (boolean, optional): Include certificate coverage analysis
- `includeWildcardAnalysis` (boolean, optional): Include wildcard overlap analysis
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "targetHostnames": ["www.example.com", "api.example.com"],
  "includeCertificateAnalysis": true,
  "includeWildcardAnalysis": true,
  "customer": "customer1"
}
```

### hostname_discover_intelligent

Perform comprehensive hostname discovery with conflict detection.

**Parameters:**
- `analysisScope` (string, optional): Scope of analysis ("all", "contract", "group")
- `analyzeWildcards` (boolean, optional): Analyze wildcard hostname efficiency
- `detectConflicts` (boolean, optional): Detect hostname conflicts
- `findOptimizations` (boolean, optional): Find optimization opportunities
- `contractId` (string, optional): Contract ID for scoped analysis
- `groupId` (string, optional): Group ID for scoped analysis
- `includeInactive` (boolean, optional): Include inactive properties
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "analysisScope": "contract",
  "analyzeWildcards": true,
  "detectConflicts": true,
  "findOptimizations": true,
  "contractId": "ctr_C-1234567",
  "customer": "customer1"
}
```

## Bulk Operations Tools

### property_bulk_activate

Activate multiple properties on staging or production.

**Parameters:**
- `propertyIds` (array, required): Property IDs to activate
- `network` (string, required): Target network ("STAGING" or "PRODUCTION")
- `note` (string, optional): Activation note
- `acknowledgeAllWarnings` (boolean, optional): Acknowledge all warnings
- `waitForCompletion` (boolean, optional): Wait for activation to complete
- `maxWaitTime` (number, optional): Maximum wait time in milliseconds
- `notifyEmails` (array, optional): Email addresses to notify
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "propertyIds": ["prp_12345", "prp_67890"],
  "network": "STAGING",
  "note": "Batch staging deployment",
  "acknowledgeAllWarnings": true,
  "customer": "customer1"
}
```

### property_bulk_clone

Clone a property to multiple new properties.

**Parameters:**
- `sourcePropertyId` (string, required): Source property ID to clone from
- `targetNames` (array, required): Names for the new cloned properties
- `contractId` (string, required): Contract ID for the new properties
- `groupId` (string, required): Group ID for the new properties
- `productId` (string, optional): Product ID (defaults to source property product)
- `cloneHostnames` (boolean, optional): Clone hostnames from source
- `activateImmediately` (boolean, optional): Activate cloned properties immediately
- `network` (string, optional): Network for immediate activation
- `ruleFormat` (string, optional): Rule format version
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "sourcePropertyId": "prp_12345",
  "targetNames": ["dev-example-com", "test-example-com"],
  "contractId": "ctr_C-1234567",
  "groupId": "grp_12345",
  "cloneHostnames": false,
  "customer": "customer1"
}
```

## Monitoring and Analytics Tools

### monitoring_get_system_health

Get system health status and circuit breaker states.

**Parameters:**
- `includeMetrics` (boolean, optional): Include detailed metrics in response
- `operationType` (string, optional): Check specific operation type
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "includeMetrics": true,
  "operationType": "PROPERTY_READ",
  "customer": "customer1"
}
```

### monitoring_get_performance_analysis

Get comprehensive performance analysis and metrics.

**Parameters:**
- `includeRecommendations` (boolean, optional): Include performance recommendations
- `operationType` (string, optional): Filter analysis by operation type
- `timeWindowMs` (number, optional): Time window for analysis in milliseconds
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "includeRecommendations": true,
  "timeWindowMs": 3600000,
  "customer": "customer1"
}
```

### testing_run_integration_tests

Run comprehensive integration test suite.

**Parameters:**
- `category` (string, optional): Filter tests by category
- `priority` (string, optional): Filter tests by priority level
- `suiteName` (string, optional): Specific test suite to run
- `generateReport` (boolean, optional): Generate detailed test report
- `includeSetup` (boolean, optional): Include test setup and teardown
- `customer` (string, optional): Customer section from .edgerc

**Example:**
```json
{
  "category": "property",
  "priority": "high",
  "generateReport": true,
  "customer": "customer1"
}
```

## Common Parameters

### customer
The `customer` parameter is supported by all tools and specifies which section of the `.edgerc` file to use for authentication. If not provided, defaults to "default".

### contractId and groupId
Many tools require `contractId` and `groupId` parameters for operations that create or modify resources. These identify the billing contract and organizational group.

### Network Parameters
Tools that support staging and production deployments typically use:
- `"STAGING"` for staging network
- `"PRODUCTION"` for production network

## Error Handling

### Common Error Types

#### Authentication Errors
```json
{
  "content": [
    {
      "type": "text",
      "text": "Authentication failed: Invalid credentials for customer 'customer1'"
    }
  ],
  "isError": true
}
```

#### Validation Errors
```json
{
  "content": [
    {
      "type": "text", 
      "text": "Validation error: Property name 'invalid-name!' contains invalid characters"
    }
  ],
  "isError": true
}
```

#### API Errors
```json
{
  "content": [
    {
      "type": "text",
      "text": "API Error (400): The request could not be understood by the server"
    }
  ],
  "isError": true
}
```

#### Resource Not Found
```json
{
  "content": [
    {
      "type": "text",
      "text": "Property 'prp_12345' not found for customer 'customer1'"
    }
  ],
  "isError": true
}
```

### Error Recovery

Most tools implement automatic retry logic for transient failures. For persistent errors:

1. Check authentication credentials in `.edgerc`
2. Verify required parameters are provided
3. Ensure proper permissions for the operation
4. Check Akamai service status
5. Review debug logs if available

---

This API reference provides comprehensive documentation for all available MCP tools. For specific operation guides and troubleshooting, refer to the service-specific operations guides.