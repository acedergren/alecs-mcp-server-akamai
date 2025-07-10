# ALECS Architecture Quick Reference

## 🏗️ Architecture at a Glance

**ALECS** = MCP Server + Akamai APIs + Type Safety + Multi-Customer Support

## 📁 Project Structure

```
alecs-mcp-server-akamai/
├── src/
│   ├── index.ts                    # Entry point
│   ├── server.ts                   # MCP server implementation
│   ├── akamai-client.ts           # API client with EdgeGrid auth
│   ├── tools/                     # Domain implementations
│   │   ├── all-tools-registry.ts  # Tool registration
│   │   ├── base-tool.ts           # Base class for all tools
│   │   ├── property/              # Property Manager domain
│   │   ├── dns/                   # Edge DNS domain
│   │   ├── security/              # Security domain
│   │   └── ...                    # Other domains
│   ├── utils/                     # Shared utilities
│   │   ├── tool-error-handler.ts  # Error handling
│   │   ├── pino-logger.ts         # Logging
│   │   └── edgerc-parser.ts       # Config parsing
│   ├── types/                     # TypeScript types
│   └── cli/                       # CLI tools
│       ├── generators/            # Code generators
│       └── commands/              # CLI commands
├── dist/                          # Compiled JavaScript
├── docs/                          # Documentation
└── tests/                         # Test suites
```

## 🔑 Key Components

### 1. **MCP Server** (`server.ts`)
- Handles JSON-RPC communication
- Manages tool registry
- Routes requests to tools
- Supports multiple transports

### 2. **Domain Tools** (`tools/*/`)
- One class per Akamai service
- Extends `BaseTool`
- Implements tool methods
- Uses Zod for validation

### 3. **Akamai Client** (`akamai-client.ts`)
- EdgeGrid authentication
- Request queuing
- Rate limiting
- Response caching

### 4. **Error Handler** (`tool-error-handler.ts`)
- RFC 7807 Problem Details
- User-friendly messages
- Consistent error format
- Context preservation

## 🔄 Request Lifecycle

```
1. AI Assistant → MCP Request → ALECS Server
2. ALECS → Tool Registry → Find Handler
3. Handler → Validate Args → Zod Schema
4. Handler → Akamai Client → EdgeGrid Auth
5. Client → Akamai API → HTTPS Request
6. Response → Validation → Format → AI Assistant
```

## 🛠️ Core Patterns

### Tool Implementation Pattern
```typescript
export class DomainTools extends BaseTool {
  async tool_name(args: ToolArgs): Promise<MCPToolResponse> {
    try {
      // 1. Validate input
      const validated = ToolSchema.parse(args);
      
      // 2. Make API call
      const response = await this.client.request({
        method: 'GET',
        path: '/api/endpoint',
        params: validated
      });
      
      // 3. Return formatted response
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }],
        isError: false
      };
    } catch (error) {
      // 4. Handle errors consistently
      return this.errorHandler.handleError(error);
    }
  }
}
```

### Schema Pattern
```typescript
export const ToolSchema = z.object({
  customer: z.string().optional(),
  required_field: z.string(),
  optional_field: z.number().optional(),
  validated_field: z.string().regex(/pattern/)
});

export type ToolArgs = z.infer<typeof ToolSchema>;
```

## 🚀 Transport Options

| Transport | Use Case | Configuration |
|-----------|----------|---------------|
| **stdio** | Claude Desktop | Default |
| **http** | Web/CDN deployment | `MCP_TRANSPORT=streamable-http` |
| **websocket** | Real-time apps | `MCP_TRANSPORT=websocket` |
| **sse** | Legacy support | `MCP_TRANSPORT=sse` |

## 🔐 Security Layers

1. **Authentication**: EdgeGrid with .edgerc
2. **Authorization**: Customer isolation
3. **Validation**: Zod schemas on all inputs
4. **Sanitization**: Clean outputs
5. **Rate Limiting**: Per-customer limits
6. **Audit**: Comprehensive logging

## 🎯 Design Principles

### 1. **Type Safety First**
- No `any` types
- Runtime validation
- Compile-time checks

### 2. **Domain Driven**
- Organized by Akamai service
- Clear boundaries
- Independent domains

### 3. **Error Transparency**
- Helpful error messages
- Actionable guidance
- No stack traces to users

### 4. **Performance**
- Response caching
- Connection pooling
- Request coalescing

### 5. **Extensibility**
- Easy to add domains
- OpenAPI generation
- Plugin architecture

## 📊 Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Language** | TypeScript | Type safety, IDE support |
| **Validation** | Zod | Runtime + compile-time safety |
| **Protocol** | MCP | AI assistant standard |
| **Auth** | EdgeGrid | Akamai standard |
| **Logging** | Pino | Fast, structured logs |
| **Testing** | Jest | Comprehensive, fast |
| **Build** | TSC + Webpack | Simple, reliable |

## 🔧 Adding New Features

### 1. New Domain
```bash
# Manual
alecs generate domain my-domain

# From OpenAPI (recommended)
alecs generate-from-api --spec ./api.json --domain my-domain
```

### 2. New Tool in Existing Domain
```typescript
// Add to domain-tools.ts
async my_new_tool(args: MyToolArgs): Promise<MCPToolResponse> {
  // Implementation
}

// Register in MCP
registerTool('my_new_tool', {
  description: 'What it does',
  handler: (args) => tools.my_new_tool(args)
});
```

### 3. New Transport
```typescript
class MyTransport implements Transport {
  async start() { }
  async send(message: JSONRPCMessage) { }
  onMessage(handler: MessageHandler) { }
  async close() { }
}
```

## 🐛 Debugging Tips

1. **Enable Debug Logging**
   ```bash
   DEBUG=alecs:* npm run dev
   ```

2. **Check Tool Registration**
   ```bash
   npm run generate -- list-tools
   ```

3. **Test Individual Tools**
   ```bash
   npm test -- --testNamePattern="tool_name"
   ```

4. **Validate Schemas**
   ```typescript
   console.log(ToolSchema.parse(testData));
   ```

## 📈 Performance Considerations

- **Cache TTL**: 5 minutes for read operations
- **Rate Limits**: 100 req/min for properties, 1000 req/min for purge
- **Batch Size**: 100 items for bulk operations
- **Timeout**: 30 seconds for standard operations
- **Retry**: 3 attempts with exponential backoff

## 🚢 Deployment Checklist

- [ ] Build: `npm run build`
- [ ] Test: `npm test`
- [ ] Lint: `npm run lint`
- [ ] Security: No exposed credentials
- [ ] Config: .edgerc properly configured
- [ ] Transport: Correct for deployment target
- [ ] Monitoring: Logging configured
- [ ] Documentation: README updated

## 📚 Related Documentation

- [Full Architecture Explainer](./ARCHITECTURE_EXPLAINER.md)
- [Visual Architecture](./architecture/VISUAL_ARCHITECTURE.md)
- [Development Guide](./development/DEVELOPMENT_GUIDE.md)
- [OpenAPI Development](./OPENAPI_DEVELOPMENT_GUIDE.md)
- [Tool Creation Guide](./TOOL_CREATION_GUIDE.md)