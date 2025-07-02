# Release Notes - v1.7.4

## 🔒 Security Hardening Release

This release focuses on comprehensive security improvements based on a thorough security audit, along with improved documentation for NPM package variants.

### 🚨 Security Enhancements

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

### 🙏 Acknowledgments

Thanks to the security audit that identified these improvements. Security is an ongoing process, and we welcome responsible disclosure of any issues.

### 📊 Statistics

- **Security fixes**: 15+
- **New security features**: 10+
- **Documentation additions**: 4 new guides
- **Test coverage**: Maintained at 85%+

---

**Full Changelog**: [v1.7.3...v1.7.4](https://github.com/acedergren/alecs-mcp-server-akamai/compare/v1.7.3...v1.7.4)

**Security Advisory**: Users running previous versions in production should upgrade immediately to benefit from these security enhancements.