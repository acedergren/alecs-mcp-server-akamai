# Property Manager Module

Complete documentation for the Property Manager module, which handles CDN property configuration and management.

## Table of Contents
- [Overview](#overview)
- [Available Tools](#available-tools)
- [Core Concepts](#core-concepts)
- [Usage Examples](#usage-examples)
- [Advanced Features](#advanced-features)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Property Manager module provides comprehensive CDN property management capabilities:

- Create and manage CDN properties
- Configure delivery rules and behaviors
- Manage hostnames and edge hostnames
- Deploy configurations to staging/production
- Monitor activation status

### Key Features

- **Template System**: Pre-configured templates for common use cases
- **Version Control**: Safe property updates with version management
- **Rule Builder**: Programmatic rule configuration
- **Multi-Network**: Support for staging and production deployments
- **Progress Tracking**: Real-time activation monitoring

## Available Tools

### Basic Property Operations

#### list_properties
Lists all CDN properties with optional filtering.

**Parameters:**
- `customer` (optional): Customer account section
- `contractId` (optional): Filter by contract
- `groupId` (optional): Filter by group

**Example:**
```
List all properties for customer acme
```

#### get_property
Retrieves detailed information about a specific property.

**Parameters:**
- `propertyId`: Property ID (e.g., prp_12345)
- `customer` (optional): Customer account section

**Example:**
```
Get details for property prp_12345
```

#### create_property
Creates a new CDN property with optional template.

**Parameters:**
- `propertyName`: Name for the property
- `contractId`: Contract ID
- `groupId`: Group ID
- `productId` (optional): Product ID (defaults to SPM)
- `template` (optional): Template name
- `customer` (optional): Customer account section

**Example:**
```
Create property www.example.com in group grp_12345 using static website template
```

### Advanced Property Management

#### create_property_version
Creates a new version of an existing property.

**Parameters:**
- `propertyId`: Property ID
- `baseVersion` (optional): Version to clone from
- `customer` (optional): Customer account section

**Example:**
```
Create new version of property prp_12345 based on version 3
```

#### get_property_rules
Retrieves the rule tree for a property version.

**Parameters:**
- `propertyId`: Property ID
- `version` (optional): Version number
- `customer` (optional): Customer account section

**Example:**
```
Get rule tree for property prp_12345 version 5
```

#### update_property_rules
Updates the rule configuration for a property.

**Parameters:**
- `propertyId`: Property ID
- `version`: Version number
- `rules`: Rule tree object
- `customer` (optional): Customer account section

**Example:**
```
Update rules for property prp_12345 version 5 with new caching behavior
```

### Edge Hostname Management

#### create_edge_hostname
Creates an edge hostname for content delivery.

**Parameters:**
- `domainPrefix`: Prefix for edge hostname
- `domainSuffix`: Suffix (e.g., edgesuite.net)
- `productId`: Product ID
- `secureNetwork` (optional): ENHANCED_TLS or STANDARD_TLS
- `ipVersionBehavior` (optional): IPV4 or IPV6_COMPLIANCE
- `customer` (optional): Customer account section

**Example:**
```
Create edge hostname www.example.com.edgesuite.net with Enhanced TLS
```

#### add_property_hostname
Adds a hostname to a property configuration.

**Parameters:**
- `propertyId`: Property ID
- `version`: Version number
- `hostname`: Hostname to add
- `edgeHostnameId`: Edge hostname ID
- `customer` (optional): Customer account section

**Example:**
```
Add hostname www.example.com to property prp_12345 version 5
```

### Property Activation

#### activate_property
Deploys a property version to a network.

**Parameters:**
- `propertyId`: Property ID
- `version`: Version number
- `network`: STAGING or PRODUCTION
- `note` (optional): Activation note
- `notifyEmails` (optional): Email addresses for notifications
- `customer` (optional): Customer account section

**Example:**
```
Activate property prp_12345 version 5 to PRODUCTION with note "Q1 2025 release"
```

#### get_activation_status
Checks the status of a property activation.

**Parameters:**
- `propertyId`: Property ID
- `activationId`: Activation ID
- `customer` (optional): Customer account section

**Example:**
```
Check activation status for property prp_12345 activation atv_98765
```

## Core Concepts

### Property Hierarchy

```
Contract
└── Group
    └── Property
        └── Version
            ├── Hostnames
            ├── Rules
            └── Activations
```

### Rule Tree Structure

Properties use a hierarchical rule tree:

```json
{
  "rules": {
    "name": "default",
    "children": [
      {
        "name": "Performance",
        "behaviors": [
          {
            "name": "caching",
            "options": {
              "behavior": "MAX_AGE",
              "ttl": "7d"
            }
          }
        ]
      }
    ]
  }
}
```

### Activation Networks

- **STAGING**: Test environment with Akamai staging hostnames
- **PRODUCTION**: Live environment serving real traffic

### Version Management

- Properties are versioned for safe updates
- Only one version can be active per network
- Versions are immutable once activated

## Usage Examples

### Complete CDN Setup Flow

```bash
# 1. List available groups and contracts
"List my Akamai groups and contracts"

# 2. Create property with template
"Create property www.example.com in group grp_12345 using static website template"

# 3. Create edge hostname
"Create edge hostname www.example.com.edgesuite.net with Enhanced TLS"

# 4. Add hostname to property
"Add hostname www.example.com to property prp_12345"

# 5. Review configuration
"Get rules for property prp_12345"

# 6. Activate to staging
"Activate property prp_12345 to STAGING"

# 7. Test staging
# Use staging hostname for testing

# 8. Activate to production
"Activate property prp_12345 to PRODUCTION"
```

### Custom Rule Configuration

```bash
# 1. Get current rules
"Get rules for property prp_12345 version 3"

# 2. Create new version
"Create new version of property prp_12345"

# 3. Update with custom rules
"Update rules for property prp_12345 version 4 with these behaviors:
- Cache all images for 30 days
- Cache CSS/JS for 7 days  
- No cache for /api/* paths
- Enable gzip compression"

# 4. Activate changes
"Activate property prp_12345 version 4 to STAGING"
```

### Multi-Domain Configuration

```bash
# 1. Create property
"Create property multi-site in group grp_12345"

# 2. Add multiple hostnames
"Add these hostnames to property prp_12345:
- www.site1.com
- www.site2.com
- api.site1.com"

# 3. Configure per-hostname rules
"Update rules for property prp_12345 with hostname-specific behaviors"
```

## Advanced Features

### Property Templates

Available templates:

1. **Static Website**
   - Optimized for HTML, CSS, JS, images
   - Long cache times
   - Compression enabled
   - HTTP/2 support

2. **Dynamic Web Application**
   - Shorter cache times
   - API path handling
   - Session affinity
   - CORS support

3. **API Acceleration**
   - No caching by default
   - Rate limiting
   - Method filtering
   - JSON optimization

### Rule Behaviors

Common behaviors to configure:

1. **Caching**
   ```json
   {
     "name": "caching",
     "options": {
       "behavior": "MAX_AGE",
       "ttl": "7d",
       "honorPrivateEnabled": true
     }
   }
   ```

2. **Origin Configuration**
   ```json
   {
     "name": "origin",
     "options": {
       "hostname": "origin.example.com",
       "forwardHostHeader": "REQUEST_HOST_HEADER"
     }
   }
   ```

3. **Performance**
   ```json
   {
     "name": "gzipResponse",
     "options": {
       "behavior": "ALWAYS"
     }
   }
   ```

### Activation Options

1. **Fast Activation**: Skip validation for urgent changes
2. **Compliance Mode**: Extra validation for regulated content
3. **Notification**: Email alerts on activation completion

## Best Practices

### Property Naming

- Use descriptive names: `www.example.com` not `website1`
- Include environment: `www.example.com-staging`
- Follow DNS conventions: lowercase, no spaces

### Version Management

1. **Document Changes**: Use meaningful activation notes
2. **Test First**: Always activate to staging before production
3. **Keep History**: Don't delete old versions immediately
4. **Review Changes**: Use diff tools to compare versions

### Rule Organization

1. **Group by Function**: Performance, Security, Features
2. **Use Comments**: Document complex rules
3. **Order Matters**: More specific rules first
4. **Test Thoroughly**: Validate rule logic

### Performance Optimization

1. **Cache Aggressively**: Set appropriate TTLs
2. **Enable Compression**: Use gzip for text content
3. **Optimize Images**: Use Akamai Image Manager
4. **HTTP/2**: Enable for better performance

## Troubleshooting

### Common Issues

#### Property Creation Failed

**Error**: "Invalid product ID"

**Solution**:
```
List available products for contract cnt_12345
```

#### Hostname Already Exists

**Error**: "Hostname already in use"

**Solution**:
1. Check which property uses the hostname
2. Remove from old property first
3. Add to new property

#### Activation Stuck

**Error**: "Activation pending for hours"

**Solution**:
```
Get detailed activation status for property prp_12345 activation atv_98765
```

#### Rule Validation Failed

**Error**: "Invalid rule tree"

**Solution**:
1. Check rule syntax
2. Validate required behaviors
3. Ensure compatible options

### Debug Commands

```bash
# Check property details
"Show all versions for property prp_12345"

# Check activation history
"List all activations for property prp_12345"

# Validate rules
"Validate rules for property prp_12345 version 5"

# Compare versions
"Show differences between version 4 and 5 of property prp_12345"
```

### Performance Issues

1. **Slow Activation**: Normal for large properties (15-30 minutes)
2. **API Timeouts**: Retry with smaller operations
3. **Rule Complexity**: Simplify nested rules

## Integration Examples

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Create Property Version
  run: |
    alecs "Create new version of property $PROPERTY_ID"
    
- name: Update Rules
  run: |
    alecs "Update rules for property $PROPERTY_ID from file rules.json"
    
- name: Activate Staging
  run: |
    alecs "Activate property $PROPERTY_ID to STAGING"
```

### Terraform Integration

```hcl
resource "akamai_property" "example" {
  name        = "www.example.com"
  contract_id = "cnt_12345"
  group_id    = "grp_12345"
  product_id  = "SPM"
}
```

## Related Documentation

- [Edge DNS Module](./Edge-DNS.md)
- [Certificate Management](./CPS-Certificates.md)
- [Fast Purge Module](./Fast-Purge.md)
- [Template Reference](../technical-reference/Templates.md)

---

*Last Updated: January 2025*