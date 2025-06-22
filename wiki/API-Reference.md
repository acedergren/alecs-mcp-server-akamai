# API Reference

Complete reference for all ALECS MCP tools organized by service.

## Table of Contents
- [Property Manager Tools](#property-manager-tools)
- [DNS Tools](#dns-tools)
- [Certificate Tools](#certificate-tools)
- [FastPurge Tools](#fastpurge-tools)
- [Reporting Tools](#reporting-tools)
- [Security Tools](#security-tools)
- [Network Lists Tools](#network-lists-tools)
- [Token Management Tools](#token-management-tools)

## Property Manager Tools

### Property Operations

#### `list-properties`
List all properties in your account.

**Parameters:**
- `contractId` (optional): Filter by contract
- `groupId` (optional): Filter by group

**Example:**
```
List all properties in contract ctr_123
```

#### `create-property`
Create a new property.

**Parameters:**
- `propertyName` (required): Name of the property
- `productId` (required): Product ID (e.g., "prd_Site_Accel")
- `contractId` (required): Contract ID
- `groupId` (required): Group ID

#### `get-property`
Get details of a specific property.

**Parameters:**
- `propertyId` (required): Property ID

#### `activate-property`
Activate a property version.

**Parameters:**
- `propertyId` (required): Property ID
- `version` (required): Version number
- `network` (required): "STAGING" or "PRODUCTION"
- `note` (optional): Activation note
- `emails` (optional): Notification emails

### Rule Management

#### `get-property-rules`
Get rules for a property version.

**Parameters:**
- `propertyId` (required): Property ID
- `version` (required): Version number

#### `update-property-rules`
Update property rules.

**Parameters:**
- `propertyId` (required): Property ID
- `version` (required): Version number
- `rules` (required): Rule tree JSON

### Hostname Management

#### `list-property-hostnames`
List hostnames for a property.

**Parameters:**
- `propertyId` (required): Property ID
- `version` (required): Version number

#### `add-property-hostname`
Add hostname to property.

**Parameters:**
- `propertyId` (required): Property ID
- `version` (required): Version number
- `hostname` (required): Hostname to add
- `edgeHostname` (required): Edge hostname

## DNS Tools

### Zone Operations

#### `list-zones`
List all DNS zones.

**Parameters:**
- `type` (optional): "PRIMARY" or "SECONDARY"

#### `create-zone`
Create a new DNS zone.

**Parameters:**
- `zone` (required): Zone name
- `type` (required): Zone type
- `contractId` (required): Contract ID

#### `get-zone`
Get zone details.

**Parameters:**
- `zone` (required): Zone name

### Record Management

#### `list-records`
List records in a zone.

**Parameters:**
- `zone` (required): Zone name
- `type` (optional): Record type filter

#### `create-record`
Create a DNS record.

**Parameters:**
- `zone` (required): Zone name
- `name` (required): Record name
- `type` (required): Record type (A, AAAA, CNAME, etc.)
- `ttl` (required): TTL in seconds
- `rdata` (required): Record data array

**Example:**
```json
{
  "zone": "example.com",
  "name": "www",
  "type": "A",
  "ttl": 300,
  "rdata": ["192.0.2.1"]
}
```

#### `update-record`
Update existing record.

**Parameters:**
- `zone` (required): Zone name
- `name` (required): Record name
- `type` (required): Record type
- `ttl` (required): New TTL
- `rdata` (required): New record data

#### `delete-record`
Delete a DNS record.

**Parameters:**
- `zone` (required): Zone name
- `name` (required): Record name
- `type` (required): Record type

## Certificate Tools

### Certificate Management

#### `list-certificate-enrollments`
List all certificate enrollments.

**Parameters:**
- `contractId` (optional): Filter by contract

#### `create-dv-enrollment`
Create domain validation enrollment.

**Parameters:**
- `commonName` (required): Common name
- `sans` (optional): Subject alternative names
- `contractId` (required): Contract ID

#### `get-dv-validation-challenges`
Get DV validation challenges.

**Parameters:**
- `enrollmentId` (required): Enrollment ID

#### `validate-certificate-enrollment`
Check validation status.

**Parameters:**
- `enrollmentId` (required): Enrollment ID

## FastPurge Tools

### Cache Invalidation

#### `fastpurge-url-invalidate`
Invalidate URLs.

**Parameters:**
- `urls` (required): Array of URLs (max 50)
- `network` (optional): "STAGING" or "PRODUCTION"

**Example:**
```
Invalidate https://example.com/path on production
```

#### `fastpurge-cpcode-invalidate`
Invalidate by CP code.

**Parameters:**
- `cpcode` (required): CP code
- `network` (optional): Network

#### `fastpurge-tag-invalidate`
Invalidate by cache tag.

**Parameters:**
- `tag` (required): Cache tag
- `network` (optional): Network

## Reporting Tools

### Traffic Analytics

#### `get-traffic-summary`
Get traffic summary statistics.

**Parameters:**
- `contractId` (required): Contract ID
- `startDate` (required): Start date (ISO)
- `endDate` (required): End date (ISO)

#### `analyze-bandwidth-usage`
Analyze bandwidth patterns.

**Parameters:**
- `propertyId` (required): Property ID
- `timeRange` (required): Time range

### Performance Metrics

#### `get-performance-analysis`
Get performance metrics.

**Parameters:**
- `propertyId` (required): Property ID
- `metrics` (required): Metric types
- `timeRange` (required): Time range

## Security Tools

### Network Lists

#### `list-network-lists`
List all network lists.

**Parameters:**
- `type` (optional): List type filter

#### `create-network-list`
Create network list.

**Parameters:**
- `name` (required): List name
- `type` (required): "IP" or "GEO"
- `description` (optional): Description

#### `update-network-list`
Update network list entries.

**Parameters:**
- `listId` (required): List ID
- `add` (optional): Items to add
- `remove` (optional): Items to remove

### AppSec

#### `list-appsec-configurations`
List security configurations.

**Parameters:**
- `contractId` (optional): Contract filter

## Token Management Tools

### Token Operations

#### `generate-api-token`
Generate new API token.

**Parameters:**
- `description` (optional): Token description
- `expiresInDays` (optional): Expiration days

**Example:**
```
Generate API token for CI/CD with 90 day expiration
```

#### `list-api-tokens`
List all API tokens.

**Parameters:** None

#### `validate-api-token`
Validate token.

**Parameters:**
- `token` (required): Token to validate

#### `rotate-api-token`
Rotate existing token.

**Parameters:**
- `tokenId` (required): Token ID

#### `revoke-api-token`
Revoke token.

**Parameters:**
- `tokenId` (required): Token ID

## Response Format

All tools return consistent response format:

```typescript
{
  content: [
    {
      type: "text",
      text: "Human-readable response"
    }
  ]
}
```

## Error Handling

Common error responses:

### Authentication Error
```json
{
  "error": "Authentication failed",
  "code": "AUTH_ERROR",
  "details": "Invalid or expired token"
}
```

### Validation Error
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "propertyId",
    "message": "Property ID is required"
  }
}
```

### API Error
```json
{
  "error": "Akamai API error",
  "code": "API_ERROR",
  "status": 404,
  "details": "Property not found"
}
```

## Rate Limits

Default rate limits:
- 100 requests per minute per token
- 1000 requests per hour per token
- Akamai API limits apply

## Best Practices

1. **Use specific parameters** when possible to reduce response size
2. **Batch operations** when available (e.g., bulk DNS updates)
3. **Cache responses** for read operations
4. **Handle errors gracefully** with retries
5. **Monitor rate limits** via response headers

---

For detailed examples, see [[Tool Examples]] | For troubleshooting, see [[Troubleshooting]]