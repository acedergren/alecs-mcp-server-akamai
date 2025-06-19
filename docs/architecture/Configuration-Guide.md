# Configuration Guide

Comprehensive guide to configuring ALECS MCP Server for various deployment scenarios.

## Table of Contents
- [Basic Configuration](#basic-configuration)
- [Multi-Customer Setup](#multi-customer-setup)
- [Advanced Settings](#advanced-settings)
- [Security Configuration](#security-configuration)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)

## Basic Configuration

### Akamai Credentials (.edgerc)

The `.edgerc` file stores your Akamai API credentials. Default location: `~/.edgerc`

#### Basic Structure

```ini
[default]
client_secret = your-client-secret-here
host = your-host.luna.akamaiapis.net
access_token = your-access-token
client_token = your-client-token
max-body = 131072
```

#### Getting Credentials

1. Log in to Akamai Control Center
2. Navigate to Identity & Access Management
3. Create API credentials with required permissions:
   - Property Manager (Read/Write)
   - Edge DNS (Read/Write) 
   - Certificate Provisioning System (Read/Write)

### MCP Server Configuration

#### Claude Desktop (Recommended)

Location: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "node",
      "args": [
        "/path/to/alecs-mcp-server-akamai/dist/index.js"
      ],
      "env": {
        "AKAMAI_EDGERC_PATH": "~/.edgerc",
        "AKAMAI_DEFAULT_SECTION": "default",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Environment Variables

Create `.env` file in project root:

```bash
# Core Settings
AKAMAI_EDGERC_PATH=~/.edgerc
AKAMAI_DEFAULT_SECTION=default

# Logging
LOG_LEVEL=info  # debug, info, warn, error
LOG_FILE=/var/log/alecs/server.log

# API Settings
API_TIMEOUT=30000  # milliseconds
API_RETRY_COUNT=3
API_RETRY_DELAY=1000

# Rate Limiting
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW=1000  # milliseconds

# Activation Polling
ACTIVATION_POLL_INTERVAL=30000
ACTIVATION_MAX_ATTEMPTS=20
```

## Multi-Customer Setup

ALECS supports managing multiple Akamai accounts through `.edgerc` sections.

### Configuration Structure

```ini
# Production Account
[production]
client_secret = prod-secret
host = prod-host.luna.akamaiapis.net
access_token = prod-access-token
client_token = prod-client-token
account-switch-key = PROD-ACCOUNT-KEY

# Staging Account
[staging]
client_secret = stage-secret
host = stage-host.luna.akamaiapis.net
access_token = stage-access-token
client_token = stage-client-token
account-switch-key = STAGE-ACCOUNT-KEY

# Customer Accounts
[customer-acme]
client_secret = acme-secret
host = acme-host.luna.akamaiapis.net
access_token = acme-access-token
client_token = acme-client-token
account-switch-key = ACME-KEY

[customer-globex]
client_secret = globex-secret
host = globex-host.luna.akamaiapis.net
access_token = globex-access-token
client_token = globex-client-token
account-switch-key = GLOBEX-KEY
```

### Using Multiple Customers

Specify customer in commands:

```
# Default account
List all properties

# Specific customer
List all properties for customer customer-acme

# Another customer
Create DNS zone example.com for customer customer-globex
```

### Account Switching Best Practices

1. **Naming Convention**: Use descriptive section names
2. **Permissions**: Ensure each account has appropriate API permissions
3. **Isolation**: Keep customer data separate
4. **Auditing**: Log which account performs each action

## Advanced Settings

### Custom API Endpoints

Override default Akamai API endpoints:

```bash
# Environment variables
AKAMAI_PROPERTY_API_BASE=https://custom-papi.akamai.com
AKAMAI_DNS_API_BASE=https://custom-dns.akamai.com
AKAMAI_CPS_API_BASE=https://custom-cps.akamai.com
```

### Proxy Configuration

For environments requiring proxy:

```bash
# HTTP proxy
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080

# Proxy authentication
HTTP_PROXY=http://user:pass@proxy.company.com:8080

# No proxy for internal
NO_PROXY=localhost,127.0.0.1,.company.internal
```

### Custom Templates

Add custom property templates:

```typescript
// In templates/custom-template.ts
export const customTemplate = {
  name: "custom-app",
  description: "Custom application template",
  rules: {
    // Your rule configuration
  }
};
```

Register in configuration:

```json
{
  "templates": {
    "custom": "/path/to/custom-template.js"
  }
}
```

## Security Configuration

### Credential Security

1. **File Permissions**:
```bash
chmod 600 ~/.edgerc
chmod 700 ~/.config/alecs
```

2. **Credential Rotation**:
- Rotate API credentials every 90 days
- Use separate credentials per environment
- Never commit credentials to version control

3. **Encryption at Rest**:
```bash
# Encrypt .edgerc
openssl enc -aes-256-cbc -salt -in .edgerc -out .edgerc.enc

# Decrypt when needed
openssl enc -d -aes-256-cbc -in .edgerc.enc -out .edgerc
```

### Network Security

1. **IP Allowlisting**:
```bash
# Restrict API access by IP
ALLOWED_IPS=10.0.0.0/8,192.168.0.0/16
```

2. **TLS Configuration**:
```bash
# Minimum TLS version
MIN_TLS_VERSION=1.2

# Custom CA certificates
NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.crt
```

### Audit Logging

Enable comprehensive audit logging:

```bash
# Audit log settings
AUDIT_LOG_ENABLED=true
AUDIT_LOG_PATH=/var/log/alecs/audit.log
AUDIT_LOG_LEVEL=all  # all, changes, errors

# Log retention
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_MAX_SIZE=100M
```

## Performance Tuning

### Connection Pooling

```bash
# HTTP agent settings
HTTP_AGENT_MAX_SOCKETS=50
HTTP_AGENT_MAX_FREE_SOCKETS=10
HTTP_AGENT_TIMEOUT=60000
HTTP_AGENT_KEEPALIVE=true
```

### Caching Configuration

```bash
# API response caching
CACHE_ENABLED=true
CACHE_TTL=300  # seconds
CACHE_MAX_SIZE=100  # MB

# Cache specific endpoints
CACHE_PROPERTIES=true
CACHE_DNS_ZONES=true
CACHE_CERTIFICATES=false  # Don't cache dynamic data
```

### Batch Operations

```bash
# Batch processing
BATCH_SIZE=50
BATCH_CONCURRENT_REQUESTS=5
BATCH_RETRY_FAILED=true
```

### Resource Limits

```bash
# Memory limits
NODE_OPTIONS="--max-old-space-size=4096"

# Process limits
MAX_CONCURRENT_OPERATIONS=10
QUEUE_SIZE=1000
```

## Troubleshooting

### Debug Configuration

Enable detailed debugging:

```bash
# Debug all modules
DEBUG=*

# Debug specific modules
DEBUG=alecs:auth,alecs:api

# Verbose logging
LOG_LEVEL=debug
LOG_INCLUDE_STACK=true
```

### Common Configuration Issues

#### Issue: Authentication Failures

```bash
# Test credentials
curl -X GET https://your-host.luna.akamaiapis.net/papi/v1/contracts \
  -H "Authorization: ..." 

# Check credential format
openssl rand -hex 16  # Should match access_token format
```

#### Issue: Timeout Errors

```bash
# Increase timeouts
API_TIMEOUT=60000
ACTIVATION_POLL_TIMEOUT=300000

# Adjust polling
ACTIVATION_POLL_INTERVAL=60000
```

#### Issue: Rate Limiting

```bash
# Reduce request rate
RATE_LIMIT_REQUESTS=5
RATE_LIMIT_WINDOW=2000

# Add jitter to requests
REQUEST_JITTER=true
REQUEST_JITTER_MAX=1000
```

### Health Checks

Enable health monitoring:

```bash
# Health check endpoint
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PORT=3000
HEALTH_CHECK_PATH=/health

# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090
```

## Configuration Templates

### Minimal Configuration

```bash
# .env.minimal
AKAMAI_EDGERC_PATH=~/.edgerc
AKAMAI_DEFAULT_SECTION=default
```

### Development Configuration

```bash
# .env.development
AKAMAI_EDGERC_PATH=~/.edgerc
AKAMAI_DEFAULT_SECTION=staging
LOG_LEVEL=debug
API_TIMEOUT=60000
CACHE_ENABLED=false
```

### Production Configuration

```bash
# .env.production
AKAMAI_EDGERC_PATH=/secure/credentials/.edgerc
AKAMAI_DEFAULT_SECTION=production
LOG_LEVEL=warn
AUDIT_LOG_ENABLED=true
CACHE_ENABLED=true
RATE_LIMIT_REQUESTS=10
HEALTH_CHECK_ENABLED=true
```

## Best Practices

1. **Environment Separation**: Use different configurations for dev/staging/prod
2. **Credential Management**: Use secret management tools in production
3. **Monitoring**: Enable health checks and metrics
4. **Logging**: Configure appropriate log levels and retention
5. **Backup**: Keep configuration backups
6. **Documentation**: Document custom configurations

## Next Steps

- Set up [Multi-Customer Support](#multi-customer-setup)
- Configure [Security Settings](#security-configuration)
- Optimize [Performance](#performance-tuning)
- Review [Troubleshooting Guide](#troubleshooting)

---

*Last Updated: January 2025*