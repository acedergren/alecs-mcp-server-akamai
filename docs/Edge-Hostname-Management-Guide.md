# Edge Hostname Management Guide

## Overview

The Edge Hostname Management system provides comprehensive tools for creating, managing, and optimizing edge hostnames in Akamai. This includes intelligent recommendations, bulk operations, certificate management, and DNS validation.

## Key Features

### 1. Intelligent Edge Hostname Creation
- Automatic suffix selection based on content type
- Smart defaults for security and performance
- Integration with property configuration

### 2. Bulk Operations
- Create multiple edge hostnames at once
- Bulk DNS validation
- Mass property assignment

### 3. Certificate Management
- Certificate association validation
- DefaultDV integration
- SSL/TLS configuration

### 4. DNS Validation
- CNAME validation
- Propagation checking
- Bulk DNS verification

## Core Tools

### Edge Hostname Management

#### `create_edge_hostname_enhanced`
Creates a new edge hostname with intelligent defaults.

**Example:**
```json
{
  "tool": "create_edge_hostname_enhanced",
  "arguments": {
    "domainPrefix": "www.example.com",
    "contractId": "ctr_C-1234567",
    "groupId": "grp_123456"
  }
}
```

**Features:**
- Automatic suffix selection (.edgekey.net for secure, .edgesuite.net for non-secure)
- Default to Enhanced TLS for better security
- Dual-stack IP support (IPv4 + IPv6)
- Automatic property association

#### `create_bulk_edge_hostnames`
Creates multiple edge hostnames in a single operation.

**Example:**
```json
{
  "tool": "create_bulk_edge_hostnames",
  "arguments": {
    "hostnames": [
      "www.example.com",
      "api.example.com",
      "static.example.com"
    ],
    "contractId": "ctr_C-1234567",
    "groupId": "grp_123456",
    "secure": true,
    "domainSuffix": ".edgekey.net"
  }
}
```

#### `get_edge_hostname_details`
Retrieves comprehensive information about an edge hostname.

**Example:**
```json
{
  "tool": "get_edge_hostname_details",
  "arguments": {
    "edgeHostnameId": "ehn_12345"
  }
}
```

Or by domain:
```json
{
  "tool": "get_edge_hostname_details",
  "arguments": {
    "edgeHostnameDomain": "www.example.com.edgekey.net"
  }
}
```

#### `validate_edge_hostname_certificate`
Validates certificate association and coverage for an edge hostname.

**Example:**
```json
{
  "tool": "validate_edge_hostname_certificate",
  "arguments": {
    "edgeHostnameId": "ehn_12345",
    "hostname": "www.example.com"
  }
}
```

#### `associate_certificate_with_edge_hostname`
Associates a certificate enrollment with an edge hostname.

**Example:**
```json
{
  "tool": "associate_certificate_with_edge_hostname",
  "arguments": {
    "edgeHostnameId": "ehn_12345",
    "certificateEnrollmentId": 98765
  }
}
```

### Bulk Hostname Operations

#### `create_bulk_provisioning_plan`
Creates a comprehensive plan for provisioning multiple hostnames.

**Example:**
```json
{
  "tool": "create_bulk_provisioning_plan",
  "arguments": {
    "hostnames": [
      "www.example.com",
      "api.example.com",
      "shop.example.com",
      "blog.example.com"
    ],
    "contractId": "ctr_C-1234567",
    "groupId": "grp_123456",
    "edgeHostnameStrategy": "individual",
    "propertyStrategy": "grouped",
    "certificateStrategy": "default-dv"
  }
}
```

**Strategy Options:**
- **edgeHostnameStrategy**: 
  - `individual`: One edge hostname per hostname
  - `shared`: Share edge hostnames where possible
  - `mixed`: Intelligent selection based on requirements

- **propertyStrategy**:
  - `single`: All hostnames in one property
  - `grouped`: Group by domain/function
  - `per-hostname`: One property per hostname

- **certificateStrategy**:
  - `default-dv`: Use DefaultDV certificates
  - `cps`: Use CPS certificates
  - `existing`: Use existing certificates

#### `execute_bulk_provisioning`
Executes the bulk provisioning plan.

**Example:**
```json
{
  "tool": "execute_bulk_provisioning",
  "arguments": {
    "hostnames": ["www.example.com", "api.example.com"],
    "contractId": "ctr_C-1234567",
    "groupId": "grp_123456",
    "dryRun": true
  }
}
```

#### `validate_bulk_dns`
Validates DNS configuration for multiple hostnames.

**Example:**
```json
{
  "tool": "validate_bulk_dns",
  "arguments": {
    "hostnames": [
      {
        "hostname": "www.example.com",
        "expectedCNAME": "www.example.com.edgekey.net"
      },
      {
        "hostname": "api.example.com",
        "expectedCNAME": "api.example.com.edgekey.net"
      }
    ],
    "checkPropagation": true
  }
}
```

#### `bulk_update_hostname_properties`
Updates hostname assignments across multiple properties.

**Example:**
```json
{
  "tool": "bulk_update_hostname_properties",
  "arguments": {
    "operations": [
      {
        "hostname": "www.example.com",
        "propertyId": "prp_12345",
        "edgeHostname": "www.example.com.edgekey.net",
        "action": "add"
      },
      {
        "hostname": "old.example.com",
        "propertyId": "prp_12345",
        "edgeHostname": "old.example.com.edgekey.net",
        "action": "remove"
      }
    ],
    "createNewVersion": true,
    "versionNote": "Bulk hostname update"
  }
}
```

## Best Practices

### 1. Edge Hostname Suffix Selection

#### Use `.edgekey.net` for:
- API endpoints
- Secure applications
- Sites requiring HTTP/2 or HTTP/3
- Enhanced TLS requirements

#### Use `.edgesuite.net` for:
- Static content (when HTTPS not required)
- Cost-sensitive deployments
- Legacy compatibility

#### Use `.akamaized.net` for:
- China delivery
- Regional-specific requirements

### 2. Certificate Strategy

#### DefaultDV (Recommended)
- Fastest deployment
- Automatic renewal
- No manual validation required
- Best for most use cases

#### CPS Certificates
- When specific certificate requirements exist
- Multi-domain certificates
- Extended validation certificates

### 3. Bulk Operations

#### Planning Phase
1. Always create a provisioning plan first
2. Review validation results
3. Check for conflicts and duplicates
4. Verify DNS readiness

#### Execution Phase
1. Use dry run for testing
2. Execute in phases for large deployments
3. Monitor progress closely
4. Validate DNS after execution

### 4. DNS Management

#### Pre-deployment
- Ensure DNS management access
- Document current DNS configuration
- Plan for gradual cutover

#### During Deployment
- Use low TTL values (300 seconds)
- Update records in batches
- Monitor propagation

#### Post-deployment
- Verify all records updated
- Test from multiple locations
- Increase TTL values

## Common Workflows

### 1. Provision New Website

```bash
# Step 1: Analyze hostnames
{
  "tool": "analyze_hostname_ownership",
  "arguments": {
    "hostnames": ["www.newsite.com", "api.newsite.com"],
    "includeRecommendations": true
  }
}

# Step 2: Create provisioning plan
{
  "tool": "create_bulk_provisioning_plan",
  "arguments": {
    "hostnames": ["www.newsite.com", "api.newsite.com"],
    "contractId": "ctr_C-1234567",
    "groupId": "grp_123456",
    "certificateStrategy": "default-dv"
  }
}

# Step 3: Execute provisioning
{
  "tool": "execute_bulk_provisioning",
  "arguments": {
    "hostnames": ["www.newsite.com", "api.newsite.com"],
    "contractId": "ctr_C-1234567",
    "groupId": "grp_123456"
  }
}

# Step 4: Validate DNS
{
  "tool": "validate_bulk_dns",
  "arguments": {
    "hostnames": [
      {
        "hostname": "www.newsite.com",
        "expectedCNAME": "www.newsite.com.edgekey.net"
      }
    ]
  }
}
```

### 2. Migrate Existing Hostnames

```bash
# Step 1: Validate existing hostnames
{
  "tool": "validate_hostnames_bulk",
  "arguments": {
    "hostnames": ["old1.example.com", "old2.example.com"],
    "checkDNS": true
  }
}

# Step 2: Create edge hostnames
{
  "tool": "create_bulk_edge_hostnames",
  "arguments": {
    "hostnames": ["old1.example.com", "old2.example.com"],
    "contractId": "ctr_C-1234567",
    "groupId": "grp_123456",
    "secure": true,
    "domainSuffix": ".edgekey.net"
  }
}

# Step 3: Update property assignments
{
  "tool": "bulk_update_hostname_properties",
  "arguments": {
    "operations": [
      {
        "hostname": "old1.example.com",
        "propertyId": "prp_12345",
        "edgeHostname": "old1.example.com.edgekey.net",
        "action": "update"
      }
    ]
  }
}
```

### 3. Certificate Management

```bash
# Step 1: Check certificate status
{
  "tool": "validate_edge_hostname_certificate",
  "arguments": {
    "edgeHostnameId": "ehn_12345"
  }
}

# Step 2: Associate certificate if needed
{
  "tool": "associate_certificate_with_edge_hostname",
  "arguments": {
    "edgeHostnameId": "ehn_12345",
    "certificateEnrollmentId": 98765
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Edge Hostname Creation Fails
- **Cause**: Invalid domain prefix or suffix
- **Solution**: Ensure domain prefix doesn't include the suffix

#### 2. Certificate Association Fails
- **Cause**: Certificate not validated or deployed
- **Solution**: Complete domain validation first

#### 3. DNS Validation Failures
- **Cause**: DNS not updated or propagation delay
- **Solution**: Wait for propagation, verify records

#### 4. Bulk Operation Partial Failures
- **Cause**: Some hostnames invalid or conflicting
- **Solution**: Review failure reasons, fix issues, retry

### Error Recovery

1. **Always use dry run first** for bulk operations
2. **Keep track of operation IDs** for status checking
3. **Review partial successes** - successful operations aren't rolled back
4. **Use validation tools** before execution

## Performance Considerations

### Rate Limits
- Edge hostname creation: 100/hour per contract
- Bulk operations: Process in batches of 50
- DNS validation: Limit to 100 hostnames per check

### Optimization Tips
1. Group related hostnames together
2. Use shared edge hostnames where appropriate
3. Plan certificate strategy upfront
4. Pre-validate all hostnames

## Integration with Other Tools

### Property Management
- Edge hostnames are required for property hostnames
- Create edge hostnames before adding to properties
- Use property version management for updates

### Certificate Management
- DefaultDV certificates work seamlessly
- CPS certificates require manual enrollment
- Validate certificates before production

### DNS Management
- Coordinate with DNS team for updates
- Use DNS validation tools
- Plan for rollback scenarios

## Security Considerations

1. **Always use secure edge hostnames** for sensitive content
2. **Enable Enhanced TLS** for modern security
3. **Validate certificate coverage** before go-live
4. **Monitor certificate expiration** dates
5. **Use dual-stack (IPv4/IPv6)** for future-proofing

## Monitoring and Maintenance

### Regular Tasks
1. Monitor certificate expiration
2. Review edge hostname usage
3. Clean up unused edge hostnames
4. Update DNS records as needed

### Health Checks
- Certificate validation status
- DNS resolution checks
- Edge hostname availability
- Property activation status

## API References

- [Property Manager API (PAPI)](https://techdocs.akamai.com/property-mgr/reference/api)
- [Edge Hostname API Guide](https://techdocs.akamai.com/property-mgr/reference/edge-hostnames)
- [Certificate Provisioning System (CPS)](https://techdocs.akamai.com/cps/reference/api)