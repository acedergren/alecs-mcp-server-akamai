# Enhanced CLI Tool Architecture Migration Guide

## Overview

The Enhanced CLI Tool Architecture is now the standard for all ALECS MCP Server tools. It provides:

- ✅ Dynamic customer support (no singleton lock)
- ✅ Built-in caching with TTL
- ✅ Automatic hint integration
- ✅ Progress tracking for long operations
- ✅ Enhanced error messages
- ✅ Type safety throughout
- ✅ Unified behavior across all tools

## Migration Examples

### Before: Old CLI Pattern (Billing)

```typescript
export class BillingTools {
  private client: AkamaiClient;
  private errorHandler: ToolErrorHandler;

  constructor(customer: string = 'default') {
    this.client = new AkamaiClient(customer); // ❌ LOCKED to one customer!
    this.errorHandler = new ToolErrorHandler({
      tool: 'billing',
      operation: 'billing-operation',
      customer
    });
  }

  async usageByProduct(args: Schema): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        method: 'GET',
        path: BillingEndpoints.usageByProduct(args.contractId),
        queryParams: { fromMonth: args.fromMonth }
      });

      // Manual formatting
      let text = formatResponse(response);
      
      // Manual hint integration
      const result = { content: [{ type: 'text', text }] };
      return await enhanceResponseWithHints('billing_usage_by_product', args, result);
      
    } catch (error) {
      // Manual error handling
      return this.errorHandler.handleError(error);
    }
  }
}

// Singleton instance - can't switch customers!
export const billingTools = new BillingTools();
```

### After: Enhanced CLI Pattern

```typescript
import { EnhancedTool } from '../common/enhanced-tool-base';

// Create enhanced tool instance for the domain
const billingTool = new EnhancedTool('billing');

export async function usageByProduct(args: Schema): Promise<MCPToolResponse> {
  return billingTool.execute(
    'billing_usage_by_product',
    args,
    async (client) => {
      // Just the API call - everything else is automatic!
      return client.request({
        method: 'GET',
        path: BillingEndpoints.usageByProduct(args.contractId),
        queryParams: { fromMonth: args.fromMonth }
      });
    },
    {
      format: 'text',
      formatter: (data) => formatProductUsage(data, args),
      cacheKey: (p) => `billing:${p.contractId}:${p.fromMonth}`,
      cacheTtl: 3600, // 1 hour cache
      operation: 'usage-by-product'
    }
  );
}
```

## Migration Steps

### 1. Remove Singleton Pattern

**Before:**
```typescript
export class ToolClass {
  private client: AkamaiClient;
  constructor(customer: string = 'default') {
    this.client = new AkamaiClient(customer);
  }
}
export const toolInstance = new ToolClass();
```

**After:**
```typescript
const tool = new EnhancedTool('domain-name');
// No singleton - client created per request!
```

### 2. Convert Methods to Functions

**Before:**
```typescript
class Tools {
  async myMethod(args: Args): Promise<MCPToolResponse> {
    // implementation
  }
}
```

**After:**
```typescript
export async function myMethod(args: Args): Promise<MCPToolResponse> {
  return tool.execute('tool_name', args, async (client) => {
    // implementation
  });
}
```

### 3. Add Caching

**Before:**
```typescript
// No caching
const response = await client.request({ /* ... */ });
```

**After:**
```typescript
return tool.execute('tool_name', args, 
  async (client) => client.request({ /* ... */ }),
  {
    cacheKey: (p) => `domain:${p.id}:${p.param}`,
    cacheTtl: 3600 // seconds
  }
);
```

### 4. Simplify Error Handling

**Before:**
```typescript
try {
  // logic
} catch (error) {
  const errorResponse = this.errorHandler.handleError(error);
  return await enhanceResponseWithHints('tool_name', args, errorResponse, {
    customer: args.customer,
    error: error as Error
  });
}
```

**After:**
```typescript
// Automatic! Just return the result
return tool.execute('tool_name', args, operation, options);
```

### 5. Add Progress Tracking

**Before:**
```typescript
// No progress tracking
const result = await longOperation();
```

**After:**
```typescript
return tool.execute('tool_name', args, 
  async (client) => longOperation(),
  {
    progress: true,
    progressMessage: 'Processing large dataset...'
  }
);
```

## BaseTool Migration

For tools using BaseTool pattern:

### Before: BaseTool Pattern

```typescript
export class PropertyTools extends BaseTool {
  protected readonly domain = 'property';
  
  async listProperties(args: Schema): Promise<MCPToolResponse> {
    return this.executeStandardOperation(
      'list-properties',
      args,
      async (client) => { /* implementation */ },
      { 
        toolName: 'property_list',
        cacheKey: (p) => `properties:${p.contractId}`,
        cacheTtl: 300
      }
    );
  }
}
```

### After: Enhanced CLI Pattern

```typescript
const propertyTool = new EnhancedTool('property');

export async function listProperties(args: Schema): Promise<MCPToolResponse> {
  return propertyTool.execute(
    'property_list',
    args,
    async (client) => { /* same implementation */ },
    {
      cacheKey: (p) => `properties:${p.contractId}`,
      cacheTtl: 300
    }
  );
}
```

## Type-Safe Tool Registry

### Creating Tool Definitions

```typescript
import { createTool } from '../common/enhanced-tool-base';

export const toolDefinitions = [
  createTool({
    domain: 'billing',
    name: 'billing_usage_by_product',
    description: 'Get usage by product',
    inputSchema: BillingSchema,
    execute: async (client, args) => {
      return client.request({ /* ... */ });
    },
    options: {
      format: 'text',
      formatter: formatProductUsage,
      cacheKey: (p) => `billing:${p.contractId}`,
      cacheTtl: 3600
    }
  })
];
```

### Registering Tools

```typescript
// In index.ts
import { toolDefinitions } from './billing-tools-enhanced';

export const billingTools = toolDefinitions.reduce((acc, tool) => {
  acc[tool.name] = tool;
  return acc;
}, {} as Record<string, any>);
```

## CLI Template Updates

The ALECSCore CLI will generate enhanced pattern by default:

```bash
# Generate new domain with enhanced pattern
alecscore generate domain billing --enhanced

# Migrate existing domain
alecscore migrate billing --to-enhanced
```

## Benefits Summary

| Feature | Old Pattern | Enhanced Pattern |
|---------|------------|------------------|
| Customer Support | Singleton (locked) | Dynamic per request |
| Caching | Manual implementation | Built-in with TTL |
| Error Handling | Manual try/catch | Automatic + context |
| Hints | Manual integration | Automatic |
| Progress | Not available | Built-in support |
| Type Safety | Partial | Full throughout |
| Code Lines | ~100 per method | ~20 per method |

## Next Steps

1. Start with new tools - use Enhanced pattern
2. Migrate high-traffic tools first (for caching benefits)
3. Update CLI templates to generate Enhanced pattern
4. Gradually migrate all existing tools
5. Remove old patterns and consolidate

The Enhanced CLI Tool Architecture makes tools more powerful while requiring less code. It's the future of ALECS MCP Server!