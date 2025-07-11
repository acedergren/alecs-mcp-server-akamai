# Codebase Consolidation and Refactoring Plan

## Executive Summary

After deep analysis of the src/ directory structure, I've identified significant duplication and opportunities for consolidation. The codebase has grown organically with multiple implementations of similar functionality.

## 1. CLIENT/AUTH CONSOLIDATION (Critical Priority)

### Current State (5 implementations, ~2200 lines total):
- `src/auth/EdgeGridAuth.ts` (568 lines)
- `src/auth/EnhancedEdgeGrid.ts` (451 lines)
- `src/utils/edgegrid-client.ts` (202 lines)
- `src/services/BaseAkamaiClient.ts` (575 lines)
- `src/akamai-client.ts` (407 lines)

### Action Plan:
1. **CREATE**: `src/clients/unified-akamai-client.ts`
   - Merge best features from all implementations
   - Single source of truth for EdgeGrid authentication
   - Support account switching, retries, caching
   
2. **ARCHIVE**: All 5 existing implementations to `.archive/clients/`

3. **UPDATE**: All imports to use new unified client

## 2. SERVER CONSOLIDATION (Critical Priority)

### Current State (11 server files, ~130KB total):
- Individual servers in `src/servers/` (8 files, each 2-39KB)
- Core servers: `base-mcp-server.ts`, `alecs-core.ts`, `fast-mcp-server.ts`

### Action Plan:
1. **CREATE**: `src/server.ts` (single modular server)
   - Dynamic tool loading from domains
   - Unified middleware pipeline
   - Single entry point
   
2. **ENHANCE**: `src/core/server/alecs-core.ts` as the foundation
   
3. **ARCHIVE**: All individual server files to `.archive/servers/`

## 3. TOOL CONSOLIDATION (High Priority)

### Current State:
Many tools have both regular and "consolidated" versions:
- `certificate-tools.ts` + `consolidated-certificate-tools.ts`
- `dns-tools.ts` + `consolidated-dns-tools.ts`
- `property-tools.ts` + `consolidated-property-tools.ts`

### Action Plan:
1. **KEEP**: Only consolidated versions (they're newer and better)
2. **ARCHIVE**: Old non-consolidated versions
3. **RENAME**: Remove "consolidated" prefix for clarity
4. **UPDATE**: All index.ts files to export renamed tools

## 4. ERROR HANDLING (Completed ✓)

### Current State:
- ✓ Already created `unified-error-handler.ts`
- Multiple legacy error files exist

### Action Plan:
1. **ARCHIVE**: Remaining error files in `src/errors/`
2. **UPDATE**: All imports to use unified handler

## 5. TYPE DEFINITIONS (Medium Priority)

### Current State:
- Multiple MCP type definitions (`mcp.ts`, `mcp-2025.ts`, `mcp-protocol.ts`)
- Duplicate cache types (`cache.ts`, `cache-interface.ts`)
- Mixed generated and manual API response types

### Action Plan:
1. **CREATE**: `src/types/index.ts` with clear exports
2. **MERGE**: MCP types into single `mcp.types.ts`
3. **MERGE**: Cache types into single definition
4. **ORGANIZE**: API responses by source (generated vs manual)

## 6. DUPLICATE UTILITIES (Medium Priority)

### Current State:
Multiple implementations of similar functionality:
- Circuit breakers (2 implementations)
- Cache services (3 implementations)
- Request coalescers (2 implementations)
- Progress/monitoring (multiple)

### Action Plan:
1. **MERGE**: Into single best implementation for each
2. **ARCHIVE**: Duplicate implementations
3. **CREATE**: Clear utility index with all exports

## 7. CLI CONSOLIDATION (Low Priority)

### Current State:
- `src/alecs-cli-wrapper.ts`
- `src/cli/alecs-cli-wrapper.ts`
- Multiple generator implementations

### Action Plan:
1. **KEEP**: `src/cli/` structure (it's more organized)
2. **ARCHIVE**: Root-level CLI wrapper
3. **CONSOLIDATE**: Generator implementations

## 8. NEW FUNCTIONALITY TO ADD

### ID Translation (In Progress):
- ✓ Created `id-translation-service.ts`
- TODO: Integrate into base tool
- TODO: Add to all tool responses

### Contract/Group Auto-Discovery:
- TODO: Create `contract-discovery-service.ts`
- TODO: Enhance error messages with valid options

### DNS Changelist Abstraction:
- TODO: Create simplified DNS record management
- TODO: Hide changelist complexity from users

## 9. FOLDER STRUCTURE REORGANIZATION

### Proposed New Structure:
```
src/
├── client/                 # Unified Akamai client
├── server/                 # Single modular server
├── domains/               # Business logic by domain
│   ├── property/
│   ├── dns/
│   ├── certificates/
│   └── ...
├── tools/                 # MCP tool implementations
├── middleware/            # Server middleware
├── services/              # Shared services
├── types/                 # TypeScript definitions
├── utils/                 # Utilities
└── index.ts              # Main entry point
```

## 10. IMPLEMENTATION PHASES

### Phase 1: Client/Auth Consolidation (Today)
- Create unified client
- Update all imports
- Archive old implementations

### Phase 2: Server Consolidation (Today)
- Create modular server
- Migrate tool registrations
- Archive individual servers

### Phase 3: Tool Cleanup (Tomorrow)
- Remove duplicate tool versions
- Rename consolidated tools
- Update exports

### Phase 4: Type Cleanup (Tomorrow)
- Merge duplicate types
- Organize API responses
- Create clear type exports

### Phase 5: Utility Cleanup (Later)
- Merge duplicate utilities
- Create utility index
- Archive duplicates

## Files to Archive Summary

### Immediate Archive (50+ files):
- All files in `src/auth/`
- All files in `src/servers/`
- All non-consolidated tool files
- Duplicate error handlers
- Duplicate client implementations

### Keep and Enhance:
- Consolidated tool versions
- Domain structure
- Core services
- Unified implementations

## Expected Benefits

1. **Code Reduction**: ~40% fewer files
2. **Clarity**: Single source of truth for each function
3. **Maintainability**: Easier to find and update code
4. **Performance**: Less duplicate initialization
5. **Testing**: Simpler test structure

## Migration Safety

1. All archived files go to `.archive/` (not deleted)
2. Git commits after each phase
3. Update imports incrementally
4. Run tests after each change
5. Keep backups of working state