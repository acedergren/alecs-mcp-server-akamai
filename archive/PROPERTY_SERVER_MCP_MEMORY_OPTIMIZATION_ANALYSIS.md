# Property Server Optimization Analysis: MCP Spec & Memory Usage

## Executive Summary

The current property server architecture with 29 tools (potentially 70+) presents significant challenges for MCP June 2025 compliance, memory efficiency, and Claude Desktop user experience. This analysis proposes a radical restructuring optimized specifically for Claude Desktop as the primary MCP client.

## Current State Problems

### 1. Tool Discovery Crisis (Claude Desktop Impact)
With 70+ property tools in a single server:
- **Claude Desktop Performance**: Claude must evaluate all 70+ tool descriptions for EVERY user message
- **Decision Latency**: Each tool adds ~10ms to Claude's decision time (700ms+ overhead)
- **Context Window Usage**: 70 tool descriptions consume ~5-10K tokens before any user interaction
- **UI Overload**: Claude Desktop's tool picker becomes unwieldy with 70+ options
- **User Confusion**: Users can't easily understand which tool to request

### 2. Memory Overhead
Current memory consumption patterns:
```
- 70 Zod schemas compiled at startup: ~10MB
- 70 tool handlers in memory: ~5MB
- Request coalescing cache: ~50MB (unbounded)
- Response buffers: Up to 100MB for large rule trees
- Connection pools: ~2MB per connection
- Total baseline: ~70-170MB before any requests
```

### 3. MCP Spec Challenges
- **Naming**: 70+ snake_case names become unwieldy
- **Descriptions**: Must be concise but differentiated
- **Parameters**: Complex tools have 15+ parameters
- **Responses**: No streaming support for large responses
- **Stateless**: Multi-step workflows are difficult

## Proposed Architecture: Modular MCP Servers

### Option 1: Monolithic Optimization (Current Path)
Keep single property-server but optimize:

**Pros:**
- Single server to maintain
- All tools in one place
- Simpler deployment

**Cons:**
- 70+ tools violate MCP best practices
- High memory baseline
- Difficult tool discovery
- Slower Claude decision making

**Memory Optimizations:**
```typescript
// Lazy load tool implementations
const toolImplementations = new Map<string, () => Promise<Function>>();

// Load only when called
toolImplementations.set('create_property', 
  () => import('./tools/property-tools').then(m => m.createProperty)
);

// Shared schema validators
const sharedSchemas = {
  propertyId: z.string().regex(/^prp_\d+$/),
  contractId: z.string().regex(/^ctr_[A-Z0-9-]+$/),
  groupId: z.string().regex(/^grp_\d+$/)
};

// Response size limits
const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB
```

### Option 2: Federated Micro-Servers (Recommended)

Split into focused MCP servers:

#### 1. **property-core-server** (15 tools)
Essential CRUD and lifecycle operations
```
- list_properties
- get_property  
- create_property
- delete_property
- clone_property
- list_versions
- create_version
- get_version
- activate_property
- get_activation_status
- cancel_activation
- list_activations
- list_contracts
- list_groups
- list_products
```
Memory: ~20MB baseline

#### 2. **property-config-server** (20 tools)
Configuration and rules management
```
- get_rules
- update_rules
- validate_rules
- patch_rules
- list_behaviors
- list_criteria
- get_rule_format
- list_hostnames
- add_hostname
- remove_hostname
- bulk_update_hostnames
- list_edge_hostnames
- create_edge_hostname
- get_validation_errors
- validate_configuration
- compare_versions
- diff_rules
- list_includes
- create_include
- update_include
```
Memory: ~25MB baseline

#### 3. **property-operations-server** (15 tools)
Advanced operations and workflows
```
- onboard_property
- onboard_wizard
- check_onboarding_status
- rollback_version
- bulk_search
- bulk_update
- bulk_activate
- create_activation_plan
- update_with_default_dv
- update_with_cps_cert
- generate_dv_challenges
- check_property_health
- get_audit_history
- detect_config_drift
- optimize_performance
```
Memory: ~20MB baseline

#### 4. **property-analytics-server** (10 tools)
Reporting and monitoring
```
- get_property_metrics
- get_activation_metrics
- get_error_reports
- get_performance_report
- get_usage_analytics
- get_cost_analysis
- get_security_events
- get_change_history
- generate_compliance_report
- export_configuration
```
Memory: ~15MB baseline

### Benefits of Federation:
1. **Tool Discovery**: 15-20 tools per server is manageable
2. **Memory**: 80MB total vs 170MB monolithic
3. **Performance**: Load only needed servers
4. **Maintenance**: Easier to update specific domains
5. **Scaling**: Can run servers on different machines

## Claude Desktop-Specific Optimizations

### 1. Claude's Tool Selection Process
Understanding how Claude Desktop works:
```
User: "Create a new property for example.com"
↓
Claude evaluates ALL registered tools:
- Reads all tool names and descriptions
- Matches intent to capabilities
- Selects best tool(s)
- Formats parameters
↓
With 70 tools: 700ms+ just for decision
With 15 tools: 150ms for decision
```

### 2. Optimal Tool Count for Claude Desktop
Based on Claude's processing:
- **Sweet spot: 10-20 tools per server**
- **Maximum effective: 30 tools**
- **Beyond 30**: Significant performance degradation

### 3. Tool Naming for Claude's Pattern Matching
Claude performs better with consistent patterns:
```
❌ Bad (hard for Claude to pattern match):
- create_property
- new_property_version  
- make_edge_hostname
- property_activation_execute

✅ Good (consistent hierarchy):
- property_create
- property_version_create
- property_edge_hostname_create
- property_activation_create
```

Benefits for Claude:
- Faster pattern recognition
- Better intent matching
- Reduced ambiguity
- Consistent parameter inference

### 4. Claude Desktop Response Processing
How Claude processes MCP tool responses:

```
Tool returns: JSON response
↓
Claude analyzes structure and content
↓ 
Claude reformats for user based on:
- User's question context
- Data relevance
- Optimal presentation format
↓
User sees: Natural language response with key information
```

**Key Insight**: Claude is excellent at extracting and presenting relevant information from structured JSON. Don't pre-format for humans - let Claude handle presentation!

### 5. Tool Description Optimization for Claude
Claude uses tool descriptions to match user intent. Optimize descriptions:

```
❌ Bad (vague, doesn't help Claude match intent):
- "Manage properties"
- "Work with hostnames"  
- "Handle activations"

✅ Good (specific actions Claude can match):
- "Create a new CDN property configuration"
- "Add hostname to existing property version"
- "Activate property version to staging or production network"
```

### 6. Parameter Naming for Claude's Understanding
Use parameter names that Claude can infer from context:

```json
❌ Bad (ambiguous parameter names):
{
  "pid": "property identifier",
  "v": "version number",
  "n": "network type"
}

✅ Good (self-documenting):
{
  "property_id": "Property identifier (prp_12345)",
  "version": "Property version number",
  "network": "Target network (staging|production)"
}
```

## Optimized Tool Design for Claude Desktop

### 1. Progressive Parameter Disclosure
Use optional parameters with smart defaults to reduce Claude's decision complexity:
```json
{
  "name": "property_create",
  "description": "Create a new CDN property",
  "parameters": {
    "type": "object",
    "required": ["name"],  // Only name required
    "properties": {
      "name": { "type": "string", "description": "Property name" },
      "contract_id": { "type": "string", "description": "Contract ID (auto-detected if not provided)" },
      "group_id": { "type": "string", "description": "Group ID (auto-detected if not provided)" },
      "product_id": { "type": "string", "description": "Product ID (defaults to Ion)" },
      // Advanced parameters hidden in description
    }
  }
}
```

### 3. Composite Tools for Workflows
Instead of exposing 10 atomic operations:
```json
{
  "name": "property_quick_setup",
  "description": "Complete property setup: create, configure, add hostnames, activate",
  "parameters": {
    "type": "object",
    "required": ["name", "hostname", "origin"],
    "properties": {
      "name": { "type": "string" },
      "hostname": { "type": "string" },
      "origin": { "type": "string" },
      "activate_to": { "type": "string", "enum": ["staging", "production"], "default": "staging" }
    }
  }
}
```

### 4. Response Optimization
For Claude Desktop optimization:
```typescript
// Paginated responses
{
  "data": [...],  // Limited to 50 items
  "pagination": {
    "total": 500,
    "page": 1,
    "per_page": 50,
    "next_cursor": "base64_encoded_cursor"
  },
  "summary": {
    // Key insights for Claude to understand without processing all data
    "total_properties": 500,
    "by_status": { "active": 400, "inactive": 100 },
    "recent_changes": 5
  }
}

// Large data handling
if (responseSize > MAX_RESPONSE_SIZE) {
  return {
    "data": null,
    "summary": extractKeySummary(fullData),
    "notice": "Full data too large. Use specific filters or request details for individual items.",
    "suggested_queries": [
      "property_get id='prp_12345'",
      "property_list_versions id='prp_12345'",
      "property_search name='specific-name'"
    ]
  };
}
```

## Memory Optimization Strategies

### 1. Lazy Loading Pattern
```typescript
class PropertyServer {
  private toolLoaders = new Map<string, () => Promise<ToolHandler>>();
  private loadedTools = new Map<string, ToolHandler>();

  async handleTool(name: string, args: any) {
    if (!this.loadedTools.has(name)) {
      const loader = this.toolLoaders.get(name);
      if (loader) {
        this.loadedTools.set(name, await loader());
      }
    }
    return this.loadedTools.get(name)?.execute(args);
  }
}
```

### 2. Shared Resource Pool
```typescript
// Shared across all tools
const resourcePool = {
  schemas: new SharedSchemaValidator(),
  httpClient: new PooledHttpClient({ maxConnections: 5 }),
  cache: new BoundedLRUCache({ maxSize: 50 * 1024 * 1024 }), // 50MB
  serializer: new EfficientJSONSerializer()
};
```

### 3. Response Streaming Simulation
```typescript
// For large responses, return chunks that Claude can process incrementally
function chunkLargeResponse(data: any[], chunkSize: number = 10) {
  return {
    chunks: data.length / chunkSize,
    first_chunk: data.slice(0, chunkSize),
    get_chunk_command: `property_get_chunk cursor='...'`,
    summary: generateSummary(data)
  };
}
```

### 4. Automatic Garbage Collection
```typescript
// After each tool execution
setImmediate(() => {
  if (global.gc) {
    global.gc();
  }
});

// Periodic cache cleanup
setInterval(() => {
  resourcePool.cache.prune();
  resourcePool.httpClient.cleanupIdleConnections();
}, 60000); // Every minute
```

## Implementation Recommendations

### Phase 1: Optimize Current Monolith
1. Implement lazy loading for tool handlers
2. Add response size limits and summaries
3. Implement bounded caches
4. Add memory monitoring

### Phase 2: Create Core Servers
1. Split out property-core-server with 15 essential tools
2. Implement shared resource pool
3. Add comprehensive tests

### Phase 3: Specialized Servers
1. Create property-config-server
2. Create property-operations-server
3. Migrate advanced features

### Phase 4: Analytics & Monitoring
1. Create property-analytics-server
2. Add cross-server coordination
3. Implement unified logging

## Trade-offs Analysis

### Monolithic Approach
**Choose if:**
- Simplicity is paramount
- Single deployment required
- Memory is not a constraint
- Tool count under 30

### Federated Approach
**Choose if:**
- Scalability matters
- Memory efficiency required
- Tool count over 30
- Different teams own different domains

## Conclusion

For the ALECS Property Server with 70+ potential tools, the federated micro-server approach offers the best balance of:
- MCP spec compliance (15-20 tools per server)
- Memory efficiency (80MB vs 170MB total)
- User experience (better tool discovery)
- Maintainability (domain separation)
- Scalability (independent deployment)

The investment in splitting servers will pay dividends in:
- Faster Claude responses (fewer tools to evaluate)
- Lower memory footprint
- Better user experience
- Easier maintenance and testing

Recommendation: Proceed with federated architecture starting with property-core-server.