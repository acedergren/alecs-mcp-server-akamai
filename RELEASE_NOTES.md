# ALECS MCP Server - Release Notes

## Release v1.7.4 - Security Hardening Release

### 🔒 Security Enhancements

#### Automatic Security Setup
- **NEW**: Post-install script automatically configures secure defaults
  - Generates cryptographically secure `TOKEN_MASTER_KEY` using `crypto.randomBytes(32)`
  - Creates `.env` file with production-ready security settings
  - Sets restrictive file permissions (600 for `.env`, 700 for `.tokens/`)
  - Validates `.edgerc` permissions and provides remediation steps

#### Critical Security Fixes
- **FIXED**: Weak master key generation - now requires secure key or generates one automatically
- **FIXED**: Missing authentication in SSE transport - auth now enforced by default
- **FIXED**: Credentials no longer logged in debug mode
- **FIXED**: TLS/SSL now enforced by default (`FORCE_TLS=true`)
- **FIXED**: Debug endpoints disabled by default in production
- **FIXED**: Rate limiting enabled by default (60 req/min, 1000 req/hour)

#### Security Configuration
- **NEW**: Comprehensive `.env.example` with security-focused defaults
- **NEW**: Security checklist displayed during installation
- **NEW**: Automatic detection and warning for insecure configurations
- **NEW**: IP whitelist support for additional access control
- **NEW**: Session timeout configuration

### 📚 Documentation Improvements

#### NPM Package Variants
- **NEW**: Comprehensive guide for using modular servers (`docs/npm-variants-guide.md`)
- **NEW**: Clear CLI interface with `alecs start:property`, `alecs start:dns`, etc.
- **NEW**: Improved `--help` output showing all available server variants
- **FIXED**: CLI wrapper now properly handles all start: commands

#### Architecture Documentation
- **NEW**: Remote authentication design guide
- **NEW**: Security audit findings and remediation steps
- **NEW**: Simple .edgerc remote auth patterns

### 🛠️ Technical Improvements

#### CLI Enhancements
- **NEW**: `alecs-cli-wrapper.ts` for intuitive command routing
- **NEW**: Support for modular server commands:
  ```bash
  alecs start:property   # Property management only
  alecs start:dns        # DNS management only
  alecs start:certs      # Certificate management only
  alecs start:reporting  # Reporting only
  alecs start:security   # Security/WAF only
  ```
- **IMPROVED**: Help text with examples and environment variables

#### Build & Distribution
- **NEW**: `publish-all-versions.sh` script to verify NPM publishing status
- **FIXED**: Package.json includes all necessary files for distribution
- **FIXED**: Proper shebang in CLI wrapper for Unix compatibility

### 🔧 Configuration Changes

#### New Environment Variables
```bash
# Security (enabled by default)
FORCE_TLS=true
REQUIRE_AUTHENTICATION=true
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOG=true

# Limits
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
MAX_CONNECTIONS_PER_IP=10
SESSION_TIMEOUT=30

# Development only
SKIP_AUTH=false
VERBOSE_ERRORS=false
ALLOW_INSECURE=false
```

### 🚀 Upgrade Instructions

1. **Update the package**:
   ```bash
   npm update -g alecs-mcp-server-akamai
   # or
   npm install -g alecs-mcp-server-akamai@1.7.4
   ```

2. **Security setup runs automatically**, but verify:
   ```bash
   # Check file permissions
   ls -la ~/.edgerc    # Should be 600
   ls -la .env         # Should be 600
   ls -la .tokens/     # Should be 700
   ```

3. **Review your .env file** for the new security settings

4. **For remote deployments**, ensure `FORCE_TLS=true` and proper authentication

### ⚠️ Breaking Changes

- **Default behavior**: Authentication and TLS are now enabled by default
- **Debug mode**: Debug endpoints are disabled by default (set `ENABLE_DEBUG_ENDPOINTS=true` for development)
- **Rate limiting**: Enabled by default, may affect high-volume automated usage

### 🐛 Bug Fixes

- Fixed missing imports in WebSocket transport authentication
- Fixed TypeScript error in CLI wrapper
- Fixed file permission issues on Windows
- Improved error handling for missing credentials

### 📈 Performance

- No significant performance impact from security enhancements
- Rate limiting uses efficient in-memory storage
- Token validation adds <1ms overhead per request

### 📊 Statistics

- **Security fixes**: 15+
- **New security features**: 10+
- **Documentation additions**: 4 new guides
- **Test coverage**: Maintained at 85%+

---

## Release v1.7.0 - Intelligent DNS Operations & Production-Ready Infrastructure

### 🎯 Major Features

#### DNS Operations Revolution
- **Intelligent DNS Operations**: Enhanced `upsertRecord()` with automatic ADD vs EDIT detection
- **DNS Delegation Workflow**: New `delegateSubzone()` function for complete delegation workflows  
- **Automatic Changelist Management**: Phantom/empty changelist cleanup and force mode options
- **Professional Compliance**: Complete removal of emojis from codebase (32 files updated)

#### Production Infrastructure
- **NPM Package Fixed**: Direct `npm install -g alecs-mcp-server-akamai` now works correctly
- **Public Docker Registry**: All images now available at `ghcr.io/acedergren/alecs-mcp-server-akamai`
- **Modular Architecture Focus**: Optimized for microservices deployment

### 📦 Installation & Deployment

#### NPM Installation (Fixed!)
```bash
# Global installation now works correctly
npm install -g alecs-mcp-server-akamai@1.7.0

# Run the server
alecs
```

#### Docker Images (Public Registry)
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

### 🏗️ Architecture Changes

#### Why Modular?
We've shifted focus to modular deployments for production environments:

1. **Resource Efficiency**: Each service runs independently with minimal memory footprint
2. **Fault Isolation**: Service failures don't affect other components
3. **Scalability**: Scale individual services based on demand
4. **Security**: Smaller attack surface per service

#### Server Variants Explained
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
  - SIEM Server (port 3018)
- **`minimal`**: Testing server with 3 core tools
- **`websocket`/`sse`**: Remote access variants

### 👨‍💻 Developer Experience

#### DNS Without the Pain
```typescript
// Before: Multiple API calls, changelist management, error handling
// After: One simple call
await delegateSubzone(client, {
  zone: "subdomain.example.com",
  nameservers: ["ns1.provider.com", "ns2.provider.com"],
  provider: "CloudProvider"
});
```

#### Consistent NPM Scripts
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
npm run start:siem
```

### ⚠️ Breaking Changes

#### Removed Components
- Performance server (untested, archived)
- Consolidated server variants (replaced by clean modular architecture)
- Emojis in all output (replaced with [SUCCESS], [ERROR], [INFO] markers)

#### Migration Guide
If upgrading from v1.6.x:
1. Update Docker image references from `full` to `latest` for development
2. Switch to `modular` variant for production deployments
3. Update any scripts expecting emoji output

### 🚀 Quick Start

#### Development Setup
```bash
# Using NPM
npm install -g alecs-mcp-server-akamai@1.7.0
alecs

# Using Docker
docker run -it --env-file .env ghcr.io/acedergren/alecs-mcp-server-akamai:latest
```

#### Production Setup
```bash
# Deploy modular architecture
docker-compose -f build/docker/docker-compose.modular.yml up -d
```

---

## Roadmap

### What's Next
- **v1.8.0**: Enhanced reporting with multi-customer dashboards
- **v1.9.0**: GraphQL API support
- **v2.0.0**: Full async job queue system

---

## Links

- **Full Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Security Advisory**: Users running previous versions in production should upgrade immediately to benefit from these security enhancements
- **Documentation**: [docs/README.md](./docs/README.md)
- **Docker Images**: [ghcr.io/acedergren/alecs-mcp-server-akamai](https://ghcr.io/acedergren/alecs-mcp-server-akamai)

---

## Support

For issues and support:
- [GitHub Issues](https://github.com/acedergren/alecs-mcp-server-akamai/issues)
- [Security Issues](./SECURITY.md)
- [Contributing Guide](./CONTRIBUTING.md)