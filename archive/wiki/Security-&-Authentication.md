# Security & Authentication

ALECS implements defense-in-depth security with multiple layers of protection for enterprise deployments.

## Table of Contents
- [Authentication Methods](#authentication-methods)
- [Token Management](#token-management)
- [Security Features](#security-features)
- [Best Practices](#best-practices)
- [Threat Model](#threat-model)

## Authentication Methods

### 1. Bearer Token Authentication

ALECS uses cryptographically secure bearer tokens for API authentication:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/jsonrpc
```

**Token Properties:**
- 256-bit cryptographic strength
- Configurable expiration
- Rotation support
- Revocation capability

### 2. EdgeRC Authentication

For Akamai API access, ALECS uses EdgeGrid authentication:

```ini
[default]
client_secret = your-secret
host = your-host.luna.akamaiapis.net
access_token = your-access-token
client_token = your-client-token
```

**Security Notes:**
- File permissions: `chmod 600 ~/.edgerc`
- Environment-specific sections
- Credential rotation support

## Token Management

### Generating Tokens

Use the MCP tool:
```
Generate an API token with 30-day expiration for production access
```

Or via CLI:
```bash
alecs token generate --description "Production API" --expires 30d
```

### Token Operations

**List Active Tokens:**
```
List all active API tokens
```

**Rotate Token:**
```
Rotate token tok_abc123
```

**Revoke Token:**
```
Revoke token tok_abc123
```

### Token Storage

Tokens are stored with AES-256-GCM encryption:

```
.tokens/
├── tok_abc123.json (encrypted)
├── tok_def456.json (encrypted)
└── ...
```

## Security Features

### 1. Rate Limiting

Protection against abuse:
- **Default**: 100 requests/minute/token
- **Configurable** per token or globally
- **Headers**: X-RateLimit-* headers

```typescript
// Configuration
RATE_LIMIT_WINDOW=60000  // 1 minute
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Security Headers

All responses include security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### 3. Audit Logging

Comprehensive security event logging:

```json
{
  "type": "AUTH_SUCCESS",
  "timestamp": "2024-01-01T00:00:00Z",
  "tokenId": "tok_abc123",
  "ip": "192.168.1.1",
  "userAgent": "MCP-Client/1.0",
  "path": "/jsonrpc",
  "method": "POST"
}
```

### 4. Input Validation

All inputs validated with JSON Schema:
- Parameter type checking
- Range validation
- Format validation
- Injection prevention

## Best Practices

### 1. Token Security

**DO:**
- Store tokens securely
- Use environment variables
- Rotate tokens regularly
- Monitor token usage

**DON'T:**
- Commit tokens to git
- Share tokens
- Use tokens in URLs
- Log token values

### 2. Network Security

**Recommended Setup:**
```
┌──────────┐     HTTPS    ┌─────────┐     Private    ┌─────────┐
│  Client  │─────────────▶│ Reverse │───────────────▶│  ALECS  │
│          │              │  Proxy  │                │ Server  │
└──────────┘              └─────────┘                └─────────┘
```

**Configuration:**
- Use HTTPS/TLS
- Implement firewall rules
- Network segmentation
- VPN for remote access

### 3. Credential Management

**EdgeRC Security:**
```bash
# Secure storage
chmod 600 ~/.edgerc

# Separate environments
~/.edgerc
~/.edgerc.staging
~/.edgerc.production

# Rotation schedule
- Production: 90 days
- Staging: 180 days
- Development: 365 days
```

### 4. Multi-Customer Security

**Isolation Principles:**
- Separate EdgeRC sections
- Customer-specific tokens
- Audit trail per customer
- No cross-customer access

## Threat Model

### 1. External Threats

**Threat**: Unauthorized API access
**Mitigation**: Token authentication, rate limiting

**Threat**: Token theft
**Mitigation**: Token expiration, rotation, revocation

**Threat**: DDoS attacks
**Mitigation**: Rate limiting, monitoring, alerting

### 2. Internal Threats

**Threat**: Credential exposure
**Mitigation**: Encryption at rest, access controls

**Threat**: Privilege escalation
**Mitigation**: Least privilege, audit logging

**Threat**: Data leakage
**Mitigation**: Response sanitization, secure logging

### 3. Supply Chain

**Threat**: Dependency vulnerabilities
**Mitigation**: Regular updates, security scanning

**Threat**: Compromised packages
**Mitigation**: Lock files, integrity checks

## Security Monitoring

### 1. Log Analysis

Monitor for security events:
```bash
# Failed authentications
grep "AUTH_FAILURE" alecs.log | tail -20

# Rate limit violations
grep "RATE_LIMIT_EXCEEDED" alecs.log | tail -20

# Unusual patterns
grep "SECURITY_EVENT" alecs.log | awk '{print $4}' | sort | uniq -c
```

### 2. Metrics

Key security metrics:
- Authentication success/failure rate
- Rate limit violations
- Token usage patterns
- API error rates

### 3. Alerts

Configure alerts for:
- Multiple auth failures
- Unusual token usage
- Rate limit spikes
- Error rate increases

## Incident Response

### 1. Token Compromise

If a token is compromised:
1. Revoke immediately: `alecs token revoke <token-id>`
2. Audit usage: Check logs for unauthorized access
3. Rotate related credentials
4. Notify affected users

### 2. Credential Exposure

If EdgeRC exposed:
1. Rotate Akamai credentials immediately
2. Update all ALECS instances
3. Audit Akamai API usage
4. Review access logs

### 3. Security Updates

Stay secure:
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Security audit
npm audit
```

## Compliance

### Data Protection

- No PII storage
- Encrypted credentials
- Secure token storage
- Audit trail retention

### Access Control

- Token-based authentication
- Role-based permissions (future)
- Customer isolation
- Audit logging

## Security Checklist

### Deployment
- [ ] HTTPS enabled
- [ ] Firewall configured
- [ ] Rate limiting active
- [ ] Monitoring enabled

### Configuration
- [ ] Strong master key set
- [ ] EdgeRC permissions 600
- [ ] Token expiration configured
- [ ] Audit logging enabled

### Operations
- [ ] Regular token rotation
- [ ] Credential rotation schedule
- [ ] Security updates applied
- [ ] Logs monitored

---

Next: [[Troubleshooting]] | [[Best Practices]]