# Comprehensive Implementation Guide for ALECS MCP Server

## Overview
This guide consolidates all findings from TechDocs analysis, API quirks investigation, and user experience research to create a definitive implementation plan for the ALECS MCP Server.

## Phase 1: Foundation Fixes (Immediate)

### 1.1 Contract/Group Auto-Discovery Service

**Problem**: Users can't list properties without knowing contract/group IDs, but can't discover these IDs easily.

**Implementation**:
```typescript
// src/services/smart-discovery-service.ts
export class SmartDiscoveryService {
  private contractCache = new Map<string, Contract>();
  private groupCache = new Map<string, Group[]>();
  private propertyContextCache = new Map<string, PropertyContext>();
  
  async discoverPropertyContext(propertyNameOrId?: string): Promise<PropertyContext[]> {
    // Step 1: Try to list all contracts
    const contracts = await this.listAllContracts();
    
    // Step 2: For each contract, get groups
    const contexts: PropertyContext[] = [];
    for (const contract of contracts) {
      const groups = await this.getGroupsForContract(contract.contractId);
      for (const group of groups) {
        contexts.push({ contractId: contract.contractId, groupId: group.groupId });
      }
    }
    
    // Step 3: If searching for specific property, search across all contexts
    if (propertyNameOrId) {
      for (const context of contexts) {
        const properties = await this.listProperties(context);
        const match = properties.find(p => 
          p.propertyId === propertyNameOrId || 
          p.propertyName.includes(propertyNameOrId)
        );
        if (match) return [context];
      }
    }
    
    return contexts;
  }
  
  async getDefaultContext(): Promise<PropertyContext> {
    const contexts = await this.discoverPropertyContext();
    // Return first context or most commonly used
    return contexts[0] || throw new Error('No contracts found');
  }
}
```

**Tool Updates**:
```typescript
// Update property_list tool
'property_list': {
  inputSchema: z.object({
    contractId: z.string().optional(), // Make optional
    groupId: z.string().optional(),    // Make optional
    customer: z.string().optional()
  }),
  handler: async (client, args) => {
    let context;
    if (!args.contractId || !args.groupId) {
      // Auto-discover
      const discovery = new SmartDiscoveryService();
      const contexts = await discovery.discoverPropertyContext();
      
      // List properties from all contexts
      const allProperties = [];
      for (const ctx of contexts) {
        const props = await client.listProperties({
          ...ctx,
          customer: args.customer
        });
        allProperties.push(...props);
      }
      return formatPropertyList(allProperties);
    }
    // Normal flow with provided IDs
  }
}
```

### 1.2 DNS Changelist Abstraction Layer

**Problem**: Users must manage complex changelist workflow for simple DNS updates.

**Implementation**:
```typescript
// src/services/dns-changelist-manager.ts
export class DNSChangelistManager {
  private activeChangelists = new Map<string, ChangelistContext>();
  
  async withChangelist<T>(
    zone: string, 
    operation: (changelistId: string) => Promise<T>
  ): Promise<T> {
    const changelist = await this.createChangelist(zone);
    
    try {
      // Add zone to changelist
      await this.addZoneToChangelist(changelist.id, zone);
      
      // Execute user operation
      const result = await operation(changelist.id);
      
      // Submit and activate
      await this.submitChangelist(changelist.id);
      const activation = await this.activateChangelist(changelist.id);
      
      // Wait for activation
      await this.waitForActivation(activation.id);
      
      return result;
    } catch (error) {
      // Auto-cleanup on error
      await this.discardChangelist(changelist.id);
      throw error;
    }
  }
}
```

**New Simplified Tools**:
```typescript
'dns_record_update_simple': {
  description: 'Update DNS record without managing changelists',
  inputSchema: z.object({
    zone: z.string(),
    recordType: z.string(),
    name: z.string(),
    data: z.array(z.string()),
    ttl: z.number().optional()
  }),
  handler: async (client, args) => {
    const manager = new DNSChangelistManager();
    
    await manager.withChangelist(args.zone, async (changelistId) => {
      // Update record within changelist context
      await client.updateRecord({
        zone: args.zone,
        changelistId,
        record: {
          type: args.recordType,
          name: args.name,
          data: args.data,
          ttl: args.ttl || 3600
        }
      });
    });
    
    return {
      content: [{
        type: 'text',
        text: `✓ DNS record ${args.name}.${args.zone} updated successfully`
      }]
    };
  }
}
```

### 1.3 Property Activation Workflow Engine

**Problem**: Complex activation process with warnings, staging requirements, and version management.

**Implementation**:
```typescript
// src/services/property-activation-engine.ts
export class PropertyActivationEngine {
  async activateWithGuidance(
    propertyId: string,
    options: ActivationOptions
  ): Promise<ActivationResult> {
    // Step 1: Check if editable
    const currentVersion = await this.getActiveVersion(propertyId);
    let targetVersion = currentVersion;
    
    if (await this.isVersionActive(propertyId, currentVersion)) {
      // Create new version
      targetVersion = await this.createNewVersion(propertyId);
      await this.applyChanges(propertyId, targetVersion, options.changes);
    }
    
    // Step 2: Validate
    const validation = await this.validateVersion(propertyId, targetVersion);
    
    // Step 3: Handle warnings
    if (validation.warnings.length > 0) {
      const fixes = await this.autoFixWarnings(validation.warnings);
      if (fixes.unfixable.length > 0) {
        return this.promptUserForWarnings(fixes.unfixable);
      }
    }
    
    // Step 4: Activate to staging first
    if (!options.skipStaging) {
      await this.activateToNetwork(propertyId, targetVersion, 'STAGING');
      await this.waitForActivation();
      
      // Offer testing guidance
      return {
        status: 'staged',
        message: 'Property activated on staging. Test at: ...',
        nextStep: 'Test and then activate to production'
      };
    }
    
    // Step 5: Activate to production
    return await this.activateToNetwork(propertyId, targetVersion, 'PRODUCTION');
  }
}
```

## Phase 2: Enhanced User Experience (Week 1-2)

### 2.1 Certificate Provisioning Wizard

**Implementation**:
```typescript
// src/workflows/certificate-wizard.ts
export class CertificateProvisioningWizard {
  async startWizard(domain: string): Promise<WizardResult> {
    const steps = [
      this.checkDNSPointing.bind(this),
      this.selectValidationType.bind(this),
      this.createEnrollment.bind(this),
      this.showValidationInstructions.bind(this),
      this.monitorValidation.bind(this),
      this.deployToNetwork.bind(this)
    ];
    
    const context = { domain, state: {} };
    
    for (const step of steps) {
      const result = await step(context);
      if (result.waitForUser) {
        return result;
      }
    }
    
    return { success: true, certificate: context.state.certificate };
  }
  
  private async selectValidationType(context: WizardContext) {
    // Smart selection based on domain
    if (context.domain.includes('*')) {
      return { validationType: 'dns', reason: 'Wildcard requires DNS' };
    }
    
    const httpAccessible = await this.checkHTTPAccess(context.domain);
    return {
      validationType: httpAccessible ? 'http' : 'dns',
      reason: httpAccessible ? 'HTTP validation faster' : 'HTTP not accessible'
    };
  }
}
```

### 2.2 Intelligent Error Translation

**Implementation**:
```typescript
// src/middleware/error-translator.ts
export class ErrorTranslator {
  private errorMappings = {
    'ERR_18001': {
      original: 'Property version already active',
      translation: 'This version is already live. Create a new version to make changes.',
      suggestion: 'Would you like me to create a new version?',
      autoFix: async (context) => this.createNewVersion(context)
    },
    'WAR_CERT_NOT_READY': {
      original: 'Certificate not deployed on network',
      translation: 'The HTTPS certificate isn\'t ready yet.',
      suggestion: 'Deploy certificate first or switch to HTTP temporarily',
      autoFix: null // Requires user action
    },
    '400_MISSING_CONTRACT': {
      original: 'contractId and groupId are required',
      translation: 'I need to know which account to use.',
      suggestion: 'Let me find your available contracts...',
      autoFix: async (context) => this.discoverContracts(context)
    }
  };
  
  translate(error: AkamaiError): UserFriendlyError {
    const mapping = this.errorMappings[error.code] || 
                   this.errorMappings[error.type];
    
    if (mapping) {
      return {
        message: mapping.translation,
        suggestion: mapping.suggestion,
        canAutoFix: !!mapping.autoFix,
        originalError: error
      };
    }
    
    // Generic translation
    return this.genericTranslation(error);
  }
}
```

### 2.3 Template Library

**Implementation**:
```typescript
// src/services/template-service.ts
export const PropertyTemplates = {
  'static_website': {
    name: 'Static Website',
    description: 'Optimized for HTML, CSS, JS, and images',
    rules: [
      {
        name: 'Performance',
        behaviors: [
          { name: 'caching', options: { behavior: 'MAX_AGE', ttl: '1d' } },
          { name: 'prefetch', options: { enabled: true } },
          { name: 'http2', options: { enabled: true } }
        ]
      }
    ]
  },
  'api_gateway': {
    name: 'API Gateway',
    description: 'Optimized for REST APIs with rate limiting',
    rules: [
      {
        name: 'API Settings',
        behaviors: [
          { name: 'caching', options: { behavior: 'NO_STORE' } },
          { name: 'cors', options: { enabled: true } },
          { name: 'rateLimiting', options: { requests: 1000, window: 60 } }
        ]
      }
    ]
  }
};
```

## Phase 3: Cross-Domain Workflows (Week 2-3)

### 3.1 New Site Deployment Workflow

**Implementation**:
```typescript
// src/workflows/new-site-deployment.ts
export class NewSiteDeploymentWorkflow {
  async deploy(config: SiteConfig): Promise<DeploymentResult> {
    const steps = {
      property: await this.createProperty(config),
      edgeHostname: await this.createEdgeHostname(config),
      certificate: await this.provisionCertificate(config),
      dns: await this.updateDNS(config),
      security: await this.configureWAF(config),
      activation: await this.activateEverything(config)
    };
    
    return {
      summary: this.generateSummary(steps),
      nextSteps: this.getNextSteps(config)
    };
  }
}
```

### 3.2 Bulk Operations Manager

**Implementation**:
```typescript
// src/services/bulk-operations-manager.ts
export class BulkOperationsManager {
  async executeBulkUpdate<T>(
    items: T[],
    operation: (item: T) => Promise<any>,
    options: BulkOptions = {}
  ): Promise<BulkResult> {
    const { 
      batchSize = 5, 
      stopOnError = false,
      progressCallback 
    } = options;
    
    const results = [];
    const errors = [];
    
    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(async (item, index) => {
        try {
          const result = await operation(item);
          progressCallback?.(i + index, items.length);
          return { success: true, result };
        } catch (error) {
          if (stopOnError) throw error;
          errors.push({ item, error });
          return { success: false, error };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return { results, errors, summary: this.generateSummary(results) };
  }
}
```

## Phase 4: Advanced Features (Week 3-4)

### 4.1 Intelligent Caching Layer

**Implementation**:
```typescript
// src/services/intelligent-cache.ts
export class IntelligentCache {
  private caches = {
    contracts: new LRUCache<string, Contract>({ ttl: 24 * 60 * 60 * 1000 }), // 24h
    properties: new LRUCache<string, Property>({ ttl: 5 * 60 * 1000 }), // 5m
    dns: new LRUCache<string, DNSZone>({ ttl: 60 * 1000 }) // 1m
  };
  
  async getWithRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const cached = this.caches[options.type].get(key);
    
    if (cached && !options.forceRefresh) {
      // Background refresh if stale
      if (this.isStale(cached, options)) {
        this.backgroundRefresh(key, fetcher, options);
      }
      return cached;
    }
    
    const fresh = await fetcher();
    this.caches[options.type].set(key, fresh);
    return fresh;
  }
}
```

### 4.2 Workflow State Management

**Implementation**:
```typescript
// src/services/workflow-state-manager.ts
export class WorkflowStateManager {
  private states = new Map<string, WorkflowState>();
  
  async trackWorkflow(
    workflowId: string,
    steps: WorkflowStep[]
  ): Promise<void> {
    const state: WorkflowState = {
      id: workflowId,
      steps: steps.map(s => ({ ...s, status: 'pending' })),
      startTime: Date.now(),
      currentStep: 0
    };
    
    this.states.set(workflowId, state);
    
    // Execute steps
    for (let i = 0; i < steps.length; i++) {
      state.currentStep = i;
      state.steps[i].status = 'in_progress';
      
      try {
        const result = await steps[i].execute(state.context);
        state.steps[i].status = 'completed';
        state.steps[i].result = result;
        state.context = { ...state.context, ...result };
      } catch (error) {
        state.steps[i].status = 'failed';
        state.steps[i].error = error;
        
        if (steps[i].critical) {
          throw new WorkflowError(`Step ${i} failed`, state);
        }
      }
    }
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
// src/__tests__/smart-discovery.test.ts
describe('SmartDiscoveryService', () => {
  it('should discover contracts when none provided', async () => {
    const service = new SmartDiscoveryService();
    const contexts = await service.discoverPropertyContext();
    expect(contexts.length).toBeGreaterThan(0);
    expect(contexts[0]).toHaveProperty('contractId');
    expect(contexts[0]).toHaveProperty('groupId');
  });
  
  it('should find property across multiple contracts', async () => {
    const service = new SmartDiscoveryService();
    const context = await service.discoverPropertyContext('www.example.com');
    expect(context).toBeDefined();
  });
});
```

### Integration Tests
```typescript
// src/__tests__/workflows.integration.test.ts
describe('Complete Workflows', () => {
  it('should deploy new site end-to-end', async () => {
    const workflow = new NewSiteDeploymentWorkflow();
    const result = await workflow.deploy({
      domain: 'test.example.com',
      template: 'static_website',
      security: 'basic'
    });
    
    expect(result.property).toBeDefined();
    expect(result.certificate.status).toBe('deployed');
    expect(result.activation.network).toBe('PRODUCTION');
  });
});
```

## Migration Guide

### For Existing Users
```typescript
// Old way - requires all IDs
await property_list({ 
  contractId: 'ctr_123', 
  groupId: 'grp_456' 
});

// New way - auto-discovery
await property_list(); // Lists all properties across all contracts

// Old way - manual changelist
const cl = await dns_changelist_create({ zone: 'example.com' });
await dns_record_add({ changelistId: cl.id, ... });
await dns_changelist_submit({ changelistId: cl.id });
await dns_changelist_activate({ changelistId: cl.id });

// New way - simple update
await dns_record_update_simple({ 
  zone: 'example.com',
  name: 'www',
  type: 'A',
  data: ['1.2.3.4']
});
```

## Performance Considerations

### Caching Strategy
- Contract/Group mappings: Cache for 24 hours
- Property lists: Cache for 5 minutes  
- DNS records: Cache for 1 minute
- Activation status: Real-time, no caching

### Rate Limiting
- Implement exponential backoff
- Respect per-customer rate limits
- Batch operations where possible

## Security Considerations

### API Key Management
- Never log full API credentials
- Rotate account keys regularly
- Use separate keys per customer

### Error Handling
- Sanitize error messages
- Don't expose internal IDs unnecessarily
- Log security events

## Conclusion

This comprehensive implementation guide provides a complete roadmap for transforming Akamai's complex APIs into user-friendly MCP tools. By following these patterns and implementations, we can deliver a tool that feels like having an Akamai expert on the team, not just an API wrapper.