# Property Tools Claude Desktop Optimization Plan

Based on SUPERTHINK_ANALYSIS.md, this document outlines which property tools will be:
- ✅ **KEPT & OPTIMIZED** for Claude Desktop with JSON responses
- ❌ **DELETED** due to fake implementations or inefficiency  
- 🔄 **REWRITTEN** to use proper APIs

## 📊 Summary Statistics

- **Current Tools**: 34 property-related functions
- **To Keep**: 29 (85%)
- **To Delete**: 5 (15%)
- **To Optimize for Claude**: All 29 kept tools

## ✅ TOOLS TO KEEP & OPTIMIZE (29 tools)

### Property Manager Core Tools (14 tools)
These are the foundation of property management and work with real Akamai APIs:

| Function | Current Status | Claude Optimization |
|----------|----------------|---------------------|
| `createPropertyVersion` | ✅ REAL API | Add JSON format parameter ✅ DONE |
| `getPropertyRules` | ✅ REAL API | Add structured rule tree response |
| `updatePropertyRules` | ✅ REAL API | Add validation summary in JSON |
| `createEdgeHostname` | ✅ REAL API | Add creation status tracking |
| `addPropertyHostname` | ✅ REAL API | Add hostname validation results |
| `removePropertyHostname` | ✅ REAL API | Add removal confirmation |
| `activateProperty` | ✅ REAL API | Add JSON format parameter ✅ DONE |
| `getActivationStatus` | ✅ REAL API | Add structured status response |
| `listPropertyActivations` | ✅ REAL API | Add JSON format parameter ✅ DONE |
| `createPropertyVersionEnhanced` | ✅ WRAPPER | Merge with base function |
| `getVersionDiff` | ✅ CLIENT LOGIC | Add structured diff format |
| `listPropertyVersionsEnhanced` | ✅ WRAPPER | Merge with base function |
| `rollbackPropertyVersion` | ✅ COMPOSITE | Add rollback summary |
| `batchVersionOperations` | ✅ ORCHESTRATOR | Add batch progress tracking |

### Property Tools (7 tools)
Basic property operations that form the core CRUD functionality:

| Function | Current Status | Claude Optimization |
|----------|----------------|---------------------|
| `listProperties` | ✅ REAL API | Add filtering summary |
| `listPropertiesTreeView` | ✅ CLIENT+API | Add tree navigation hints |
| `getProperty` | ✅ REAL API | Add property summary |
| `createProperty` | ✅ REAL API | Add creation wizard |
| `listContracts` | ✅ REAL API | Add contract details |
| `listGroups` | ✅ REAL API | Add group hierarchy |
| `listProducts` | ✅ REAL API | Add product capabilities |

### Property Manager Advanced (8 tools)
Advanced operations for power users:

| Function | Current Status | Claude Optimization |
|----------|----------------|---------------------|
| `listEdgeHostnames` | ✅ REAL API | Add edge hostname summary |
| `getEdgeHostname` | ✅ REAL API | Add configuration details |
| `cloneProperty` | ✅ REAL API | Add clone progress tracking |
| `removeProperty` | ✅ REAL API | Add safety checks summary |
| `listPropertyVersions` | ✅ REAL API | Add version comparison |
| `getPropertyVersion` | ✅ REAL API | Add version details |
| `getLatestPropertyVersion` | ✅ WRAPPER | Add latest changes summary |
| `cancelPropertyActivation` | ✅ REAL API | Add cancellation status |

## ❌ TOOLS TO DELETE (5 tools)

These tools have fundamental issues and should be removed:

### 1. `searchProperties` (Multiple implementations)
**Issue**: Downloads ALL properties then filters client-side
**Files to check**:
- property-manager-advanced-tools.ts
- property-search-optimized.ts
- property-operations-advanced.ts
- property-manager.ts

**Alternative**: Use the universal search with proper caching

### 2. `listAllHostnames`
**Issue**: O(N) operation that fetches hostnames for every property
**File**: property-manager-advanced-tools.ts
**Alternative**: Add pagination/filtering or use property-specific hostname listing

### 3. `updatePropertyWithDefaultDV`
**Issue**: Unclear Default DV certificate integration
**File**: property-manager-tools.ts
**Alternative**: Rewrite using proper CPS API integration

### 4. `updatePropertyWithCPSCertificate`
**Issue**: Questionable CPS integration
**File**: property-manager-tools.ts
**Alternative**: Rewrite using verified CPS API endpoints

### 5. Any "acknowledge/override" error functions
**Issue**: Use fake endpoints like `/acknowledge-warnings`
**Alternative**: Handle errors properly in activation flow

## 🔄 JSON Response Format Standard

All kept tools should support the following response format:

```typescript
interface ClaudeOptimizedResponse<T> {
  data: T;                        // Main response data
  metadata: {
    total: number;                // Total items available
    shown: number;                // Items in this response
    hasMore: boolean;             // Pagination indicator
    executionTime: number;        // Response time in ms
    warnings?: string[];          // Non-fatal issues
  };
  filters?: Record<string, any>;  // Applied filters
  parameters?: Record<string, any>; // Input parameters
  navigation?: {                  // For paginated responses
    nextCursor?: string;
    prevCursor?: string;
    page?: number;
    perPage?: number;
  };
  summary?: {                     // Human-readable summary
    description: string;
    keyPoints: string[];
    nextSteps?: string[];
  };
}
```

## 📝 Implementation Priority

### Phase 1: Delete Fake Tools (Immediate)
1. Remove all `searchProperties` implementations
2. Remove `listAllHostnames`
3. Remove certificate update functions with unclear APIs
4. Clean up imports and references

### Phase 2: Core Tool Optimization (Week 1)
1. Add JSON format to remaining core tools:
   - `getPropertyRules`
   - `updatePropertyRules`
   - `getActivationStatus`
2. Merge enhanced versions with base functions
3. Add structured responses to all property CRUD operations

### Phase 3: Advanced Tool Optimization (Week 2)
1. Optimize all advanced property tools
2. Add batch operation progress tracking
3. Implement proper error handling with actionable messages

### Phase 4: Testing & Documentation (Week 3)
1. Comprehensive testing of all 29 tools
2. Update documentation with examples
3. Create migration guide for removed tools

## 🎯 Expected Outcomes

1. **Reduced Tool Count**: From 34 to 29 property tools
2. **100% Real API Usage**: No fake implementations
3. **Claude-Optimized Responses**: All tools support JSON format
4. **Better Performance**: Remove O(N) operations
5. **Clear Error Messages**: Actionable error handling

## 🚀 Next Steps

1. Start with deleting the 5 identified fake/broken tools
2. Run tests to ensure no breaking changes
3. Begin JSON optimization of kept tools
4. Document changes in CHANGELOG

This plan ensures we maintain only high-quality, real API-based tools that are optimized for Claude Desktop usage.