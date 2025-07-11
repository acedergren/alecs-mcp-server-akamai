# API Workflow Implementation Plan

## Phase 1: Critical User Experience Fixes (Week 1)

### 1.1 Smart Property Discovery
**Problem**: Users need contractId and groupId but don't know them
**Solution**: Auto-discovery service

```typescript
// New utility service: src/services/smart-discovery-service.ts
export class SmartDiscoveryService {
  private contractCache: Map<string, Contract>;
  private groupCache: Map<string, Group[]>;
  private propertyMappingCache: Map<string, {contractId: string, groupId: string}>;
  
  async discoverPropertyContext(propertyIdOrName: string): Promise<PropertyContext> {
    // Implementation that searches across all contracts/groups
  }
  
  async getDefaultContract(): Promise<string> {
    const contracts = await this.listAllContracts();
    if (contracts.length === 1) return contracts[0].contractId;
    // Otherwise, look for "Production" or most used
  }
}
```

**Tools to Update**:
- `property_list` - Remove contract/group as required
- `property_create` - Auto-select if not provided
- `property_search` - Search across all contracts

### 1.2 DNS Changelist Abstraction
**Problem**: Users must manage changelists manually
**Solution**: Hide changelist workflow

```typescript
// New wrapper: src/services/dns-simplified-service.ts
export class SimplifiedDNSService {
  async updateRecord(zone: string, record: DNSRecord): Promise<void> {
    const changelist = await this.createChangelist(zone, 'Auto-update via MCP');
    try {
      await this.modifyRecordInChangelist(changelist.id, record);
      await this.submitChangelist(changelist.id);
      await this.activateChangelist(changelist.id);
    } catch (error) {
      await this.discardChangelist(changelist.id);
      throw error;
    }
  }
}
```

**New Simplified Tools**:
- `dns_record_update_simple` - Single-step record update
- `dns_records_bulk_update_simple` - Batch updates with auto-changelist

### 1.3 Property Activation Workflow
**Problem**: Complex multi-step activation process
**Solution**: Guided workflow tool

```typescript
// New tool: property_activate_guided
{
  description: "Guided property activation with automatic validation and staging",
  parameters: {
    property: "Property name or ID",
    target: "production", // Auto-suggests staging first
    skipStaging: false,   // Requires confirmation if true
    autoFixWarnings: true // Attempts to fix common warnings
  }
}
```

## Phase 2: Intelligent Defaults & Templates (Week 2)

### 2.1 Certificate Provisioning Wizard
```typescript
// New tool: certificate_provision_wizard
{
  steps: [
    { name: "domain_selection", prompt: "Which domains need certificates?" },
    { name: "validation_method", default: "dns", options: ["dns", "http"] },
    { name: "network_type", default: "enhanced_tls", hidden: true },
    { name: "auto_deploy", default: true }
  ]
}
```

### 2.2 Security Configuration Templates
```typescript
// New tool: security_quick_setup
{
  templates: {
    "basic_web": {
      waf: { mode: "ASE_AUTO", paranoia: 1 },
      rateLimit: { requests: 1000, window: 60 },
      geoBlocking: { allowList: ["US", "CA", "EU"] }
    },
    "api_protection": {
      waf: { mode: "ASE_MANUAL", paranoia: 3 },
      rateLimit: { requests: 100, window: 60 },
      botManager: { enabled: true, mode: "aggressive" }
    }
  }
}
```

### 2.3 Network List Smart Creation
```typescript
// Enhanced tool: network_list_create_smart
{
  // Auto-detects format:
  // "1.2.3.4/32" → IP list
  // "US,CA,MX" → GEO list
  // File upload → Parse and categorize
}
```

## Phase 3: Cross-Domain Workflows (Week 3)

### 3.1 New Site Deployment Workflow
```typescript
// New tool: deploy_new_site
{
  description: "Complete workflow to deploy a new site on Akamai",
  steps: [
    "create_property",
    "create_edge_hostname", 
    "setup_dns_records",
    "provision_certificate",
    "configure_security",
    "activate_everything"
  ],
  // Each step can be customized or skipped
}
```

### 3.2 Bulk Operations Manager
```typescript
// New service: src/services/bulk-operations-service.ts
export class BulkOperationsService {
  async bulkPropertyUpdate(
    filter: PropertyFilter,
    updates: PropertyUpdates,
    options: BulkOptions
  ): Promise<BulkResult> {
    // Handles rate limiting, parallel execution, rollback on failure
  }
}
```

## Phase 4: Enhanced Error Handling & Recovery (Week 4)

### 4.1 Intelligent Error Translation
```typescript
// New middleware: src/middleware/error-translation-middleware.ts
const errorMappings = {
  "ERR_18001": {
    message: "Property version is already active",
    suggestion: "Would you like me to create a new version for your changes?",
    autoFix: async (context) => {
      return await createNewVersion(context.propertyId);
    }
  }
};
```

### 4.2 Operation Status Tracking
```typescript
// New service: src/services/operation-tracker-service.ts
export class OperationTracker {
  async trackLongOperation(
    operationType: string,
    operationId: string,
    expectedDuration: number
  ): Promise<OperationStatus> {
    // Provides real-time updates for:
    // - Property activations
    // - Certificate provisioning
    // - Large purge operations
  }
}
```

## Implementation Details

### File Structure
```
src/
  services/
    smart-discovery-service.ts      # Contract/group auto-discovery
    dns-simplified-service.ts       # Changelist abstraction
    bulk-operations-service.ts      # Batch operations
    operation-tracker-service.ts    # Long operation monitoring
    workflow-orchestrator.ts        # Multi-step workflows
  
  workflows/
    new-site-deployment.ts
    property-activation-guided.ts
    certificate-provisioning-wizard.ts
    
  middleware/
    error-translation-middleware.ts
    parameter-discovery-middleware.ts
    
  tools/
    property/
      property-tools-enhanced.ts    # Smart versions of existing tools
    dns/
      dns-tools-simplified.ts       # Changelist-free versions
    workflows/
      workflow-tools.ts             # New cross-domain tools
```

### Configuration
```typescript
// New config: src/config/workflow-config.ts
export const workflowConfig = {
  autoDiscovery: {
    enabled: true,
    cacheTimeout: 3600,
    searchAllContracts: true
  },
  simplifiedMode: {
    hideChan

## Testing Strategy

### Unit Tests
- Test each simplified service method
- Mock API responses for workflow tests
- Verify error translation logic

### Integration Tests  
- Test complete workflows end-to-end
- Verify auto-discovery with multiple contracts
- Test rollback on workflow failures

### User Acceptance Tests
- "Create and activate a property" in 1 command
- "Update DNS record" without knowing about changelists  
- "Provision certificate" with guided wizard

## Rollout Plan

### Week 1: Foundation
- Implement smart discovery service
- Add simplified DNS tools
- Update property tools with auto-discovery

### Week 2: Enhanced Tools
- Add certificate wizard
- Implement security templates
- Create smart network list tools

### Week 3: Workflows
- Build workflow orchestrator
- Implement new site deployment
- Add bulk operations

### Week 4: Polish
- Add error translation
- Implement operation tracking
- Complete documentation

## Success Metrics

### Before
- Average commands to activate property: 7
- Average time to update DNS: 5 minutes  
- User errors due to missing params: 40%

### After (Target)
- Average commands to activate property: 1
- Average time to update DNS: 30 seconds
- User errors due to missing params: <5%

## Migration Guide

### For Existing Users
```typescript
// Old way:
property_list({ contractId: 'ctr_123', groupId: 'grp_456' })

// New way:
property_list()  // Automatically finds all properties

// Old way:
dns_record_create({ zone, changelist, record })
dns_changelist_submit({ changelist })
dns_changelist_activate({ changelist })

// New way:
dns_record_update_simple({ zone, record })  // Done!
```

### For New Users
Start with simplified tools:
1. `deploy_new_site` - Complete site setup
2. `property_activate_guided` - Safe activation
3. `certificate_provision_wizard` - Easy SSL

## Conclusion

This implementation plan transforms Akamai's powerful but complex APIs into user-friendly tools that:

1. **Remove friction** - No more hunting for IDs
2. **Prevent errors** - Guided workflows with validation
3. **Save time** - Single commands replace multi-step processes
4. **Learn from users** - Cache successful patterns
5. **Provide expertise** - Built-in best practices

The end result is an MCP tool that feels like having an Akamai expert on your team, not just an API wrapper.