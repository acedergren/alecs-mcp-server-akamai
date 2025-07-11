# ID Translation Service Integration

## Overview

The ID Translation Service has been integrated into BaseTool to automatically translate cryptic Akamai IDs (like `ctr_C-1234567`) into human-readable names (like `Web Performance Contract`). This enhancement improves the user experience by making API responses more understandable while maintaining the original IDs for API operations.

## Key Features

### 1. Automatic Translation
- Translates IDs automatically when tools use `BaseTool.execute()`
- No changes needed to existing tool logic
- Adds `*Name` fields alongside original `*Id` fields

### 2. Supported ID Types
- **Property IDs** (`prp_*`) → Property names
- **Contract IDs** (`ctr_*`) → Contract names  
- **Group IDs** (`grp_*`) → Group names
- **Product IDs** (`prd_*`) → Product names
- **CP Code IDs** → CP Code names
- **Certificate IDs** → Certificate common names
- **Network List IDs** → Network list names

### 3. Performance Optimizations
- **LRU Cache**: Recently translated IDs are cached (1-hour TTL)
- **Batch Translation**: Multiple IDs translated in single API call where possible
- **Configurable TTL**: Cache duration can be customized per operation
- **Skip Cache Option**: Force fresh lookups when needed

### 4. Path Mapping Support
- Simple paths: `propertyId`, `contractId`
- Array wildcards: `*.propertyId`, `items.*.contractId`
- Deep wildcards: `**.propertyId` (matches at any depth)
- Complex paths: `properties.items.*.contractId`

## Implementation in Tools

### Basic Usage

```typescript
export async function listProperties(args: any): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'property',
    'property_list',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: '/papi/v1/properties',
      });
    },
    {
      translation: {
        enabled: true,
        mappings: BaseTool.COMMON_TRANSLATIONS.property
      }
    }
  );
}
```

### Custom Mappings

```typescript
{
  translation: {
    enabled: true,
    mappings: [
      { path: 'customId', type: 'property' },
      { path: 'items.*.relatedIds.*.id', type: 'contract' }
    ],
    options: {
      ttl: 7200000, // 2 hours
      includeMetadata: true
    }
  }
}
```

### Disable Translation

```typescript
{
  translation: {
    enabled: false  // No translation for this operation
  }
}
```

## Common Translation Mappings

BaseTool provides pre-defined mappings for common domains:

- `BaseTool.COMMON_TRANSLATIONS.property` - Property-related IDs
- `BaseTool.COMMON_TRANSLATIONS.certificate` - Certificate IDs
- `BaseTool.COMMON_TRANSLATIONS.network` - Network list IDs
- `BaseTool.COMMON_TRANSLATIONS.cpcode` - CP code IDs
- `BaseTool.COMMON_TRANSLATIONS.all` - All common patterns

## Example Transformation

### Before Translation
```json
{
  "propertyId": "prp_123456",
  "contractId": "ctr_C-1234567",
  "groupId": "grp_98765"
}
```

### After Translation
```json
{
  "propertyId": "prp_123456",
  "propertyName": "www.example.com",
  "contractId": "ctr_C-1234567",
  "contractName": "Web Performance Contract",
  "groupId": "grp_98765",
  "groupName": "Production Properties"
}
```

## Error Handling

- Translation failures don't break the operation
- Falls back to original ID if translation fails
- Errors are logged but not propagated to user
- Cache continues to work even if some translations fail

## Cache Management

```typescript
// Clear all translation cache
idTranslationService.clearCache();

// Get cache statistics
const stats = idTranslationService.getCacheStats();
console.log(`Cache size: ${stats.size}/${stats.maxSize}`);
```

## Best Practices

1. **Enable for Read Operations**: Always enable translation for list/get operations
2. **Disable for Write Operations**: Disable for create/update operations
3. **Use Common Mappings**: Prefer `COMMON_TRANSLATIONS` over custom mappings
4. **Custom Formatters**: Formatters receive translated data automatically
5. **Test with Cache**: Verify translations work with both cold and warm cache

## Migration Guide

To add translation to existing tools:

1. Update the tool's `BaseTool.execute()` call
2. Add translation configuration
3. Test that responses include `*Name` fields
4. Update any custom formatters to use translated names

No changes needed to:
- Tool parameters
- API request logic  
- Error handling
- Response schemas

The translation is completely transparent to the tool implementation.