# Application Security (WAF) Configuration Tools

This document describes the implementation of Akamai Application Security (APPSEC) configuration tools for the Akamai MCP server.

## Overview

The Application Security tools provide comprehensive WAF policy management, security configuration, and threat protection capabilities for Akamai's APPSEC API.

## Implemented Features

### Basic Application Security Tools

#### 1. Configuration Management
- **`list_appsec_configurations`**: List all Application Security configurations in your account
- **`get_appsec_configuration`**: Get detailed information about a specific Application Security configuration

#### 2. WAF Policy Management
- **`create_waf_policy`**: Create a new WAF security policy with configurable modes (ASE_AUTO, ASE_MANUAL, KRS)

#### 3. Security Events and Monitoring
- **`get_security_events`**: Retrieve security events and attack data for monitoring and analysis

#### 4. Configuration Activation
- **`activate_security_configuration`**: Activate an Application Security configuration to staging or production
- **`get_security_activation_status`**: Get the status of a security configuration activation

## Architecture

### Tool Structure
All Application Security tools follow the standard MCP tool pattern:
```typescript
{
  name: string,
  description: string,
  inputSchema: JSONSchema,
  handler: async function
}
```

### Client Integration
The tools use the `AkamaiClient` class for EdgeGrid authentication and API requests, ensuring consistent authentication and error handling across all tools.

### Error Handling
All tools implement comprehensive error handling with:
- Try/catch blocks for API requests
- Structured error responses with meaningful messages
- Graceful degradation for missing data

## Usage Examples

### List Application Security Configurations
```javascript
{
  "name": "list_appsec_configurations",
  "arguments": {
    "customer": "production"  // Optional: defaults to "default"
  }
}
```

### Create WAF Policy
```javascript
{
  "name": "create_waf_policy",
  "arguments": {
    "configId": 12345,
    "policyName": "Production WAF Policy",
    "policyMode": "ASE_AUTO",
    "paranoidLevel": 3,
    "customer": "production"
  }
}
```

### Get Security Events
```javascript
{
  "name": "get_security_events",
  "arguments": {
    "configId": 12345,
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-01T23:59:59Z",
    "limit": 100,
    "customer": "production"
  }
}
```

### Activate Security Configuration
```javascript
{
  "name": "activate_security_configuration",
  "arguments": {
    "configId": 12345,
    "version": 3,
    "network": "STAGING",
    "note": "Initial deployment",
    "customer": "production"
  }
}
```

## Response Format

All tools return a consistent response format:
```typescript
{
  success: boolean;
  data?: {
    // Tool-specific data
    formatted?: string;  // Human-readable formatted output
  };
  error?: string;
}
```

## Testing

Comprehensive test coverage is provided in `/src/__tests__/appsec-basic-tools-simple.test.ts` including:
- Configuration management tests
- WAF policy creation tests
- Error handling verification
- Tool structure validation

## Future Enhancements

Additional Application Security features that can be implemented:

### Advanced WAF Features
- Custom security rule creation and management
- Rule condition configuration
- Rate limiting policies
- Bot protection settings
- DDoS protection configuration

### Advanced Analytics and Monitoring
- IP reputation management
- Geolocation controls
- Security analytics reports
- Attack pattern analysis
- Machine learning insights

### Security Management
- Real-time security monitoring
- Incident response automation
- SIEM integration
- Security posture assessment
- Compliance reporting

### Threat Intelligence
- Threat intelligence feed subscriptions
- IOC (Indicators of Compromise) management
- Advanced threat hunting capabilities
- Behavioral analysis

## API Integration

The tools integrate with the following Akamai Application Security API endpoints:
- `/appsec/v1/configs` - Configuration management
- `/appsec/v1/configs/{configId}/versions/{version}/security-policies` - WAF policies
- `/appsec/v1/configs/{configId}/security-events` - Security events
- `/appsec/v1/configs/{configId}/versions/{version}/activations` - Activation management

## Security Considerations

- All API requests use EdgeGrid authentication
- Customer isolation through multi-tenant configuration
- Secure parameter validation
- Error messages do not expose sensitive information
- Rate limiting considerations for API requests

## Multi-Customer Support

All tools support multi-customer environments through the optional `customer` parameter:
- Defaults to "default" customer configuration
- Validates customer existence before API calls
- Uses customer-specific EdgeGrid credentials
- Maintains isolation between customer accounts

## Files Structure

```
src/tools/security/
├── appsec-basic-tools-v2.ts          # Main implementation (currently active)
├── appsec-tools.ts.bak               # Advanced tools (future implementation)
├── appsec-advanced-tools.ts.bak      # Advanced features (future implementation)
├── security-management-tools.ts.bak  # Management tools (future implementation)
└── network-lists-*.ts                # Network Lists tools (existing)

src/__tests__/
├── appsec-basic-tools-simple.test.ts # Basic tools tests
└── appsec-tools.test.ts               # Comprehensive tests (future)
```

## Integration Status

✅ **Implemented and Active**:
- Basic Application Security tools
- Configuration management
- WAF policy creation
- Security events retrieval
- Configuration activation
- Comprehensive testing
- MCP server integration

🚧 **Future Implementation**:
- Advanced WAF rule configuration
- Rate limiting and DDoS protection
- Bot protection management
- Security analytics and reporting
- Threat intelligence integration
- Advanced monitoring and alerting

## Configuration

No additional configuration is required beyond the standard Akamai EdgeGrid setup in `.edgerc`. The tools will automatically use the appropriate customer configuration section.