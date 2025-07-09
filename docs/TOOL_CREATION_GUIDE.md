# ALECS Tool Creation Guide

## Quick Start: Creating Your First Tool

### 1. Basic Tool Pattern
```typescript
import { tool } from '../core/server/alecs-core.js';
import { z } from 'zod';

// Define your tool's input schema
const MyToolSchema = z.object({
  customer: z.string(),
  param1: z.string(),
  param2: z.number().optional()
});

// Create the tool
const myTool = tool(
  'my-tool',              // Tool name (follows domain.action pattern)
  MyToolSchema,           // Zod schema for input validation
  async (args, ctx) => {  // Handler function
    // Your tool logic here
    const result = await ctx.client.get('/api/endpoint', args);
    return result;
  },
  {                       // Optional configuration
    cache: { ttl: 300 },  // Cache for 5 minutes
    coalesce: true,       // Prevent duplicate requests
    format: 'json'        // Response format
  }
);
```

### 2. Register in Domain Server
```typescript
// In your domain server (e.g., src/servers/mydomain-server-alecscore.ts)
import { ALECSCore } from '../core/server/alecs-core.js';

class MyDomainServer extends ALECSCore {
  override tools = [
    myTool,
    // ... other tools
  ];
}

export default MyDomainServer;
```

### 3. Add to Registry
```typescript
// In src/tools/all-tools-registry.ts
import { myDomainTools } from './mydomain/consolidated-mydomain-tools.js';

export function getAllToolDefinitions(): ToolDefinition[] {
  const allTools: ToolDefinition[] = [];
  
  // Add your domain tools
  allTools.push(...convertToolsToDefinitions(myDomainTools));
  
  return allTools;
}
```

## Complete Tool Creation Workflow

### Step 1: Plan Your Tool

Before coding, define:
- **Purpose**: What does your tool accomplish?
- **Input**: What parameters does it need?
- **Output**: What data does it return?
- **API**: Which Akamai API endpoint(s) will it use?
- **Customer**: Does it support multi-customer scenarios?

### Step 2: Create the Tool Schema

```typescript
import { z } from 'zod';
import { CustomerSchema } from '../schemas/customer.js';

// Always extend CustomerSchema for multi-customer support
const MyToolSchema = CustomerSchema.extend({
  // Required parameters
  hostname: z.string().min(1, 'Hostname is required'),
  
  // Optional parameters with defaults
  timeout: z.number().min(1).max(300).default(30),
  
  // Enum values
  network: z.enum(['staging', 'production']).default('staging'),
  
  // Complex objects
  config: z.object({
    enabled: z.boolean(),
    rules: z.array(z.string())
  }).optional(),
  
  // Custom validations
  contractId: z.string().refine(
    (val) => val.startsWith('ctr_'),
    'Contract ID must start with ctr_'
  )
});

// Export the type for use in your handler
export type MyToolArgs = z.infer<typeof MyToolSchema>;
```

### Step 3: Implement the Tool Handler

```typescript
import { ToolContext } from '../types/tool-infrastructure.js';
import { createErrorResponse, createSuccessResponse } from '../utils/response-helpers.js';

async function myToolHandler(args: MyToolArgs, ctx: ToolContext) {
  const { client, customer, cache, logger } = ctx;
  
  try {
    // Log the operation
    logger.info('Executing my-tool', { customer, args });
    
    // Validate customer context
    if (!customer) {
      return createErrorResponse('Customer context is required', 'MISSING_CUSTOMER');
    }
    
    // Check cache first (if enabled)
    const cacheKey = `my-tool-${customer}-${args.hostname}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit for my-tool', { customer, hostname: args.hostname });
      return cached;
    }
    
    // Make the API call
    const response = await client.get('/api/v1/my-endpoint', {
      params: {
        hostname: args.hostname,
        timeout: args.timeout
      },
      headers: {
        'Customer': customer
      }
    });
    
    // Process the response
    const result = {
      hostname: args.hostname,
      data: response.data,
      timestamp: new Date().toISOString()
    };
    
    // Cache the result
    await cache.set(cacheKey, result, args.timeout);
    
    return createSuccessResponse(result);
    
  } catch (error) {
    logger.error('my-tool failed', { error, customer, args });
    
    // Handle known API errors
    if (error.response?.status === 404) {
      return createErrorResponse(
        `Hostname ${args.hostname} not found`,
        'HOSTNAME_NOT_FOUND'
      );
    }
    
    if (error.response?.status === 403) {
      return createErrorResponse(
        'Access denied for this customer',
        'ACCESS_DENIED'
      );
    }
    
    // Generic error fallback
    return createErrorResponse(
      'An unexpected error occurred',
      'INTERNAL_ERROR'
    );
  }
}
```

### Step 4: Create the Tool Definition

```typescript
export const myTool = tool(
  'mydomain.my-action',   // Naming convention: domain.action
  MyToolSchema,
  myToolHandler,
  {
    // Performance options
    cache: { 
      ttl: 300,           // Cache for 5 minutes
      customer: true      // Customer-isolated caching
    },
    coalesce: true,       // Prevent duplicate concurrent requests
    
    // Response formatting
    format: 'json',       // Default format
    streaming: false,     // For large datasets
    
    // Metadata
    description: 'My tool does X with Y parameters',
    tags: ['core', 'mydomain']
  }
);
```

## Advanced Patterns

### Pattern 1: Complex Data Processing

```typescript
const processDataTool = tool(
  'data.process',
  ProcessDataSchema,
  async (args, ctx) => {
    const { client, format } = ctx;
    
    // Stream large datasets
    const stream = await client.stream('/api/v1/large-data', args);
    
    // Process in chunks
    const results = [];
    for await (const chunk of stream) {
      const processed = await processChunk(chunk);
      results.push(processed);
    }
    
    // Format based on client preference
    return format(results, args.outputFormat);
  },
  {
    streaming: true,
    cache: { ttl: 0 }  // Don't cache streaming responses
  }
);
```

### Pattern 2: Multi-Step Operations

```typescript
const multiStepTool = tool(
  'workflow.multi-step',
  MultiStepSchema,
  async (args, ctx) => {
    const { client, logger } = ctx;
    
    const results = {
      steps: [],
      overall: 'pending'
    };
    
    try {
      // Step 1
      logger.info('Starting step 1');
      const step1 = await client.post('/api/v1/step1', args.step1);
      results.steps.push({ step: 1, status: 'completed', data: step1.data });
      
      // Step 2 (depends on step 1)
      logger.info('Starting step 2');
      const step2 = await client.post('/api/v1/step2', {
        ...args.step2,
        referenceId: step1.data.id
      });
      results.steps.push({ step: 2, status: 'completed', data: step2.data });
      
      results.overall = 'completed';
      return results;
      
    } catch (error) {
      results.overall = 'failed';
      results.error = error.message;
      throw error;
    }
  }
);
```

### Pattern 3: Customer-Aware Caching

```typescript
const customerAwareTool = tool(
  'customer.data',
  CustomerDataSchema,
  async (args, ctx) => {
    const { client, customer, cache } = ctx;
    
    // Customer-specific cache key
    const cacheKey = `customer-data-${customer}-${args.dataType}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch fresh data
    const response = await client.get('/api/v1/customer-data', {
      params: { dataType: args.dataType },
      headers: { 'Account-Switch-Key': customer }
    });
    
    // Cache with customer isolation
    await cache.set(cacheKey, response.data, 600, { customer });
    
    return response.data;
  },
  {
    cache: { 
      ttl: 600,
      customer: true,    // Enable customer-isolated caching
      invalidate: ['customer.update']  // Invalidate on customer updates
    }
  }
);
```

## Testing Your Tools

### Unit Testing Pattern

```typescript
// In __tests__/tools/my-tool.test.ts
import { describe, it, expect, jest } from '@jest/globals';
import { myTool } from '../../src/tools/mydomain/my-tool.js';

describe('myTool', () => {
  const mockContext = {
    client: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    },
    customer: 'test-customer',
    cache: {
      get: jest.fn(),
      set: jest.fn()
    },
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    },
    format: jest.fn((data) => data)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle valid input', async () => {
    // Arrange
    const args = { customer: 'test-customer', hostname: 'example.com' };
    mockContext.client.get.mockResolvedValue({ data: { status: 'active' } });

    // Act
    const result = await myTool.handler(args, mockContext);

    // Assert
    expect(result).toEqual({
      hostname: 'example.com',
      data: { status: 'active' },
      timestamp: expect.any(String)
    });
    
    expect(mockContext.client.get).toHaveBeenCalledWith('/api/v1/my-endpoint', {
      params: { hostname: 'example.com', timeout: 30 },
      headers: { 'Customer': 'test-customer' }
    });
  });

  it('should handle 404 errors gracefully', async () => {
    // Arrange
    const args = { customer: 'test-customer', hostname: 'nonexistent.com' };
    mockContext.client.get.mockRejectedValue({
      response: { status: 404 }
    });

    // Act & Assert
    await expect(myTool.handler(args, mockContext)).rejects.toThrow('Hostname nonexistent.com not found');
  });

  it('should use cache when available', async () => {
    // Arrange
    const args = { customer: 'test-customer', hostname: 'cached.com' };
    const cachedResult = { cached: true };
    mockContext.cache.get.mockResolvedValue(cachedResult);

    // Act
    const result = await myTool.handler(args, mockContext);

    // Assert
    expect(result).toEqual(cachedResult);
    expect(mockContext.client.get).not.toHaveBeenCalled();
  });
});
```

### Integration Testing

```typescript
// In __tests__/integration/my-tool-integration.test.ts
import { ALECSCore } from '../../src/core/server/alecs-core.js';
import { myTool } from '../../src/tools/mydomain/my-tool.js';

describe('MyTool Integration', () => {
  let server: ALECSCore;

  beforeEach(() => {
    server = new ALECSCore('test-server');
    server.tools = [myTool];
  });

  it('should execute tool through server', async () => {
    const request = {
      method: 'tools/call',
      params: {
        name: 'mydomain.my-action',
        arguments: {
          customer: 'test-customer',
          hostname: 'example.com'
        }
      }
    };

    const response = await server.handleRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.error).toBeUndefined();
  });
});
```

## Best Practices

### 1. Schema Design
- **Always extend CustomerSchema** for multi-customer support
- **Use descriptive error messages** in schema validation
- **Set reasonable defaults** for optional parameters
- **Use enums** for limited value sets
- **Add custom validations** for business rules

### 2. Error Handling
- **Catch and categorize errors** by HTTP status code
- **Return user-friendly error messages** without exposing internals
- **Log errors with context** for debugging
- **Use RFC 7807 Problem Details format** for consistency

### 3. Performance
- **Enable caching** for read-heavy operations
- **Use request coalescing** for duplicate requests
- **Implement streaming** for large datasets
- **Set appropriate cache TTL** based on data volatility

### 4. Testing
- **Write comprehensive unit tests** for all code paths
- **Mock external dependencies** for isolation
- **Test error scenarios** explicitly
- **Use integration tests** for end-to-end validation

### 5. Documentation
- **Document tool purpose** and usage patterns
- **Provide clear examples** of input/output
- **Document error codes** and their meanings
- **Include performance characteristics** (cache TTL, etc.)

## Common Pitfalls and Solutions

### Pitfall 1: Forgetting Customer Context
```typescript
// ❌ Wrong - ignores customer context
const badTool = tool('bad-tool', schema, async (args, ctx) => {
  return await ctx.client.get('/api/endpoint');
});

// ✅ Correct - validates and uses customer context
const goodTool = tool('good-tool', schema, async (args, ctx) => {
  if (!ctx.customer) {
    throw new Error('Customer context required');
  }
  return await ctx.client.get('/api/endpoint', {
    headers: { 'Customer': ctx.customer }
  });
});
```

### Pitfall 2: Poor Error Handling
```typescript
// ❌ Wrong - generic error handling
const badTool = tool('bad-tool', schema, async (args, ctx) => {
  try {
    return await ctx.client.get('/api/endpoint');
  } catch (error) {
    throw new Error('Something went wrong');
  }
});

// ✅ Correct - specific error handling
const goodTool = tool('good-tool', schema, async (args, ctx) => {
  try {
    return await ctx.client.get('/api/endpoint');
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Resource not found');
    }
    if (error.response?.status === 403) {
      throw new Error('Access denied');
    }
    throw new Error('API request failed');
  }
});
```

### Pitfall 3: Ignoring Cache Optimization
```typescript
// ❌ Wrong - no caching for expensive operations
const badTool = tool('expensive-tool', schema, async (args, ctx) => {
  // This will hit the API every time
  return await ctx.client.get('/api/expensive-endpoint');
});

// ✅ Correct - appropriate caching
const goodTool = tool('expensive-tool', schema, async (args, ctx) => {
  const cacheKey = `expensive-${args.customer}-${args.id}`;
  const cached = await ctx.cache.get(cacheKey);
  if (cached) return cached;
  
  const result = await ctx.client.get('/api/expensive-endpoint');
  await ctx.cache.set(cacheKey, result, 300); // Cache for 5 minutes
  return result;
}, {
  cache: { ttl: 300 }
});
```

## Tool Naming Conventions

### Standard Format: `domain.action`
- **property.list** - List properties
- **property.create** - Create a property
- **property.update** - Update a property
- **property.delete** - Delete a property

### For Sub-domains: `domain.subdomain.action`
- **dns.zone.create** - Create DNS zone
- **dns.record.add** - Add DNS record
- **security.waf.enable** - Enable WAF protection

### For Complex Operations: `domain.action-detail`
- **property.activate-staging** - Activate to staging
- **property.activate-production** - Activate to production
- **certificate.deploy-enhanced** - Deploy to Enhanced TLS

## Integration with MCP Protocol

Your tools automatically integrate with the MCP protocol through ALECSCore:

1. **Schema Validation**: Zod schemas are converted to JSON Schema for MCP
2. **Request Handling**: MCP requests are routed to your tool handlers
3. **Response Formatting**: Results are formatted according to MCP standards
4. **Error Handling**: Errors are converted to MCP error format
5. **Streaming**: Large responses can be streamed to Claude Desktop

## Next Steps

1. **Review existing tools** in `src/tools/` for patterns and examples
2. **Check the consolidated tool files** for your domain
3. **Run tests** to ensure your tool integrates properly
4. **Update documentation** when adding new tools
5. **Consider performance implications** of your tool's API usage

## Getting Help

- **Architecture Guide**: See `docs/architecture/COMPONENT_IMPLEMENTATION_GUIDE.md`
- **Type Definitions**: Check `src/types/tool-infrastructure.ts`
- **Examples**: Look at `src/tools/property/consolidated-property-tools.ts`
- **Testing**: See `__tests__/` directory for test patterns