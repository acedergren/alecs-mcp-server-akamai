# Tool Cleanup Action Plan

## Priority 1: Critical Issues (Do First)

### 1. Fix the Disconnected Tool Registry
**Problem**: `all-tools-registry.ts` registers 158 tools but isn't used anywhere
**Actions**:
- [ ] Option A: Integrate `all-tools-registry.ts` into `modular-server-factory.ts`
- [ ] Option B: Delete `all-tools-registry.ts` if not needed
- [ ] Update server initialization to use centralized registry

### 2. Remove Mock/Fake Tools
**Problem**: 14 reporting tools return fake data
**Actions**:
- [ ] Delete all mock reporting tool functions from `reporting-tools.ts`
- [ ] Remove reporting tool registrations from `all-tools-registry.ts`
- [ ] Create issue to implement real Reporting API integration later

## Priority 2: Consolidate Duplicates

### 3. Merge Property Management Tools
**Problem**: 4+ files with overlapping functionality
**Actions**:
- [ ] Create single `property-manager-unified.ts` combining:
  - `property-tools.ts` (basic operations)
  - `property-manager.ts` (extended features)
  - `property-manager-tools.ts` (main implementation)
  - `property-manager-advanced-tools.ts` (advanced features)
- [ ] Update all imports to use unified tool
- [ ] Delete redundant files

### 4. Clean DNS Tool Overlap
**Actions**:
- [ ] Merge `dns-operations-priority.ts` into `dns-advanced-tools.ts`
- [ ] Ensure no duplicate functions across DNS tools
- [ ] Create clear separation: basic vs advanced operations

## Priority 3: Quick Wins

### 5. Delete Obsolete Files
**Actions**:
- [ ] Remove all `*.backup-before-cleanup` files
- [ ] Delete commented-out elicitation tools (already marked as removed)
- [ ] Clean up unused imports in all tool files

### 6. Fix Commented Valid Tools
**Actions**:
- [ ] Uncomment these valid tools in `all-tools-registry.ts`:
  ```typescript
  import { generateASNSecurityRecommendations, listCommonGeographicCodes } from './security/network-lists-geo-asn';
  ```
- [ ] Add proper registrations for these tools

## Priority 4: Organization Improvements

### 7. Standardize Tool Structure
**Actions**:
- [ ] Create tool interface standard:
  ```typescript
  interface AkamaiTool {
    name: string;
    description: string;
    api: 'PAPI' | 'DNS' | 'CPS' | 'FastPurge' | 'NetworkLists' | 'AppSec';
    handler: (client: AkamaiClient, params: any) => Promise<MCPToolResponse>;
  }
  ```
- [ ] Update all tools to follow this structure
- [ ] Add API version documentation to each tool

### 8. Create Missing API Tools (Future)
**Actions**:
- [ ] Add Image & Video Manager tools
- [ ] Implement Bot Manager integration
- [ ] Add DataStream log delivery tools
- [ ] Create mPulse monitoring tools

## Implementation Order

1. **Week 1**: Fix registry (Priority 1.1) and remove fake tools (Priority 1.2)
2. **Week 2**: Consolidate property tools (Priority 2.3) and DNS tools (Priority 2.4)
3. **Week 3**: Quick cleanup (Priority 3) and organizational improvements (Priority 4)
4. **Future**: Add missing API coverage as needed

## Success Metrics

- Reduce tool files from 59 to ~40
- Reduce registered tools from 158 to ~100 (removing duplicates/fakes)
- 100% of registered tools actually available to users
- 0 mock implementations in production
- Clear 1:1 mapping between tools and Akamai APIs

## Notes

- Keep backup of current state before major changes
- Test each consolidation thoroughly
- Update documentation as tools are merged
- Ensure all customer-specific functionality remains intact