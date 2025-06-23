# Consolidated Tool Type Implementation Guide

## Overview

The consolidated tools use a consistent pattern with Zod schemas for type validation. Each tool follows this structure:
- Action-based interface (what to do)
- Optional resource identifiers (what to act on)
- Options object for configuration
- Customer parameter for multi-tenant support

## Tool Type Signatures

### 1. Property Tool

```typescript
import { z } from 'zod';

// Actions
type PropertyAction = 'list' | 'get' | 'create' | 'update' | 'activate' | 
                     'clone' | 'delete' | 'search' | 'analyze' | 'optimize';

// Schema
const PropertyToolSchema = z.object({
  action: z.enum([...PropertyAction]),
  ids: z.union([z.string(), z.array(z.string())]).optional(),
  options: z.object({
    // Business context
    view: z.enum(['simple', 'detailed', 'business']).default('simple'),
    filter: z.object({
      status: z.enum(['active', 'inactive', 'all']).optional(),
      businessPurpose: z.string().optional(),
      lastModified: z.string().optional(),
    }).optional(),
    
    // For create/update
    name: z.string().optional(),
    businessPurpose: z.string().optional(),
    hostnames: z.array(z.string()).optional(),
    basedOn: z.string().optional(),
    
    // For analysis
    goal: z.string().optional(),
    includeRules: z.boolean().default(false),
  }).default({}),
  
  customer: z.string().optional(),
});

// Usage
await handlePropertyTool({
  action: 'create',
  options: {
    name: 'My Property',
    businessPurpose: 'E-commerce site',
    hostnames: ['example.com', 'www.example.com'],
    view: 'business'
  },
  customer: 'acme-corp'
});
```

### 2. DNS Tool

```typescript
// Actions
type DNSAction = 'list-zones' | 'manage-zone' | 'manage-records' | 'import' | 
                 'activate' | 'validate' | 'troubleshoot' | 'rollback';

// Schema
const DNSToolSchema = z.object({
  action: z.enum([...DNSAction]),
  zones: z.union([z.string(), z.array(z.string())]).optional(),
  options: z.object({
    // Business shortcuts
    businessAction: z.enum([
      'setup-email',
      'add-subdomain', 
      'enable-ssl',
      'verify-ownership',
      'setup-redirects',
    ]).optional(),
    
    // Email provider shortcuts
    emailProvider: z.enum([
      'google-workspace',
      'microsoft-365',
      'custom',
    ]).optional(),
    
    // Import options
    source: z.enum(['cloudflare', 'route53', 'godaddy', 'zone-file']).optional(),
    validateOnly: z.boolean().default(true),
    testFirst: z.boolean().default(true),
    
    // Records management
    records: z.array(z.object({
      name: z.string(),
      type: z.string(),
      value: z.string(),
      ttl: z.number().optional(),
    })).optional(),
    
    // Safety options
    backupFirst: z.boolean().default(true),
    rollbackOnError: z.boolean().default(true),
  }).default({}),
  
  customer: z.string().optional(),
});

// Usage
await handleDNSTool({
  action: 'manage-records',
  zones: 'example.com',
  options: {
    records: [
      { name: 'www', type: 'A', value: '192.0.2.1', ttl: 300 },
      { name: '@', type: 'MX', value: '10 mail.example.com', ttl: 3600 }
    ],
    backupFirst: true
  }
});
```

### 3. Certificate Tool

```typescript
// Actions  
type CertificateAction = 'list' | 'secure' | 'status' | 'renew' | 'automate' | 
                        'validate' | 'deploy' | 'monitor' | 'troubleshoot';

// Schema
const CertificateToolSchema = z.object({
  action: z.enum([...CertificateAction]),
  
  // Flexible domain handling
  domains: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  
  // Smart options
  options: z.object({
    // Business intent
    purpose: z.enum([
      'secure-website',
      'wildcard',
      'multi-domain',
      'api-security',
      'compliance',
    ]).optional(),
    
    // Automation preferences
    automation: z.object({
      autoRenew: z.boolean().default(true),
      renewalDays: z.number().default(30),
      validationMethod: z.enum(['dns', 'http', 'email', 'auto']).default('auto'),
      notifyBeforeExpiry: z.number().default(14),
    }).optional(),
    
    // Deployment options
    deployment: z.object({
      propertyIds: z.array(z.string()).optional(),
      network: z.enum(['staging', 'production', 'both']).default('both'),
      activateImmediately: z.boolean().default(true),
    }).optional(),
    
    // Certificate preferences
    certificateType: z.enum(['DV', 'EV', 'OV']).optional(),
    provider: z.enum(['lets-encrypt', 'akamai', 'third-party']).optional(),
    
    // Monitoring options
    monitoring: z.object({
      enableAlerts: z.boolean().default(true),
      alertChannels: z.array(z.enum(['email', 'slack', 'webhook'])).optional(),
      checkFrequency: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
    }).optional(),
    
    // Safety options
    validateFirst: z.boolean().default(true),
    testDeployment: z.boolean().default(true),
    rollbackOnError: z.boolean().default(true),
    
    // Display options
    includeExpiring: z.boolean().default(true),
    showRecommendations: z.boolean().default(true),
    detailed: z.boolean().default(false),
  }).default({}),
  
  customer: z.string().optional(),
});

// Usage
await handleCertificateTool({
  action: 'secure',
  domains: ['example.com', 'www.example.com'],
  options: {
    purpose: 'secure-website',
    automation: {
      autoRenew: true,
      validationMethod: 'dns'
    },
    deployment: {
      network: 'production',
      activateImmediately: true
    }
  }
});
```

### 4. Search Tool

```typescript
// Actions
type SearchAction = 'find' | 'locate' | 'discover' | 'analyze' | 'suggest';

// Schema
const SearchToolSchema = z.object({
  action: z.enum([...SearchAction]),
  query: z.union([z.string(), z.object({ text: z.string() })]),
  options: z.object({
    limit: z.number().default(50),
    sortBy: z.enum(['status', 'name', 'modified', 'created', 'relevance']).default('relevance'),
    offset: z.number().default(0),
    format: z.enum(['detailed', 'simple', 'tree', 'graph']).default('simple'),
    types: z.array(z.enum([
      'property', 'all', 'contract', 'hostname', 'certificate', 
      'cpcode', 'activation', 'group', 'user', 'dns-zone', 
      'dns-record', 'alert'
    ])).default(['all']),
    searchMode: z.enum(['exact', 'fuzzy', 'semantic', 'regex']).default('fuzzy'),
    includeRelated: z.boolean().default(false),
    includeInactive: z.boolean().default(false),
    includeDeleted: z.boolean().default(false),
    autoCorrect: z.boolean().default(true),
    expandAcronyms: z.boolean().default(false),
    searchHistory: z.boolean().default(false),
    groupBy: z.enum(['status', 'type', 'date', 'none']).default('none'),
  }).default({}),
  customer: z.string().optional(),
});

// Usage
await handleSearchTool({
  action: 'find',
  query: 'production properties SSL',
  options: {
    types: ['property', 'certificate'],
    format: 'detailed',
    includeRelated: true
  }
});
```

### 5. Deploy Tool

```typescript
// Actions
type DeployAction = 'deploy' | 'status' | 'rollback' | 'schedule' | 
                   'coordinate' | 'validate' | 'monitor' | 'history';

// Schema
const DeployToolSchema = z.object({
  action: z.enum([...DeployAction]),
  resources: z.any().optional(), // Flexible resource input
  options: z.object({
    network: z.enum(['staging', 'production', 'both']).default('staging'),
    strategy: z.enum(['immediate', 'scheduled', 'maintenance', 'canary', 'blue-green']).default('immediate'),
    format: z.enum(['detailed', 'summary', 'timeline']).default('summary'),
    dryRun: z.boolean().default(false),
    verbose: z.boolean().default(false),
    coordination: z.object({
      parallel: z.boolean().default(false),
      staggerDelay: z.number().default(300),
    }).optional(),
  }).default({}),
  customer: z.string().optional(),
});

// Usage
await handleDeployTool({
  action: 'deploy',
  resources: {
    propertyId: 'prp_12345',
    version: 5
  },
  options: {
    network: 'production',
    strategy: 'canary',
    dryRun: false
  }
});
```

## Common Patterns

### 1. All tools accept optional parameters with defaults
```typescript
// Options objects use .default({}) to ensure they're always defined
options: z.object({...}).default({})
```

### 2. Flexible ID/resource handling
```typescript
// Single or array of IDs
ids: z.union([z.string(), z.array(z.string())]).optional()

// Single or array of domains
domains: z.union([z.string(), z.array(z.string())]).optional()
```

### 3. Safety defaults
```typescript
// Most tools default to safe operations
validateFirst: z.boolean().default(true)
testFirst: z.boolean().default(true)
backupFirst: z.boolean().default(true)
rollbackOnError: z.boolean().default(true)
```

### 4. Business-friendly enums
```typescript
// Use descriptive enum values
view: z.enum(['simple', 'detailed', 'business'])
purpose: z.enum(['secure-website', 'wildcard', 'multi-domain'])
```

## Error Handling

All tools return consistent response formats:

```typescript
// Success
{
  status: 'success',
  action: string,
  data: any,
  message?: string
}

// Error
{
  status: 'error',
  action: string,
  error: string,
  details?: any
}
```

## Usage in Workflow Orchestrator

The WorkflowOrchestrator wraps these tools with business-friendly methods:

```typescript
const orchestrator = WorkflowOrchestrator.getInstance();

// Instead of direct tool calls
await orchestrator.createProperty({
  name: 'My Property',
  businessPurpose: 'E-commerce',
  hostnames: ['example.com'],
  customer: 'acme'
});

// Which internally calls
await handlePropertyTool({
  action: 'create',
  options: {
    name: 'My Property',
    businessPurpose: 'E-commerce',
    hostnames: ['example.com'],
    view: 'business',
    includeRules: false
  },
  customer: 'acme'
});
```

## Key Takeaways

1. **Always provide the `action` parameter** - it's required for all tools
2. **Options are always optional** - they have defaults
3. **Use the exact enum values** - TypeScript will enforce this
4. **Customer is optional** - for multi-tenant support
5. **IDs/domains can be single strings or arrays** - tools handle both
6. **Safety defaults are ON** - explicitly disable if needed
7. **Use WorkflowOrchestrator for business operations** - it provides cleaner APIs

## Type Import Example

```typescript
import { z } from 'zod';
import { 
  handlePropertyTool,
  handleDNSTool,
  handleCertificateTool,
  handleSearchTool,
  handleDeployTool
} from '@tools/consolidated';

// Extract types from schemas
type PropertyToolParams = z.infer<typeof PropertyToolSchema>;
type DNSToolParams = z.infer<typeof DNSToolSchema>;
// etc...
```