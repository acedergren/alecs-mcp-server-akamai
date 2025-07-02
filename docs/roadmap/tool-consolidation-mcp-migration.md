# ALECS Tool Consolidation & MCP 2025-06-18 Migration Roadmap

## Executive Summary

This roadmap outlines the strategic consolidation of ALECS tools from 48 files to ~20 files (43% reduction) while simultaneously implementing MCP 2025-06-18 naming conventions. This dual approach minimizes disruption while maximizing long-term maintainability and developer experience.

**Key Outcomes:**
- 43% reduction in tool file count (35+ → ~20 files)
- MCP 2025-06-18 spec compliance with backward compatibility
- Improved junior developer onboarding and tool discoverability
- Zero-downtime migration with gradual deprecation

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Consolidation Strategy](#consolidation-strategy)
3. [MCP 2025-06-18 Migration](#mcp-2025-0618-migration)
4. [Implementation Phases](#implementation-phases)
5. [Technical Implementation](#technical-implementation)
6. [Risk Mitigation](#risk-mitigation)
7. [Success Metrics](#success-metrics)

## Current State Analysis

### Tool Inventory Summary
- **Total Tool Files:** 48
- **Total Registered Tools:** 171
- **Naming Convention:** `kebab-case` (e.g., `list-properties`)
- **Missing MCP 2025 Features:** `title` field for human-readable names

### Major Redundancy Areas

#### Property Management (9 files → 3 files)
```
Current State:
├── property-tools.ts
├── property-manager.ts
├── property-manager-tools.ts
├── property-manager-advanced-tools.ts
├── property-activation-advanced.ts
├── property-version-management.ts
├── property-operations-advanced.ts
├── property-error-handling-tools.ts
└── property-manager-rules-tools.ts
```

#### DNS Management (5 files → 2 files)
```
Current State:
├── dns-tools.ts
├── dns-advanced-tools.ts
├── dns-migration-tools.ts
├── dns-dnssec-operations.ts
└── dns-operations-priority.ts
```

#### Security/Network Lists (5 files → 2 files)
```
Current State:
└── security/
    ├── network-lists-tools.ts
    ├── network-lists-activation.ts
    ├── network-lists-bulk.ts
    ├── network-lists-geo-asn.ts
    └── network-lists-integration.ts
```

## Consolidation Strategy

### Service Domain Organization

#### 1. Property Management Domain
```typescript
// property-core-tools.ts
- CRUD operations (create, get, list, delete)
- Version management (create, list, rollback)
- Activation workflows (activate, status, history)
- Hostname management (add, remove, list)

// property-rules-tools.ts
- Rule tree operations (get, update, validate)
- Rule templates and optimization
- Include management

// property-advanced-tools.ts
- Bulk operations
- Search and analytics
- Configuration drift detection
- Health checks
```

#### 2. DNS Domain
```typescript
// dns-core-tools.ts
- Zone management (create, list, delete)
- Record operations (CRUD)
- DNSSEC operations
- Changelist workflow

// dns-migration-tools.ts (keep separate)
- Import/export operations
- Provider migration
- Bulk operations
```

#### 3. Certificate Domain
```typescript
// certificate-management-tools.ts (unified)
- DV enrollment
- Certificate lifecycle
- DNS validation
- Property integration
```

## MCP 2025-06-18 Migration

### Naming Convention Changes

#### Current vs Future Naming
```typescript
// OLD (kebab-case)
'list-properties'
'get-property-version'
'activate-network-list'

// NEW (snake_case with title)
{
  name: 'property_list',
  title: 'List Properties',
  description: '...'
}
```

### Leveraging Existing Infrastructure

#### 1. MCP Compatibility Wrapper
- Location: `src/utils/mcp-compatibility-wrapper.ts`
- Detects client protocol version
- Handles response format conversion
- Already production-tested

#### 2. Migration Utilities
- Location: `src/utils/mcp-2025-migration.ts`
- `createBackwardsCompatibleTool()` function
- Automated migration report generation
- Name validation utilities

#### 3. Tool Handler Wrapper
- Location: `src/tools/all-tools-registry.ts`
- `createToolHandler()` with flexible signatures
- Response normalization

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Non-breaking changes to add MCP 2025 features

#### Week 1: Add Title Fields
```typescript
// Update tool definitions
{
  name: 'list-properties',          // Keep existing
  title: 'List Properties',        // Add new
  description: '...',
  schema: schemas.ListPropertiesSchema,
  handler: createToolHandler(listProperties),
}
```

#### Week 2: Create Compatibility Layer
```typescript
// Implement dual-name support
const compatibleTools = createBackwardsCompatibleTool(
  'list-properties',    // old name
  'property_list',      // new name  
  listPropertiesHandler
);
```

### Phase 2: Tool Consolidation (Weeks 3-4)
**Goal:** Merge tools with new naming conventions

#### Week 3: High-Impact Consolidations
1. **Property Management**: 9 → 3 files
   - Merge core operations
   - Consolidate error handling
   - Unify version management

2. **Certificate Management**: 3 → 1 file
   - Combine CPS tools
   - Integrate DNS validation

#### Week 4: Service Domain Consolidations  
1. **DNS Tools**: 5 → 2 files
   - Merge core operations
   - Keep migration separate

2. **Network Lists**: 5 → 2 files
   - Combine activation/CRUD
   - Merge geo/ASN operations

### Phase 3: Migration Activation (Weeks 5-6)
**Goal:** Deploy and monitor adoption

#### Week 5: Gradual Rollout
```typescript
// Deploy with monitoring
tools.forEach(tool => {
  if (isLegacyName(tool.name)) {
    logger.warn(`Legacy tool "${tool.name}" used by ${client}`);
  }
});
```

#### Week 6: Deprecation Warnings
- Add console warnings for old names
- Update documentation
- Notify clients of timeline

### Phase 4: Cleanup (Weeks 7-8)
**Goal:** Remove legacy support

#### Week 7: Final Migration
- Remove old name support
- Update all tests
- Final documentation updates

#### Week 8: Validation
- Comprehensive testing
- Performance validation
- Client compatibility checks

## Technical Implementation

### Tool Definition Structure
```typescript
interface MCP2025ToolDefinition {
  // Required fields
  name: string;        // snake_case identifier
  title: string;       // Human-readable name
  description: string;
  schema: ZodSchema;
  handler: ToolHandler;
  
  // Migration support
  aliases?: string[];  // Legacy names
  deprecated?: boolean;
  deprecationMessage?: string;
}
```

### Migration Helper Implementation
```typescript
// Automated tool migration
function migrateToolDefinition(oldTool: ToolDefinition): MCP2025ToolDefinition {
  const newName = toSnakeCase(oldTool.name);
  const title = toTitleCase(oldTool.name.replace(/-/g, ' '));
  
  return {
    name: newName,
    title: title,
    description: oldTool.description,
    schema: oldTool.schema,
    handler: oldTool.handler,
    aliases: [oldTool.name],
    deprecated: false
  };
}
```

### Compatibility Registry
```typescript
// Enhanced tool registry with compatibility
class CompatibleToolRegistry {
  private tools = new Map<string, MCP2025ToolDefinition>();
  private aliases = new Map<string, string>(); // old → new
  
  register(tool: MCP2025ToolDefinition) {
    this.tools.set(tool.name, tool);
    
    // Register aliases
    tool.aliases?.forEach(alias => {
      this.aliases.set(alias, tool.name);
    });
  }
  
  get(name: string): MCP2025ToolDefinition | undefined {
    // Check for direct match
    if (this.tools.has(name)) {
      return this.tools.get(name);
    }
    
    // Check aliases
    const modernName = this.aliases.get(name);
    if (modernName) {
      console.warn(`Tool "${name}" is deprecated, use "${modernName}"`);
      return this.tools.get(modernName);
    }
    
    return undefined;
  }
}
```

## Risk Mitigation

### Technical Risks
| Risk | Mitigation Strategy |
|------|-------------------|
| Breaking client integrations | Dual-name support with gradual deprecation |
| Test suite failures | Update tests incrementally per phase |
| Performance degradation | Benchmark before/after consolidation |
| Lost functionality | Comprehensive testing matrix |

### Operational Risks
| Risk | Mitigation Strategy |
|------|-------------------|
| Developer confusion | Clear migration guides and examples |
| Documentation drift | Automated docs generation |
| Rollback complexity | Feature flags for new naming |
| Client adoption delays | 6-month deprecation window |

## Success Metrics

### Quantitative Metrics
- **File Reduction**: 35+ → ~20 files (43% reduction target)
- **Test Coverage**: Maintain >95% coverage
- **Performance**: <5% latency increase
- **Adoption Rate**: >80% using new names within 3 months

### Qualitative Metrics
- **Developer Satisfaction**: Survey before/after
- **Onboarding Time**: Measure new developer ramp-up
- **Support Tickets**: Reduction in naming confusion issues
- **Code Quality**: Improved maintainability scores

## Monitoring & Rollback Plan

### Monitoring Strategy
```typescript
// Tool usage monitoring
interface ToolUsageMetrics {
  toolName: string;
  isLegacy: boolean;
  clientVersion: string;
  timestamp: Date;
  deprecationWarningShown: boolean;
}

// Collect and analyze usage patterns
const metricsCollector = new MetricsCollector();
metricsCollector.on('tool-invoked', (metrics: ToolUsageMetrics) => {
  if (metrics.isLegacy) {
    alerting.notify('legacy-tool-usage', metrics);
  }
});
```

### Rollback Procedures
1. **Phase 1 Rollback**: Remove title fields (non-breaking)
2. **Phase 2 Rollback**: Revert file merges via git
3. **Phase 3 Rollback**: Disable new names, keep aliases
4. **Phase 4 Rollback**: Re-enable legacy name support

## Conclusion

This roadmap provides a systematic approach to modernizing ALECS while maintaining stability and backward compatibility. By combining tool consolidation with MCP 2025-06-18 migration, we achieve maximum efficiency with minimal disruption.

### Key Success Factors
1. **Leverage existing infrastructure** (compatibility wrapper, migration utilities)
2. **Gradual migration** with clear deprecation timeline
3. **Comprehensive monitoring** of adoption rates
4. **Clear communication** to all stakeholders

### Next Steps
1. Review and approve roadmap
2. Create detailed task tickets for each phase
3. Set up monitoring infrastructure
4. Begin Phase 1 implementation

---

*Document Version: 1.0*  
*Last Updated: 2025-01-30*  
*Owner: ALECS Architecture Team*