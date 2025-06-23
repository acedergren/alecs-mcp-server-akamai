# Secure Hostname Onboarding Tool - Demo Guide

The Secure Hostname Onboarding tool provides a comprehensive, guided workflow for onboarding hostnames with enterprise-grade security features. This tool simplifies the complex process of setting up Akamai properties with intelligent certificate selection, optional DNS migration, and security configuration.

## Features

- **Intelligent Certificate Selection**: Automatically detects and recommends the best certificate option (DefaultDV, DV SAN SNI)
- **Step-by-Step Guidance**: Interactive workflow that asks minimal questions
- **Smart Defaults**: Automatically selects optimal products and configurations
- **DNS Migration Support**: Optional migration of DNS to Akamai
- **Security Configuration**: Sets up WAF policies in alert mode
- **Progress Tracking**: Maintains state to resume interrupted onboarding

## Usage Examples

### 1. Getting Started - Help

```json
{
  "operation": "help"
}
```

This displays all available operations and guidance on how to use the tool.

### 2. Start New Onboarding

Begin the onboarding process with minimal information:

```json
{
  "operation": "start",
  "hostname": "www.example.com"
}
```

The tool will guide you through providing additional required information:
- Origin hostname
- Contract ID
- Group ID

### 3. Complete Onboarding with All Parameters

For a fully automated setup:

```json
{
  "operation": "start",
  "hostname": "www.example.com",
  "additionalHostnames": ["example.com", "api.example.com"],
  "originHostname": "origin.example.com",
  "contractId": "ctr_1-ABC123",
  "groupId": "grp_12345",
  "certificateType": "auto",
  "securityLevel": "standard",
  "migrateDNS": false
}
```

### 4. Check Requirements

Verify prerequisites before starting:

```json
{
  "operation": "check-requirements",
  "hostname": "www.example.com",
  "contractId": "ctr_1-ABC123"
}
```

### 5. Setup Property

Create and configure the Akamai property:

```json
{
  "operation": "setup-property",
  "hostname": "www.example.com",
  "originHostname": "origin.example.com",
  "contractId": "ctr_1-ABC123",
  "groupId": "grp_12345",
  "certificateType": "default-dv",
  "securityLevel": "standard",
  "confirmAction": true
}
```

### 6. Configure DNS

#### Option A: Just Get CNAME Instructions

```json
{
  "operation": "configure-dns",
  "hostname": "www.example.com",
  "migrateDNS": false,
  "propertyId": "prp_123456"
}
```

#### Option B: Full DNS Migration

```json
{
  "operation": "configure-dns",
  "hostname": "www.example.com",
  "migrateDNS": true,
  "currentNameservers": ["ns1.current-dns.com", "ns2.current-dns.com"],
  "confirmAction": true,
  "propertyId": "prp_123456"
}
```

### 7. Configure Security

Set up WAF and security policies:

```json
{
  "operation": "configure-security",
  "propertyId": "prp_123456",
  "securityLevel": "standard"
}
```

Security levels:
- `basic`: Standard Akamai protections only
- `standard`: WAF in alert mode (recommended)
- `enhanced`: WAF with App & API Protector
- `custom`: Custom security configuration

### 8. Check Status

Monitor the onboarding progress:

```json
{
  "operation": "status",
  "propertyId": "prp_123456"
}
```

## Certificate Types

The tool supports multiple certificate options:

- **default-dv**: Secure by Default (DefaultDV) - Instant HTTPS with automatic provisioning
- **dv-san-sni**: Standard DV SAN with SNI - Requires DNS validation
- **third-party**: Use existing third-party certificate
- **auto**: Let the tool recommend based on your setup

## Security Levels

Choose the appropriate security level for your needs:

### Basic
- DDoS protection
- Rate limiting
- Geographic controls
- No additional WAF configuration

### Standard (Recommended)
- All basic protections
- WAF in alert mode
- OWASP Top 10 protection
- SQL injection detection
- XSS prevention
- Command injection blocking

### Enhanced
- All standard protections
- Advanced bot detection
- API rate limiting
- Behavioral analysis
- Custom rule creation
- Real-time threat intelligence

## Complete Workflow Example

Here's a complete onboarding workflow:

```bash
# 1. Start the onboarding
{
  "operation": "start",
  "hostname": "shop.example.com",
  "additionalHostnames": ["example.com", "api.example.com"],
  "originHostname": "origin.example.com",
  "contractId": "ctr_1-ABC123",
  "groupId": "grp_12345"
}

# 2. Setup the property (after reviewing recommendations)
{
  "operation": "setup-property",
  "hostname": "shop.example.com",
  "additionalHostnames": ["example.com", "api.example.com"],
  "originHostname": "origin.example.com",
  "contractId": "ctr_1-ABC123",
  "groupId": "grp_12345",
  "certificateType": "default-dv",
  "securityLevel": "standard",
  "confirmAction": true
}

# 3. Configure DNS (if not migrating)
{
  "operation": "configure-dns",
  "hostname": "shop.example.com",
  "propertyId": "prp_789012",
  "migrateDNS": false
}

# 4. Activate to staging
{
  "operation": "activate",
  "propertyId": "prp_789012",
  "network": "staging"
}

# 5. Check status
{
  "operation": "status",
  "propertyId": "prp_789012"
}
```

## Tips and Best Practices

1. **Start Simple**: Begin with just the hostname and let the tool guide you
2. **Use Auto Certificate Selection**: The tool will recommend the best certificate type
3. **Test on Staging First**: Always activate to staging before production
4. **Monitor Security Logs**: After enabling WAF, monitor logs before switching to blocking mode
5. **Save Property ID**: Keep the property ID for resuming or checking status

## Error Recovery

If the onboarding process is interrupted:

1. Use the `status` operation with your property ID to check progress
2. The tool maintains state and will show completed steps
3. Continue from where you left off using the appropriate operation

## Multi-Customer Support

For multi-tenant setups, add the `customer` parameter:

```json
{
  "operation": "start",
  "hostname": "www.example.com",
  "customer": "customer-section-name"
}
```