# Tool Consolidation Implementation Plan

## Phase 1: Core Resource Tools (Priority: High)

### 1. Property Tool (Consolidates 47 tools → 1 tool)

**Current scattered tools:**

- listProperties, listPropertiesTreeView, getProperty, createProperty
- createPropertyVersion, createPropertyVersionEnhanced
- activateProperty, activatePropertyWithMonitoring
- updatePropertyRules, updatePropertyRulesEnhanced
- cloneProperty, bulkCloneProperties
- And 37 more...

**New consolidated tool:**

```typescript
// src/tools/consolidated/property-tool.ts
export const propertyTool = {
  name: 'property',
  description: 'Comprehensive property management tool',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'get', 'create', 'update', 'activate', 'clone', 'delete', 'search'],
        description: 'Action to perform',
      },
      ids: {
        oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        description: 'Property ID(s) - supports bulk operations',
      },
      options: {
        type: 'object',
        description: 'Action-specific options',
        properties: {
          // List options
          treeView: { type: 'boolean' },
          groupId: { type: 'string' },
          contractId: { type: 'string' },

          // Create/Update options
          name: { type: 'string' },
          productId: { type: 'string' },
          rules: { type: 'object' },
          hostnames: { type: 'array' },
          version: { type: 'number' },

          // Activation options
          network: { type: 'string', enum: ['staging', 'production'] },
          notifyEmails: { type: 'array' },
          acknowledgeWarnings: { type: 'array' },
          monitor: { type: 'boolean' },

          // Search options
          query: { type: 'string' },
          detailed: { type: 'boolean' },
        },
      },
    },
    required: ['action'],
  },
};
```

### 2. DNS Tool (Consolidates 33 tools → 1 tool)

**Current scattered tools:**

- listZones, getZone, createZone, deleteZone
- listRecords, upsertRecord, deleteRecord, createMultipleRecordSets
- importFromCloudflare, importZoneViaAXFR, parseZoneFile
- activateZone, checkZoneActivationStatus
- And 23 more...

**New consolidated tool:**

```typescript
// src/tools/consolidated/dns-tool.ts
export const dnsTool = {
  name: 'dns',
  description: 'Comprehensive DNS zone and record management',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list-zones', 'manage-zone', 'manage-records', 'import', 'activate', 'validate'],
        description: 'Action to perform',
      },
      zones: {
        oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        description: 'Zone name(s) - supports bulk operations',
      },
      options: {
        type: 'object',
        properties: {
          // Zone management
          type: { type: 'string', enum: ['PRIMARY', 'SECONDARY', 'ALIAS'] },
          masters: { type: 'array' },

          // Record management
          records: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                ttl: { type: 'number' },
                rdata: { type: 'array' },
                operation: { type: 'string', enum: ['create', 'update', 'delete'] },
              },
            },
          },

          // Import options
          source: { type: 'string', enum: ['file', 'axfr', 'cloudflare', 'route53'] },
          sourceData: { type: 'string' },

          // Activation options
          comment: { type: 'string' },
          bypassSafetyChecks: { type: 'boolean' },
        },
      },
    },
    required: ['action'],
  },
};
```

### 3. Certificate Tool (Consolidates 19 tools → 1 tool)

**Current scattered tools:**

- createDVEnrollment, enrollCertificateWithValidation
- checkDVEnrollmentStatus, monitorCertificateEnrollment
- deployCertificateToNetwork, linkCertificateToProperty
- And 13 more...

**New consolidated tool:**

```typescript
// src/tools/consolidated/certificate-tool.ts
export const certificateTool = {
  name: 'certificate',
  description: 'Certificate lifecycle management',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'enroll', 'status', 'validate', 'deploy', 'renew'],
        description: 'Action to perform',
      },
      ids: {
        oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        description: 'Enrollment ID(s)',
      },
      options: {
        type: 'object',
        properties: {
          // Enrollment options
          type: { type: 'string', enum: ['DV', 'EV', 'THIRD_PARTY'] },
          domains: { type: 'array' },
          validationMethod: { type: 'string' },

          // Deployment options
          network: { type: 'string', enum: ['staging', 'production'] },
          propertyIds: { type: 'array' },

          // Monitoring options
          includeHistory: { type: 'boolean' },
          includeDeploymentStatus: { type: 'boolean' },
        },
      },
    },
    required: ['action'],
  },
};
```

## Phase 2: Unified Operations Tools (Priority: Medium)

### 4. Search Tool (Universal Search)

```typescript
// src/tools/consolidated/search-tool.ts
export const searchTool = {
  name: 'search',
  description: 'Universal search across all Akamai resources',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (hostname, property ID, contract ID, etc.)',
      },
      types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['property', 'hostname', 'certificate', 'contract', 'group', 'cpcode'],
        },
        description: 'Resource types to search (default: all)',
      },
      options: {
        type: 'object',
        properties: {
          detailed: { type: 'boolean' },
          useCache: { type: 'boolean' },
          limit: { type: 'number' },
        },
      },
    },
    required: ['query'],
  },
};
```

### 5. Deploy Tool (Unified Activation)

```typescript
// src/tools/consolidated/deploy-tool.ts
export const deployTool = {
  name: 'deploy',
  description: 'Unified deployment and activation for all resources',
  inputSchema: {
    type: 'object',
    properties: {
      resource: {
        type: 'string',
        enum: ['property', 'dns', 'certificate', 'include'],
        description: 'Resource type to deploy',
      },
      action: {
        type: 'string',
        enum: ['activate', 'status', 'rollback', 'schedule'],
        description: 'Deployment action',
      },
      ids: {
        oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        description: 'Resource ID(s) to deploy',
      },
      options: {
        type: 'object',
        properties: {
          network: { type: 'string', enum: ['staging', 'production'] },
          notifyEmails: { type: 'array' },
          acknowledgeWarnings: { type: 'array' },
          schedule: { type: 'string' },
          dryRun: { type: 'boolean' },
        },
      },
    },
    required: ['resource', 'action', 'ids'],
  },
};
```

### 6. Analytics Tool (Replaces reporting/monitoring tools)

```typescript
// src/tools/consolidated/analytics-tool.ts
export const analyticsTool = {
  name: 'analytics',
  description: 'Performance analytics and reporting',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['traffic', 'performance', 'costs', 'errors', 'alerts'],
        description: 'Analytics action',
      },
      options: {
        type: 'object',
        properties: {
          metrics: { type: 'array' },
          period: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' },
              granularity: { type: 'string' },
            },
          },
          filters: {
            type: 'object',
            properties: {
              cpCodes: { type: 'array' },
              hostnames: { type: 'array' },
              countries: { type: 'array' },
            },
          },
          format: { type: 'string', enum: ['json', 'csv', 'xlsx'] },
        },
      },
    },
    required: ['action'],
  },
};
```

### 7. Admin Tool (Manages contracts, groups, CP codes)

```typescript
// src/tools/consolidated/admin-tool.ts
export const adminTool = {
  name: 'admin',
  description: 'Administrative operations for contracts, groups, and CP codes',
  inputSchema: {
    type: 'object',
    properties: {
      resource: {
        type: 'string',
        enum: ['contract', 'group', 'cpcode', 'user', 'account'],
        description: 'Administrative resource type',
      },
      action: {
        type: 'string',
        enum: ['list', 'get', 'create', 'update', 'delete', 'move'],
        description: 'Action to perform',
      },
      ids: {
        oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        description: 'Resource ID(s)',
      },
      options: {
        type: 'object',
        properties: {
          // Contract operations
          searchTerm: { type: 'string' },
          includeExpired: { type: 'boolean' },

          // Group operations
          parentGroupId: { type: 'string' },
          groupName: { type: 'string' },
          includeSubgroups: { type: 'boolean' },

          // CP Code operations
          cpcodeName: { type: 'string' },
          productId: { type: 'string' },
          contractId: { type: 'string' },
          groupId: { type: 'string' },

          // User/permissions
          permissions: { type: 'array' },
          role: { type: 'string' },
        },
      },
    },
    required: ['resource', 'action'],
  },
};
```

### 8. Config Tool (Unified configuration management)

```typescript
// src/tools/consolidated/config-tool.ts
export const configTool = {
  name: 'config',
  description: 'Manage all configuration elements (rules, includes, behaviors)',
  inputSchema: {
    type: 'object',
    properties: {
      resource: {
        type: 'string',
        enum: ['rules', 'include', 'behavior', 'variable', 'template'],
        description: 'Configuration resource type',
      },
      action: {
        type: 'string',
        enum: ['get', 'update', 'validate', 'apply', 'diff'],
        description: 'Configuration action',
      },
      ids: {
        oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        description: 'Resource identifier(s)',
      },
      options: {
        type: 'object',
        properties: {
          // Rules management
          ruleTree: { type: 'object' },
          ruleFormat: { type: 'string' },

          // Include management
          includeType: { type: 'string' },
          parentProperty: { type: 'string' },

          // Template operations
          templateId: { type: 'string' },
          variables: { type: 'object' },

          // Validation
          validateMode: { type: 'string', enum: ['fast', 'full'] },
        },
      },
    },
    required: ['resource', 'action'],
  },
};
```

## Implementation Strategy

### Step 1: Create Adapter Layer (Week 1-2)

```typescript
// src/tools/adapters/legacy-adapter.ts
export class LegacyToolAdapter {
  constructor(private consolidatedTools: Map<string, ConsolidatedTool>) {}

  // Map old tool calls to new consolidated tools
  async callLegacyTool(toolName: string, params: any): Promise<any> {
    const mapping = this.getLegacyMapping(toolName);
    const consolidatedTool = this.consolidatedTools.get(mapping.tool);

    return consolidatedTool.execute({
      action: mapping.action,
      ...this.transformParams(params, mapping),
    });
  }
}
```

### Step 2: Implement Core Tools (Week 2-3)

- Start with property tool (most complex)
- Then DNS tool
- Certificate tool
- Search tool (already partially exists)

### Step 3: Testing & Migration (Week 3-4)

```typescript
// src/tools/migration/test-suite.ts
export class ToolMigrationTestSuite {
  async testCompatibility(oldTool: string, newTool: string) {
    // Test that old tool behavior is preserved
    const testCases = this.getTestCasesForTool(oldTool);

    for (const testCase of testCases) {
      const oldResult = await this.callOldTool(oldTool, testCase.params);
      const newResult = await this.callNewTool(newTool, testCase.mappedParams);

      assert.deepEqual(oldResult, newResult);
    }
  }
}
```

### Step 4: Gradual Rollout (Week 4-5)

1. Deploy with both old and new tools available
2. Add deprecation warnings to old tools
3. Monitor usage patterns
4. Provide migration guides

### Step 5: Cleanup (Week 6+)

1. Remove deprecated tools in next major version
2. Archive old tool implementations
3. Update all documentation

## Benefits Measurement

### Before Consolidation:

- 180 tools across 43 files
- ~15,000 lines of tool code
- Inconsistent naming and parameters
- High maintenance burden

### After Consolidation:

- ~35 tools in organized structure
- ~5,000 lines of tool code (67% reduction)
- Consistent resource.action pattern
- Bulk operations built-in
- Better discoverability

### Success Metrics:

1. **Developer Experience**: Time to find correct tool reduced by 80%
2. **Maintenance**: Code changes required for new features reduced by 60%
3. **Performance**: Bulk operations 10x faster than sequential calls
4. **Adoption**: 90% of users prefer consolidated tools within 3 months

## Risk Mitigation

1. **Backward Compatibility**: Adapter layer ensures no breaking changes
2. **Testing**: Comprehensive test suite validates behavior preservation
3. **Documentation**: Auto-generated migration guides for each tool
4. **Rollback Plan**: Feature flags to disable new tools if issues arise
5. **User Feedback**: Beta program with key users before full rollout

## Next Steps

1. [ ] Get stakeholder approval for consolidation plan
2. [ ] Create detailed technical design for property tool
3. [ ] Build proof-of-concept with 5 most-used tools
4. [ ] Conduct user testing with beta group
5. [ ] Refine based on feedback
6. [ ] Begin phased implementation

This consolidation will transform the Akamai MCP server from a sprawling collection of tools into a
coherent, powerful, and user-friendly system.
