# GTM (Global Traffic Management) Domain

Global Traffic Management - DNS-based load balancing and failover

## Overview

This domain provides comprehensive tools for managing Akamai's Global Traffic Management (GTM) service, which enables DNS-based global server load balancing, data center failover, and geographic routing for optimal performance and availability.

## Key Features

- **DNS-based Load Balancing**: Distribute traffic across multiple data centers
- **Automatic Failover**: Redirect traffic when data centers become unavailable
- **Geographic Routing**: Route users to the nearest data center
- **Performance-based Routing**: Direct traffic based on real-time performance metrics
- **Weighted Round-Robin**: Distribute traffic based on capacity
- **Health Monitoring**: Continuous liveness testing of endpoints

## Tools

### Domain Management (5 tools)
- `gtm_list_domains` - List all GTM domains with their types and status
- `gtm_create_domain` - Create a new GTM domain for global traffic management
- `gtm_get_domain` - Get detailed information about a GTM domain
- `gtm_update_domain` - Update GTM domain configuration
- `gtm_get_domain_status` - Get propagation status and validation state

### Datacenter Management (4 tools)
- `gtm_list_datacenters` - List all datacenters in a GTM domain
- `gtm_create_datacenter` - Create a new datacenter for traffic routing
- `gtm_update_datacenter` - Update datacenter information and location
- `gtm_delete_datacenter` - Delete a datacenter from GTM domain

### Property Management (4 tools)
- `gtm_list_properties` - List all properties in a GTM domain
- `gtm_create_property` - Create a new GTM property for traffic management
- `gtm_update_property` - Update property traffic targets and liveness tests
- `gtm_delete_property` - Delete a property from GTM domain

### Geographic Maps (2 tools)
- `gtm_create_geographic_map` - Create geographic map for location-based routing
- `gtm_update_geographic_map` - Update geographic map assignments

### Resource Management (2 tools)
- `gtm_list_resources` - List all resources in a GTM domain
- `gtm_create_resource` - Create a resource for load measurement

## API Integration

This domain integrates with the Akamai GTM Configuration API v1:
- Base URL: `https://akzz-XXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXX.luna.akamaiapis.net/config-gtm/v1`
- Authentication: EdgeGrid authentication
- API Documentation: [GTM API Reference](https://techdocs.akamai.com/gtm/reference)

## Usage Examples

### Domain Management

#### List GTM Domains
```typescript
const domains = await client.callTool('gtm_list_domains', {
  customer: 'default'
});
```

#### Create GTM Domain
```typescript
const domain = await client.callTool('gtm_create_domain', {
  customer: 'default',
  name: 'example.akadns.net',
  type: 'weighted',  // basic, failover, weighted, full, static
  comment: 'Production GTM domain',
  emailNotificationList: ['ops@example.com']
});
```

### Datacenter Configuration

#### Create Datacenter
```typescript
const datacenter = await client.callTool('gtm_create_datacenter', {
  customer: 'default',
  domainName: 'example.akadns.net',
  nickname: 'US East',
  city: 'New York',
  country: 'US',
  continent: 'NA',
  latitude: 40.7128,
  longitude: -74.0060
});
```

### Property Configuration

#### Create Property with Traffic Targets
```typescript
const property = await client.callTool('gtm_create_property', {
  customer: 'default',
  domainName: 'example.akadns.net',
  name: 'www',
  type: 'weighted',
  scoreAggregationType: 'mean',
  handoutMode: 'normal',
  trafficTargets: [
    {
      datacenterId: 3133,
      enabled: true,
      weight: 50,
      servers: ['1.2.3.4', '5.6.7.8']
    },
    {
      datacenterId: 3134,
      enabled: true,
      weight: 50,
      servers: ['9.10.11.12']
    }
  ]
});
```

#### Add Liveness Tests
```typescript
const updatedProperty = await client.callTool('gtm_update_property', {
  customer: 'default',
  domainName: 'example.akadns.net',
  propertyName: 'www',
  livenessTests: [
    {
      name: 'HTTP Health Check',
      testObjectProtocol: 'HTTP',
      testObject: '/health',
      testObjectPort: 80,
      testInterval: 60,
      testTimeout: 10
    }
  ]
});
```

### Geographic Routing

#### Create Geographic Map
```typescript
const geoMap = await client.callTool('gtm_create_geographic_map', {
  customer: 'default',
  domainName: 'example.akadns.net',
  name: 'Global Routing',
  defaultDatacenterId: 5400,
  assignments: [
    {
      datacenterId: 3133,
      countries: ['US', 'CA', 'MX']
    },
    {
      datacenterId: 3134,
      countries: ['GB', 'FR', 'DE'],
      continents: ['EU']
    }
  ]
});
```

## GTM Domain Types

- **Basic**: Simple load balancing
- **Failover**: Active/passive failover configuration
- **Weighted**: Weighted round-robin distribution
- **Full**: All GTM features enabled
- **Static**: Static mapping only

## Property Types

- **Failover**: Primary/backup configuration
- **Weighted**: Percentage-based traffic distribution
- **Geographic**: Location-based routing
- **CIDR Mapping**: IP address-based routing
- **AS Mapping**: Autonomous System routing
- **QTR**: Quality Threshold Routing
- **Performance**: Real-time performance-based

## Best Practices

1. **Domain Naming**: Use `.akadns.net` suffix for GTM domains
2. **Health Checks**: Always configure liveness tests for critical properties
3. **Geographic Distribution**: Place datacenters in multiple regions
4. **Weight Distribution**: Start with equal weights and adjust based on capacity
5. **Testing**: Test failover scenarios before production deployment

## Development

### Adding New Tools
```bash
alecs generate tool gtm <tool-name>
```

### Implementation Notes
- All tools follow ALECSCore domain patterns
- Comprehensive error handling with specific error codes
- Human-readable formatted responses
- Full type safety with Zod validation
- Customer context validation

## Testing

```bash
# Run domain-specific tests
npm test -- --testNamePattern="GTM"

# Run specific tool tests
npm test -- --testNamePattern="gtm_create_domain"
```

## Troubleshooting

### Common Issues

1. **Domain Creation Fails**
   - Ensure domain name ends with `.akadns.net`
   - Check contract and permissions

2. **Property Not Resolving**
   - Verify domain propagation status
   - Check datacenter assignments
   - Ensure traffic targets are enabled

3. **Failover Not Working**
   - Verify liveness test configuration
   - Check test intervals and timeouts
   - Monitor test results

## Generated

This domain was generated on 2025-07-10T04:21:59.538Z using ALECSCore CLI and implements 17 GTM management tools.