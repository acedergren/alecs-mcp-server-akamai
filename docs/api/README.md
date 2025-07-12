# ALECS API Reference

**Version:** 1.7.4  
**Last Updated:** 2025-07-12  
**Total APIs:** 159 tools

## Overview

ALECS provides comprehensive access to Akamai's APIs through the Model Context Protocol. All tools follow consistent patterns for authentication, error handling, and response formats.

## Available Services

### 🏢 Property Manager (25 tools)
Manage CDN configurations, rules, and activations.

**Key Operations:**
- `list_properties` - List all properties
- `create_property` - Create new property
- `get_property_rules` - Get rule configuration
- `activate_property` - Deploy to staging/production

### 🛡️ Security (47 tools)
Network lists, WAF policies, and security configurations.

**Key Operations:**
- `list-network-lists` - List IP/GEO lists
- `create-network-list` - Create blocking lists
- `activate-network-list` - Deploy security rules

### 🌐 Edge DNS (12 tools)
Manage DNS zones, records, and DNSSEC.

**Key Operations:**
- `list-zones` - List DNS zones
- `create-zone` - Create new zone
- `upsert-record` - Create/update DNS records
- `activate-zone-changes` - Deploy DNS changes

### 📋 Includes (12 tools)
Manage include configurations and snippets.

**Key Operations:**
- `list-includes` - List all includes
- `create-include` - Create new include
- `update-include` - Modify include content
- `activate-include` - Deploy include changes

### 🔗 Edge Hostnames (10 tools)
Advanced hostname management and edge configurations.

**Key Operations:**
- `list-edge-hostnames` - List edge hostnames
- `create-edge-hostname` - Create new edge hostname
- `update-edge-hostname` - Modify hostname settings

### 📊 Reporting (10 tools)
Analytics, metrics, and performance data.

**Key Operations:**
- `get_traffic_report` - Traffic analytics
- `get_cache_performance` - Cache metrics
- `get_geographic_distribution` - Geographic data

### 🔐 Certificates (8 tools)
SSL/TLS certificate lifecycle management.

**Key Operations:**
- `create-dv-enrollment` - Start DV certificate
- `check-dv-enrollment-status` - Check progress
- `link-certificate-to-property` - Attach to CDN

### ⚡ Fast Purge (8 tools)
Cache invalidation and purging operations.

**Key Operations:**
- `purge-by-url` - Purge specific URLs
- `purge-by-tag` - Purge by cache tags
- `purge-status` - Check purge progress

### 🔧 Workflow (7 tools)
Orchestration and automation tools.

**Key Operations:**
- `create-workflow` - Create automation workflow
- `execute-workflow` - Run workflow
- `monitor-workflow` - Track workflow status

### 🌐 Hostname Management (5 tools)
Advanced hostname operations and configurations.

### 📦 Bulk Operations (5 tools)
Batch processing and bulk operations.

### 🚨 SIEM (4 tools)
Security monitoring and incident response.

### 🏗️ Rule Tree (4 tools)
Rule processing and tree management.

### 📊 CPCode (2 tools)
Traffic analysis and reporting codes.

## Common Parameters

### Customer Context
All tools accept an optional `customer` parameter:

```typescript
{
  "customer": "acme-corp"  // Maps to .edgerc section
}
```

### Standard Response Format

```typescript
{
  "success": true,
  "data": {
    "content": [{
      "type": "text",
      "text": "JSON response data"
    }]
  },
  "_meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "tool": "tool_name",
    "version": "2.0.0"
  }
}
```

### ID Translation & Human-Readable Names

ALECS automatically translates cryptic Akamai IDs to human-readable names in all responses:

```typescript
// Raw API Response:
{
  "propertyId": "prp_123456",
  "groupId": "grp_789012",
  "contractId": "ctr_345678"
}

// ALECS Enhanced Response:
{
  "propertyId": "prp_123456",
  "propertyId_displayName": "My Website (prp_123456)",
  "groupId": "grp_789012", 
  "groupId_displayName": "Production Group (grp_789012)",
  "contractId": "ctr_345678",
  "contractId_displayName": "Main Contract (ctr_345678)"
}
```

**Supported ID Types:**
- Property IDs (`prp_*`)
- Group IDs (`grp_*`) 
- Contract IDs (`ctr_*`)
- CP Codes (`cpc_*`)
- Edge Hostnames (`ehn_*`)
- Network Lists
- EdgeWorker IDs
- Certificate Enrollments

### Hostname Context Routing

The hostname router provides relationship mapping between hostnames and Akamai resources:

```typescript
// Example: Get hostname context
{
  "hostname": "www.example.com",
  "propertyId": "prp_123456",
  "propertyName": "Example Website",
  "cpCodes": ["cpc_789012"],
  "contractId": "ctr_345678",
  "groupId": "grp_789012"
}
```

This enables cross-service operations like purging content by hostname or setting up DNS records for a property's hostnames.

### Error Response Format

```typescript
{
  "success": false,
  "error": "Clear error message",
  "details": {
    "code": "ERROR_CODE",
    "suggestion": "How to fix this issue"
  }
}
```

## Authentication

ALECS uses Akamai's EdgeGrid authentication:

1. Store credentials in `~/.edgerc`
2. Use `customer` parameter to select account
3. Automatic request signing
4. Support for account switching

## Rate Limits

- Default: 200 requests/minute
- Burst: 50 requests/second
- Automatic retry with backoff
- Circuit breaker protection

## Best Practices

1. **Use List Operations First** - Discover available resources
2. **Cache Responses** - Reduce API calls
3. **Batch Operations** - Use bulk endpoints when available
4. **Handle Async Operations** - Poll for activation status
5. **Validate Before Submit** - Use validation tools

## Tool Naming Conventions

- `list_*` - List resources
- `get_*` - Get single resource
- `create_*` - Create new resource
- `update_*` - Modify existing
- `delete_*` - Remove resource
- `activate_*` - Deploy changes
- `validate_*` - Check validity

## Example Workflows

### Property Deployment
```
1. list_properties()
2. create_property_version()
3. update_property_rules()
4. validate_property_activation()
5. activate_property()
```

### DNS Migration
```
1. create-zone()
2. bulk-import-records()
3. validate DNS records
4. activate-zone-changes()
```

### Certificate Setup
```
1. create-dv-enrollment()
2. get-dv-validation-challenges()
3. Complete validation
4. link-certificate-to-property()
```