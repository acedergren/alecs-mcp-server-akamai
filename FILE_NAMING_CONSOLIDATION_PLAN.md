# File Naming and Consolidation Plan

## Overview
This plan identifies files with redundant prefixes/suffixes and proposes simplified names and consolidation strategies.

## 1. REMOVE "CONSOLIDATED" PREFIX (13 files)

All "consolidated-*" tools should become the primary implementation:

| Current Name | New Name | Action |
|-------------|----------|---------|
| `consolidated-bulk-operations-tools.ts` | `bulk-operations.ts` | Rename + Archive old if exists |
| `consolidated-certificate-tools.ts` | `certificates.ts` | Rename + Archive `certificate-tools.ts` |
| `consolidated-dns-tools.ts` | `dns.ts` | Rename + Archive `dns-tools.ts` |
| `consolidated-edge-hostname-tools.ts` | `edge-hostnames.ts` | Rename |
| `consolidated-fastpurge-tools.ts` | `fastpurge.ts` | Rename |
| `consolidated-hostname-tools.ts` | `hostnames.ts` | Rename |
| `consolidated-include-tools.ts` | `includes.ts` | Rename |
| `consolidated-property-tools.ts` | `properties.ts` | Rename + Archive `property-tools.ts` |
| `consolidated-reporting-tools.ts` | `reporting.ts` | Rename |
| `consolidated-rule-tree-tools.ts` | `rule-trees.ts` | Rename |
| `consolidated-security-tools.ts` | `security.ts` | Rename |
| `consolidated-siem-tools.ts` | `siem.ts` | Rename |
| `consolidated-utility-tools.ts` | `utilities.ts` | Rename |

## 2. SIMPLIFY "UNIFIED" PREFIX (4 files)

| Current Name | New Name | Rationale |
|-------------|----------|-----------|
| `unified-cache-service.ts` | `cache.ts` | Single cache implementation |
| `unified-search-service.ts` | `search.ts` | Single search implementation |
| `unified-error-handler.ts` | `error-handler.ts` | Already consolidated |

## 3. REMOVE "ENHANCED" PREFIX (3 files)

| Current Name | New Name | Action |
|-------------|----------|---------|
| `enhanced-domain-generator.ts` | `domain-generator.ts` | Merge with existing `domain-generator.ts` |
| `EnhancedEdgeGrid.ts` | Archive | Merge into unified client |
| `enhanced-edgegrid-mock.ts` | `edgegrid-mock.ts` | Rename |

## 4. REMOVE "COMPREHENSIVE" PREFIX (2 files)

| Current Name | New Name | Action |
|-------------|----------|---------|
| `comprehensive-security-tools.ts` | `appsec.ts` | Rename to match domain |
| `comprehensive-test.ts` | `integration-test.ts` | More descriptive name |

## 5. SIMPLIFY "BASE" PREFIX

| Current Name | New Name | Rationale |
|-------------|----------|-----------|
| `base-tool.ts` | Keep as-is | "Base" is appropriate for abstract class |
| `base-mcp-server.ts` | Keep as-is | "Base" is appropriate for abstract class |
| `BaseAkamaiClient.ts` | Archive | Merge into unified client |
| `reliable-test-base.ts` | `test-base.ts` | Simplify name |

## 6. MERGE DUPLICATE CACHE IMPLEMENTATIONS

### Current State (5 implementations):
- `services/unified-cache-service.ts`
- `utils/cache-service.ts`
- `utils/smart-cache.ts`
- `core/server/performance/smart-cache.ts`
- `types/cache.ts` + `types/cache-interface.ts`

### Action Plan:
1. **KEEP**: `services/cache.ts` (renamed from unified-cache-service)
2. **ARCHIVE**: All others
3. **MERGE**: Best features from all implementations

## 7. MERGE DUPLICATE ERROR HANDLERS

### Current State (6 files):
- `utils/unified-error-handler.ts` (newest, best)
- `core/errors/domain-errors.ts`
- `errors/auth-errors.ts`
- `errors/dns-errors.ts`
- `errors/property-errors.ts`
- `audit/batch-fixes/fix-generic-errors.ts`

### Action Plan:
1. **KEEP**: `utils/error-handler.ts` (renamed from unified)
2. **ARCHIVE**: All domain-specific error files
3. **UPDATE**: Domain errors integrated into main handler

## 8. CONSOLIDATE CLIENT IMPLEMENTATIONS

### Current State (4 clients):
- `akamai-client.ts`
- `utils/edgegrid-client.ts`
- `services/BaseAkamaiClient.ts`
- `auth/EnhancedEdgeGrid.ts`

### New Structure:
```
src/client/
├── index.ts          # Main unified client
├── auth.ts           # EdgeGrid authentication
├── retry.ts          # Retry logic
└── types.ts          # Client types
```

## 9. CONSOLIDATE SEARCH IMPLEMENTATIONS

### Current State:
- `services/unified-search-service.ts`
- `utils/akamai-search-helper.ts`

### Action Plan:
1. **CREATE**: `services/search.ts` (merge both)
2. **ARCHIVE**: Both old files

## 10. TOOL FILE NAMING CONVENTION

### Standardize all tool files to:
```
src/tools/{domain}/
├── index.ts          # Tool exports
├── {domain}.ts       # Main implementation (not {domain}-tools.ts)
├── types.ts          # Domain types
└── schemas.ts        # Validation schemas
```

### Remove "-tools" suffix from:
- `certificate-tools.ts` → `certificates.ts`
- `dns-tools.ts` → `dns.ts`
- `property-tools.ts` → `properties.ts`
- `billing-tools.ts` → `billing.ts`
- `diagnostics-tools.ts` → `diagnostics.ts`
- `edge-compute-tools.ts` → `edge-compute.ts`
- `gtm-tools.ts` → `gtm.ts`
- `workflow-tools.ts` → `workflows.ts`
- `monitoring-tools.ts` → `monitoring.ts`

## 11. REMOVE "-api-implementation" SUFFIX

### Standardize to just "api.ts":
- `billing-api-implementation.ts` → `api.ts`
- `certificate-api-implementation.ts` → `api.ts`
- `diagnostics-api-implementation.ts` → `api.ts`
- `dns-api-implementation.ts` → `api.ts`
- `edge-compute-api-implementation.ts` → `api.ts`
- `gtm-api-implementation.ts` → `api.ts`
- `property-api-implementation.ts` → `api.ts`
- `reporting-api-implementation.ts` → `api.ts`

## 12. SERVER NAMING SIMPLIFICATION

### Current (8 files with "-alecscore" suffix):
```
appsec-server-alecscore.ts
certs-server-alecscore.ts
dns-server-alecscore.ts
fastpurge-server-alecscore.ts
property-server-alecscore.ts
reporting-server-alecscore.ts
security-server-alecscore.ts
siem-server-alecscore.ts
```

### Action: 
**ARCHIVE ALL** - Replace with single modular `server.ts`

## Summary Impact

### Before: 
- ~180 TypeScript files in src/
- Multiple versions of same functionality
- Confusing prefixes/suffixes

### After:
- ~120 TypeScript files (33% reduction)
- Single source of truth for each function
- Clean, consistent naming

### Naming Principles Applied:
1. No redundant prefixes (unified, enhanced, consolidated, comprehensive)
2. No redundant suffixes (-tools, -api-implementation)
3. Descriptive but concise names
4. Consistent patterns across domains
5. Proper use of "base" only for abstract classes