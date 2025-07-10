# OpenAPI-Driven Development Guide

## Overview

ALECS now supports automatic tool generation from OpenAPI specifications, dramatically reducing development time and ensuring API compliance. This guide covers the new OpenAPI-driven development workflow.

## Key Features

### 1. Automatic Code Generation
Generate complete tool implementations from OpenAPI specs:
- Type-safe tool methods
- Zod schemas for runtime validation
- MCP tool definitions
- Proper error handling

### 2. Smart Updates
Keep tools synchronized with API changes:
- Detect new endpoints
- Update modified parameters
- Preserve custom logic
- Mark deprecated endpoints

### 3. Migration Support
Convert existing hardcoded tools:
- Replace manual API calls with typed versions
- Generate missing schemas
- Add response validation
- Update to latest patterns

## Command Reference

### Generate New Domain

```bash
# Basic generation
alecs generate-from-api --spec ./openapi.json --domain mydomain

# With custom output directory
alecs generate-from-api --spec ./openapi.json --domain mydomain --output ./src/tools/mydomain

# Download spec from URL
alecs generate-from-api --spec https://api.example.com/openapi.json --domain mydomain
```

### Update Existing Tools

```bash
# Check what would change (dry run)
alecs generate-from-api --spec ./api-v2.json --domain property --dry-run

# Apply updates
alecs generate-from-api --spec ./api-v2.json --domain property --update

# Update specific tools only
alecs generate-from-api --spec ./api-v2.json --domain property --update --tools "property_list,property_create"
```

### Migrate Legacy Tools

```bash
# Analyze migration potential
alecs generate-from-api --spec ./api.json --tool ./src/tools/dns/dns-tools.ts --analyze

# Perform migration with backup
alecs generate-from-api --spec ./api.json --tool ./src/tools/dns/dns-tools.ts --migrate --backup

# Validate migration
alecs generate-from-api --spec ./api.json --tool ./src/tools/dns/dns-tools.ts --validate
```

### Interactive Mode

```bash
# Guided workflow
alecs generate-from-api

# The CLI will prompt for:
# 1. API specification source (file/URL)
# 2. Target domain name
# 3. Operation type (create/update/migrate)
# 4. Additional options
```

## Generated Code Structure

### Tool Implementation
```typescript
/**
 * List properties
 * 
 * @endpoint GET /papi/v1/properties
 * @since 2025-01-17T00:00:00.000Z
 */
async property_list(args: PropertyListArgs): Promise<MCPToolResponse> {
  try {
    this.errorHandler.operation = 'property_list';
    logger.info({ args }, 'Executing property_list');
    
    // Build query parameters
    const params: Record<string, any> = {};
    if (args.contractId !== undefined) params.contractId = args.contractId;
    if (args.groupId !== undefined) params.groupId = args.groupId;
    
    const response = await this.client.request({
      method: 'GET',
      path: '/papi/v1/properties',
      params
    });
    
    // Validate response
    const validatedData = PropertyListResponseSchema.parse(response.data);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(validatedData, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to execute property_list');
    return this.errorHandler.handleError(error);
  }
}
```

### Schema Generation
```typescript
// Auto-generated from OpenAPI schema
export const PropertySchema = z.object({
  propertyId: z.string(),
  propertyName: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  latestVersion: z.number().optional(),
  productionVersion: z.number().optional(),
  stagingVersion: z.number().optional(),
  assetId: z.string().optional(),
  note: z.string().optional()
});

export type Property = z.infer<typeof PropertySchema>;
```

### MCP Registration
```typescript
// Auto-generated MCP tool definition
'property_list': {
  description: 'List all properties',
  inputSchema: {
    type: 'object',
    properties: {
      contractId: {
        type: 'string',
        description: 'Contract identifier',
        required: false
      },
      groupId: {
        type: 'string',
        description: 'Group identifier',
        required: false
      }
    }
  },
  handler: async (args: any) => propertyTools.property_list(args)
}
```

## Configuration Options

### generate-from-api.config.json
```json
{
  "defaultOutput": "./src/tools",
  "schemaPrefix": "",
  "schemaSuffix": "Schema",
  "typePrefix": "",
  "typeSuffix": "",
  "generateTests": true,
  "preserveCustomCode": true,
  "strictMode": true,
  "downloadSpecs": {
    "enabled": true,
    "baseUrl": "https://github.com/akamai/akamai-apis/raw/main/apis",
    "cacheDir": "./docs/api"
  }
}
```

## Best Practices

### 1. Version Control
- Commit generated code separately from manual changes
- Review generated diffs before committing
- Use semantic commit messages

### 2. Customization
- Add custom logic in separate methods
- Use composition over modification
- Document manual overrides

### 3. Testing
- Generate tests with `--generate-tests`
- Add integration tests for custom logic
- Validate against real API responses

### 4. Schema Evolution
- Use `--preserve-custom` to keep modifications
- Version schemas when breaking changes occur
- Document migration paths

## Common Patterns

### Adding Custom Validation
```typescript
// Extend generated schema
export const EnhancedPropertySchema = PropertySchema.extend({
  customField: z.string().optional()
}).refine(
  (data) => data.propertyName.length > 3,
  { message: "Property name must be at least 4 characters" }
);
```

### Wrapping Generated Methods
```typescript
// Add custom logic around generated method
async property_list_with_cache(args: PropertyListArgs): Promise<MCPToolResponse> {
  const cacheKey = `property_list_${args.contractId}_${args.groupId}`;
  const cached = await this.cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const result = await this.property_list(args);
  await this.cache.set(cacheKey, result, 300);
  
  return result;
}
```

### Handling API Versioning
```typescript
// Support multiple API versions
async property_list(args: PropertyListArgs & { apiVersion?: string }): Promise<MCPToolResponse> {
  const version = args.apiVersion || 'v1';
  const basePath = `/papi/${version}`;
  
  // Use versioned endpoint
  const response = await this.client.request({
    method: 'GET',
    path: `${basePath}/properties`
  });
  
  // Validate with version-specific schema
  const schema = version === 'v2' ? PropertyV2Schema : PropertySchema;
  const validatedData = schema.parse(response.data);
  
  return this.formatResponse(validatedData);
}
```

## Troubleshooting

### Common Issues

1. **Schema Validation Errors**
   - Check OpenAPI spec validity
   - Ensure all $refs are resolvable
   - Validate example responses

2. **Generation Conflicts**
   - Use `--force` to overwrite
   - Review `--dry-run` output first
   - Backup existing code

3. **Missing Endpoints**
   - Check operationId presence
   - Verify path parameters format
   - Ensure proper HTTP methods

### Debug Mode
```bash
# Enable verbose logging
DEBUG=alecs:* alecs generate-from-api --spec ./api.json --domain test

# Save debug output
alecs generate-from-api --spec ./api.json --domain test --debug > debug.log 2>&1
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Update API Tools
on:
  schedule:
    - cron: '0 0 * * 0' # Weekly
  workflow_dispatch:

jobs:
  update-tools:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install ALECS
        run: npm install -g alecs-mcp-server-akamai
        
      - name: Download Latest API Specs
        run: |
          curl -O https://api.akamai.com/specs/property-manager-v1.json
          curl -O https://api.akamai.com/specs/edge-dns-v2.json
          
      - name: Update Tools
        run: |
          alecs generate-from-api --spec property-manager-v1.json --domain property --update
          alecs generate-from-api --spec edge-dns-v2.json --domain dns --update
          
      - name: Run Tests
        run: npm test
        
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'chore: update API tools to latest specifications'
          body: 'Automated update of API tools based on latest OpenAPI specifications.'
          branch: update-api-tools
```

## Future Enhancements

### Planned Features
- GraphQL schema generation
- API mocking for testing
- Breaking change detection
- Auto-documentation updates
- Multi-language support

### Experimental Features
Enable with `--experimental` flag:
- Smart merge strategies
- API deprecation handling
- Performance optimizations
- Custom template support

## Contributing

To contribute to the OpenAPI generator:

1. Review [TOOL_CREATION_GUIDE.md](./TOOL_CREATION_GUIDE.md)
2. Check generator code in `src/cli/generators/`
3. Add tests in `src/cli/generators/__tests__/`
4. Submit PR with examples

## Resources

- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [Akamai API Catalog](https://techdocs.akamai.com/home/page/products-tools-a-z)
- [Akamai OpenAPI Specs](https://github.com/akamai/akamai-apis)
- [Zod Documentation](https://zod.dev/)