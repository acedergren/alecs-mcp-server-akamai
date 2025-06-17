# DNS Operations Guide

This guide provides comprehensive information for operating and managing Akamai Edge DNS functionality within the MCP server.

## Table of Contents

1. [Overview](#overview)
2. [Service Architecture](#service-architecture)
3. [Configuration](#configuration)
4. [Zone Management](#zone-management)
5. [Record Management](#record-management)
6. [Migration Operations](#migration-operations)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [Security Considerations](#security-considerations)

## Overview

The Edge DNS system provides comprehensive DNS management capabilities through:

- **Zone Management**: Create, configure, and manage DNS zones
- **Record Management**: Full CRUD operations for DNS records
- **Migration Tools**: Import zones from external providers
- **DNSSEC Support**: Security extensions for DNS
- **Bulk Operations**: Efficient large-scale DNS management
- **Multi-Zone Management**: Coordinate operations across multiple zones

### Key Features

- Multi-customer DNS isolation
- Support for PRIMARY, SECONDARY, and ALIAS zones
- Comprehensive record type support (A, AAAA, CNAME, MX, TXT, etc.)
- Zone file import/export capabilities
- AXFR zone transfers
- Real-time change activation
- Advanced migration workflows

## Service Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │────│   DNS Tools      │────│  Zone Manager   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                │                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Migration     │────│   DNS Service    │────│ Record Manager  │
│     Tools       │    └──────────────────┘    └─────────────────┘
└─────────────────┘             │                        │
         │                      ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Monitoring    │    │ Akamai Edge DNS  │    │ Change Tracking │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Responsibilities

- **DNS Tools**: MCP protocol interface and parameter validation
- **DNS Service**: Akamai Edge DNS API integration
- **Zone Manager**: Zone lifecycle management and configuration
- **Record Manager**: DNS record CRUD operations and validation
- **Migration Tools**: Zone import/export and provider migration
- **Change Tracking**: DNS change management and activation
- **Monitoring**: Health monitoring, metrics collection, and alerting

## Configuration

### Environment Variables

```bash
# Required: Akamai EdgeGrid credentials
AKAMAI_CLIENT_TOKEN=your_client_token
AKAMAI_CLIENT_SECRET=your_client_secret
AKAMAI_ACCESS_TOKEN=your_access_token
AKAMAI_HOST=your_akamai_host

# Optional: DNS configuration
DNS_DEFAULT_TTL=3600               # Default TTL for records
DNS_ZONE_ACTIVATION_TIMEOUT=300000 # 5 minutes
DNS_MIGRATION_BATCH_SIZE=100       # Records per batch
DNS_VALIDATION_ENABLED=true        # Enable record validation

# Optional: DNSSEC configuration
DNSSEC_ENABLED=false              # Enable DNSSEC by default
DNSSEC_ALGORITHM=RSASHA256        # Default signing algorithm

# Optional: Migration configuration
MIGRATION_PARALLEL_ZONES=5        # Concurrent zone migrations
MIGRATION_RECORD_BATCH_SIZE=50    # Records per batch
MIGRATION_VALIDATION_LEVEL=strict # strict|warnings|none
```

### .edgerc Configuration

```ini
[default]
client_token = your_client_token
client_secret = your_client_secret
access_token = your_access_token
host = your_akamai_host

[customer1]
client_token = customer1_client_token
client_secret = customer1_client_secret
access_token = customer1_access_token
host = customer1_akamai_host
account_switch_key = customer1_account_key

[dns-admin]
client_token = dns_admin_client_token
client_secret = dns_admin_client_secret
access_token = dns_admin_access_token
host = dns_admin_akamai_host
```

## Zone Management

### Creating Zones

#### Primary Zone Creation

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_create_zone" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "type": "PRIMARY",
    "comment": "Primary zone for example.com",
    "contractId": "ctr_C-1234567",
    "groupId": "grp_12345",
    "customer": "customer1"
  }'
```

#### Secondary Zone Creation

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_create_zone" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "secondary.example.com",
    "type": "SECONDARY",
    "masters": ["192.0.2.1", "192.0.2.2"],
    "comment": "Secondary zone for disaster recovery",
    "contractId": "ctr_C-1234567",
    "groupId": "grp_12345",
    "customer": "customer1"
  }'
```

#### Alias Zone Creation

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_create_zone" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "alias.example.com",
    "type": "ALIAS",
    "target": "primary.example.com",
    "comment": "Alias zone pointing to primary",
    "contractId": "ctr_C-1234567",
    "groupId": "grp_12345",
    "customer": "customer1"
  }'
```

### Zone Information

#### List Zones

```bash
curl -X GET "http://localhost:3000/mcp/tools/dns_list_zones" \
  -H "Content-Type: application/json" \
  -d '{
    "search": "example",
    "contractIds": ["ctr_C-1234567"],
    "includeAliases": true,
    "customer": "customer1"
  }'
```

#### Get Zone Details

```bash
curl -X GET "http://localhost:3000/mcp/tools/dns_get_zone" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "customer": "customer1"
  }'
```

## Record Management

### Creating Records

#### A Record

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_upsert_record" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "name": "www.example.com",
    "type": "A",
    "ttl": 3600,
    "rdata": ["192.0.2.100", "192.0.2.101"],
    "comment": "Load balanced web servers",
    "customer": "customer1"
  }'
```

#### CNAME Record

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_upsert_record" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "name": "blog.example.com",
    "type": "CNAME",
    "ttl": 1800,
    "rdata": ["www.example.com"],
    "comment": "Blog alias to main website",
    "customer": "customer1"
  }'
```

#### MX Record

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_upsert_record" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "name": "example.com",
    "type": "MX",
    "ttl": 3600,
    "rdata": ["10 mail1.example.com", "20 mail2.example.com"],
    "comment": "Mail server configuration",
    "customer": "customer1"
  }'
```

#### TXT Record

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_upsert_record" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "name": "example.com",
    "type": "TXT",
    "ttl": 300,
    "rdata": ["v=spf1 include:_spf.google.com ~all"],
    "comment": "SPF record for email authentication",
    "customer": "customer1"
  }'
```

### Managing Records

#### List Records

```bash
curl -X GET "http://localhost:3000/mcp/tools/dns_list_records" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "search": "www",
    "types": ["A", "AAAA"],
    "customer": "customer1"
  }'
```

#### Delete Record

```bash
curl -X DELETE "http://localhost:3000/mcp/tools/dns_delete_record" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "name": "old.example.com",
    "type": "A",
    "comment": "Removing deprecated subdomain",
    "customer": "customer1"
  }'
```

#### Bulk Record Creation

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_create_multiple_records" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "recordSets": [
      {
        "name": "api.example.com",
        "type": "A",
        "ttl": 300,
        "rdata": ["192.0.2.200"]
      },
      {
        "name": "cdn.example.com",
        "type": "CNAME",
        "ttl": 3600,
        "rdata": ["example.com.edgekey.net"]
      }
    ],
    "comment": "API and CDN endpoint setup",
    "customer": "customer1"
  }'
```

### Activating Changes

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_activate_changes" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "comment": "Activating new record changes",
    "waitForCompletion": true,
    "timeout": 300000,
    "customer": "customer1"
  }'
```

## Migration Operations

### Zone File Import

#### Parse Zone File

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_parse_zone_file" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "zoneFileContent": "$ORIGIN example.com.\n$TTL 3600\n@ IN SOA ns1.example.com. admin.example.com. (\n  2024011501 ; serial\n  7200       ; refresh\n  3600       ; retry\n  1209600    ; expire\n  86400      ; minimum\n)\n\n@ IN NS ns1.example.com.\n@ IN NS ns2.example.com.\n\nwww IN A 192.0.2.100\nmail IN A 192.0.2.200",
    "customer": "customer1"
  }'
```

#### Import Parsed Records

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_bulk_import_records" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "batchId": "import-batch-12345",
    "clearCache": true,
    "customer": "customer1"
  }'
```

### AXFR Transfer

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_import_zone_via_axfr" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "masterServer": "ns1.external-provider.com",
    "createZone": true,
    "contractId": "ctr_C-1234567",
    "groupId": "grp_12345",
    "tsigKey": {
      "name": "transfer-key",
      "algorithm": "hmac-sha256",
      "secret": "base64-encoded-secret"
    },
    "customer": "customer1"
  }'
```

### Provider Migration

#### Generate Migration Instructions

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_generate_migration_instructions" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "example.com",
    "targetProvider": "route53",
    "customer": "customer1"
  }'
```

#### Convert Secondary to Primary

```bash
curl -X POST "http://localhost:3000/mcp/tools/dns_convert_zone_to_primary" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "secondary.example.com",
    "comment": "Converting to primary zone for full management",
    "customer": "customer1"
  }'
```

## Monitoring and Alerting

### Health Checks

```bash
# Overall DNS system health
curl -X GET "http://localhost:3000/health/dns"

# Zone activation health
curl -X GET "http://localhost:3000/health/dns/zones"

# Record management health
curl -X GET "http://localhost:3000/health/dns/records"

# Migration system health
curl -X GET "http://localhost:3000/health/dns/migration"
```

### Key Metrics

#### Zone Metrics
- `dns.zones.total`: Total number of zones
- `dns.zones.primary`: Number of primary zones
- `dns.zones.secondary`: Number of secondary zones
- `dns.zones.alias`: Number of alias zones

#### Record Metrics
- `dns.records.total`: Total number of records
- `dns.records.by_type.A`: Number of A records
- `dns.records.by_type.AAAA`: Number of AAAA records
- `dns.records.by_type.CNAME`: Number of CNAME records

#### Performance Metrics
- `dns.activation.average_time`: Average activation time
- `dns.activation.success_rate`: Activation success rate
- `dns.api.response_time`: API response time
- `dns.migration.success_rate`: Migration success rate

### Alerts

#### Critical Alerts
- **Zone Activation Failure**: When zone changes fail to activate
- **Migration Failure**: When zone migration fails
- **API Unavailable**: When Edge DNS API becomes unavailable
- **DNSSEC Validation Failure**: When DNSSEC validation fails

#### Warning Alerts
- **Slow Activation**: When activation takes longer than 5 minutes
- **High Error Rate**: When API error rate exceeds 5%
- **Zone Transfer Failure**: When AXFR transfers fail
- **Record Validation Warnings**: When records have validation issues

## Troubleshooting

### Common Issues

#### Zone Activation Failures

**Symptoms:**
- Changes not propagating to Edge DNS servers
- Activation timeouts
- Validation errors preventing activation

**Diagnosis:**
```bash
# Check zone status
curl -X GET "http://localhost:3000/mcp/tools/dns_get_zone" \
  -d '{"zone": "example.com", "customer": "customer1"}'

# Validate zone before activation
curl -X POST "http://localhost:3000/mcp/tools/dns_activate_changes" \
  -d '{"zone": "example.com", "validateOnly": true, "customer": "customer1"}'
```

**Solutions:**
1. Check for record validation errors
2. Verify zone configuration is complete
3. Ensure proper SOA record configuration
4. Check for conflicting records

#### Record Creation Issues

**Symptoms:**
- Records not accepting changes
- Validation errors for record data
- Conflicts with existing records

**Diagnosis:**
```bash
# Check existing records
curl -X GET "http://localhost:3000/mcp/tools/dns_list_records" \
  -d '{"zone": "example.com", "customer": "customer1"}'

# Validate specific record
curl -X GET "http://localhost:3000/mcp/tools/dns_get_record_set" \
  -d '{"zone": "example.com", "name": "www.example.com", "type": "A", "customer": "customer1"}'
```

**Solutions:**
1. Verify record format and syntax
2. Check for CNAME conflicts
3. Validate TTL values
4. Ensure proper rdata format

#### Migration Problems

**Symptoms:**
- AXFR transfers failing
- Zone file parsing errors
- Incomplete record imports

**Diagnosis:**
```bash
# Check zone transfer status
curl -X GET "http://localhost:3000/mcp/tools/dns_get_secondary_zone_transfer_status" \
  -d '{"zones": ["example.com"], "customer": "customer1"}'

# Test zone file parsing
curl -X POST "http://localhost:3000/mcp/tools/dns_parse_zone_file" \
  -d '{"zone": "example.com", "zoneFileContent": "...", "customer": "customer1"}'
```

**Solutions:**
1. Verify AXFR permissions on source server
2. Check TSIG key configuration
3. Validate zone file format
4. Review network connectivity

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
export LOG_LEVEL=debug
export DNS_DEBUG=true
export EDGE_DNS_DEBUG=true

# Start server with debug logging
npm run dev
```

## Best Practices

### Zone Management

1. **Zone Organization**
   ```
   Primary zones: company.com, api.company.com
   Secondary zones: backup.company.com
   Alias zones: cdn.company.com -> company.com.edgekey.net
   ```

2. **Record Management**
   - Use consistent TTL values
   - Implement proper record hierarchy
   - Document record purposes
   - Regular record audits

3. **Change Management**
   - Test changes in development zones
   - Use staged deployments
   - Document all changes
   - Monitor activation status

### Performance Optimization

1. **TTL Strategy**
   ```
   Short TTL (300s): Frequently changing records
   Medium TTL (3600s): Standard records
   Long TTL (86400s): Stable infrastructure records
   ```

2. **Record Optimization**
   - Minimize record count where possible
   - Use appropriate record types
   - Optimize for query patterns
   - Consider geographic distribution

### Migration Planning

1. **Pre-Migration**
   - Audit existing DNS configuration
   - Plan migration in phases
   - Prepare rollback procedures
   - Test migration process

2. **Migration Execution**
   - Use gradual TTL reduction
   - Monitor DNS propagation
   - Validate record accuracy
   - Implement monitoring

## Security Considerations

### Access Control

1. **Zone Security**
   ```bash
   # Separate credentials for DNS operations
   export DNS_CLIENT_TOKEN=$(vault kv get -field=token secret/dns)
   
   # Use role-based access
   export DNS_ROLE=dns-admin
   ```

2. **TSIG Keys**
   - Use strong TSIG keys for zone transfers
   - Rotate keys regularly
   - Secure key storage
   - Monitor key usage

### Data Protection

1. **Zone Data**
   - Encrypt sensitive DNS data
   - Sanitize logs and outputs
   - Protect zone configurations
   - Implement data retention

2. **DNSSEC**
   ```bash
   # Enable DNSSEC for zone
   curl -X POST "http://localhost:3000/mcp/tools/dns_enable_dnssec" \
     -d '{"zone": "example.com", "algorithm": "RSASHA256", "customer": "customer1"}'
   ```

### Compliance

1. **Audit Logging**
   ```typescript
   // Log all DNS operations
   auditLogger.log({
     customer: 'customer1',
     operation: 'dns_record_create',
     zone: 'example.com',
     record: 'www.example.com',
     type: 'A',
     user: 'api_user',
     timestamp: new Date(),
     result: 'success'
   });
   ```

2. **Change Tracking**
   - Maintain change history
   - Track zone modifications
   - Monitor access patterns
   - Regular security reviews

---

This operations guide provides comprehensive information for successfully deploying, operating, and maintaining the Edge DNS system in production environments. For additional support, refer to the troubleshooting section or contact the development team.