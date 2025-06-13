# ALECS Specialized Agents

ALECS provides three specialized agents that offer high-level orchestration with rich terminal progress output for complex Akamai operations.

## Overview

The agents provide:
- **Rich Terminal Output**: Progress bars, spinners, and colored status updates
- **Error Handling**: Graceful recovery and clear error messaging
- **Time Estimates**: ETAs and completion tracking for long operations
- **Integration**: Agents work together for complex workflows
- **MCP Compatibility**: All functionality exposed through MCP tools

## Agent 1: CDN + HTTPS Provisioning Agent

Complete CDN property provisioning with integrated certificate management.

### Features
- Property version management (create, clone, list versions)
- Rule tree templates (origin, caching, performance, security)
- Edge hostname creation and management
- Property activation with real-time progress tracking
- Default DV certificate provisioning with DNS validation
- Hostname management (add/remove/update)

### Example Usage

```javascript
// Complete property provisioning
await cdn.provisionCompleteProperty(
  'my-website',
  ['www.example.com', 'example.com'],
  'origin.example.com',
  {
    productId: 'prd_Web_Accel',
    activateStaging: true,
    activateProduction: false,
    notifyEmails: ['ops@example.com']
  }
);
```

### Progress Output Example
```
Complete CDN Property Provisioning
════════════════════════════════════════════════════════════
📦 Property: my-website
🌍 Hostnames: www.example.com, example.com
🖥️ Origin: origin.example.com
────────────────────────────────────────────────────────────
[████████████████████████████████] 100% | Step 9/9 | Property provisioning complete!

✅ Provisioning Summary
────────────────────────────────────────────────────────────
✅ Property ID: prp_123456
✅ Edge Hostname: my-website.edgesuite.net
✅ Version: 1
✅ Certificates: Provisioned for 2 domains
✅ Active on: STAGING
```

## Agent 2: CPS Certificate Management Agent

Advanced certificate lifecycle management with automated validation.

### Features
- Certificate enrollment (Default DV, EV, OV, Third-party)
- Automated DNS validation via EdgeDNS integration
- Certificate deployment to Enhanced TLS network
- Certificate-property linking and tracking
- Auto-renewal configuration
- Certificate status dashboard

### Example Usage

```javascript
// Provision and deploy certificate
await cps.provisionAndDeployCertificate(
  ['www.example.com', 'example.com'],
  {
    type: 'default-dv',
    network: 'production',
    propertyIds: ['prp_123456'],
    autoRenewal: true
  }
);
```

### Progress Output Example
```
Certificate Enrollment
──────────────────────────────────────────────
📜 Type: DEFAULT-DV
🌍 Domains: 2
  • www.example.com
  • example.com
──────────────────────────────────────────────
🔒 Enrolling [████████████████████] 100% Certificate enrollment created

Automated DNS Validation
──────────────────────────────────────────────
🔍 Domain: www.example.com
  • Record: _acme-challenge.www.example.com
  • Type: TXT
  • Value: abc123...
✅ DNS record created for www.example.com
⏱️ Validating [████████████████████] 100% 2/2 domains validated
```

## Agent 3: DNS Migration Agent

Cloudflare-style DNS zone migration with hidden change-list management.

### Features
- AXFR zone transfers with progress tracking
- Zone file parsing and transformation
- Bulk import with automatic batching
- Cloudflare API integration
- Nameserver migration instructions
- CRUD operations with abstracted change-list workflow

### Example Usage

```javascript
// Import zone from Cloudflare
await dns.importFromCloudflare(
  'cf_api_token',
  'cf_zone_id',
  'example.com'
);

// Bulk migration
await dns.migrateZoneComplete(
  'example.com',
  'example.com',
  {
    source: 'axfr',
    sourceConfig: {
      primaryNS: 'ns1.current-provider.com',
      tsigKey: { name: 'key', algorithm: 'hmac-sha256', secret: 'secret' }
    },
    autoActivate: true
  }
);
```

### Progress Output Example
```
Zone Import via AXFR
──────────────────────────────────────────────
🔍 Zone: example.com
🖥️ Primary NS: ns1.current-provider.com
──────────────────────────────────────────────
🌍 Importing [████████████████████] 100% Import complete: 156 records imported

✅ Import Summary:
  • Records imported: 156
  • Records failed: 0

Nameserver Migration Instructions
════════════════════════════════════════════════════════════
ℹ️ Current Configuration
  🔍 Zone: example.com
  🖥️ Current Nameservers:
    → ns1.current-provider.com
    → ns2.current-provider.com

🚀 Target Configuration
  🖥️ Akamai Nameservers:
    → a1-234.akam.net
    → a2-234.akam.net
    → a3-234.akam.net
    → a4-234.akam.net
```

## Orchestration

The orchestrator coordinates all three agents for complex workflows.

### Complete Website Migration

```javascript
const orchestrator = await createOrchestrator({
  customer: 'default',
  contractId: 'ctr_123456',
  groupId: 'grp_123456'
});

await orchestrator.migrateWebsite({
  domain: 'example.com',
  originHostname: 'origin.example.com',
  sourceProvider: 'cloudflare',
  sourceConfig: {
    apiToken: 'cf_token',
    zoneId: 'cf_zone_id'
  },
  activateStaging: true,
  notifyEmails: ['ops@example.com']
});
```

### Secure Website Provisioning

```javascript
await orchestrator.provisionSecureWebsite({
  domains: ['example.com', 'www.example.com'],
  originHostname: 'origin.example.com',
  certificateType: 'default-dv',
  enableWAF: true,
  enableDDoS: true,
  cacheStrategy: 'moderate',
  notifyEmails: ['security@example.com']
});
```

## MCP Tool Integration

All agent functionality is exposed through MCP tools:

### Available Tools

- `provision_complete_property` - Complete CDN property setup
- `clone_property_version` - Clone configuration between properties
- `apply_property_template` - Apply rule templates
- `provision_and_deploy_certificate` - Certificate lifecycle management
- `automated_dns_validation` - Automated DNS validation
- `process_certificate_renewal` - Certificate renewal
- `import_zone_from_cloudflare` - Cloudflare migration
- `bulk_dns_migration` - Bulk zone migrations
- `migrate_website` - Complete website migration
- `provision_secure_website` - Secure website from scratch

### Example MCP Request

```json
{
  "tool": "migrate_website",
  "arguments": {
    "customer": "production",
    "domain": "example.com",
    "originHostname": "origin.example.com",
    "sourceProvider": "cloudflare",
    "sourceConfig": {
      "apiToken": "your-cf-token",
      "zoneId": "your-zone-id"
    },
    "activateStaging": true,
    "notifyEmails": ["ops@example.com"]
  }
}
```

## Terminal Progress Features

### Progress Bars
- Real-time progress tracking
- Time estimates (ETA)
- Completion percentages
- Color-coded status

### Spinners
- Activity indicators for indeterminate operations
- Status updates during long-running tasks
- Success/failure indicators

### Formatted Output
- Color-coded messages
- Icons for different types of information
- Structured summaries
- Clear error messages

## Error Handling

All agents implement robust error handling:

1. **Graceful Recovery**: Operations continue where possible
2. **Clear Messaging**: Specific error details with context
3. **Rollback Support**: Undo capabilities where applicable
4. **Progress Preservation**: Progress bars show failure points

## Performance Considerations

- **Batching**: Bulk operations are automatically batched
- **Parallel Processing**: Concurrent operations where safe
- **Rate Limiting**: Respects Akamai API limits
- **Caching**: Agent instances are cached per customer

## Running the Demo

To see all agents in action:

```bash
npm run demo:agents
```

This will demonstrate:
- Agent initialization
- Progress output examples
- Feature capabilities
- Integration patterns