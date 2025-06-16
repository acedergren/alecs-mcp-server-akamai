# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Akamai MCP (Model Context Protocol) server project that enables AI assistants to interact with Akamai's CDN and edge services APIs. The project is designed to support multiple Akamai customers through account switching.

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

# Run development server
npm run dev
```

### Testing
```bash
# Run tests
npm test

# Run specific test
npm test -- --testNamePattern="pattern"
```

#### Test Environment
A dedicated test environment is available in the `.edgerc` file:
- Section name: `testing`
- This represents a test environment in Akamai for integration testing
- Use `customer: "testing"` parameter in MCP tools to target this environment

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