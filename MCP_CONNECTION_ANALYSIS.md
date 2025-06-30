# Deep Analysis: MCP Server Connection Failures

## 🔍 Root Cause Analysis

After analyzing the MCP SDK implementation and our server factory, I've identified **5 critical issues** causing connection failures after the refactoring.

### Issue 1: Type Safety Violation in ToolDefinition

**Problem:**
```typescript
// In all-tools-registry.ts (line 540)
export interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodSchema;
  handler: (client: any, params: any) => Promise<any>; // ❌ Using any!
}
```

**Expected:**
```typescript
// Our tools actually return Promise<MCPToolResponse>
handler: (client: AkamaiClient, params: any) => Promise<MCPToolResponse>;
```

**Impact:** Type mismatches cause runtime errors and unpredictable behavior.

### Issue 2: Response Format Mismatch

**Problem:** Our server returns the entire `MCPToolResponse` object:
```typescript
// In akamai-server-factory.ts (line 353)
return response; // Returns full MCPToolResponse object
```

**MCP SDK Expects:** CallToolResult format:
```typescript
{
  content: Array<{
    type: "text" | "image" | "resource",
    text?: string,
    // ...MCP SDK specific fields
  }>,
  _meta?: {}
}
```

**Our Tools Return:** MCPToolResponse format:
```typescript
{
  content: Array<{
    type: "text" | "image" | "resource", 
    text?: string,
    data?: string,
    mimeType?: string
  }>,
  isError?: boolean
}
```

### Issue 3: Schema Conversion Issues

**Problem:** Custom Zod-to-JSON Schema conversion:
```typescript
// In akamai-server-factory.ts (lines 166-199)
private zodToJsonSchema(zodSchema: ZodType): Record<string, unknown>
```

**Issues:**
- Uses custom conversion instead of MCP SDK's schema handling
- May not produce MCP-compliant JSON Schema
- Missing required fields for MCP protocol

### Issue 4: Tool Loading Validation Errors

**Problem:** Tools failing validation during loading:
```typescript
// In akamai-server-factory.ts (lines 129-137)
for (const tool of toolsToLoad) {
  try {
    this.validateTool(tool);
    this.tools.set(tool.name, tool);
    loadedCount++;
  } catch (error) {
    logger.error(`Failed to load tool ${tool.name}:`, error); // ❌ Silent failures
  }
}
```

**Impact:** Tools silently fail to load, reducing available functionality.

### Issue 5: MCP Protocol Compliance

**Problem:** Not using MCP SDK's built-in tool registration:
- Custom schema handling instead of SDK schemas
- Manual JSON-RPC response formatting
- Missing MCP protocol version negotiation

## 🔧 Solutions

### Solution 1: Fix ToolDefinition Types

```typescript
// Update all-tools-registry.ts
import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types/mcp-protocol';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodSchema;
  handler: (client: AkamaiClient, params: unknown) => Promise<MCPToolResponse>;
}
```

### Solution 2: Correct Response Format

```typescript
// In akamai-server-factory.ts CallToolRequestSchema handler
const response = await tool.handler(client, args || {});

// Convert MCPToolResponse to MCP SDK format
return {
  content: response.content,
  isError: response.isError,
  _meta: {} // Add if needed
};
```

### Solution 3: Use MCP SDK Schema Handling

```typescript
// Replace custom zodToJsonSchema with proper MCP schemas
import { Tool } from '@modelcontextprotocol/sdk/types.js';

// In list tools handler:
const tools: Tool[] = Array.from(this.tools.values()).map(tool => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.schema ? zodToJsonSchema(tool.schema) : undefined // Use proper conversion
}));
```

### Solution 4: Proper Error Handling

```typescript
// In loadTools method:
const failedTools: string[] = [];
for (const tool of toolsToLoad) {
  try {
    this.validateTool(tool);
    this.tools.set(tool.name, tool);
    loadedCount++;
  } catch (error) {
    failedTools.push(tool.name);
    logger.error(`Failed to load tool ${tool.name}:`, error);
  }
}

if (failedTools.length > 0) {
  throw new Error(`Failed to load ${failedTools.length} tools: ${failedTools.join(', ')}`);
}
```

### Solution 5: Use MCP SDK Properly

```typescript
// Replace manual server setup with proper MCP SDK usage
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Use SDK's built-in tool registration instead of manual handlers
this.server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Array.from(this.tools.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.schema ? this.convertSchema(tool.schema) : undefined,
  }));
  
  return { tools };
});
```

## 🚨 Critical Fix Priority

### Priority 1 (Immediate)
1. **Fix ToolDefinition types** - Remove all `any` usage
2. **Correct response format** - Match MCP SDK expectations
3. **Handle tool loading errors** - Don't silently fail

### Priority 2 (Short-term)
4. **Improve schema conversion** - Use MCP-compliant conversion
5. **Add proper error handling** - Comprehensive error reporting

### Priority 3 (Long-term)
6. **Full MCP SDK integration** - Use SDK features properly
7. **Add connection testing** - Automated MCP client tests

## 🧪 Testing Strategy

### Test 1: Tool Loading
```bash
# Check if all tools load without errors
npm run build && node -e "
  import('./dist/utils/akamai-server-factory.js').then(({ createAkamaiServer }) => {
    const server = createAkamaiServer({ name: 'test', version: '1.0.0' });
    console.log('Tools loaded:', server.getLoadedTools().length);
  });
"
```

### Test 2: MCP Inspector Connection
```bash
# Test with MCP Inspector
npx @modelcontextprotocol/inspector dist/index.js
```

### Test 3: Schema Validation
```typescript
// Test schema conversion
const server = new AkamaiMCPServer({ name: 'test', version: '1.0.0' });
const tools = server.getLoadedTools();
console.log('First tool schema:', JSON.stringify(tools[0].schema, null, 2));
```

## 🎯 Expected Outcomes

After implementing these fixes:
- ✅ **All tools load successfully** without validation errors
- ✅ **MCP clients connect** without protocol errors  
- ✅ **Type safety** throughout the codebase
- ✅ **Proper error messages** for debugging
- ✅ **MCP Inspector compatibility** for testing

## 🔄 Implementation Plan

1. **Phase 1:** Fix type definitions and response formats
2. **Phase 2:** Improve error handling and logging
3. **Phase 3:** Test with MCP Inspector and real clients
4. **Phase 4:** Add automated connection tests

The core issue is that we've created a custom MCP implementation instead of properly using the MCP SDK. These fixes will align our server with MCP protocol expectations.