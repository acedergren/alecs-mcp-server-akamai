# ALECS MCP Server - Complete Project Guide for Claude

## Project Overview

**ALECS (A LaunchGrid for Edge & Cloud Services)** is an MCP (Model Context Protocol) server that enables AI assistants to interact with Akamai's CDN and edge services APIs. It democratizes Akamai CDN management by providing natural language interfaces to complex API operations.

**Current Version**: 1.3.0 (Full TypeScript migration completed)

## Architecture

### Core Design Principles
1. **Modular Architecture**: Split into 5 focused service modules
2. **Multi-Customer Support**: Handle multiple Akamai accounts via `.edgerc` sections
3. **TypeScript First**: 100% TypeScript with strict mode enabled
4. **MCP Protocol Compliance**: Following Model Context Protocol standards
5. **Interactive CLI**: User-friendly launcher for service selection

### Service Modules

1. **Property Server** (`alecs-property`) - 32 tools
   - CDN property configuration
   - Rule management
   - Basic certificate integration (Default DV)
   - Edge hostname management

2. **DNS Server** (`alecs-dns`) - 24 tools
   - Zone management (PRIMARY, SECONDARY, ALIAS)
   - Record CRUD operations
   - Zone transfers and migrations
   - Hidden changelist workflow

3. **Certificates Server** (`alecs-certs`) - 22 tools
   - Full certificate lifecycle
   - Default DV automation
   - ACME DNS integration
   - Enhanced TLS network deployment

4. **Security Server** (`alecs-security`) - 95 tools
   - WAF configurations
   - Network lists (IP, GEO, ASN)
   - Bot management
   - Application security policies

5. **Reporting Server** (`alecs-reporting`) - 25 tools
   - Traffic analytics
   - Performance metrics
   - Real-time monitoring
   - Custom report generation

## Development Commands

### Essential Commands
```bash
# Build
npm run build              # Production build
npm run build:watch        # Watch mode
npm run build:check        # Type check only

# Start
npm start                  # Interactive launcher (default)
npm run start:property     # Property server only
npm run start:dns          # DNS server only
npm run start:full         # All services

# Development
npm run dev                # Run with tsx
npm run dev:interactive    # Interactive dev mode

# Testing
npm test                   # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm run test:modular       # Modular server tests

# Code Quality
npm run lint               # Fix linting issues
npm run format             # Format with Prettier
npm run typecheck          # Strict type checking
```

### Advanced Testing
```bash
npm run test:validate      # Comprehensive validation
npm run test:health        # MCP protocol health check
npm run test:journey       # Customer journey tests
npm run test:performance   # Load testing
```

## Configuration

### TypeScript Configuration
- **Target**: ES2022
- **Module**: CommonJS (for MCP SDK compatibility)
- **Strict Mode**: Full strict checking enabled
- **Path Aliases**: 
  - `@/*` → `src/*`
  - `@utils/*` → `src/utils/*`
  - `@tools/*` → `src/tools/*`
  - `@types/*` → `src/types/*`
  - `@services/*` → `src/services/*`

### Build Configuration
- Two tsconfig files:
  - `tsconfig.json`: Development (relaxed for faster iteration)
  - `tsconfig.build.json`: Production (full strict mode)

### Jest Configuration
- TypeScript support via ts-jest
- Path alias resolution
- Multiple test categories (unit, integration, e2e, type)
- Coverage thresholds: 80%+ branches/functions, 85%+ lines/statements

## Project Structure

```
alecs-mcp-server-akamai/
├── src/
│   ├── servers/           # Modular service implementations
│   ├── tools/             # MCP tool implementations
│   │   └── security/      # Security-specific tools
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── agents/            # Autonomous agent implementations
│   ├── auth/              # EdgeGrid authentication
│   └── __tests__/         # Test suites
├── docs/                  # Comprehensive documentation
├── dist/                  # Compiled output (gitignored)
└── package.json           # Project configuration
```

## Key Patterns and Conventions

### Multi-Customer Support
- All tools accept a `customer` parameter
- Customer credentials stored in `.edgerc` sections
- Account switching via `account-switch-key` header
- Validation before API calls

### Tool Naming Convention
- Format: `service.action` or `service.resource.action`
- Examples:
  - `property.list`
  - `dns.zone.create`
  - `security.networkList.update`

### Error Handling
- Custom error types for different scenarios
- Graceful degradation
- Detailed error messages for debugging
- MCP-compliant error responses

### Authentication Flow
1. Read `.edgerc` file
2. Parse customer sections
3. Apply EdgeGrid authentication
4. Include account-switch-key if present

## Testing Architecture

### Test Categories
1. **Unit Tests**: Individual function testing
2. **Integration Tests**: Service integration
3. **E2E Tests**: Full workflow testing
4. **Type Tests**: TypeScript type validation
5. **MCP Protocol Tests**: Protocol compliance

### Test Organization
- Tests in `src/__tests__/`
- Modular server tests in `src/__tests__/modular-servers/`
- Mock data and utilities available
- Comprehensive test coverage (currently 85%+)

## Common Development Tasks

### Adding a New Tool
1. Create tool implementation in appropriate `src/tools/` subdirectory
2. Define input/output schemas using Zod
3. Add to appropriate server module
4. Write unit and integration tests
5. Update documentation

### Debugging
- Use `console.error()` for logging (stderr for MCP)
- Enable debug mode via environment variables
- Interactive launcher shows real-time feedback
- Test individual tools with focused test suites

### Performance Optimization
- Lazy loading of tool implementations
- Efficient customer config caching
- Parallel API calls where possible
- Progress tracking for long operations

## Important Notes

### MCP Protocol Requirements
- All output to stdout must be MCP protocol messages
- Use stderr for logging and debugging
- Tools must have proper JSON Schema definitions
- Handle tool calls atomically

### TypeScript Best Practices
- Always use strict mode for production
- Prefer interfaces over type aliases
- Use type imports: `import type { ... }`
- Explicit return types for public APIs
- Avoid `any` - use `unknown` if needed

### Security Considerations
- Never log sensitive credentials
- Validate all customer parameters
- Use secure credential storage
- Follow Akamai API best practices

## Known Issues and Workarounds

1. **MCP SDK ES Module Compatibility**
   - Some tests skipped due to module resolution
   - Use CommonJS for compatibility

2. **TypeScript Compilation**
   - Development builds use relaxed checking
   - Production builds enforce strict mode

3. **Customer Configuration**
   - `.edgerc` must exist before startup
   - Sections must have complete credentials

## Resources

- **Akamai API Docs**: https://techdocs.akamai.com/
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Project Issues**: Check GitHub issues for known problems

## Quick Troubleshooting

### Build Fails
```bash
npm run clean
npm install
npm run build
```

### Tests Fail
```bash
npm run test:validate  # Check what's broken
npm run test -- --testNamePattern="specific test"
```

### Interactive Mode Issues
- Check `.edgerc` exists and is readable
- Verify Node.js version >= 18.0.0
- Run with debug: `DEBUG=true npm start`