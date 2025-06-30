# Release v1.7.0 - Intelligent DNS Operations & Production-Ready Infrastructure

## [SUCCESS] Major Features

### DNS Operations Revolution
- **Intelligent DNS Operations**: Enhanced `upsertRecord()` with automatic ADD vs EDIT detection
- **DNS Delegation Workflow**: New `delegateSubzone()` function for complete delegation workflows  
- **Automatic Changelist Management**: Phantom/empty changelist cleanup and force mode options
- **Professional Compliance**: Complete removal of emojis from codebase (32 files updated)

### Production Infrastructure
- **NPM Package Fixed**: Direct `npm install -g alecs-mcp-server-akamai` now works correctly
- **Public Docker Registry**: All images now available at `ghcr.io/acedergren/alecs-mcp-server-akamai`
- **Modular Architecture Focus**: Optimized for microservices deployment

## [INFO] Installation & Deployment

### NPM Installation (Fixed!)
```bash
# Global installation now works correctly
npm install -g alecs-mcp-server-akamai@1.7.0

# Run the server
alecs
```

### Docker Images (Public Registry)
```bash
# Main server (recommended for development)
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:latest

# Modular servers (recommended for production)
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:modular

# Minimal server (for testing)
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:minimal

# Remote access servers
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:websocket
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:sse
```

## [IMPORTANT] Architecture Changes

### Why Modular?
We've shifted focus to modular deployments for production environments:

1. **Resource Efficiency**: Each service runs independently with minimal memory footprint
2. **Fault Isolation**: Service failures don't affect other components
3. **Scalability**: Scale individual services based on demand
4. **Security**: Smaller attack surface per service

### Server Variants Explained
- **`latest`** (formerly `full`): Development server with PM2 management - all tools in one container
- **`modular`**: Production-ready microservices architecture
  - Property Server (port 3010)
  - DNS Server (port 3011)
  - Certificate Server (port 3012)
  - Security Server (port 3013)
  - Reporting Server (port 3014)
  - AppSec Server (port 3015)
  - FastPurge Server (port 3016)
  - Network Lists Server (port 3017)
- **`minimal`**: Testing server with 3 core tools
- **`websocket`/`sse`**: Remote access variants

## [SUCCESS] Developer Experience

### DNS Without the Pain
```typescript
// Before: Multiple API calls, changelist management, error handling
// After: One simple call
await delegateSubzone(client, {
  zone: "subdomain.example.com",
  nameservers: ["ns1.provider.com", "ns2.provider.com"],
  provider: "CloudProvider"
});
```

### Consistent NPM Scripts
```bash
# Start individual servers
npm run start:property
npm run start:dns
npm run start:certs
npm run start:security
npm run start:reporting
npm run start:appsec
npm run start:fastpurge
npm run start:network-lists
```

## [WARNING] Breaking Changes

### Removed Components
- Performance server (untested, archived)
- Consolidated server variants (replaced by clean modular architecture)
- Emojis in all output (replaced with [SUCCESS], [ERROR], [INFO] markers)

### Migration Guide
If upgrading from v1.6.x:
1. Update Docker image references from `full` to `latest` for development
2. Switch to `modular` variant for production deployments
3. Update any scripts expecting emoji output

## [INFO] Quick Start

### Development Setup
```bash
# Using NPM
npm install -g alecs-mcp-server-akamai@1.7.0
alecs

# Using Docker
docker run -it --env-file .env ghcr.io/acedergren/alecs-mcp-server-akamai:latest
```

### Production Setup
```bash
# Deploy modular architecture
docker-compose -f build/docker/docker-compose.modular.yml up -d
```

## [SUCCESS] What's Next

- v1.8.0: Enhanced reporting with multi-customer dashboards
- v1.9.0: GraphQL API support
- v2.0.0: Full async job queue system

---

For complete details, see [CHANGELOG.md](https://github.com/acedergren/alecs-mcp-server-akamai/blob/v1.7.0/CHANGELOG.md#170---2025-01-30)