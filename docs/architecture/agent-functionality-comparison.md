# Agent Functionality Comparison

## Overview

The Akamai MCP Server includes two specialized agents for property management workflows. This
document outlines the key differences between the Property Onboarding Agent and the Property
Production Activation Agent.

## Property Onboarding Agent

**Purpose**: Automates the complete workflow for onboarding new properties to Akamai CDN

### Key Features:

- **Full Property Creation**: Creates new properties from scratch
- **Edge Hostname Setup**: Automatically creates edge hostnames with Enhanced TLS
- **DNS Configuration**: Sets up DNS zones and CNAME records
- **CP Code Creation**: Creates CP codes for traffic categorization
- **Origin Configuration**: Configures origin servers and caching rules
- **Certificate Management**: Sets up Default DV certificates
- **Initial Activation**: Activates to staging network for testing

### Typical Workflow:

1. Check if property already exists
2. Create property with appropriate product configuration
3. Create CP Code for traffic categorization
4. Create edge hostname with Enhanced TLS
5. Configure property rules (origin, caching, etc.)
6. Add hostname to property
7. Activate to staging network
8. Set up DNS CNAME records (optional)

### Configuration Options:

```typescript
interface OnboardingConfig {
  hostname: string; // Required: Domain to onboard
  originHostname?: string; // Origin server hostname
  contractId?: string; // Akamai contract ID
  groupId?: string; // Akamai group ID
  productId?: string; // Product ID (e.g., prd_Fresca)
  cpCodeId?: string; // Existing CP code (if any)
  network?: 'STANDARD_TLS' | 'ENHANCED_TLS' | 'SHARED_CERT';
  certificateType?: 'DEFAULT' | 'CPS_MANAGED';
  customer?: string; // Multi-tenant customer ID
  notificationEmails?: string[]; // Activation notification emails
  skipDnsSetup?: boolean; // Skip DNS configuration
  dnsProvider?: string; // External DNS provider
  useCase?: 'web-app' | 'api' | 'download' | 'streaming' | 'basic-web';
}
```

## Property Production Activation Agent

**Purpose**: Activates properties to production network after staging validation

### Key Features:

- **Production Activation**: Moves properties from staging to production
- **Version Management**: Can activate specific property versions
- **Activation Monitoring**: Tracks activation progress (10-60 minutes)
- **Compliance Verification**: Ensures notification emails are provided
- **Status Tracking**: Monitors propagation across Akamai network

### Typical Workflow:

1. Validate property exists
2. Get current property version (or use specified version)
3. Validate notification emails are provided
4. Submit production activation
5. Monitor activation status
6. Report completion or timeout

### Configuration Options:

```typescript
interface ProductionActivationConfig {
  propertyId: string; // Required: Property to activate
  version?: number; // Specific version (default: latest)
  notificationEmails: string[]; // Required for production
  note?: string; // Activation note
  customer?: string; // Multi-tenant customer ID
  waitForActivation?: boolean; // Wait for completion
  maxWaitTime?: number; // Max wait time in minutes
}
```

## Key Differences

| Feature                   | Property Onboarding Agent           | Production Activation Agent                |
| ------------------------- | ----------------------------------- | ------------------------------------------ |
| **Primary Purpose**       | Create and configure new properties | Activate existing properties to production |
| **Scope**                 | Complete end-to-end setup           | Single activation operation                |
| **Property Creation**     | ✅ Yes                              | ❌ No                                      |
| **Edge Hostname Setup**   | ✅ Yes                              | ❌ No                                      |
| **DNS Configuration**     | ✅ Yes                              | ❌ No                                      |
| **CP Code Creation**      | ✅ Yes                              | ❌ No                                      |
| **Rule Configuration**    | ✅ Yes                              | ❌ No                                      |
| **Staging Activation**    | ✅ Yes                              | ❌ No                                      |
| **Production Activation** | ❌ No                               | ✅ Yes                                     |
| **Notification Emails**   | Optional                            | Required                                   |
| **Typical Duration**      | 5-10 minutes                        | 10-60 minutes                              |
| **Use Case**              | New property setup                  | Go-live deployment                         |

## When to Use Each Agent

### Use Property Onboarding Agent when:

- Setting up a new website or application on Akamai
- Migrating from another CDN provider
- Creating a new property for an existing customer
- Need full automation of property setup

### Use Production Activation Agent when:

- Property has been tested successfully in staging
- Ready to go live with production traffic
- Need to activate a specific tested version
- Require monitoring of production activation status

## Integration Example

These agents can work together in a complete workflow:

```typescript
// 1. First, onboard the property
const onboardingResult = await propertyOnboardingAgent.execute({
  hostname: 'www.example.com',
  originHostname: 'origin.example.com',
  useCase: 'web-app',
});

// 2. Test in staging...
// 3. Then activate to production
const activationResult = await productionActivationAgent.execute({
  propertyId: onboardingResult.propertyId,
  notificationEmails: ['ops@example.com'],
  waitForActivation: true,
});
```

## Error Handling

Both agents include comprehensive error handling:

- Property Onboarding: Validates contracts, groups, products, and handles conflicts
- Production Activation: Validates property existence and activation requirements

## Best Practices

1. **Always test in staging** before production activation
2. **Provide notification emails** for production activations
3. **Monitor activation status** for production deployments
4. **Use appropriate CP codes** for traffic categorization
5. **Configure DNS properly** before production activation
