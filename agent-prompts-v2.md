# Akamai MCP Server - Updated Agent Prompts for Multi-Customer Support

## Research Agent Prompts (Run Concurrently)

### Agent 1: Core APIs with Account Switching
```
Research Akamai Property Manager API and EdgeGrid authentication with account switching:
1. Study the OpenAPI specs at https://github.com/akamai/akamai-apis/tree/main/apis/papi/v1
2. Document account-switch-key usage in EdgeGrid headers
3. Analyze .edgerc file structure for multi-customer support:
   - Section-based configuration [default], [customer1], [customer2]
   - Account-switch-key parameter usage
4. Property activation to STAGING and PRODUCTION networks
5. Property versioning and promotion workflows
6. Sample code for multi-customer context switching
Save findings to docs/property-manager-multi-customer.md
```

### Agent 2: Certificate & DNS Management
```
Research Default DV certificates and Edge DNS APIs:
1. Study CPS API specs at https://github.com/akamai/akamai-apis/tree/main/apis/cps/v2
2. Focus ONLY on Default DV (Secure by Default) enrollment
3. Document Enhanced TLS network deployment only
4. Study Edge DNS API at https://github.com/akamai/akamai-apis/tree/main/apis/config-dns/v2
5. DNS zone management and record CRUD operations
6. Integration patterns between DNS and Property Manager
Save to docs/certificates-dns-apis.md
```

### Agent 3: FastPurge, AppSec & Network Lists
```
Research content purging, security, and network list APIs:
1. Fast Purge API v3: https://github.com/akamai/akamai-apis/tree/main/apis/ccu/v3
2. Application Security API: https://github.com/akamai/akamai-apis/tree/main/apis/appsec/v1
3. Network Lists API v2: https://github.com/akamai/akamai-apis/tree/main/apis/network-list/v2
   - IP lists, GEO lists, and custom lists
   - Activation to STAGING/PRODUCTION
4. Document activation dependencies between APIs
Save to docs/purge-security-network-lists.md
```

### Agent 4: Reporting API
```
Research Akamai Reporting API for CDN metrics:
1. Study specs at https://github.com/akamai/akamai-apis/tree/main/apis/reporting/v1
2. Focus on essential Day 0 reports:
   - Traffic volume
   - Cache hit ratio
   - Error rates
   - Bandwidth usage
3. Data aggregation options and time ranges
4. Multi-customer report filtering
Save to docs/reporting-api.md
```

## Architecture & Planning Agent

```
Design MCP server architecture with multi-customer support:

Requirements:
- Account-switch-key support for multiple customers
- Customer context management
- TypeScript/Node.js
- Minimal infrastructure

Create architecture including:
1. EdgeGrid client factory with customer switching
2. Customer configuration management (.edgerc sections)
3. MCP tool naming convention for multi-customer
4. Staging vs Production network handling
5. Simple state management per customer

Example tool structure:
- property.list (with customer parameter)
- dns.zone.create
- networklist.add
- certificate.provision.dv

Save to docs/multi-customer-architecture.md
```

## Updated Development Stage Prompts

### Stage 1: Core + Multi-Customer Foundation
```
Create MCP server with multi-customer Property Manager and DNS:

1. Set up TypeScript project with:
   - MCP SDK integration
   - EdgeGrid auth with account-switch-key
   - .edgerc parser for multiple sections

2. Customer context manager:
   - loadCustomerConfig(customerName)
   - switchCustomerContext(customerName)
   - Customer validation

3. Property Manager tools:
   - property.list [{customer: "customer1"}]
   - property.get [{customer, propertyId}]
   - property.create [{customer, propertyName, productId}]
   - property.activate [{customer, propertyId, network: "STAGING|PRODUCTION"}]

4. Edge DNS tools:
   - dns.zone.list [{customer}]
   - dns.zone.create [{customer, zone}]
   - dns.record.add [{customer, zone, record}]

5. Default DV Certificate tools:
   - certificate.dv.create [{customer, domains, enhancedTls: true}]
   - certificate.dv.status [{customer, enrollmentId}]

Include proper error handling for invalid customers.
```

### Stage 2: Network Lists + Fast Purge
```
Add Network Lists and Fast Purge with customer context:

1. Network Lists service:
   - networklist.list [{customer, type: "IP|GEO"}]
   - networklist.create [{customer, name, type, items}]
   - networklist.update [{customer, listId, items}]
   - networklist.activate [{customer, listId, network: "STAGING|PRODUCTION"}]

2. Fast Purge service:
   - purge.url [{customer, urls}]
   - purge.cpcode [{customer, cpcode}]
   - purge.tag [{customer, tags}]

3. Handle activation dependencies (e.g., network list before property)
```

### Stage 3: Security Configuration
```
Add Application Security with multi-customer support:

1. Security tools:
   - security.config.list [{customer}]
   - security.waf.get [{customer, configId}]
   - security.waf.update [{customer, configId, policy}]
   - security.ratelimit.set [{customer, configId, limits}]
   - security.activate [{customer, configId, network}]

2. Link security configs to properties
3. Handle version management
```

### Stage 4: Reporting
```
Add reporting with customer filtering:

1. Reporting tools:
   - report.traffic [{customer, propertyId, startDate, endDate}]
   - report.performance [{customer, propertyId, metrics}]
   - report.errors [{customer, propertyId}]
   - report.bandwidth [{customer, cpcode}]

2. Support for aggregated reports across properties
3. Export formats (JSON, CSV)
```

## Updated Quick Start

```bash
# .edgerc file structure
[default]
client_secret = xxx
host = xxx.luna.akamaiapis.net
access_token = xxx
client_token = xxx

[customer1]
client_secret = yyy
host = yyy.luna.akamaiapis.net
access_token = yyy
client_token = yyy
account-switch-key = ACCOUNT1

[customer2]
client_secret = zzz
host = zzz.luna.akamaiapis.net
access_token = zzz
client_token = zzz
account-switch-key = ACCOUNT2
```

## Updated Infrastructure

No changes needed - multi-customer is handled in application logic, not infrastructure.

## Key Implementation Notes

1. **Customer Parameter**: Every MCP tool should accept a `customer` parameter
2. **Network Parameter**: Activation tools need `network: "STAGING" | "PRODUCTION"`
3. **Default DV Only**: Skip CPS enrollment types, focus on Default DV
4. **Enhanced TLS**: Always deploy certs to Enhanced TLS network
5. **Validation**: Validate customer exists in .edgerc before operations

## Timeline Adjustment
- Add 1 week for multi-customer architecture
- Total: 3-4 months evening/weekend work