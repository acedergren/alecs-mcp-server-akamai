---
name: "Hero Feature: Context Enrichment"
about: System for gathering and enriching error context
title: "Build context enrichment system for better error diagnosis"
labels: hero-feature, enhancement, backend, priority:high
assignees: ''

---

## Description
Create a system that automatically gathers and enriches context around errors, including user permissions, recent operations, and resource states to provide more accurate diagnoses.

## Requirements

### Context Collection
- [ ] Capture operation history
- [ ] Track user permissions and access
- [ ] Monitor resource states
- [ ] Collect environment information

### Context Structure
```typescript
interface EnrichedContext {
  // Operation context
  operation: {
    tool: string;
    parameters: any;
    timestamp: Date;
    customer?: string;
    requestId?: string;
  };
  
  // User context
  user: {
    availableCustomers: string[];
    permissions: {
      contracts: ContractAccess[];
      groups: GroupAccess[];
      products: string[];
    };
    recentOperations: Operation[];
    commonErrors: ErrorPattern[];
  };
  
  // Resource context  
  resources: {
    relatedProperties?: Property[];
    relatedContracts?: Contract[];
    relatedGroups?: Group[];
    resourceStates: ResourceState[];
  };
  
  // Environment context
  environment: {
    apiVersion: string;
    rateLimitStatus: RateLimitInfo;
    accountType: string;
    region?: string;
  };
}
```

### Context Gathering Methods

#### Permission Scanner
```typescript
class PermissionScanner {
  async scan(client: AkamaiClient): Promise<UserPermissions> {
    // Parallel permission checks
    const [contracts, groups, products] = await Promise.all([
      this.scanContractAccess(client),
      this.scanGroupAccess(client),
      this.scanProductAccess(client)
    ]);
    
    return {
      contracts: this.analyzeContractPermissions(contracts),
      groups: this.analyzeGroupPermissions(groups),
      products: products,
      limitations: this.identifyLimitations(contracts, groups)
    };
  }
  
  private async scanContractAccess(client: AkamaiClient) {
    // List all contracts
    const contracts = await client.listContracts();
    
    // Test write access for each
    const access = await Promise.all(
      contracts.map(async (contract) => {
        const canWrite = await this.testWriteAccess(client, contract);
        return { contract, canWrite };
      })
    );
    
    return access;
  }
}
```

#### Operation History Tracker
```typescript
class OperationTracker {
  private history: CircularBuffer<Operation>;
  
  track(operation: Operation) {
    this.history.push({
      ...operation,
      timestamp: new Date(),
      result: 'pending'
    });
  }
  
  getRecentErrors(): ErrorContext[] {
    return this.history
      .filter(op => op.result === 'error')
      .map(op => ({
        operation: op,
        error: op.error,
        timeSince: Date.now() - op.timestamp
      }));
  }
  
  findPatterns(): OperationPattern[] {
    // Identify repeated failures
    const patterns = this.analyzePatterns(this.history);
    return patterns.filter(p => p.frequency > 2);
  }
}
```

#### Resource State Monitor
```typescript
class ResourceMonitor {
  async gatherResourceContext(
    error: ParsedError,
    client: AkamaiClient
  ): Promise<ResourceContext> {
    // Extract resource IDs from error
    const resourceIds = this.extractResourceIds(error);
    
    // Gather current states
    const states = await Promise.all([
      this.getPropertyStates(resourceIds.properties, client),
      this.getActivationStates(resourceIds.activations, client),
      this.getContractInfo(resourceIds.contracts, client)
    ]);
    
    return {
      properties: states[0],
      activations: states[1],
      contracts: states[2],
      insights: this.analyzeResourceStates(states)
    };
  }
}
```

### Smart Context Analysis
```typescript
class ContextAnalyzer {
  analyze(context: EnrichedContext): ContextInsights {
    const insights = {
      probableIssues: [],
      alternativeApproaches: [],
      preventionTips: []
    };
    
    // Check for permission mismatches
    if (this.hasPermissionMismatch(context)) {
      insights.probableIssues.push({
        type: 'permission-mismatch',
        description: 'Trying to use resources without access',
        evidence: this.getPermissionEvidence(context)
      });
    }
    
    // Check for repeated errors
    if (this.hasRepeatedErrors(context)) {
      insights.probableIssues.push({
        type: 'repeated-failure',
        description: 'This error has occurred 3 times in last hour',
        suggestion: 'Consider trying a different approach'
      });
    }
    
    // Check for environmental issues
    if (this.hasEnvironmentalIssues(context)) {
      insights.probableIssues.push({
        type: 'rate-limiting',
        description: 'Approaching API rate limits',
        prevention: 'Add delays between operations'
      });
    }
    
    return insights;
  }
}
```

## Implementation Plan

### Phase 1: Basic Context
- [ ] Operation tracking
- [ ] Error history
- [ ] Basic permission checks

### Phase 2: Advanced Context
- [ ] Resource state monitoring
- [ ] Pattern detection
- [ ] Environment analysis

### Phase 3: Intelligence
- [ ] Context correlation
- [ ] Predictive insights
- [ ] Learning from patterns

## Testing Requirements
- [ ] Context accuracy tests
- [ ] Performance impact tests
- [ ] Privacy/security tests
- [ ] Integration tests

## Acceptance Criteria
- [ ] Enriches 100% of error contexts
- [ ] Adds <50ms to error processing
- [ ] Identifies root cause in 80%+ cases
- [ ] No sensitive data exposure
- [ ] Helps prevent repeated errors

## Example Context Enrichment

### Before Enrichment
```json
{
  "error": "403 Forbidden",
  "operation": "property.create"
}
```

### After Enrichment
```json
{
  "error": "403 Forbidden",
  "operation": "property.create",
  "context": {
    "user": {
      "hasAccessToContract": false,
      "alternativeContracts": ["ctr_XYZ", "ctr_ABC"],
      "lastSuccessfulCreate": "2 hours ago with ctr_XYZ"
    },
    "resources": {
      "contractStatus": "active",
      "contractOwner": "different-account",
      "similarPropertiesIn": ["ctr_XYZ"]
    },
    "insights": {
      "rootCause": "Contract belongs to parent account",
      "suggestion": "Use contract from your account or enable account switching"
    }
  }
}
```

## Dependencies
- Client permission APIs
- Operation history storage
- Resource state APIs
- Pattern matching algorithms