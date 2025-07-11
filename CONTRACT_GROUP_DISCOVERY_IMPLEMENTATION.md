# Contract/Group Auto-Discovery Service Implementation

## Overview

The Contract/Group Auto-Discovery Service dramatically improves the user experience by automatically discovering available contracts and groups for customers, caching results for performance, and providing helpful suggestions when invalid IDs are used. This prevents common 403/404 errors and guides users to valid resources.

## Key Features Implemented

### 1. Automatic Discovery
- **Contract Discovery**: Fetches all available contracts via `/papi/v1/contracts`
- **Group Discovery**: Fetches all available groups via `/papi/v1/groups`
- **Multi-Customer Support**: Discovers resources per customer context
- **Error Resilience**: Gracefully handles API failures and caches error states

### 2. Smart Caching
- **TTL Management**: 1 hour for successful data, 5 minutes for error states
- **Per-Customer Isolation**: Cache keys include customer context
- **Force Refresh**: Option to bypass cache when needed
- **Cache Invalidation**: Methods to clear specific customer or all caches

### 3. Validation & Suggestions
- **Contract Validation**: Checks if contract IDs are valid for a customer
- **Group Validation**: Validates group IDs, optionally filtered by contract
- **Smart Suggestions**: Finds similar IDs using numeric part matching
- **Human-Friendly Messages**: Clear explanations with actionable next steps

### 4. Error Enhancement
- **403 Error Enhancement**: Validates contract/group IDs and suggests valid options
- **404 Error Enhancement**: Shows available resources for the customer
- **Account Switching Detection**: Identifies when account switching might be needed
- **Quick Fix Commands**: Suggests using `contract_list` and `group_list` tools

## Architecture

### Service Structure

```typescript
// Core service class
ContractGroupDiscoveryService
├── discover() - Main discovery method
├── validateContract() - Contract validation with suggestions
├── validateGroup() - Group validation with suggestions
├── checkAccountSwitching() - Account switching detection
├── getDiscoveryForError() - Quick discovery for error enhancement
└── Utility methods for cache management and suggestions

// Integration points
BaseTool.enhanceError() - Uses discovery for enhanced error messages
UnifiedErrorHandler - Includes discovery suggestions in error responses
```

### Data Structures

```typescript
interface Contract {
  contractId: string;
  contractTypeName?: string;
}

interface Group {
  groupId: string;
  groupName?: string;
  parentGroupId?: string | null;
  contractIds?: string[];
}

interface DiscoveryResult {
  contracts: Contract[];
  groups: Group[];
  lastUpdated: Date;
  customer: string;
}

interface ValidationResult {
  isValid: boolean;
  suggestions?: {
    contracts?: Contract[];
    groups?: Group[];
    message: string;
  };
}
```

## Integration Points

### 1. BaseTool Integration

The discovery service is integrated into `BaseTool.enhanceError()` to provide contextual suggestions:

```typescript
// Enhanced 403 error handling
if (context.args.contractId) {
  const validation = await contractGroupDiscovery.validateContract(
    context.args.contractId, 
    customer
  );
  if (!validation.isValid && validation.suggestions) {
    // Add suggestions to error response
  }
}
```

### 2. UnifiedErrorHandler Integration

The error handler now includes discovery-powered suggestions:

```typescript
// Contract not found guidance
case 'contract_not_found':
  // Provides specific contract suggestions
  // References contract_list tool for discovery
```

### 3. Existing Tool Integration

The service integrates with existing tools:
- `contract_list` - Used in suggestions for contract discovery
- `group_list` - Used in suggestions for group discovery
- Property tools - Enhanced with better error messages

## Example Enhanced Error Messages

### Before (403 Error)
```
Error: Permission Denied
Permission denied for property_create. 
Current customer: test-customer
```

### After (403 Error with Discovery)
```
Error: Permission Denied
Permission denied for property_create. Contract 'ctr_V-invalid' may not be 
valid or accessible. Current customer: test-customer

Suggestions:
Contract 'ctr_V-invalid' not found. Available contracts:
  • ctr_V-123456 (Akamai)
  • ctr_V-789012 (Partner)

Use 'contract_list' to see all available contracts.

Quick Fix Commands:
alecs contract_list
Check available contracts for this customer
```

### Before (404 Error)
```
Error: Resource Not Found
property not found. Verify the ID is correct and you're using 
the right customer account (test-customer).
```

### After (404 Error with Discovery)
```
Error: Resource Not Found
property not found. Verify the ID is correct and you're using 
the right customer account (test-customer).

Available Resources:
Available contracts: ctr_V-123456 (Akamai), ctr_V-789012 (Partner)
Available groups: grp_123456 - Default Group, grp_789012 - Test Group

Quick Fix Commands:
alecs contract_list
List available contracts for this customer

alecs group_list  
List available groups for this customer
```

## Performance Considerations

### Caching Strategy
- **Cache Keys**: `discovery:{customer}` format for isolation
- **TTL Policy**: 1 hour for successful discoveries, 5 minutes for errors
- **Deduplication**: Prevents multiple concurrent discoveries for same customer
- **Memory Efficient**: Uses existing UnifiedCacheService infrastructure

### API Optimization
- **Parallel Requests**: Contracts and groups fetched concurrently
- **Error Isolation**: Contract fetch failure doesn't prevent group fetch
- **Graceful Degradation**: Service works even if discovery fails
- **Rate Limiting**: Respects Akamai API rate limits

## Error Handling

### Service-Level Error Handling
- **API Failures**: Logged but don't break the service
- **Validation Failures**: Return empty arrays rather than throwing
- **Cache Failures**: Service continues without cache
- **Network Issues**: Cached error state prevents repeated failures

### Integration Error Handling
- **Discovery Failures**: Error enhancement continues without suggestions
- **Validation Timeouts**: Uses cached data when available
- **Async Safety**: Discovery runs in background for error enhancement

## Testing

### Unit Tests Implemented
- Contract and group discovery functionality
- Validation with various input scenarios
- Cache behavior and TTL management
- Error state handling
- Account switching detection
- Suggestion generation logic

### Test Coverage
- ✅ Successful discovery scenarios
- ✅ API error handling
- ✅ Cache hit/miss scenarios
- ✅ Valid/invalid ID validation
- ✅ Suggestion generation
- ✅ Account switching detection
- ✅ Multi-customer isolation

## Usage Examples

### Direct Service Usage
```typescript
import { contractGroupDiscovery } from './services/contract-group-discovery-service';

// Discover contracts and groups
const discovery = await contractGroupDiscovery.discover('customer-name');

// Validate a contract ID
const contractValidation = await contractGroupDiscovery.validateContract(
  'ctr_V-123456', 
  'customer-name'
);

// Validate a group ID with contract filter
const groupValidation = await contractGroupDiscovery.validateGroup(
  'grp_123456', 
  'customer-name', 
  'ctr_V-123456'
);

// Check for account switching issues
const accountHint = await contractGroupDiscovery.checkAccountSwitching(
  'customer-name', 
  { status: 403 }
);
```

### Tool Integration
The service is automatically used by all tools extending `BaseTool`:

```typescript
// Property creation with enhanced error handling
const result = await this.executeStandardOperation(
  'property-create',
  { contractId: 'invalid-contract', groupId: 'invalid-group' },
  async (client) => {
    // Tool implementation
  }
);
// If errors occur, discovery service provides suggestions automatically
```

## Benefits

### For Users
- **Clear Error Messages**: Know exactly what went wrong and how to fix it
- **Actionable Suggestions**: Get specific contract/group IDs to use
- **Quick Discovery**: Easy commands to see available resources
- **Reduced Trial-and-Error**: Less guessing about valid IDs

### For Developers
- **Consistent Error Handling**: All tools get enhanced error messages
- **Reduced Support Burden**: Users can self-diagnose permission issues
- **Better UX**: Users understand multi-customer environments better
- **Extensible**: Service can be enhanced for other resource types

### For Operations
- **Cached Performance**: Reduces API calls through intelligent caching
- **Resilient**: Handles API failures gracefully
- **Observable**: Clear logging for debugging issues
- **Scalable**: Designed for multi-customer environments

## Future Enhancements

### Potential Extensions
1. **Product Discovery**: Extend to discover available products
2. **CP Code Discovery**: Add CP code validation and suggestions
3. **Edge Hostname Discovery**: Include edge hostname validation
4. **Proactive Caching**: Pre-warm cache for frequently used customers
5. **Analytics**: Track common validation failures for insights

### Integration Opportunities
1. **Property Creation Wizard**: Use discovery for guided property creation
2. **Account Switching Helper**: Automatic account switching suggestions
3. **Resource Browser**: Build CLI commands to browse available resources
4. **Validation Middleware**: Pre-validate requests before API calls

## Implementation Files

### Core Implementation
- **`src/services/contract-group-discovery-service.ts`** - Main service implementation
- **`src/__tests__/contract-group-discovery.test.ts`** - Comprehensive test suite

### Integration Files
- **`src/tools/common/base-tool.ts`** - Enhanced error handling integration
- **`src/core/errors/error-handler.ts`** - Error message enhancement
- **`src/services/index.ts`** - Service export configuration

### Supporting Tools
- **`src/tools/property/consolidated-property-tools.ts`** - Uses existing `contract_list` and `group_list` tools
- **Property tool registry** - Tools are already exposed as MCP tools

## Conclusion

The Contract/Group Auto-Discovery Service represents a significant improvement in user experience for the ALECS MCP Server. By automatically discovering available resources, providing intelligent validation, and offering helpful suggestions, it transforms cryptic API errors into actionable guidance.

The service integrates seamlessly with existing architecture, uses intelligent caching for performance, and provides a foundation for future resource discovery enhancements. Users will now receive clear, helpful error messages that guide them toward success rather than leaving them frustrated with permission denials.

This implementation follows CODE KAI principles by providing:
- **Key**: Clear identification of what went wrong
- **Approach**: Specific steps to resolve the issue  
- **Implementation**: Ready-to-use commands and examples

The result is a more user-friendly, self-documenting API that helps users succeed on their first attempt rather than requiring trial-and-error debugging.