# ALECS MCP Server Development Onboarding

## Welcome to ALECS Development

This guide will get you up to speed with the ALECS MCP Server architecture and development workflow.

## 📋 Prerequisites

Before you start, ensure you have:
- Node.js 18+ installed
- TypeScript knowledge
- Basic understanding of MCP (Model Context Protocol)
- Familiarity with Akamai APIs (helpful but not required)

## 🚀 Quick Start

### 1. Set Up Your Development Environment

```bash
# Clone and install
git clone <repository-url>
cd alecs-mcp-server-akamai
npm install

# Build the project
npm run build

# Run tests
npm test
```

### 2. Understand the Architecture

Start with these key documents:
1. **[Architecture Flowchart](../ARCHITECTURE_FLOWCHART.md)** - Visual overview of the system
2. **[Component Implementation Guide](./architecture/COMPONENT_IMPLEMENTATION_GUIDE.md)** - Detailed component documentation
3. **[Tool Creation Guide](./TOOL_CREATION_GUIDE.md)** - How to create new tools

### 3. Your First Tool

Follow the [Tool Creation Guide](./TOOL_CREATION_GUIDE.md) to create your first tool:

```typescript
// Quick example
const myTool = tool(
  'example.hello',
  z.object({ name: z.string() }),
  async (args, ctx) => {
    return `Hello, ${args.name}!`;
  }
);
```

## 🏗️ Architecture Overview

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude        │    │   ALECS Core    │    │   Akamai APIs   │
│   Desktop       │◄──►│   Framework     │◄──►│                 │
│   (MCP Client)  │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Concepts

1. **ALECS Core** - The main server framework that handles MCP protocol
2. **Tools** - Individual functions that interact with Akamai APIs
3. **Context** - Provides authentication, caching, and utilities to tools
4. **Customer** - Multi-tenant support for different Akamai accounts

## 🛠️ Development Workflow

### Creating a New Tool

1. **Plan Your Tool**
   - Define its purpose and API endpoint
   - Identify required parameters
   - Plan error handling

2. **Create the Tool**
   ```typescript
   // Define schema
   const MyToolSchema = CustomerSchema.extend({
     param1: z.string(),
     param2: z.number().optional()
   });
   
   // Create tool
   export const myTool = tool(
     'domain.action',
     MyToolSchema,
     async (args, ctx) => {
       // Implementation
     }
   );
   ```

3. **Register the Tool**
   ```typescript
   // In domain server
   class MyDomainServer extends ALECSCore {
     override tools = [myTool];
   }
   ```

4. **Test the Tool**
   ```typescript
   // Write unit tests
   describe('myTool', () => {
     it('should work correctly', async () => {
       // Test implementation
     });
   });
   ```

5. **Update Documentation**
   - Add to API reference
   - Update changelog
   - Add examples

### Testing Strategy

1. **Unit Tests** - Test individual tools in isolation
2. **Integration Tests** - Test tool interaction with ALECS Core
3. **E2E Tests** - Test complete workflows through MCP protocol
4. **Performance Tests** - Ensure tools meet performance requirements

## 📁 Project Structure

```
alecs-mcp-server-akamai/
├── src/
│   ├── core/              # ALECS Core framework
│   │   └── server/        # Base server implementation
│   ├── tools/             # Tool implementations
│   │   ├── property/      # Property management tools
│   │   ├── dns/          # DNS management tools
│   │   └── certificates/ # Certificate tools
│   ├── servers/          # Domain-specific servers
│   ├── auth/             # Authentication layer
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript definitions
├── docs/                 # Documentation
├── __tests__/            # Test files
└── examples/             # Usage examples
```

## 🎯 Best Practices

### Code Style
- Use TypeScript for type safety
- Follow the existing naming conventions
- Keep functions small and focused
- Use Zod for runtime validation

### Error Handling
- Provide specific, helpful error messages
- Handle API errors gracefully
- Log errors with sufficient context
- Don't expose internal details to users

### Performance
- Enable caching for read operations
- Use request coalescing for duplicate requests
- Implement streaming for large datasets
- Set appropriate timeouts

### Security
- Validate all inputs with Zod schemas
- Use customer context for multi-tenant isolation
- Don't log sensitive information
- Follow the principle of least privilege

## 📚 Essential Reading

### Primary Documentation
1. **[Tool Creation Guide](./TOOL_CREATION_GUIDE.md)** - Comprehensive guide to creating tools
2. **[Tool Quick Reference](./TOOL_QUICK_REFERENCE.md)** - Quick reference for common patterns
3. **[Architecture Flowchart](../ARCHITECTURE_FLOWCHART.md)** - Visual system overview

### Advanced Topics
1. **[Component Implementation Guide](./architecture/COMPONENT_IMPLEMENTATION_GUIDE.md)** - Deep dive into components
2. **[API Reference](./api/README.md)** - Complete API documentation
3. **[Performance Optimization](./performance/README.md)** - Performance best practices

## 🔧 Common Development Tasks

### Adding a New Domain Server

1. Create server file in `src/servers/`
2. Extend `ALECSCore` base class
3. Import and register domain tools
4. Add to `src/index.ts` routing

### Adding Tools to Existing Domain

1. Create tool in appropriate domain folder
2. Add to consolidated tools file
3. Update domain server's tools array
4. Add to all-tools-registry

### Debugging Issues

1. **Enable Debug Logging**
   ```typescript
   ctx.logger.debug('Debug message', { data });
   ```

2. **Check Cache Status**
   ```typescript
   const cached = await ctx.cache.get(key);
   ctx.logger.debug('Cache hit', { hit: !!cached });
   ```

3. **Validate API Responses**
   ```typescript
   ctx.logger.debug('API response', { 
     status: response.status,
     data: response.data 
   });
   ```

## 🚨 Common Pitfalls

### Avoid These Mistakes

1. **Not validating customer context**
   ```typescript
   // ❌ Wrong
   await ctx.client.get('/api/endpoint');
   
   // ✅ Correct
   if (!ctx.customer) throw new Error('Customer required');
   await ctx.client.get('/api/endpoint', {
     headers: { 'Customer': ctx.customer }
   });
   ```

2. **Poor error handling**
   ```typescript
   // ❌ Wrong
   try {
     return await apiCall();
   } catch (error) {
     throw new Error('Something went wrong');
   }
   
   // ✅ Correct
   try {
     return await apiCall();
   } catch (error) {
     if (error.response?.status === 404) {
       throw new Error('Resource not found');
     }
     throw error;
   }
   ```

3. **Ignoring performance optimizations**
   ```typescript
   // ❌ Wrong - no caching
   const result = await expensiveApiCall();
   
   // ✅ Correct - with caching
   const cached = await ctx.cache.get(key);
   if (cached) return cached;
   
   const result = await expensiveApiCall();
   await ctx.cache.set(key, result, 300);
   ```

## 📈 Performance Expectations

### Tool Performance Guidelines
- **Response Time**: < 2 seconds for most operations
- **Cache Hit Rate**: > 60% for read operations
- **Memory Usage**: < 100MB per server instance
- **Concurrent Requests**: Support 50+ concurrent tool executions

### Monitoring
- Use structured logging for debugging
- Monitor cache hit rates
- Track API response times
- Watch for memory leaks

## 🤝 Contributing

### Development Process
1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Run full test suite
5. Create pull request

### Code Review Checklist
- [ ] Code follows established patterns
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Performance impact is considered
- [ ] Security implications are reviewed

## 📞 Getting Help

### Resources
- **Internal Documentation**: Check `docs/` directory
- **Code Examples**: Look at existing tools in `src/tools/`
- **Architecture Questions**: See `docs/architecture/`
- **Performance Issues**: Check `docs/performance/`

### Debugging Tips
1. Start with unit tests to isolate issues
2. Use debug logging liberally
3. Check cache behavior
4. Validate API responses
5. Review error handling paths

## 🎉 You're Ready!

You now have the foundation to:
- Understand the ALECS architecture
- Create new tools following established patterns
- Test your implementations properly
- Follow best practices for performance and security

Start with the [Tool Creation Guide](./TOOL_CREATION_GUIDE.md) and build your first tool!