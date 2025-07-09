# ALECS Tool Quick Reference

## 📋 Tool Creation Checklist

### Before You Start
- [ ] Define tool purpose and API endpoint
- [ ] Identify required and optional parameters
- [ ] Plan error handling scenarios
- [ ] Consider caching requirements
- [ ] Check if customer context is needed

### Implementation Steps
- [ ] Create Zod schema extending CustomerSchema
- [ ] Implement tool handler with proper error handling
- [ ] Add appropriate caching and performance options
- [ ] Write comprehensive tests
- [ ] Register tool in domain server
- [ ] Add to all-tools-registry
- [ ] Update documentation

## 🚀 Quick Start Template

```typescript
// 1. Schema Definition
const MyToolSchema = CustomerSchema.extend({
  param1: z.string(),
  param2: z.number().optional().default(30)
});

// 2. Tool Implementation
export const myTool = tool(
  'domain.action',
  MyToolSchema,
  async (args, ctx) => {
    const { client, customer, cache, logger } = ctx;
    
    // Validate customer
    if (!customer) throw new Error('Customer required');
    
    // Check cache
    const cacheKey = `tool-${customer}-${args.param1}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
    
    // API call
    const response = await client.get('/api/endpoint', {
      params: args,
      headers: { 'Customer': customer }
    });
    
    // Cache result
    await cache.set(cacheKey, response.data, 300);
    return response.data;
  },
  {
    cache: { ttl: 300, customer: true },
    coalesce: true
  }
);

// 3. Registration
class MyDomainServer extends ALECSCore {
  override tools = [myTool];
}
```

## 📚 Common Patterns

### Customer Validation
```typescript
if (!ctx.customer) {
  return createErrorResponse('Customer context required', 'MISSING_CUSTOMER');
}
```

### Error Handling
```typescript
try {
  // API call
} catch (error) {
  if (error.response?.status === 404) {
    return createErrorResponse('Resource not found', 'NOT_FOUND');
  }
  if (error.response?.status === 403) {
    return createErrorResponse('Access denied', 'ACCESS_DENIED');
  }
  throw error;
}
```

### Caching
```typescript
const cacheKey = `${toolName}-${customer}-${uniqueId}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

// ... fetch data ...

await cache.set(cacheKey, result, ttlSeconds);
```

### API Client Usage
```typescript
// GET request
const response = await client.get('/api/endpoint', {
  params: { key: value },
  headers: { 'Customer': customer }
});

// POST request
const response = await client.post('/api/endpoint', data, {
  headers: { 'Customer': customer }
});
```

## 🔧 Tool Configuration Options

```typescript
tool(name, schema, handler, {
  // Caching
  cache: {
    ttl: 300,              // Cache duration in seconds
    customer: true,        // Customer-isolated caching
    invalidate: ['event']  // Cache invalidation triggers
  },
  
  // Performance
  coalesce: true,          // Prevent duplicate requests
  streaming: false,        // Enable streaming for large data
  
  // Response formatting
  format: 'json',          // Default response format
  
  // Metadata
  description: 'Tool description',
  tags: ['domain', 'core']
});
```

## 📝 Schema Patterns

### Basic Types
```typescript
const Schema = z.object({
  // Required string
  hostname: z.string().min(1),
  
  // Optional with default
  timeout: z.number().min(1).max(300).default(30),
  
  // Enum values
  network: z.enum(['staging', 'production']),
  
  // Array of strings
  tags: z.array(z.string()).optional(),
  
  // Nested object
  config: z.object({
    enabled: z.boolean(),
    rules: z.array(z.string())
  }).optional()
});
```

### Custom Validation
```typescript
const Schema = z.object({
  contractId: z.string().refine(
    (val) => val.startsWith('ctr_'),
    'Contract ID must start with ctr_'
  ),
  
  email: z.string().email('Invalid email format'),
  
  port: z.number().min(1).max(65535, 'Port must be 1-65535')
});
```

## 🧪 Testing Patterns

### Unit Test Structure
```typescript
describe('myTool', () => {
  const mockContext = {
    client: { get: jest.fn(), post: jest.fn() },
    customer: 'test-customer',
    cache: { get: jest.fn(), set: jest.fn() },
    logger: { info: jest.fn(), error: jest.fn() }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle valid input', async () => {
    // Arrange
    const args = { customer: 'test', param1: 'value' };
    mockContext.client.get.mockResolvedValue({ data: 'result' });

    // Act
    const result = await myTool.handler(args, mockContext);

    // Assert
    expect(result).toEqual('result');
    expect(mockContext.client.get).toHaveBeenCalledWith('/api/endpoint', {
      params: args,
      headers: { 'Customer': 'test' }
    });
  });
});
```

## 🚨 Common Pitfalls

| ❌ Avoid | ✅ Do Instead |
|---------|-------------|
| `any` types | Use proper Zod schemas |
| Generic error messages | Specific, helpful errors |
| No customer validation | Always validate customer context |
| Hardcoded values | Use environment variables |
| No caching | Enable appropriate caching |
| Missing tests | Comprehensive test coverage |

## 🎯 Performance Best Practices

### Caching Strategy
- **Read-heavy operations**: Cache for 5-15 minutes
- **Configuration data**: Cache for 1-5 minutes
- **Real-time data**: No caching or very short TTL
- **User-specific data**: Use customer-isolated caching

### Request Optimization
- **Enable coalescing** for duplicate requests
- **Use connection pooling** for HTTP clients
- **Implement streaming** for large datasets
- **Set appropriate timeouts** based on operation complexity

### Error Handling
- **Fail fast** on validation errors
- **Provide context** in error messages
- **Log errors** with sufficient detail
- **Don't expose internal errors** to users

## 🔍 Debugging Tips

### Enable Debug Logging
```typescript
ctx.logger.debug('Tool execution', { customer, args });
```

### Check Cache Status
```typescript
const cacheStatus = await ctx.cache.get(cacheKey);
ctx.logger.debug('Cache status', { hit: !!cacheStatus });
```

### Validate API Responses
```typescript
const response = await ctx.client.get('/api/endpoint');
ctx.logger.debug('API response', { status: response.status });
```

## 📖 Documentation Requirements

### Tool Comments
```typescript
/**
 * Creates a new DNS zone with specified configuration
 * @param args - Zone creation parameters
 * @param ctx - Tool execution context
 * @returns Promise<ZoneCreationResult>
 */
```

### Schema Documentation
```typescript
const Schema = z.object({
  /** The DNS zone name (e.g., example.com) */
  zoneName: z.string().min(1),
  
  /** Zone type: primary or secondary */
  type: z.enum(['primary', 'secondary'])
});
```

## 🔗 Useful Links

- **Full Guide**: `docs/TOOL_CREATION_GUIDE.md`
- **Architecture**: `docs/architecture/COMPONENT_IMPLEMENTATION_GUIDE.md`
- **Examples**: `src/tools/property/consolidated-property-tools.ts`
- **Types**: `src/types/tool-infrastructure.ts`
- **Testing**: `__tests__/` directory