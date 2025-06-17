# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an ALECS MCP Server (A LaunchGrid for Edge & Cloud Services) - an MCP (Model Context Protocol) server that enables AI assistants to interact with Akamai's CDN and edge services APIs. The project democratizes Akamai CDN management by eliminating the complexity barrier between intention and execution, supporting multiple Akamai customers through account switching.

## Key Commands

### Project Setup
```bash
# Initialize project
npm init -y
npm install typescript @types/node tsx dotenv
npm install @modelcontextprotocol/sdk
npm install axios crypto

# TypeScript setup
npx tsc --init

# Build
npm run build

# Start with interactive mode (default)
npm start

# Run specific modular servers
node dist/servers/property-server.js
node dist/servers/dns-server.js
node dist/servers/certs-server.js
node dist/servers/security-server.js
node dist/servers/reporting-server.js

# Run development server
npm run dev
```

### Testing
```bash
# Run tests
npm test

# Run specific test
npm test -- --testNamePattern="pattern"

# Run with coverage
npm test:coverage

# Watch mode for development
npm test:watch

# Validation and health checks
npm run test:validate      # Comprehensive validation suite
npm run test:health        # MCP protocol health check
npm run test:journey       # Customer journey tests
npm run test:performance   # Performance and load testing
```

#### Test Environment
A dedicated test environment is available in the `.edgerc` file:
- Section name: `testing`
- This represents a test environment in Akamai for integration testing
- Use `customer: "testing"` parameter in MCP tools to target this environment

### Code Quality
```bash
# Linting
npm run lint              # Auto-fix linting issues
npm run lint:check        # Check without fixing

# Formatting
npm run format            # Format code with Prettier
npm run format:check      # Check formatting

# Type checking
npm run typecheck         # TypeScript validation
```

### Deployment
```bash
# Build Docker image
docker build -t alecs-mcp-server-akamai:latest .

# Run with environment variables
docker run -it --env-file .env alecs-mcp-server-akamai:latest

# Package as single binary
npx pkg . --targets node18-macos-x64,node18-linux-x64,node18-win-x64
```

## Architecture Overview

### Recent Refactoring (v1.3.0)

The project has undergone a complete architectural refactoring:

1. **Modular Service Architecture**: The monolithic server has been split into 5 focused modules:
   - Property Server (32 tools): CDN property configuration
   - DNS Server (24 tools): DNS zone and record management  
   - Certificates Server (22 tools): SSL certificate provisioning
   - Security Server (95 tools): WAF, network lists, and security configurations
   - Reporting Server (25 tools): Analytics and performance metrics

2. **TypeScript Migration**: 100% TypeScript with full strict mode enabled
   - All JavaScript files converted to TypeScript
   - Comprehensive type definitions and interfaces
   - Full strict mode compliance

3. **Interactive CLI**: New default startup mode with service selection
   - User-friendly prompts for service selection
   - Automatic configuration detection
   - Graceful error handling

### Multi-Customer Support
The server supports multiple Akamai accounts through `.edgerc` configuration sections:
- Each customer has a section in `.edgerc` with their credentials and optional account-switch-key
- All MCP tools accept a `customer` parameter to specify which account to use
- EdgeGrid authentication handles account switching via headers

### Core Components

1. **EdgeGrid Authentication**: Implements Akamai's EdgeGrid authentication protocol with account switching support
2. **MCP Tool Structure**: Each tool follows the pattern `service.action` (e.g., `property.list`, `dns.zone.create`)
3. **Network Targeting**: Activation tools support `STAGING` and `PRODUCTION` networks
4. **Service Modules**:
   - Property Manager: CDN property configuration
   - Edge DNS: DNS zone and record management
   - CPS (Default DV only): SSL certificate provisioning
   - Network Lists: IP and geographic access control lists
   - Fast Purge: Content invalidation
   - Application Security: WAF and security configurations
   - Reporting: Traffic and performance metrics

### API Integration Pattern
1. Research agents analyze Akamai OpenAPI specs from GitHub
2. Service implementations use TypeScript with strong typing
3. MCP SDK provides the tool interface layer
4. Customer context is validated before each API call

## Development Workflow

### Stage 1 (MVP): Property Manager + DNS
Focus on core CDN functionality with multi-customer support

### Stage 2: Network Lists + Fast Purge
Add content control and purging capabilities

### Stage 3: Security Configuration
Implement WAF and security policy management

### Stage 4: Reporting
Add traffic and performance reporting tools

## Important Notes

- Always validate customer parameter exists in `.edgerc` before operations
- Default to Enhanced TLS network for certificate deployments
- Handle async operations (activations) with proper status polling
- Respect Akamai API rate limits per customer account
- Use staging environment for testing before production deployments

## Test Suite Status (Last Updated: 2025-01-17)

### Overall Test Metrics
- **Total Tests**: 438 total
- **Passing Tests**: 379 passing
- **Skipped Tests**: 59 skipped (including 4 MCP SDK ES module compatibility issues)
- **Test Suites**: 38 total (31 passing, 4 skipped, 3 skipped)
- **Execution Time**: ~18 seconds
- **TypeScript**: Full strict mode enabled with 100% type coverage

### MCP Protocol Testing Implementation
Successfully created comprehensive MCP test suites to improve protocol compliance:

1. **Tool Schema Validation** (`tool-schema-validation.test.ts`) - ✅ PASSING
   - Validates JSON Schema Draft 7 compliance
   - Tests parameter type enforcement
   - Ensures proper error messaging

2. **MCP Server Initialization** (`mcp-server-initialization.test.ts`) - ⚠️ Compilation issues
   - Tests server setup and configuration
   - Validates handler registration
   - Checks lifecycle management

3. **MCP Protocol Compliance** (`mcp-protocol-compliance.test.ts`) - ⚠️ Compilation issues
   - Tests request/response format validation
   - Validates MCP error standards
   - Ensures protocol version compliance

4. **MCP Client Simulation** (`mcp-client-simulation.test.ts`) - ⚠️ Compilation issues
   - Simulates Claude Desktop client patterns
   - Tests concurrent client handling
   - Validates disconnection scenarios

5. **Multi-Tool Workflows** (`mcp-multi-tool-workflows.test.ts`) - ⚠️ Compilation issues
   - Tests complex tool compositions
   - Validates state management
   - Ensures context preservation

### Test Coverage Analysis
- **Previous Grade**: B+ (85% coverage)
- **Target Grade**: A+ (95%+ coverage)
- **Progress**: Added MCP protocol testing framework
- **Next Steps**: Resolve compilation issues in MCP test suites

### Known Issues
- MCP test suites have TypeScript compilation errors due to mock setup complexity
- These tests require deeper integration with the actual MCP server implementation
- Core functionality tests (338) are all passing

### Testing Commands
```bash
# Run all tests
npm test

# Run specific test pattern
npm test -- --testNamePattern="MCP"

# Run with coverage
npm test:coverage

# Run tests in watch mode
npm test:watch

# Run validation tests
npm run test:validate

# Run health checks
npm run test:health

# Run specific test file
npm test -- src/__tests__/tool-schema-validation.test.ts
```

### TypeScript Configuration

The project uses full TypeScript strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true
  }
}
```