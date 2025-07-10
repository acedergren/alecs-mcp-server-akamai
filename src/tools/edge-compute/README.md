# Edge Compute Domain

Edge compute domain providing EdgeWorkers and Cloudlets functionality

## Overview

This domain provides comprehensive tools for managing Edge Compute operations through Akamai's EdgeWorkers and Cloudlets APIs. EdgeWorkers enable serverless JavaScript execution at the edge, while Cloudlets provide policy-based request handling capabilities.

## EdgeWorkers Tools

### Core Operations
- `edge_compute_list_edgeworkers` - List all EdgeWorkers with filtering options
- `edge_compute_get_edgeworker` - Get EdgeWorker details including recent versions
- `edge_compute_create_edgeworker` - Create a new EdgeWorker
- `edge_compute_update_edgeworker` - Update EdgeWorker name or description
- `edge_compute_delete_edgeworker` - Delete an EdgeWorker (permanent action)

### Version Management
- `edge_compute_create_version` - Upload new EdgeWorker code bundle
- `edge_compute_activate_edgeworker` - Deploy version to staging/production

## Cloudlets Tools

### Policy Management
- `edge_compute_list_cloudlet_policies` - List all Cloudlet policies by type
- `edge_compute_get_cloudlet_policy` - Get policy details and versions
- `edge_compute_create_cloudlet_policy` - Create new Cloudlet policy
- `edge_compute_update_cloudlet_rules` - Update policy rules
- `edge_compute_activate_cloudlet` - Deploy policy to staging/production

### Cloudlet Types
- **ALB** - Application Load Balancer
- **AP** - API Prioritization
- **AS** - Audience Segmentation
- **CD** - Continuous Deployment
- **ER** - Edge Redirector
- **FR** - Forward Rewrite
- **IG** - Image and Video Manager
- **VP** - Visitor Prioritization

## API Integration

This domain integrates with two Akamai APIs:
- **EdgeWorkers API v1**: `/edgeworkers/v1`
- **Cloudlets API v3**: `/cloudlets/v3`
- Authentication: EdgeGrid authentication
- API Documentation: [Akamai EdgeWorkers](https://techdocs.akamai.com/edgeworkers/reference/api) | [Akamai Cloudlets](https://techdocs.akamai.com/cloudlets/reference/api)

## Usage Examples

### EdgeWorkers Examples

#### List EdgeWorkers
```typescript
const edgeWorkers = await client.callTool('edge_compute_list_edgeworkers', {
  customer: 'default',
  resourceTierId: 200,
  limit: 10
});
```

#### Create EdgeWorker
```typescript
const newWorker = await client.callTool('edge_compute_create_edgeworker', {
  customer: 'default',
  name: 'My Edge Function',
  description: 'Handles API responses at the edge',
  resourceTierId: 200
});
```

#### Upload Code Bundle
```typescript
const version = await client.callTool('edge_compute_create_version', {
  customer: 'default',
  edgeWorkerId: 12345,
  bundleContent: 'base64_encoded_gzip_content',
  description: 'Fix response headers'
});
```

#### Activate to Staging
```typescript
const activation = await client.callTool('edge_compute_activate_edgeworker', {
  customer: 'default',
  edgeWorkerId: 12345,
  version: '1.0.0',
  network: 'STAGING',
  note: 'Testing header modifications'
});
```

### Cloudlets Examples

#### List Cloudlet Policies
```typescript
const policies = await client.callTool('edge_compute_list_cloudlet_policies', {
  customer: 'default',
  cloudletType: 'ER', // Edge Redirector
  limit: 20
});
```

#### Create Edge Redirector Policy
```typescript
const policy = await client.callTool('edge_compute_create_cloudlet_policy', {
  customer: 'default',
  name: 'Mobile Redirects',
  description: 'Redirect mobile users to m.example.com',
  cloudletType: 'ER',
  propertyId: 'prp_123456'
});
```

#### Update Policy Rules
```typescript
const rules = await client.callTool('edge_compute_update_cloudlet_rules', {
  customer: 'default',
  policyId: 1234,
  version: 1,
  rules: [{
    ruleName: 'Mobile Detection',
    matches: [{
      matchType: 'header',
      matchOperator: 'contains',
      matchValue: 'Mobile'
    }],
    behaviors: [{
      name: 'redirectUrl',
      value: 'https://m.example.com'
    }]
  }]
});
```

## Typical Workflows

### EdgeWorker Deployment
1. Create EdgeWorker: `edge_compute_create_edgeworker`
2. Upload code: `edge_compute_create_version`
3. Test in staging: `edge_compute_activate_edgeworker` (STAGING)
4. Validate functionality
5. Deploy to production: `edge_compute_activate_edgeworker` (PRODUCTION)

### Cloudlet Configuration
1. Create policy: `edge_compute_create_cloudlet_policy`
2. Configure rules: `edge_compute_update_cloudlet_rules`
3. Test in staging: `edge_compute_activate_cloudlet` (staging)
4. Monitor behavior
5. Deploy to production: `edge_compute_activate_cloudlet` (production)

## Resource Tiers

EdgeWorkers operate within resource tiers that define execution limits:
- **Init Duration**: Maximum initialization time
- **Runtime Duration**: Maximum execution time per request
- **Memory**: Maximum memory allocation
- **Log Size**: Maximum log output size

## Best Practices

1. **Test in Staging First** - Always deploy to staging before production
2. **Version Management** - Use descriptive version descriptions
3. **Monitor Activations** - Check activation status before proceeding
4. **Resource Limits** - Be aware of tier limitations
5. **Error Handling** - Implement proper error handling in EdgeWorker code

## Testing

```bash
# Run domain-specific tests
npm test -- --testNamePattern="edge-compute"

# Run EdgeWorkers tests
npm test -- --testNamePattern="EdgeWorker"

# Run Cloudlets tests
npm test -- --testNamePattern="Cloudlet"
```

## Generated

This domain was generated on 2025-07-10T04:07:56.616Z using ALECSCore CLI.