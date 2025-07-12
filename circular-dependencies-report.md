# Circular Dependencies Report

**Generated**: 2025-07-12
**Tool**: madge v8.0.0
**Total Files Analyzed**: 346
**Circular Dependencies Found**: 6

## Summary

The analysis identified 6 circular dependency chains in the codebase, primarily in two areas:
1. **Orchestration/Registry System** (1 chain)
2. **Audit Framework** (5 chains)

## Detailed Analysis

### 1. Orchestration/Registry Circular Dependency

**Chain**: 
```
orchestration/mcp-tool-executor.ts 
  → tools/tools-registry.ts 
  → tools/orchestration/index.ts 
  → tools/orchestration/workflow-tools.ts
  → (back to orchestration/mcp-tool-executor.ts)
```

**Impact**: High - This affects the core tool registration and execution system
**Root Cause**: The tool executor depends on the registry, which re-exports orchestration tools that depend on the executor

### 2. Audit Framework Circular Dependencies

**Chains**:
```
audit/audit-framework.ts → audit/rules/api-compliance-rules.ts → (back to audit-framework.ts)
audit/audit-framework.ts → audit/rules/performance-audit-rules.ts → (back to audit-framework.ts)
audit/audit-framework.ts → audit/rules/security-audit-rules.ts → (back to audit-framework.ts)
audit/audit-framework.ts → audit/rules/server-audit-rules.ts → (back to audit-framework.ts)
audit/audit-framework.ts → audit/rules/tool-audit-rules.ts → (back to audit-framework.ts)
```

**Impact**: Medium - Affects the audit system but isolated from core functionality
**Root Cause**: Rule files import the framework they're registered with

## Resolution Strategy

### Priority 1: Orchestration/Registry Fix
1. Extract shared interfaces to a separate file
2. Use dependency injection pattern
3. Break the chain at the registry level

### Priority 2: Audit Framework Fix
1. Create an audit-types.ts file for shared interfaces
2. Use registration pattern instead of direct imports
3. Implement lazy loading for rule modules

## Next Steps
1. Create interface extraction tasks
2. Implement dependency injection patterns
3. Test each fix in isolation
4. Verify no new circular dependencies introduced