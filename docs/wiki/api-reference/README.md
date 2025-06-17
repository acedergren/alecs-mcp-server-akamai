# API Reference

Complete reference documentation for all ALECS MCP Server tools and APIs.

## Tool Categories

### [Property Management](./property-tools.md)
Basic property operations and management
- `list_properties` - List all CDN properties
- `get_property` - Get property details
- `create_property` - Create new property
- `list_groups` - List groups and contracts

### [Property Manager](./property-manager-tools.md)
Advanced property configuration and deployment
- `create_property_version` - Create property version
- `get_property_rules` - Get rule configuration
- `update_property_rules` - Update rules
- `create_edge_hostname` - Create edge hostname
- `add_property_hostname` - Add hostname
- `remove_property_hostname` - Remove hostname
- `activate_property` - Deploy property
- `get_activation_status` - Check activation
- `list_property_activations` - Activation history

### [DNS Management](./dns-tools.md)
DNS zone and record management
- `list_zones` - List DNS zones
- `get_zone` - Get zone details
- `create_zone` - Create new zone
- `list_records` - List DNS records
- `upsert_record` - Create/update record
- `delete_record` - Delete record

### [Certificate Management](./cps-tools.md)
SSL/TLS certificate provisioning
- `create_dv_enrollment` - Create DV certificate
- `get_dv_validation_challenges` - Get validation requirements
- `check_dv_enrollment_status` - Check certificate status
- `list_certificate_enrollments` - List certificates
- `link_certificate_to_property` - Link to property

### [DNS Migration](./dns-migration-tools.md)
Tools for migrating DNS from other providers
- `import_zone_via_axfr` - Import via zone transfer
- `parse_zone_file` - Parse BIND zone file
- `bulk_import_records` - Bulk record import
- `convert_zone_to_primary` - Convert zone type
- `generate_migration_instructions` - Migration guide

### [Enhanced Tools](./enhanced-tools.md)
Additional automation and convenience tools
- `import_from_cloudflare` - Cloudflare import
- `import_zone_file` - Direct zone file import
- `get_nameserver_instructions` - NS migration help
- `create_acme_validation_records` - Auto DNS validation
- `monitor_certificate_validation` - Track validation

## Tool Schema Format

Each tool follows this schema structure:

```typescript
interface ToolDefinition {
  name: string;                    // Tool identifier
  description: string;             // What the tool does
  inputSchema: {                   // Zod schema definition
    type: "object";
    properties: {
      [key: string]: {
        type: string;             // string, number, boolean, array
        description?: string;      // Parameter description
        enum?: string[];          // Allowed values
        default?: any;            // Default value
        optional?: boolean;       // Is parameter optional
      }
    };
    required?: string[];          // Required parameters
  };
}
```

## Common Parameters

### customer
- **Type**: string
- **Optional**: Yes
- **Description**: Specifies which customer account to use from `.edgerc`
- **Example**: `"customer-acme"`

### network
- **Type**: string
- **Enum**: ["STAGING", "PRODUCTION"]
- **Description**: Target network for activations
- **Example**: `"PRODUCTION"`

### version
- **Type**: number
- **Description**: Property version number
- **Example**: `5`

## Response Formats

### Success Response

```typescript
interface SuccessResponse {
  success: true;
  data: any;              // Tool-specific data
  message?: string;       // Optional success message
}
```

### Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;         // Error code
    message: string;      // Human-readable message
    details?: any;        // Additional error details
  };
}
```

## Authentication

All tools use EdgeGrid authentication configured in `.edgerc`:

```ini
[default]
client_secret = xxx
host = xxx.luna.akamaiapis.net
access_token = xxx
client_token = xxx
```

## Rate Limiting

API rate limits apply:
- Default: 10 requests/second per customer
- Activation APIs: 2 requests/second
- Bulk operations: 5 concurrent requests

## Error Codes

Common error codes across all tools:

| Code | Description | Solution |
|------|-------------|----------|
| `AUTH_ERROR` | Authentication failed | Check credentials |
| `NOT_FOUND` | Resource not found | Verify ID exists |
| `PERMISSION_DENIED` | Insufficient permissions | Check API access |
| `RATE_LIMITED` | Too many requests | Wait and retry |
| `VALIDATION_ERROR` | Invalid input | Check parameters |
| `TIMEOUT` | Request timeout | Retry operation |

## Best Practices

1. **Always specify customer** when working with multiple accounts
2. **Use descriptive notes** for activations and changes
3. **Test in staging** before production deployments
4. **Handle errors gracefully** with retry logic
5. **Batch operations** when possible for efficiency

## Tool Naming Convention

Tools follow a consistent naming pattern:

```
<service>_<action>_<object>
```

Examples:
- `list_properties` - List action on properties
- `create_zone` - Create action on zone
- `get_activation_status` - Get action on activation status

## Versioning

The API follows semantic versioning:
- **Major**: Breaking changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes

Current version: 1.0.0

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/alecs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/alecs/discussions)
- **Documentation**: This wiki

---

*For detailed tool documentation, see the individual reference pages listed above.*

*Last Updated: January 2025*