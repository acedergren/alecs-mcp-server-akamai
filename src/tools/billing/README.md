# Billing Domain

Billing domain tools

## Overview

This domain provides tools for managing Billing operations through the Akamai BILLING API.

## Tools

### Core Operations
- `billing_list` - List all billing resources
- `billing_get` - Get specific billing resource
- `billing_create` - Create new billing resource
- `billing_update` - Update existing billing resource
- `billing_delete` - Delete billing resource

### Advanced Operations
- `billing_search` - Search billing resources
- `billing_bulk_operation` - Bulk operations

## API Integration

This domain integrates with the Akamai BILLING API:
- Base URL: `https://akzz-XXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXX.luna.akamaiapis.net`
- Authentication: EdgeGrid authentication
- API Documentation: [Akamai Developer Portal](https://developer.akamai.com/)

## Usage Examples

### List Resources
```typescript
const tools = await client.callTool('billing_list', {
  customer: 'default',
  limit: 10
});
```

### Get Specific Resource
```typescript
const resource = await client.callTool('billing_get', {
  customer: 'default',
  id: 'resource-id'
});
```

### Create New Resource
```typescript
const newResource = await client.callTool('billing_create', {
  customer: 'default',
  name: 'New Resource',
  // ... other required fields
});
```

## Development

### Adding New Tools
Use the CLI to add new tools to this domain:

```bash
alecs generate tool billing <tool-name>
```

### Implementation Notes
- All tools follow the domain tools pattern
- Error handling is standardized across all operations
- Response formats comply with MCP protocol
- Customer context is validated before each operation

## Testing

```bash
# Run domain-specific tests
npm test -- --testNamePattern="Billing"

# Run specific tool tests
npm test -- --testNamePattern="billing"
```

## Generated

This domain was generated on 2025-07-09T22:49:33.647Z using ALECSCore CLI.
