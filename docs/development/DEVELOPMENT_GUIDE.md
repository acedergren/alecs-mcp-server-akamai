# ALECS Development Guide

**Coding Standards, Patterns, and Best Practices**

## 🎯 Overview

This guide establishes coding standards and development patterns for ALECS. Follow these guidelines to maintain code quality, consistency, and team productivity.

## 📋 Code Quality Standards

### TypeScript Configuration

**Zero Tolerance Policy**:
- ❌ No `any` types - use `unknown` with type guards
- ❌ No type assertions without runtime validation
- ❌ No `@ts-ignore` comments
- ✅ Strict TypeScript configuration enabled
- ✅ All inputs/outputs validated with Zod

```typescript
// ❌ Bad: Using 'any'
function processData(data: any): any {
  return data.properties?.items?.[0];
}

// ✅ Good: Type guards with runtime validation
function processData(data: unknown): PropertyItem | undefined {
  if (!isPropertyListResponse(data)) {
    throw new ValidationError('Invalid property list response');
  }
  return data.properties?.items?.[0];
}

function isPropertyListResponse(obj: unknown): obj is PropertyListResponse {
  return PropertyListResponseSchema.safeParse(obj).success;
}
```

### Error Handling Standards

**RFC 7807 Problem Details**:
All errors must follow RFC 7807 specification with structured error responses.

```typescript
// Error class hierarchy
export class AkamaiError extends Error {
  constructor(public problem: ProblemDetails) {
    super(problem.title);
    this.name = this.constructor.name;
  }
}

export class PropertyError extends AkamaiError {
  constructor(problem: Partial<ProblemDetails>) {
    super({
      type: problem.type || '/errors/property-error',
      title: problem.title || 'Property Operation Failed',
      status: problem.status || 500,
      detail: problem.detail || 'An error occurred',
      instance: problem.instance || 'property/unknown'
    });
  }
}

// Usage in tools
try {
  const result = await client.request(options);
  return result;
} catch (error) {
  throw new PropertyError({
    type: '/errors/property-list-failed',
    title: 'Property List Failed',
    status: getStatusCode(error),
    detail: `Failed to list properties: ${error.message}`,
    instance: 'property/list-properties'
  });
}
```

### Validation Patterns

**Zod Schema Design**:

```typescript
// Input validation schemas
export const CreatePropertySchema = z.object({
  // Required fields
  propertyName: z.string()
    .min(1, 'Property name required')
    .max(255, 'Property name too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid property name format'),
  
  // Optional fields with defaults
  productId: z.string().regex(/^prd_/).optional(),
  customer: z.string().optional(),
  
  // Complex validation
  hostnames: z.array(z.string().url()).min(1, 'At least one hostname required'),
  
  // Conditional validation
  rules: z.object({
    behaviors: z.array(BehaviorSchema),
    criteria: z.array(CriteriaSchema)
  }).optional()
}).refine(
  (data) => data.productId || data.customer,
  'Either productId or customer must be provided'
);

// API response schemas for runtime validation
export const PropertyCreateResponseSchema = z.object({
  propertyLink: z.string().url(),
  propertyId: z.string().regex(/^prp_/),
  propertyName: z.string(),
  accountId: z.string(),
  contractId: z.string().regex(/^ctr_/),
  groupId: z.string().regex(/^grp_/)
});
```

## 🏗️ Architecture Patterns

### Tool Development Pattern

**1. Tool Definition Structure**:

```typescript
// Tool implementation in consolidated class
export class ConsolidatedPropertyTools extends BaseTool {
  protected readonly domain = 'property';

  async createProperty(args: CreatePropertyArgs): Promise<MCPToolResponse> {
    return this.executeStandardOperation(
      'create-property',
      args,
      async (client) => {
        // 1. Build request from validated args
        const request = this.buildCreatePropertyRequest(args);
        
        // 2. Make typed API request
        const response = await this.makeTypedRequest(client, {
          path: '/papi/v1/properties',
          method: 'POST',
          schema: PropertyCreateResponseSchema,
          body: request
        });
        
        // 3. Transform response for AI consumption
        return this.transformPropertyCreate(response);
      }
    );
  }
  
  // Helper methods for request building
  private buildCreatePropertyRequest(args: CreatePropertyArgs): PropertyCreateRequest {
    return {
      propertyName: args.propertyName,
      productId: args.productId || 'prd_Web_App_Accel',
      cloneFrom: args.cloneFrom ? {
        propertyId: args.cloneFrom.propertyId,
        version: args.cloneFrom.version
      } : undefined
    };
  }
  
  // Helper methods for response transformation
  private transformPropertyCreate(response: PropertyCreateResponse): PropertySummary {
    return {
      id: response.propertyId,
      name: response.propertyName,
      status: 'created',
      urls: {
        details: response.propertyLink,
        rules: `${response.propertyLink}/versions/1/rules`,
        hostnames: `${response.propertyLink}/versions/1/hostnames`
      },
      createdAt: new Date().toISOString()
    };
  }
}
```

**2. Server Integration Pattern**:

```typescript
// Server class extending ALECSCore
class PropertyServer extends ALECSCore {
  override tools = [
    this.tool(
      'create-property',
      CreatePropertySchema,
      async (args, ctx) => {
        const response = await property.create(args);
        return ctx.format(response);
      },
      {
        description: 'Create a new CDN property with specified configuration',
        cache: false,           // No caching for mutations
        coalesce: false,        // Each creation is unique
        rateLimit: { rpm: 10 } // Conservative rate limiting
      }
    )
  ];
}
```

### Domain Layer Pattern

**Business Logic Organization**:

```typescript
// Domain operations with clean interfaces
export const property = {
  // CRUD operations
  create: createProperty,
  get: getProperty,
  update: updateProperty,
  delete: deleteProperty,
  list: listProperties,
  
  // Nested resource operations
  version: {
    create: createPropertyVersion,
    get: getPropertyVersion,
    list: listPropertyVersions,
    activate: activatePropertyVersion
  },
  
  rules: {
    get: getPropertyRules,
    update: updatePropertyRules,
    validate: validatePropertyRules
  }
};

// Implementation with full error handling
export async function createProperty(
  args: CreatePropertyArgs
): Promise<PropertySummary> {
  // 1. Input validation
  const validated = CreatePropertySchema.parse(args);
  
  // 2. Customer context
  const customer = safeExtractCustomer(validated);
  const client = new AkamaiClient(customer);
  
  // 3. Business logic
  try {
    // Check prerequisites
    await validatePropertyPrerequisites(client, validated);
    
    // Execute creation
    const response = await client.request<PropertyCreateResponse>({
      path: '/papi/v1/properties',
      method: 'POST',
      body: buildPropertyCreateRequest(validated)
    });
    
    // Transform and return
    return transformPropertyResponse(response);
    
  } catch (error) {
    throw new PropertyError({
      type: '/errors/property-create-failed',
      title: 'Property Creation Failed',
      status: getStatusCode(error),
      detail: `Failed to create property '${validated.propertyName}': ${error.message}`,
      instance: 'property/create'
    });
  }
}
```

### Performance Patterns

**Caching Strategy**:

```typescript
// Cache configuration per operation type
export const CacheConfigurations = {
  // Read operations - aggressive caching
  'list-properties': { ttl: 300, customer: true },
  'get-property': { ttl: 600, customer: true },
  'get-property-rules': { ttl: 300, customer: true },
  
  // Metadata operations - moderate caching
  'list-contracts': { ttl: 3600, customer: true },
  'list-groups': { ttl: 1800, customer: true },
  
  // Mutation operations - no caching
  'create-property': { ttl: 0, customer: false },
  'update-property': { ttl: 0, customer: false },
  'activate-property': { ttl: 0, customer: false }
};

// Tool implementation with caching
this.tool(
  'list-properties',
  ListPropertiesSchema,
  async (args, ctx) => {
    const cacheKey = `properties:${args.customer}:${JSON.stringify(args)}`;
    
    return ctx.cache.get(cacheKey, async () => {
      const response = await property.list(args);
      return ctx.format(response);
    }, { ttl: 300 });
  }
)
```

**Request Coalescing**:

```typescript
// Automatic coalescing for identical requests
this.tool(
  'get-property',
  GetPropertySchema,
  async (args, ctx) => {
    const coalesceKey = `property:${args.propertyId}:${args.customer}`;
    
    return ctx.coalesce(coalesceKey, async () => {
      const response = await property.get(args);
      return ctx.format(response);
    });
  },
  { coalesce: true }
)
```

## 🧪 Testing Patterns

### Unit Testing Standards

**Test Structure**:

```typescript
describe('PropertyTools', () => {
  let tools: ConsolidatedPropertyTools;
  let mockClient: jest.MockedClass<typeof AkamaiClient>;
  
  beforeEach(() => {
    tools = new ConsolidatedPropertyTools();
    mockClient = createMockClient();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createProperty', () => {
    it('should create property with valid input', async () => {
      // Arrange
      const args = {
        propertyName: 'test-property',
        customer: 'testing'
      };
      
      const expectedResponse = {
        propertyId: 'prp_123456',
        propertyName: 'test-property',
        // ... other fields
      };
      
      mockClient.request.mockResolvedValue(expectedResponse);
      
      // Act
      const result = await tools.createProperty(args);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.content).toMatchObject({
        id: 'prp_123456',
        name: 'test-property'
      });
      
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties',
        method: 'POST',
        body: expect.objectContaining({
          propertyName: 'test-property'
        })
      });
    });
    
    it('should handle validation errors', async () => {
      // Arrange
      const invalidArgs = {
        propertyName: '', // Invalid: empty name
        customer: 'testing'
      };
      
      // Act & Assert
      await expect(tools.createProperty(invalidArgs))
        .rejects.toThrow(ValidationError);
    });
    
    it('should handle API errors gracefully', async () => {
      // Arrange
      const args = {
        propertyName: 'test-property',
        customer: 'testing'
      };
      
      mockClient.request.mockRejectedValue(
        new Error('API Error: Property name already exists')
      );
      
      // Act & Assert
      await expect(tools.createProperty(args))
        .rejects.toThrow(PropertyError);
    });
  });
});
```

### Integration Testing

**Real API Testing**:

```typescript
describe('Property Integration Tests', () => {
  let client: AkamaiClient;
  
  beforeAll(async () => {
    // Use 'testing' customer for integration tests
    client = new AkamaiClient('testing');
    await client.validateConnection();
  });
  
  afterEach(async () => {
    // Cleanup any created resources
    await cleanupTestResources();
  });
  
  it('should complete property creation workflow', async () => {
    const propertyName = `test-prop-${Date.now()}`;
    
    // Create property
    const createResult = await property.create({
      propertyName,
      customer: 'testing',
      productId: 'prd_Web_App_Accel'
    });
    
    expect(createResult.id).toMatch(/^prp_/);
    
    // Verify property exists
    const getResult = await property.get({
      propertyId: createResult.id,
      customer: 'testing'
    });
    
    expect(getResult.name).toBe(propertyName);
    
    // Cleanup
    await property.delete({
      propertyId: createResult.id,
      customer: 'testing'
    });
  });
});
```

## 📝 Documentation Standards

### Code Documentation

**JSDoc Standards**:

```typescript
/**
 * Creates a new CDN property with specified configuration.
 * 
 * This function handles the complete property creation workflow including:
 * - Input validation and sanitization
 * - Customer context establishment
 * - API request execution with retry logic
 * - Response transformation for AI consumption
 * 
 * @param args - Property creation parameters
 * @param args.propertyName - Unique name for the property (1-255 chars, alphanumeric)
 * @param args.customer - Customer context for multi-tenant deployment
 * @param args.productId - Akamai product ID (defaults to Web Application Accelerator)
 * @param args.cloneFrom - Optional property to clone configuration from
 * 
 * @returns Promise resolving to property summary with management URLs
 * 
 * @throws {ValidationError} When input parameters are invalid
 * @throws {CustomerNotFoundError} When customer context is invalid
 * @throws {PropertyError} When API operation fails
 * 
 * @example
 * ```typescript
 * const property = await createProperty({
 *   propertyName: 'my-website',
 *   customer: 'production',
 *   productId: 'prd_Web_App_Accel'
 * });
 * 
 * console.log(`Created property: ${property.id}`);
 * ```
 * 
 * @see {@link https://techdocs.akamai.com/property-mgr/reference/post-properties} PAPI Documentation
 */
export async function createProperty(
  args: CreatePropertyArgs
): Promise<PropertySummary> {
  // Implementation...
}
```

### Tool Documentation

**Tool Description Standards**:

```typescript
this.tool(
  'create-property',
  CreatePropertySchema,
  async (args, ctx) => {
    // Implementation
  },
  {
    description: `Create a new CDN property with specified configuration.

This tool creates a new property in Akamai Property Manager for content delivery configuration. The property serves as a container for rules, hostnames, and activation settings.

**Common Use Cases:**
- New website onboarding
- API endpoint acceleration
- Mobile app content delivery
- Video streaming setup

**Prerequisites:**
- Valid contract and group access
- Appropriate product entitlements
- Unique property name within account

**Post-Creation Steps:**
1. Configure property rules
2. Add hostnames
3. Test in staging
4. Activate to production

**Example Usage:**
"Create a new property called 'my-api' for web acceleration"`,
    
    examples: [
      {
        description: 'Basic property creation',
        input: {
          propertyName: 'my-website',
          customer: 'production'
        }
      },
      {
        description: 'Clone existing property',
        input: {
          propertyName: 'my-website-v2',
          customer: 'production',
          cloneFrom: {
            propertyId: 'prp_123456',
            version: 3
          }
        }
      }
    ]
  }
)
```

## 🔧 Development Workflow

### Git Workflow

**Branch Naming**:
- `feature/tool-name` - New tool development
- `fix/issue-description` - Bug fixes
- `perf/optimization-area` - Performance improvements
- `docs/documentation-update` - Documentation changes

**Commit Messages**:
```
type(scope): description

feat(property): add bulk property creation tool
fix(dns): resolve zone validation error
perf(cache): optimize cache key generation
docs(api): update tool documentation
test(security): add network list integration tests
```

**Pull Request Template**:
```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] New tool/feature
- [ ] Bug fix
- [ ] Performance improvement
- [ ] Documentation update
- [ ] Breaking change

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] All tests passing
```

### Code Review Guidelines

**Review Checklist**:
- ✅ Type safety maintained (no `any` types)
- ✅ Error handling implemented properly
- ✅ Input validation with Zod schemas
- ✅ Performance considerations addressed
- ✅ Tests added for new functionality
- ✅ Documentation updated
- ✅ Security implications considered

**Review Comments**:
```typescript
// ❌ Suggestion: Use type guard instead of 'as'
const property = response.data as Property;

// ✅ Better: Runtime validation
const property = PropertySchema.parse(response.data);
```

### IDE Configuration

**VS Code Settings** (`.vscode/settings.json`):
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.env": true
  }
}
```

**ESLint Configuration** (`.eslintrc.js`):
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error'
  }
};
```

## 🚀 Performance Guidelines

### Optimization Checklist

**Tool Performance**:
- ✅ Use caching for read operations
- ✅ Enable request coalescing for identical requests
- ✅ Implement proper connection pooling
- ✅ Add circuit breaker for external APIs
- ✅ Use streaming for large responses
- ✅ Implement proper pagination

**Memory Management**:
- ✅ Clean up event listeners
- ✅ Close database connections
- ✅ Implement cache size limits
- ✅ Use WeakMap for object references
- ✅ Avoid memory leaks in async operations

**Network Optimization**:
- ✅ Use HTTP/2 where possible
- ✅ Implement proper keep-alive
- ✅ Compress large payloads
- ✅ Use connection pooling
- ✅ Implement request deduplication

## 🔒 Security Guidelines

### Input Validation

**Security Checklist**:
- ✅ Validate all inputs with Zod schemas
- ✅ Sanitize string inputs
- ✅ Validate customer access permissions
- ✅ Prevent injection attacks
- ✅ Use parameterized queries
- ✅ Implement rate limiting

**Authentication Security**:
- ✅ Secure credential storage
- ✅ Rotate API keys regularly
- ✅ Use environment variables for secrets
- ✅ Implement proper session management
- ✅ Log security events

## 📊 Monitoring and Logging

### Structured Logging

```typescript
// Use structured logging with context
logger.info({
  operation: 'create-property',
  customer: 'production',
  propertyName: 'my-website',
  duration: 1234,
  success: true
}, 'Property created successfully');

// Error logging with context
logger.error({
  operation: 'create-property',
  customer: 'production',
  propertyName: 'my-website',
  error: {
    type: 'PropertyError',
    message: error.message,
    stack: error.stack
  }
}, 'Property creation failed');
```

### Metrics Collection

```typescript
// Performance metrics
metrics.histogram('tool_duration_ms', duration, {
  tool: 'create-property',
  customer: 'production',
  success: 'true'
});

// Business metrics
metrics.counter('properties_created_total', 1, {
  customer: 'production',
  product: 'web_app_accel'
});
```

---

Following these development guidelines ensures consistent, maintainable, and high-quality code across the ALECS project. The patterns and standards outlined here have been battle-tested in production and support the system's performance and reliability requirements.