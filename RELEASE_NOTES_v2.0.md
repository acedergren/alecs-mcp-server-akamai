# ALECS v2.0.0 Release Notes

## 🎉 Major Release: The OpenAPI Era

We're thrilled to announce ALECS v2.0.0, a transformative release that revolutionizes how developers interact with Akamai's APIs through AI assistants. This release introduces OpenAPI-driven code generation, comprehensive new domains, and significant architectural improvements.

## 🚀 What's New

### 1. OpenAPI-Driven Development (Game Changer!)

Generate complete tool implementations from OpenAPI specifications in seconds:

```bash
# Generate new domain from API spec
alecs generate-from-api --spec ./openapi.json --domain mydomain

# Update existing tools when APIs change
alecs generate-from-api --spec ./api-v2.json --domain property --update

# Migrate legacy tools to OpenAPI patterns
alecs generate-from-api --spec ./api.json --tool ./dns-tools.ts --migrate
```

**Benefits:**
- 🚀 **10x faster** tool development
- 🔧 **Always up-to-date** with latest API changes
- 📝 **Type-safe** with automatic Zod schema generation
- 🔄 **Smart updates** preserve custom logic
- 🎯 **Zero manual work** for standard CRUD operations

### 2. New Domains & Tools

**Total Tools: 216** (up from 156 in v1.7)

#### New Domains Added:
- **Billing** (10 tools) - Comprehensive billing operations
- **Edge Compute** (12 tools) - EdgeWorkers and Cloudlets management
- **GTM** (17 tools) - Global Traffic Management
- **Diagnostics** (21 tools) - Edge diagnostics and testing

#### Enhanced Domains:
- **Edge Hostnames** (10 tools) - Added search, update, and bulk operations
- **Includes** (10 tools) - Full include configuration management
- **Rule Tree** (5 tools) - Advanced rule processing
- **Hostname Management** (5 tools) - Intelligent hostname operations
- **Bulk Operations** (5 tools) - Batch processing for efficiency

### 3. Architectural Improvements

#### ALECSCore Framework
- Base server class providing core functionality
- Automatic tool discovery and registration
- Standardized error handling across all domains
- Built-in caching with TTL support
- Hot reload support for development

#### Enhanced Error Handling
- RFC 7807 Problem Details format
- User-friendly error messages
- Actionable guidance for common issues
- No stack traces exposed to users

#### Performance Optimizations
- Improved build system with caching
- Request coalescing for efficiency
- Connection pooling
- Smart rate limiting

### 4. Developer Experience

#### New CLI Commands
```bash
# Generate domain from OpenAPI
alecs generate-from-api --spec ./api.json --domain mydomain

# List all available tools
alecs list-tools

# Check tool compatibility
alecs check-tools

# Run development server with hot reload
alecs dev --hot-reload
```

#### Comprehensive Documentation
- Architecture explainer with visual diagrams
- OpenAPI development guide
- Tool creation guide with examples
- Quick reference for common tasks

## 📊 Migration Guide

### For Claude Desktop Users

Update your configuration to use the unified server:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["/path/to/alecs/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "DEFAULT_CUSTOMER": "default"
      }
    }
  }
}
```

### For Cursor Users

Similar update in Cursor's MCP settings:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["/path/to/alecs/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "DEFAULT_CUSTOMER": "default"
      }
    }
  }
}
```

### For NPM Users

```bash
# Upgrade to v2.0
npm install -g alecs-mcp-server-akamai@2.0.0

# Verify installation
alecs --version
```

## 🔧 Breaking Changes

1. **Module System**: Project now uses CommonJS consistently
2. **Tool Naming**: All tools use snake_case (e.g., `property_list` not `property.list`)
3. **Configuration**: Unified server replaces individual domain servers
4. **API Changes**: Some tool signatures updated for consistency

## 🐛 Bug Fixes

- Fixed TypeScript identifier issues with hyphenated domain names
- Resolved ES module compatibility issues
- Improved error handling for missing credentials
- Fixed rate limiting edge cases
- Corrected cache invalidation logic

## 🔮 What's Next

### Phase 4 Domains (Coming Soon)
- Contract Management
- Image Manager
- Site Shield
- Test Management

### Future Features
- Remote authentication support
- GraphQL gateway
- Real-time WebSocket subscriptions
- Edge deployment on Akamai EdgeWorkers

## 🙏 Acknowledgments

Special thanks to all contributors and the Akamai developer community for feedback and suggestions.

## 📚 Resources

- [Full Documentation](./docs/README.md)
- [Architecture Guide](./docs/ARCHITECTURE_EXPLAINER.md)
- [OpenAPI Development](./docs/OPENAPI_DEVELOPMENT_GUIDE.md)
- [API Reference](./docs/API_REFERENCE.md)

## 🚀 Getting Started

```bash
# Install
npm install -g alecs-mcp-server-akamai@2.0.0

# Configure
cat > ~/.edgerc << EOF
[default]
client_secret = your_secret
host = your_host.luna.akamaiapis.net
access_token = your_token
client_token = your_token
EOF

# Run
alecs

# Or use with your AI assistant!
```

---

**Happy coding with ALECS v2.0! 🚀**

Built with ❤️ for the Akamai community