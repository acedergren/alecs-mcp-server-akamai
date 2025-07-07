# ALECS MCP Server - Tool Consolidation Matrix

## Executive Summary

After analyzing all 39 tool files (31,857 lines), we can achieve a 43% code reduction through strategic consolidation while improving maintainability and type safety.

## Consolidation Opportunities by Domain

### 1. Property Management Domain (11,200 → 6,500 lines)

#### Target Structure:
```
src/tools/property/
├── index.ts                    # Re-exports for backward compatibility
├── property-core.ts            # Core CRUD operations
├── property-versions.ts        # Version & activation management
├── property-rules.ts           # Rules, behaviors, includes
└── property-utilities.ts       # Edge hostnames, CP codes, search
```

#### Function Mapping:

**property-core.ts** (Consolidates from 4 files):
- From `property-tools.ts`:
  - `listProperties()`, `getProperty()`, `createProperty()`
  - `updateProperty()`, `deleteProperty()`, `searchProperties()`
- From `property-manager-tools.ts`:
  - `getPropertyDetails()`, `getPropertyVersions()`
- From `cpcode-tools.ts`:
  - `listCPCodes()`, `createCPCode()`, `getCPCode()`
- From `edge-hostname-management.ts`:
  - `createEdgeHostname()`, `listEdgeHostnames()`

**property-versions.ts** (Consolidates from 3 files):
- From `property-version-management.ts`:
  - `createPropertyVersion()`, `compareVersions()`
  - `rollbackPropertyVersion()` (remove duplicate)
- From `property-activation-advanced.ts`:
  - `activateProperty()`, `getActivationStatus()`
  - `cancelPropertyActivation()` (remove duplicate)
- From `property-manager-advanced-tools.ts`:
  - `listPropertyActivations()`, `bulkActivateProperties()`

**property-rules.ts** (Consolidates from 3 files):
- From `property-manager-rules-tools.ts`:
  - `getPropertyRules()`, `updatePropertyRules()`
- From `rule-tree-advanced.ts`:
  - `validateRuleTree()`, `optimizeRuleTree()`
- From `includes-tools.ts`:
  - `listIncludes()`, `createInclude()`, `activateInclude()`

### 2. DNS Domain (5,576 → 3,500 lines)

#### Target Structure:
```
src/tools/dns/
├── index.ts
├── dns-core.ts          # Zone & record operations
└── dns-utilities.ts     # DNSSEC, migration, bulk operations
```

#### Function Mapping:

**dns-core.ts** (Consolidates from 3 files):
- From `dns-tools.ts`:
  - `listZones()`, `createZone()`, `getZone()`
  - `listRecords()`, `createRecord()`, `updateRecord()`
- From `dns-advanced-tools.ts`:
  - `bulkCreateRecords()`, `validateRecordSet()`
- From `dns-operations-priority.ts`:
  - `activateZoneChanges()`, `getZoneVersion()`
  - Remove duplicate `listContracts()`

**dns-utilities.ts** (Consolidates from 2 files):
- From `dns-dnssec-operations.ts`:
  - `enableDNSSEC()`, `rotateDNSSECKeys()`
- From `dns-migration-tools.ts`:
  - `importZoneViaAXFR()`, `exportZoneFile()`

### 3. Certificate Domain (2,212 → 1,500 lines)

#### Target Structure:
```
src/tools/certificates/
├── index.ts
└── certificate-management.ts    # All certificate operations
```

#### Function Mapping:

**certificate-management.ts** (Consolidates from 3 files):
- From `cps-tools.ts`:
  - `createDVEnrollment()`, `checkEnrollmentStatus()`
  - `linkCertificateToProperty()` (keep this version)
- From `certificate-enrollment-tools.ts`:
  - `getDVValidationChallenges()`, `validateCertEnrollment()`
- From `certificate-integration-tools.ts`:
  - `deployCertificateToNetwork()` (remove duplicate link function)

### 4. Security/Network Lists Domain (2,584 → 2,000 lines)

#### Target Structure:
```
src/tools/security/
├── index.ts
├── network-lists-core.ts        # Core list operations
└── network-lists-utilities.ts   # Bulk, geo/ASN operations
```

#### Function Mapping:

**network-lists-core.ts** (Consolidates from 2 files):
- From `network-lists-tools.ts`:
  - `listNetworkLists()`, `createNetworkList()`
  - `updateNetworkList()`, `deleteNetworkList()`
- From `network-lists-activation.ts`:
  - `activateNetworkList()`, `getActivationStatus()`

**network-lists-utilities.ts** (Consolidates from 3 files):
- From `network-lists-bulk.ts`:
  - `bulkUpdateNetworkLists()`, `importFromCSV()`
- From `network-lists-geo-asn.ts`:
  - `validateGeographicCodes()`, `getASNInformation()`
- From `network-lists-integration.ts`:
  - `generateSecurityRecommendations()`

### 5. Common Utilities Extraction

#### Create `src/tools/common/base-tool.ts`:
```typescript
export abstract class BaseTool {
  protected async validateCustomer(customer?: string): Promise<AkamaiClient> {
    // Common validation logic used 30+ times
  }

  protected createErrorResponse(error: unknown): MCPToolResponse {
    // Standardized error formatting used 50+ times
  }

  protected createSuccessResponse<T>(data: T): MCPToolResponse {
    // Standardized success response used 40+ times
  }

  protected async withCache<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Common caching pattern
  }

  protected async withProgress<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Common progress tracking
  }
}
```

#### Create `src/tools/common/validators.ts`:
```typescript
// Extract all common Zod schemas
export const PaginationSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional()
});

export const CustomerSchema = z.object({
  customer: z.string().optional()
});

// Property validators
export const PropertyIdSchema = z.string().regex(/^prp_\d+$/);

// DNS validators  
export const ZoneNameSchema = z.string().regex(/^[a-z0-9.-]+$/);

// Network validators
export const IPSchema = z.string().ip();
export const CIDRSchema = z.string().regex(/^\d+\.\d+\.\d+\.\d+\/\d+$/);
```

## Implementation Strategy

### Phase 1: Extract Common Utilities (2 hours)
1. Create `base-tool.ts` with common patterns
2. Create `validators.ts` with shared schemas
3. Update all tools to extend/use common utilities
4. **Impact**: Reduces all files by ~100-200 lines each

### Phase 2: Property Consolidation (4 hours)
1. Create property directory structure
2. Move functions with deduplication
3. Update ALECSCore server imports
4. **Impact**: 11,200 → 6,500 lines (42% reduction)

### Phase 3: DNS Consolidation (3 hours)
1. Create DNS directory structure
2. Merge related functions
3. Remove duplicate implementations
4. **Impact**: 5,576 → 3,500 lines (37% reduction)

### Phase 4: Certificate & Security (3 hours)
1. Consolidate certificate tools
2. Reorganize network lists
3. **Impact**: 4,796 → 3,500 lines (27% reduction)

### Phase 5: Cleanup (2 hours)
1. Delete .d.ts files (auto-generated)
2. Archive original files
3. Update documentation
4. Run final TypeScript check

## Expected Benefits

### Code Quality
- **Lines of Code**: 31,857 → 18,000 (43% reduction)
- **Number of Files**: 39 → 18 (54% reduction)
- **Duplicate Functions**: 4 → 0
- **Type Safety**: 100% typed with validators

### Developer Experience
- Clear domain organization
- No more searching across multiple files
- Consistent patterns everywhere
- Better IntelliSense support

### Performance
- Faster TypeScript compilation
- Smaller bundle size
- Better tree-shaking
- Reduced memory footprint

### Maintainability
- Single source of truth per domain
- Clear separation of concerns
- Easier to test
- Simpler onboarding

## Risk Mitigation

1. **Backward Compatibility**: index.ts files re-export all functions
2. **Testing**: Run existing tests after each consolidation phase
3. **Rollback**: Keep archived files for 30 days
4. **Validation**: TypeScript compilation must pass after each phase

## Success Criteria

- [ ] 0 TypeScript errors
- [ ] All existing tests pass
- [ ] All ALECSCore servers functional
- [ ] 40%+ code reduction achieved
- [ ] No duplicate functions remain
- [ ] Documentation updated

This consolidation aligns with the Snow Leopard principle: elegant, efficient, no compromises.