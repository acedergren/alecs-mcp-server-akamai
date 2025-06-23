# Consolidated Tools Implementation Guide

## Overview

Based on my analysis, here's the complete structure of the consolidated tools that will help fix the TypeScript errors.

## Tool Signatures

### 1. Certificate Tool
```typescript
interface CertificateToolParams {
  action: 'list' | 'secure' | 'renew' | 'revoke' | 'validate' | 'deploy' | 'status' | 'monitor';
  ids?: string | string[];  // Certificate IDs
  options?: {
    detailed: boolean;
    rollbackOnError: boolean;
    validateFirst: boolean;
    testDeployment: boolean;
    includeExpiring: boolean;
    showRecommendations: boolean;
    certificateType?: 'DV' | 'EV' | 'OV';
    enhancedTLS?: boolean;
    domains?: string[];
    network?: 'staging' | 'production';
    monitoring?: {
      enabled: boolean;
      alertThreshold: number;
      notificationEmail?: string;
    };
  };
  customer?: string;
}
```

### 2. DNS Tool
```typescript
interface DNSToolParams {
  action: 'list' | 'create' | 'update' | 'delete' | 'migrate' | 'validate' | 'activate' | 'monitor';
  zones?: string | string[];  // NOT 'zone' - this is the error!
  options?: {
    validateOnly: boolean;
    testFirst: boolean;
    backupFirst: boolean;
    rollbackOnError: boolean;
    businessAction?: 'setup-email' | 'add-subdomain' | 'enable-ssl' | 'verify-ownership' | 'setup-redirects';
    emailProvider?: 'google' | 'microsoft' | 'custom';
    source?: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'other';
    recordTypes?: string[];
    ttl?: number;
    includeSubdomains?: boolean;
    dnssec?: boolean;
    monitoring?: {
      enabled: boolean;
      healthCheck: boolean;
      alertOnFailure: boolean;
    };
  };
  customer?: string;
}
```

### 3. Property Tool
```typescript
interface PropertyToolParams {
  action: 'list' | 'create' | 'activate' | 'analyze' | 'optimize' | 'rollback' | 'clone' | 'status';
  ids?: string | string[];  // Property IDs
  options?: {
    view: 'simple' | 'detailed' | 'business';
    includeRules: boolean;
    name?: string;
    filter?: {
      status?: 'all' | 'active' | 'inactive';
      lastModified?: string;
      businessPurpose?: string;
    };
    hostnames?: string[];
    businessPurpose?: string;
    purpose?: 'website' | 'api' | 'mobile-app' | 'media-delivery' | 'software-download';
    product?: string;
    securityLevel?: 'standard' | 'enhanced' | 'maximum';
    performance?: {
      caching: 'aggressive' | 'standard' | 'bypass';
      http2: boolean;
      http3: boolean;
      sureRoute: boolean;
    };
  };
  customer?: string;
}
```

### 4. Search Tool
```typescript
interface SearchToolParams {
  action: 'find' | 'filter' | 'analyze' | 'suggest';
  query: string | {
    text?: string;
    type?: string;
    filters?: Record<string, any>;
  };
  options?: {
    limit: number;  // Required with default
    sortBy: 'relevance' | 'name' | 'modified' | 'created' | 'status';
    offset: number;  // Required with default
    format: 'simple' | 'detailed' | 'tree' | 'graph';
    types: Array<'all' | 'property' | 'hostname' | 'certificate' | 'dns' | 'contract' | 'group' | 'cpcode' | 'network-list' | 'security' | 'alert'>;
    includeDeleted: boolean;
    includeInactive: boolean;
    searchContent: boolean;
    fuzzyMatch: boolean;
    filters: Record<string, any>;
    aggregations: string[];
    highlight: boolean;
    groupBy: 'type' | 'status' | 'customer' | 'none';
  };
  customer?: string;
}
```

### 5. Deploy Tool
```typescript
interface DeployToolParams {
  action: 'status' | 'activate' | 'validate' | 'rollback' | 'schedule' | 'cancel' | 'monitor' | 'history';
  resources?: any;  // Flexible type for different resources
  options?: {
    network: 'staging' | 'production' | 'both';
    format: 'summary' | 'detailed' | 'timeline';
    strategy: 'immediate' | 'scheduled' | 'canary' | 'blue-green' | 'maintenance';
    dryRun: boolean;
    verbose: boolean;
    coordination?: {
      notifyEmail?: string[];
      requireApproval?: boolean;
      approvers?: string[];
      maintenanceWindow?: {
        start: string;
        end: string;
      };
    };
  };
  customer?: string;
}
```

## Common Patterns

### 1. Default Values Pattern
```typescript
const defaults = {
  options: {
    // Tool-specific defaults
    detailed: false,
    validateFirst: true,
    rollbackOnError: true,
    // ... other defaults
  },
  action: 'list' as const,
};

const params = { ...defaults, ...args };
```

### 2. Search Tool Defaults
```typescript
const searchDefaults = {
  options: {
    limit: 50,
    offset: 0,
    sortBy: 'relevance' as const,
    format: 'simple' as const,
    types: ['all'] as const,
    includeDeleted: false,
    includeInactive: false,
    searchContent: true,
    fuzzyMatch: true,
    filters: {},
    aggregations: [],
    highlight: true,
    groupBy: 'type' as const,
  },
};
```

### 3. Handling Unknown Args
```typescript
function handleCertificateTool(args: Record<string, unknown>) {
  // Create properly typed params
  const params: CertificateToolParams = {
    action: (args.action as CertificateToolParams['action']) || 'list',
    ids: args.ids as string | string[] | undefined,
    options: {
      detailed: false,
      rollbackOnError: true,
      validateFirst: true,
      testDeployment: false,
      includeExpiring: false,
      showRecommendations: true,
      ...((args.options || {}) as Partial<CertificateToolParams['options']>),
    },
    customer: args.customer as string | undefined,
  };
  
  return certificateTool(params);
}
```

## Fix Examples

### Fix 1: Certificate Tool (Line 147)
```typescript
// Before (error):
await certificateTool(args as any);

// After (fixed):
await certificateTool({
  action: args.action || 'list',
  ids: args.ids,
  options: {
    detailed: false,
    rollbackOnError: true,
    validateFirst: true,
    testDeployment: false,
    includeExpiring: false,
    showRecommendations: true,
    ...(args.options || {}),
  },
  customer: args.customer,
});
```

### Fix 2: Search Tool (Line 167)
```typescript
// Before (error):
await searchTool({
  options: { types: ['certificate'] },
  action: 'search',
  query: args.query
});

// After (fixed):
await searchTool({
  action: 'find',
  query: args.query || '',
  options: {
    limit: 50,
    offset: 0,
    sortBy: 'relevance',
    format: 'simple',
    types: ['certificate'],
    includeDeleted: false,
    includeInactive: false,
    searchContent: true,
    fuzzyMatch: true,
    filters: {},
    aggregations: [],
    highlight: true,
    groupBy: 'type',
  },
  customer: args.customer,
});
```

### Fix 3: DNS Tool Property Name (Lines 246, 258, 296)
```typescript
// Before (error):
zone: args.zone

// After (fixed):
zones: args.zone  // or args.zones if that's the source
```

## Implementation Checklist for Alex

- [ ] Create type definitions file for all tool params
- [ ] Implement default value objects for each tool
- [ ] Create wrapper functions that ensure type safety
- [ ] Fix property name mismatches (zone → zones)
- [ ] Remove unknown properties (autoRenew, notify)
- [ ] Add all required search options with defaults
- [ ] Test each consolidated server individually
- [ ] Run strict TypeScript build to verify

## Testing Strategy

```bash
# Test individual files
npx tsc --noEmit src/servers/certs-server-consolidated.ts
npx tsc --noEmit src/servers/dns-server-consolidated.ts
npx tsc --noEmit src/servers/property-server-consolidated.ts
npx tsc --noEmit src/servers/security-server-consolidated.ts

# Full build
npm run build:strict
```