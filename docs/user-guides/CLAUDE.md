# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an ALECS MCP Server (A LaunchGrid for Edge & Cloud Services) - an MCP (Model Context Protocol) server that enables AI assistants to interact with Akamai's CDN and edge services APIs. The project democratizes Akamai CDN management by eliminating the complexity barrier between intention and execution, supporting multiple Akamai customers through account switching.

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build              # Standard build
npm run build:dev          # Development build (looser checks)
npm run build:strict       # Strict build (production)
npm run watch             # Watch mode

# Start servers
npm start                 # Interactive mode (default)
npm run start:json        # JSON configuration mode
npm run start:stdio       # Standard I/O mode

# Run individual servers
node dist/servers/property-server.js
node dist/servers/dns-server.js
node dist/servers/certs-server.js
node dist/servers/security-server.js
node dist/servers/reporting-server.js

# Development server
npm run dev              # Runs src/index.ts with tsx
```

### Testing
```bash
# Run all tests
npm test                  # All tests with coverage
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Run specific test categories
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:type        # Type safety tests
npm run test:mcp         # MCP protocol tests

# Run single test
npm test -- --testNamePattern="pattern"
npm test -- path/to/test.ts

# Validation and health
npm run test:validate    # Comprehensive validation
npm run test:health      # MCP protocol health check
npm run test:performance # Performance testing
```

### Code Quality
```bash
# Linting
npm run lint             # Auto-fix linting issues
npm run lint:check       # Check without fixing

# Type checking
npm run typecheck        # Full type validation
npm run typecheck:watch  # Watch mode

# Run all quality checks
npm run validate         # lint + typecheck + test
```

## Architecture Overview

### Service Modules
The project is organized into 5 focused service modules:

1. **Property Server** (`src/servers/property-server.ts`)
   - 32 tools for CDN property configuration
   - Handles property creation, modification, activation
   - Rule tree management and hostnames

2. **DNS Server** (`src/servers/dns-server.ts`)
   - 24 tools for Edge DNS management
   - Zone creation, record management
   - Bulk operations support

3. **Certificates Server** (`src/servers/certs-server.ts`)
   - 22 tools for SSL/TLS certificates
   - Default DV certificate lifecycle
   - Deployment and validation tracking

4. **Security Server** (`src/servers/security-server.ts`)
   - 95 tools for application security
   - WAF configurations, rate policies
   - Network lists and bot management

5. **Reporting Server** (`src/servers/reporting-server.ts`)
   - 25 tools for analytics and metrics
   - Traffic reports, performance data
   - Real-time and historical data

### Multi-Customer Architecture
```typescript
// All tools accept a customer parameter
const params = {
  customer: "acme-corp",  // Maps to .edgerc section
  propertyId: "prp_123"
};

// CustomerConfigManager handles authentication
const config = await configManager.getCustomerConfig("acme-corp");
// Includes account-switch-key if configured
```

### Tool Naming Convention
Tools follow the pattern: `service.resource.action`
- `property.list` - List all properties
- `dns.zone.create` - Create DNS zone
- `security.waf.policy.update` - Update WAF policy

### Key Components
- **EdgeGrid Authentication** (`src/services/edgegrid-auth.ts`): Akamai API authentication with account switching
- **CustomerConfigManager** (`src/services/customer-config-manager.ts`): Multi-tenant credential management
- **Base Service Classes** (`src/services/base/`): Shared functionality across services
- **Type Definitions** (`src/types/`): Comprehensive TypeScript interfaces

## Development Workflow

### TypeScript Configuration
- **Development**: `tsconfig.json` - Standard strict mode
- **Production**: `tsconfig.build.json` - Even stricter checks
- **Path Aliases**: Use `@/`, `@utils/`, `@services/`, etc.

### Testing Strategy
1. **Unit Tests**: Individual function/class testing
2. **Integration Tests**: Service-level API testing
3. **E2E Tests**: Full workflow validation
4. **MCP Tests**: Protocol compliance verification
5. **Performance Tests**: Load and stress testing

### Error Handling
```typescript
// Use typed errors
import { BaseError, ValidationError } from '@/errors';

// Log to stderr (stdout reserved for MCP)
console.error('[Service] Error:', error.message);
```

### Environment Setup
Create `.edgerc` file with customer sections:
```ini
[default]
client_secret = xxx
host = xxx.luna.akamaiapis.net
access_token = xxx
client_token = xxx

[acme-corp]
client_secret = yyy
host = yyy.luna.akamaiapis.net
access_token = yyy
client_token = yyy
account-switch-key = ACC-123456

[testing]
# Test environment credentials
```

## Important Implementation Notes

1. **Async Operations**: Activations and deployments require polling for completion
2. **Network Targeting**: Use `STAGING` for testing, `PRODUCTION` for live
3. **Rate Limiting**: Respect Akamai API limits per customer
4. **Validation**: Always validate customer parameter exists in `.edgerc`
5. **Logging**: Use stderr for logs, stdout is reserved for MCP protocol
6. **Type Safety**: Project uses TypeScript strict mode - no `any` types

## Docker Support
```bash
# Build image
docker build -t alecs-mcp-server-akamai:latest .

# Run with environment
docker run -it --env-file .env alecs-mcp-server-akamai:latest
```

## VS Code Integration
The project includes browser-optimized VS Code settings in `.vscode/settings.json` for improved performance in cloud IDEs.