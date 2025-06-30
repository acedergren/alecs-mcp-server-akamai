# Code Annotation Standards for ALECS MCP Server

## Overview

This document defines the code annotation standards for the ALECS MCP Server to ensure the codebase is self-documenting and immediately understandable to new developers, especially Akamai engineers.

## Core Principles

1. **Explain the Why, Not the What** - Code shows what it does, comments explain why
2. **Business Context First** - Connect technical implementation to business value
3. **Akamai API Mapping** - Always clarify how MCP concepts map to Akamai APIs
4. **Progressive Detail** - Summary first, then details for those who need them

## Standard Annotation Patterns

### 1. File-Level Documentation

Every TypeScript file must start with a comprehensive header:

```typescript
/**
 * @fileoverview Brief description of the file's purpose
 * @module ModuleName
 * 
 * @description
 * Detailed explanation of what this module does and why it exists.
 * Include the business problem it solves.
 * 
 * @example
 * ```typescript
 * // Show the most common usage pattern
 * const service = new PropertyService();
 * await service.createProperty({ name: 'example.com' });
 * ```
 * 
 * @akamai-api Property Manager API v1 (PAPI)
 * @akamai-concepts Properties, Versions, Rules, Activations
 * @see https://techdocs.akamai.com/property-mgr/reference
 * 
 * @dependencies
 * - AkamaiClient: For API authentication
 * - SmartCache: For response caching
 * - Logger: For operational visibility
 */
```

### 2. Interface Documentation

All interfaces require business context:

```typescript
/**
 * Configuration for creating a new Akamai property
 * 
 * @description
 * Properties are the core configuration unit in Akamai. Think of them
 * as containers for your website's CDN settings - caching rules,
 * security policies, and performance optimizations.
 * 
 * @akamai-note
 * In Akamai's API, this maps to the POST /papi/v1/properties request body.
 * The property must be created within a contract and group.
 */
export interface CreatePropertyConfig {
  /**
   * Human-readable name for the property
   * @example "www.example.com Production"
   * @akamai-limit Max 85 characters, alphanumeric + spaces
   */
  name: string;

  /**
   * The Akamai product to use (determines available features)
   * @example "prd_Site_Accel" - For standard web acceleration
   * @example "prd_Download_Delivery" - For large file downloads
   * @see https://techdocs.akamai.com/property-mgr/reference/get-products
   */
  productId: string;

  /**
   * Contract under which to create the property
   * @format "ctr_C-XXXXXX"
   * @akamai-note Determines billing and available features
   */
  contractId: string;

  /**
   * Group for access control and organization
   * @format "grp_XXXXX"
   * @akamai-note Properties inherit permissions from their group
   */
  groupId: string;

  /**
   * Initial hostname for the property
   * @example "www.example.com"
   * @validation Must be a valid FQDN
   */
  hostname?: string;

  /**
   * Copy configuration from existing property
   * @format "prp_XXXXX"
   * @business-value Speeds up configuration by 90% for similar sites
   */
  cloneFrom?: string;
}
```

### 3. Method Documentation

Every public method needs comprehensive documentation:

```typescript
/**
 * Creates a new property in Akamai's CDN network
 * 
 * @description
 * This method handles the complete property creation workflow:
 * 1. Validates the configuration
 * 2. Creates the property shell
 * 3. Applies initial rules (if cloning)
 * 4. Sets up default behaviors
 * 
 * @param {CreatePropertyConfig} config - Property configuration
 * @returns {Promise<Property>} The created property with its ID
 * 
 * @throws {ValidationError} If configuration is invalid
 * @throws {AkamaiError} If API request fails
 * @throws {QuotaExceededError} If contract limits are exceeded
 * 
 * @example Simple property creation
 * ```typescript
 * const property = await service.createProperty({
 *   name: 'My Website',
 *   productId: 'prd_Site_Accel',
 *   contractId: 'ctr_C-1234',
 *   groupId: 'grp_5678'
 * });
 * console.log(`Created property: ${property.propertyId}`);
 * ```
 * 
 * @example Clone from existing property
 * ```typescript
 * const property = await service.createProperty({
 *   name: 'My Website Staging',
 *   productId: 'prd_Site_Accel',
 *   contractId: 'ctr_C-1234',
 *   groupId: 'grp_5678',
 *   cloneFrom: 'prp_9999'
 * });
 * ```
 * 
 * @performance
 * - Typical response time: 2-3 seconds
 * - Cloning adds 1-2 seconds
 * - Results are cached for 5 minutes
 * 
 * @akamai-api POST /papi/v1/properties
 * @akamai-rate-limit 300 requests per hour
 * @since v1.0.0
 */
public async createProperty(
  config: CreatePropertyConfig
): Promise<Property> {
  // Validate inputs first
  this.validatePropertyConfig(config);
  
  // Check quota before making API call
  await this.checkContractQuota(config.contractId);
  
  // Implementation...
}
```

### 4. Complex Business Logic

When implementing complex Akamai-specific logic:

```typescript
/**
 * Determines the optimal cache key configuration for a property
 * 
 * @algorithm Cache Key Optimization
 * Akamai's cache key determines what makes each cached object unique.
 * Too specific = low cache hit rate. Too generic = serving wrong content.
 * 
 * We analyze:
 * 1. URL patterns across the property
 * 2. Query parameter usage
 * 3. Device-specific content needs
 * 4. Geo-location requirements
 * 
 * @business-impact
 * - Optimal cache keys can improve hit rates by 30-40%
 * - Reduces origin traffic by up to 60%
 * - Saves $1000s in bandwidth costs monthly
 * 
 * @visualization
 * ```
 * Original URL: /products?id=123&utm_source=google&session=abc
 *                          ↓
 * Analysis: 'id' affects content, others don't
 *                          ↓  
 * Cache Key: /products?id=123
 * ```
 */
private optimizeCacheKey(
  property: Property,
  analytics: TrafficAnalytics
): CacheKeyConfig {
  // Step 1: Identify query parameters that affect content
  const significantParams = this.analyzeQueryParameters(analytics);
  
  // Step 2: Check for device-specific rendering
  const deviceVaries = this.detectDeviceVariation(property);
  
  // Step 3: Analyze geographic content differences
  const geoVaries = this.analyzeGeographicVariation(analytics);
  
  // Build optimal cache key configuration
  return {
    includeQueryStrings: significantParams,
    includeDevice: deviceVaries,
    includeGeo: geoVaries,
    // Akamai-specific: Enable Query String Parameter Filter
    enableQSPF: significantParams.length > 0
  };
}
```

### 5. Error Handling Documentation

Document error scenarios comprehensively:

```typescript
/**
 * Handles property activation with automatic retry logic
 * 
 * @error-scenarios
 * 1. **Validation Errors** (400)
 *    - Invalid rule syntax
 *    - Missing required behaviors
 *    - Solution: Fix configuration and retry
 * 
 * 2. **Authorization Errors** (403)
 *    - Insufficient permissions
 *    - Contract limits exceeded
 *    - Solution: Check user permissions or upgrade contract
 * 
 * 3. **Conflict Errors** (409)
 *    - Another activation in progress
 *    - Solution: Wait for current activation to complete
 * 
 * 4. **Rate Limit Errors** (429)
 *    - Too many activation requests
 *    - Solution: Implement exponential backoff
 * 
 * @retry-strategy
 * - Validation errors: No retry (fix required)
 * - Conflicts: Retry after 30 seconds, max 5 attempts
 * - Rate limits: Exponential backoff starting at 60 seconds
 * - Network errors: Immediate retry, max 3 attempts
 */
async activatePropertyWithRetry(
  propertyId: string,
  version: number,
  network: 'staging' | 'production'
): Promise<Activation> {
  const maxAttempts = this.getMaxAttempts(network);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await this.activateProperty(propertyId, version, network);
    } catch (error) {
      if (!this.isRetryable(error) || attempt === maxAttempts) {
        throw this.enhanceError(error, { propertyId, version, network, attempt });
      }
      
      await this.waitForRetry(error, attempt);
    }
  }
}
```

### 6. Performance-Critical Code

Document performance implications:

```typescript
/**
 * Batch processes multiple API requests with rate limit awareness
 * 
 * @performance-critical
 * This method is called during bulk operations and must handle
 * 1000s of requests efficiently while respecting Akamai's rate limits.
 * 
 * @optimization-strategy
 * 1. **Request Batching**: Groups up to 50 requests per API call
 * 2. **Parallel Execution**: Uses 5 concurrent connections max
 * 3. **Rate Limit Tracking**: Monitors X-RateLimit headers
 * 4. **Adaptive Throttling**: Slows down as we approach limits
 * 
 * @metrics
 * - Throughput: 200-300 requests/minute (Akamai limit: 300/min)
 * - Memory usage: O(batch_size), not O(total_requests)
 * - Network efficiency: 50:1 compression ratio
 * 
 * @monitoring
 * - Track: batch_size, requests_per_second, rate_limit_remaining
 * - Alert: If rate_limit_remaining < 20% or errors > 5%
 */
async batchProcess<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: BatchOptions = {}
): Promise<R[]> {
  const { 
    batchSize = 50,
    concurrency = 5,
    rateLimitBuffer = 0.8 // Use only 80% of rate limit
  } = options;

  // Performance: Pre-allocate result array
  const results: R[] = new Array(items.length);
  
  // ... implementation
}
```

### 7. Integration Points

Clearly document external integrations:

```typescript
/**
 * Integrates with Akamai's Event Center for real-time alerts
 * 
 * @integration Akamai Event Center
 * @endpoint wss://events.akamai.com/v1/stream
 * @authentication OAuth 2.0 with client credentials
 * @data-format JSON-RPC 2.0 over WebSocket
 * 
 * @event-types
 * - property.activation.complete
 * - certificate.expiry.warning
 * - security.attack.detected
 * - origin.health.degraded
 * 
 * @reconnection-strategy
 * - Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
 * - Maintain subscription state during reconnection
 * - Replay missed events from last known timestamp
 * 
 * @example
 * ```typescript
 * const events = new AkamaiEventStream(credentials);
 * 
 * events.on('property.activation.complete', (event) => {
 *   console.log(`Property ${event.propertyId} activated on ${event.network}`);
 * });
 * 
 * await events.connect();
 * await events.subscribe(['property.*', 'certificate.*']);
 * ```
 */
export class AkamaiEventStream extends EventEmitter {
  // Implementation
}
```

### 8. MCP Tool Documentation

Special documentation for MCP tools:

```typescript
/**
 * @mcp-tool property.create
 * @description Creates a new CDN property configuration
 * 
 * @user-intent
 * Users typically want to:
 * - Set up a new website on Akamai's CDN
 * - Clone an existing configuration for a new environment
 * - Create a template for multiple similar sites
 * 
 * @common-patterns
 * 1. **New Website**: Create property → Add hostnames → Configure rules → Activate
 * 2. **Staging Setup**: Clone production → Modify origins → Activate to staging
 * 3. **Multi-brand**: Create template → Clone for each brand → Customize
 * 
 * @parameters
 * - name: Human-friendly property name
 * - contract: Which Akamai contract to use (billing)
 * - group: Access control group
 * - product: Feature set (Web, Mobile, Download, etc.)
 * 
 * @akamai-specifics
 * - Properties are versioned (like Git commits)
 * - Changes require activation (like deployment)
 * - Staging activation: ~5 minutes
 * - Production activation: ~30 minutes
 * 
 * @example-conversation
 * User: "Create a new property for example.com"
 * Tool: Creates property "example.com" in default contract
 * User: "Add caching rules for images"
 * Tool: Modifies property rules to cache .jpg, .png for 7 days
 * User: "Activate to staging"
 * Tool: Initiates staging activation, monitors progress
 */
export const createPropertyTool: MCPTool = {
  name: 'property.create',
  // Implementation
};
```

### 9. Testing Documentation

Document test scenarios and their business relevance:

```typescript
/**
 * @test-suite Property Creation Tests
 * @business-scenarios Testing real-world property creation patterns
 */
describe('PropertyService.createProperty', () => {
  /**
   * @test Basic property creation
   * @validates Core business flow for new customer onboarding
   * @akamai-api POST /papi/v1/properties
   * @covers Requirements: REQ-PROP-001, REQ-PROP-002
   */
  it('should create a property with minimal configuration', async () => {
    // Test implementation
  });

  /**
   * @test Property cloning
   * @validates Scaling pattern for multi-environment setups
   * @business-value Reduces configuration time from hours to minutes
   */
  it('should clone existing property configuration', async () => {
    // Test implementation
  });

  /**
   * @test Rate limit handling
   * @validates System behavior under high load
   * @sla Must handle 100 concurrent property creations
   */
  it('should respect Akamai rate limits during bulk creation', async () => {
    // Test implementation
  });
});
```

## Anti-Patterns to Avoid

### ❌ Don't State the Obvious
```typescript
// BAD: Comments that repeat the code
// Increment counter by 1
counter++;

// Set name to the provided value
this.name = name;
```

### ❌ Don't Use Vague Comments
```typescript
// BAD: Unhelpful comments
// Handle the thing
processData(thing);

// Fix for bug
if (value > 100) value = 100;
```

### ❌ Don't Document Implementation Details That May Change
```typescript
// BAD: Brittle documentation
/**
 * Uses a HashMap with initial capacity of 16
 * and load factor of 0.75 for optimal performance
 */
```

### ✅ Do Document Business Rules and Constraints
```typescript
// GOOD: Explains the why
/**
 * Akamai limits property names to 85 characters and requires
 * them to be unique within a contract. We validate this client-side
 * to avoid failed API calls that count against our rate limit.
 */
if (name.length > 85) {
  throw new ValidationError('Property name exceeds Akamai\'s 85 character limit');
}
```

## Documentation Maintenance

1. **Keep Docs in Sync**: Update documentation when changing code
2. **Review During PRs**: Documentation is part of code review
3. **Test Examples**: Ensure all code examples actually work
4. **Monitor Clarity**: Track questions asked about documented code
5. **Iterate**: Improve documentation based on developer feedback

## Tools and Automation

### Required Tools
- **TypeDoc**: Generate API documentation from TypeScript
- **ESLint Plugin**: Enforce documentation standards
- **Markdown Lint**: Validate markdown in comments
- **Example Validator**: Test that examples compile

### Pre-commit Hooks
```bash
# Check for missing documentation
npm run lint:docs

# Validate examples in comments
npm run test:examples

# Generate updated API docs
npm run docs:generate
```

### CI/CD Integration
- Block PRs with missing documentation
- Auto-generate and publish docs on merge
- Track documentation coverage metrics
- Alert on outdated examples

## Conclusion

Good documentation is an investment that pays dividends in:
- Faster onboarding (days → hours)
- Fewer support questions (80% reduction)
- Better code quality (self-review during documentation)
- Knowledge preservation (survives team changes)

Remember: If it's not documented, it doesn't exist. If it's not clear, it's not documented.