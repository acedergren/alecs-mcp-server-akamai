# Property Manager Operations Guide

This guide provides comprehensive information for operating and managing Akamai Property Manager functionality within the MCP server.

## Table of Contents

1. [Overview](#overview)
2. [Service Architecture](#service-architecture)
3. [Configuration](#configuration)
4. [Core Operations](#core-operations)
5. [Advanced Features](#advanced-features)
6. [Monitoring and Alerting](#monitoring-and-alerting)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [Security Considerations](#security-considerations)

## Overview

The Property Manager system provides comprehensive CDN configuration management through:

- **Property Management**: Create, configure, and activate CDN properties
- **Version Control**: Manage property versions with rollback capabilities
- **Hostname Management**: Configure edge hostnames and certificate integration
- **Rule Tree Management**: Advanced rule configuration with validation
- **Activation Management**: Deploy configurations to staging and production

### Key Features

- Multi-customer support with complete isolation
- Property version management and comparison
- Bulk operations for large-scale management
- Intelligent hostname recommendations
- Certificate enrollment and management
- Rule tree validation and optimization
- Comprehensive activation workflows

## Service Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │────│ Property Tools   │────│ Version Manager │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                │                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Monitoring    │────│ Property Service │────│Hostname Manager │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Alerting      │    │   Akamai PAPI   │    │ Certificate Mgmt│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Responsibilities

- **Property Tools**: MCP protocol interface and parameter validation
- **Property Service**: Akamai PAPI integration and business logic
- **Version Manager**: Property version lifecycle and comparison
- **Hostname Manager**: Edge hostname provisioning and optimization
- **Certificate Management**: SSL/TLS certificate enrollment and validation
- **Monitoring**: Health monitoring, metrics collection, and alerting

## Configuration

### Environment Variables

```bash
# Required: Akamai EdgeGrid credentials
AKAMAI_CLIENT_TOKEN=your_client_token
AKAMAI_CLIENT_SECRET=your_client_secret
AKAMAI_ACCESS_TOKEN=your_access_token
AKAMAI_HOST=your_akamai_host

# Optional: Property Manager configuration
PAPI_RULE_FORMAT=v2023-01-05        # Latest rule format
PAPI_VALIDATION_MODE=strict         # strict|warnings|none
PAPI_ACTIVATION_TIMEOUT=3600000     # 1 hour in milliseconds
PAPI_BATCH_SIZE=50                  # Operations per batch

# Optional: Certificate configuration
CPS_DV_AUTO_ENROLL=true            # Auto-enroll Default DV certificates
CPS_VALIDATION_TIMEOUT=300000      # 5 minutes for validation
CPS_ENHANCED_TLS_DEFAULT=true      # Use Enhanced TLS by default

# Optional: Monitoring configuration
PROPERTY_MONITOR_INTERVAL=300000   # 5 minutes
ACTIVATION_POLL_INTERVAL=30000     # 30 seconds
HEALTH_CHECK_ENABLED=true
```

### .edgerc Configuration

```ini
[default]
client_token = your_client_token
client_secret = your_client_secret
access_token = your_access_token
host = your_akamai_host

[customer1]
client_token = customer1_client_token
client_secret = customer1_client_secret
access_token = customer1_access_token
host = customer1_akamai_host
account_switch_key = customer1_account_key

[testing]
client_token = testing_client_token
client_secret = testing_client_secret
access_token = testing_access_token
host = testing_akamai_host
```

## Core Operations

### Property Creation

#### Basic Property Creation

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_create" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyName": "example-com-property",
    "productId": "prd_fresca",
    "contractId": "ctr_C-1234567",
    "groupId": "grp_12345",
    "customer": "customer1"
  }'
```

#### Secure Property Creation with DV Certificate

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_secure_onboard" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyName": "secure-example-com",
    "hostnames": ["www.example.com", "example.com"],
    "originHostname": "origin.example.com",
    "contractId": "ctr_C-1234567",
    "groupId": "grp_12345",
    "customer": "customer1"
  }'
```

### Property Configuration

#### Get Property Rules

```bash
curl -X GET "http://localhost:3000/mcp/tools/property_get_rules" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prp_12345",
    "version": 1,
    "customer": "customer1"
  }'
```

#### Update Property Rules

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_update_rules" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prp_12345",
    "contractId": "ctr_C-1234567",
    "groupId": "grp_12345",
    "rules": {
      "name": "default",
      "criteria": [],
      "behaviors": [
        {
          "name": "origin",
          "options": {
            "originType": "CUSTOMER",
            "hostname": "origin.example.com",
            "forwardHostHeader": "REQUEST_HOST_HEADER"
          }
        },
        {
          "name": "cpCode",
          "options": {
            "value": {
              "id": 12345
            }
          }
        }
      ],
      "children": []
    },
    "customer": "customer1"
  }'
```

### Hostname Management

#### Add Hostname to Property

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_add_hostname" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prp_12345",
    "hostname": "www.example.com",
    "edgeHostname": "www.example.com.edgesuite.net",
    "customer": "customer1"
  }'
```

#### Generate Edge Hostname Recommendations

```bash
curl -X POST "http://localhost:3000/mcp/tools/hostname_generate_recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "hostnames": ["www.example.com", "api.example.com"],
    "forceSecure": true,
    "customer": "customer1"
  }'
```

### Property Activation

#### Activate to Staging

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_activate" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prp_12345",
    "network": "STAGING",
    "note": "Staging deployment for testing",
    "notifyEmails": ["dev-team@example.com"],
    "customer": "customer1"
  }'
```

#### Activate to Production with Monitoring

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_activate_with_monitoring" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prp_12345",
    "network": "PRODUCTION",
    "note": "Production deployment v2.1",
    "options": {
      "validateFirst": true,
      "waitForCompletion": true,
      "maxWaitTime": 1800000,
      "notifyEmails": ["ops-team@example.com"]
    },
    "customer": "customer1"
  }'
```

### Version Management

#### Create New Version

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_create_version" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prp_12345",
    "baseVersion": 1,
    "note": "Adding caching rules for API endpoints",
    "customer": "customer1"
  }'
```

#### Compare Versions

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_compare_versions" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prp_12345",
    "version1": 1,
    "version2": 2,
    "compareType": "all",
    "includeDetails": true,
    "customer": "customer1"
  }'
```

## Advanced Features

### Bulk Operations

#### Bulk Property Activation

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_bulk_activate" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyIds": ["prp_12345", "prp_67890", "prp_11111"],
    "network": "STAGING",
    "note": "Batch staging deployment",
    "acknowledgeAllWarnings": true,
    "waitForCompletion": false,
    "customer": "customer1"
  }'
```

#### Bulk Hostname Management

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_bulk_manage_hostnames" \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "propertyId": "prp_12345",
        "action": "add",
        "hostnames": [
          {
            "hostname": "new.example.com",
            "edgeHostname": "new.example.com.edgekey.net"
          }
        ]
      },
      {
        "propertyId": "prp_67890",
        "action": "remove",
        "hostnames": [
          {
            "hostname": "old.example.com"
          }
        ]
      }
    ],
    "createNewVersion": true,
    "note": "Hostname management batch update",
    "customer": "customer1"
  }'
```

### Rule Tree Management

#### Validate Rule Tree

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_validate_rules" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prp_12345",
    "includeOptimizations": true,
    "includeStatistics": true,
    "customer": "customer1"
  }'
```

#### Apply Rule Patches

```bash
curl -X POST "http://localhost:3000/mcp/tools/property_patch_rules" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prp_12345",
    "propertyVersion": 2,
    "contractId": "ctr_C-1234567",
    "groupId": "grp_12345",
    "patches": [
      {
        "op": "add",
        "path": "/rules/behaviors/-",
        "value": {
          "name": "caching",
          "options": {
            "behavior": "MAX_AGE",
            "mustRevalidate": false,
            "ttl": "7d"
          }
        }
      }
    ],
    "validateRules": true,
    "customer": "customer1"
  }'
```

### Certificate Management

#### Create DV Enrollment

```bash
curl -X POST "http://localhost:3000/mcp/tools/certificate_create_dv_enrollment" \
  -H "Content-Type: application/json" \
  -d '{
    "commonName": "www.example.com",
    "sans": ["example.com", "api.example.com"],
    "adminContact": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "admin@example.com",
      "phone": "+1-555-123-4567"
    },
    "techContact": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "tech@example.com",
      "phone": "+1-555-987-6543"
    },
    "contractId": "ctr_C-1234567",
    "enhancedTLS": true,
    "customer": "customer1"
  }'
```

#### Get DV Validation Challenges

```bash
curl -X GET "http://localhost:3000/mcp/tools/certificate_get_dv_challenges" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentId": 12345,
    "customer": "customer1"
  }'
```

## Monitoring and Alerting

### Health Checks

```bash
# Overall property system health
curl -X GET "http://localhost:3000/health/property"

# Property activation health
curl -X GET "http://localhost:3000/health/property/activation"

# Certificate system health
curl -X GET "http://localhost:3000/health/property/certificates"

# Hostname management health
curl -X GET "http://localhost:3000/health/property/hostnames"
```

### Key Metrics

#### Property Metrics
- `property.total`: Total number of properties
- `property.active`: Number of active properties
- `property.activations.pending`: Pending activations
- `property.activations.success_rate`: Activation success rate
- `property.versions.total`: Total property versions

#### Performance Metrics
- `property.activation.average_time`: Average activation time
- `property.activation.time_p95`: 95th percentile activation time
- `property.api.response_time`: API response time
- `property.api.success_rate`: API success rate

#### Certificate Metrics
- `certificate.enrollments.total`: Total enrollments
- `certificate.enrollments.pending`: Pending enrollments
- `certificate.validation.success_rate`: Validation success rate
- `certificate.validation.average_time`: Average validation time

### Alerts

#### Critical Alerts
- **Activation Failure**: When property activation fails
- **Certificate Validation Failure**: When DV validation fails
- **API Unavailable**: When PAPI becomes unavailable
- **High Error Rate**: When API error rate exceeds 10%

#### Warning Alerts
- **Slow Activation**: When activation takes longer than 30 minutes
- **Certificate Expiring**: When certificates expire within 30 days
- **High API Latency**: When API response time exceeds 5 seconds
- **Validation Warnings**: When property validation has warnings

## Troubleshooting

### Common Issues

#### Property Activation Failures

**Symptoms:**
- Activation stuck in "PENDING" state
- Activation fails with validation errors
- Unexpected activation timeouts

**Diagnosis:**
```bash
# Check activation status
curl -X GET "http://localhost:3000/mcp/tools/property_get_activation_status" \
  -d '{"propertyId": "prp_12345", "activationId": "atv_12345", "customer": "customer1"}'

# Get validation errors
curl -X GET "http://localhost:3000/mcp/tools/property_get_validation_errors" \
  -d '{"propertyId": "prp_12345", "version": 2, "contractId": "ctr_C-1234567", "groupId": "grp_12345", "customer": "customer1"}'
```

**Solutions:**
1. Check for validation errors and warnings
2. Verify rule tree structure and syntax
3. Ensure all required behaviors are present
4. Check hostname and certificate configuration

#### Certificate Validation Issues

**Symptoms:**
- DV validation challenges not completing
- Certificate enrollment stuck in "pending" state
- DNS validation failures

**Diagnosis:**
```bash
# Check DV challenges
curl -X GET "http://localhost:3000/mcp/tools/certificate_get_dv_challenges" \
  -d '{"enrollmentId": 12345, "customer": "customer1"}'

# Check enrollment status
curl -X GET "http://localhost:3000/mcp/tools/certificate_check_enrollment_status" \
  -d '{"enrollmentId": 12345, "customer": "customer1"}'
```

**Solutions:**
1. Verify DNS records for domain validation
2. Check domain ownership and control
3. Ensure proper DNS propagation
4. Contact Akamai support for certificate issues

#### Hostname Configuration Problems

**Symptoms:**
- Edge hostname creation failures
- Hostname conflicts between properties
- Certificate assignment issues

**Diagnosis:**
```bash
# Analyze hostname conflicts
curl -X POST "http://localhost:3000/mcp/tools/hostname_analyze_conflicts" \
  -d '{"targetHostnames": ["www.example.com"], "customer": "customer1"}'

# Check edge hostname status
curl -X GET "http://localhost:3000/mcp/tools/property_list_edge_hostnames" \
  -d '{"contractId": "ctr_C-1234567", "groupId": "grp_12345", "customer": "customer1"}'
```

**Solutions:**
1. Use hostname discovery tool to identify conflicts
2. Generate edge hostname recommendations
3. Ensure proper certificate coverage
4. Review wildcard hostname usage

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
export LOG_LEVEL=debug
export PROPERTY_DEBUG=true
export PAPI_DEBUG=true

# Start server with debug logging
npm run dev
```

## Best Practices

### Property Organization

1. **Naming Conventions**
   ```
   {environment}-{domain}-{purpose}
   prod-example-com-main
   staging-api-example-com
   dev-cdn-example-com
   ```

2. **Version Management**
   - Always create new versions for changes
   - Use descriptive version notes
   - Test on staging before production
   - Keep production versions documented

3. **Rule Tree Structure**
   - Use logical rule organization
   - Implement consistent naming patterns
   - Document complex rule logic
   - Regular rule tree optimization

### Security Best Practices

1. **Access Control**
   - Separate credentials per environment
   - Use least-privilege access
   - Regular credential rotation
   - Monitor API usage

2. **Certificate Management**
   - Use Enhanced TLS for production
   - Monitor certificate expiration
   - Automate renewal processes
   - Validate certificate coverage

### Performance Optimization

1. **Activation Management**
   - Batch similar operations
   - Use staging for testing
   - Monitor activation performance
   - Plan maintenance windows

2. **API Usage**
   - Implement proper rate limiting
   - Use connection pooling
   - Cache frequently accessed data
   - Monitor API quotas

## Security Considerations

### Credential Protection

1. **EdgeGrid Security**
   ```bash
   # Store credentials securely
   export AKAMAI_CLIENT_TOKEN=$(vault kv get -field=token secret/akamai)
   
   # Use secure file permissions
   chmod 600 ~/.edgerc
   ```

2. **Account Isolation**
   - Separate accounts per customer
   - Use account switch keys properly
   - Monitor cross-account access
   - Audit account usage

### Data Protection

1. **Property Configuration**
   - Encrypt sensitive configuration data
   - Sanitize logs and outputs
   - Protect customer metadata
   - Implement data retention policies

2. **Certificate Security**
   - Secure private key handling
   - Monitor certificate usage
   - Implement proper key rotation
   - Audit certificate access

### Compliance

1. **Audit Logging**
   ```typescript
   // Log all property operations
   auditLogger.log({
     customer: 'customer1',
     operation: 'property_activate',
     propertyId: 'prp_12345',
     network: 'PRODUCTION',
     user: 'api_user',
     timestamp: new Date(),
     result: 'success'
   });
   ```

2. **Data Governance**
   - Follow customer data policies
   - Implement secure deletion
   - Maintain compliance documentation
   - Regular security assessments

---

This operations guide provides comprehensive information for successfully deploying, operating, and maintaining the Property Manager system in production environments. For additional support, refer to the troubleshooting section or contact the development team.