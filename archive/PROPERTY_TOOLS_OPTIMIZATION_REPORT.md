# Property Tools Optimization Report for Claude Desktop

## Executive Summary

This report analyzes the current state of property-related tools in the ALECS MCP Server and provides recommendations for optimizing them for Claude Desktop usage. The analysis covers 60+ property management tools across 6 main files.

## Current State Analysis

### Files Analyzed

1. **property-tools.ts** - Core property operations (2,070 lines)
2. **property-manager-tools.ts** - Extended property management features
3. **property-manager-advanced-tools.ts** - Advanced features like edge hostnames
4. **property-onboarding-tools.ts** - Streamlined onboarding workflow
5. **property-error-handling-tools.ts** - Enhanced error handling
6. **property-manager.ts** - New consolidated module (in development)

### Tools by Output Format

#### Already Optimized (Return Structured JSON)
✅ **property-tools.ts**
- `listProperties()` - Returns structured JSON with properties array and metadata
- `getProperty()` - Returns structured JSON with property details
- `createProperty()` - Returns structured JSON with success status and property info

✅ **property-error-handling-tools.ts**
- All error handling tools return structured responses

#### Need Optimization (Return Formatted Text/Markdown)
❌ **property-tools.ts**
- `listContracts()` - Returns markdown table
- `listGroups()` - Returns markdown with hierarchy
- `listProducts()` - Returns markdown table with categories
- `listPropertiesTreeView()` - Returns markdown tree view

❌ **property-manager-tools.ts**
- `createPropertyVersion()` - Returns text with [DONE] prefix
- `getPropertyRules()` - Returns markdown formatted rules
- `updatePropertyRules()` - Returns formatted text
- `activateProperty()` - Returns formatted text with progress
- `addPropertyHostname()` - Returns formatted text
- `removePropertyHostname()` - Returns formatted text
- `listPropertyActivations()` - Returns markdown table
- `getActivationStatus()` - Returns formatted text
- All other functions return formatted text

❌ **property-manager-advanced-tools.ts**
- `listEdgeHostnames()` - Returns markdown table
- `getEdgeHostname()` - Returns markdown formatted details
- `cloneProperty()` - Returns formatted text
- `searchProperties()` - Returns formatted text
- `listPropertyVersions()` - Returns markdown table
- All other functions return formatted text

## Recommended JSON Structure

### Standard Response Structure
```json
{
  "data": {
    // Main response data (object or array)
  },
  "metadata": {
    "total": number,
    "shown": number,
    "hasMore": boolean,
    "executionTime": number,
    "warnings": []
  },
  "parameters": {
    // Echo of input parameters
  },
  "navigation": {
    // Optional pagination/navigation info
  }
}
```

### Specific Tool Structures

#### listContracts
```json
{
  "contracts": [
    {
      "contractId": "ctr_C-1234567",
      "contractType": "Standard",
      "contractTypeName": "Akamai Cloud Embed",
      "status": "Active",
      "displayName": "Cloud Embed (C-1234567)"
    }
  ],
  "metadata": {
    "total": 5,
    "searchTerm": "cloud"
  }
}
```

#### listGroups
```json
{
  "groups": [
    {
      "groupId": "grp_12345",
      "groupName": "Default Group",
      "parentGroupId": null,
      "contractIds": ["ctr_C-1234567"],
      "children": [
        {
          "groupId": "grp_23456",
          "groupName": "Sub Group",
          "parentGroupId": "grp_12345",
          "contractIds": [],
          "children": []
        }
      ]
    }
  ],
  "metadata": {
    "total": 10,
    "topLevelGroups": 3,
    "totalContracts": 5
  },
  "contractSummary": {
    "ctr_C-1234567": {
      "name": "Cloud Embed",
      "groupCount": 3
    }
  }
}
```

#### listProducts
```json
{
  "products": [
    {
      "productId": "prd_Fresca",
      "productName": "Fresca",
      "displayName": "Ion Standard",
      "category": "delivery",
      "useCase": "Dynamic web apps, APIs"
    }
  ],
  "metadata": {
    "total": 8,
    "byCategory": {
      "delivery": 5,
      "security": 2,
      "other": 1
    }
  },
  "parameters": {
    "contractId": "ctr_C-1234567"
  }
}
```

#### createPropertyVersion
```json
{
  "version": {
    "propertyId": "prp_12345",
    "version": 3,
    "baseVersion": 2,
    "createdBy": "user@example.com",
    "createdDate": "2025-01-28T12:00:00Z",
    "note": "Updated caching rules"
  },
  "metadata": {
    "success": true,
    "nextSteps": [
      {
        "action": "updateRules",
        "description": "Update rules for the new version",
        "command": "property.updateRules"
      },
      {
        "action": "activate",
        "description": "Activate to staging network",
        "command": "property.activate"
      }
    ]
  }
}
```

#### activateProperty
```json
{
  "activation": {
    "activationId": "atv_12345",
    "propertyId": "prp_12345",
    "propertyName": "www.example.com",
    "version": 3,
    "network": "STAGING",
    "status": "PENDING",
    "submitDate": "2025-01-28T12:00:00Z",
    "estimatedTime": 300,
    "notifyEmails": ["user@example.com"]
  },
  "metadata": {
    "inProgress": true,
    "canCheckStatus": true,
    "progressToken": "progress_12345"
  }
}
```

## Error Response Structure

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid property ID format",
    "details": {
      "field": "propertyId",
      "value": "invalid-id",
      "expected": "prp_XXXXX"
    }
  },
  "resolution": {
    "steps": [
      "Check the property ID format",
      "Use 'property.list' to find valid property IDs"
    ],
    "documentation": "https://techdocs.akamai.com/..."
  },
  "metadata": {
    "timestamp": "2025-01-28T12:00:00Z",
    "requestId": "req_12345"
  }
}
```

## Implementation Priority

### Phase 1 - High Priority (Most Used Tools)
1. `listGroups()` - Essential for property creation
2. `listContracts()` - Essential for property creation
3. `createPropertyVersion()` - Core workflow
4. `activateProperty()` - Core workflow
5. `listPropertyActivations()` - Status checking

### Phase 2 - Medium Priority (Common Operations)
1. `listProducts()` - Property creation support
2. `getPropertyRules()` - Configuration viewing
3. `updatePropertyRules()` - Configuration editing
4. `listEdgeHostnames()` - Hostname management
5. `searchProperties()` - Discovery operations

### Phase 3 - Low Priority (Advanced/Less Common)
1. `listPropertiesTreeView()` - Alternative view
2. `cloneProperty()` - Advanced operation
3. `addPropertyHostname()` - Can be batched
4. `removePropertyHostname()` - Can be batched
5. All other remaining tools

## Benefits of Optimization

1. **Improved LLM Processing**: Structured JSON is easier for Claude to parse and understand
2. **Consistent Error Handling**: Predictable error formats improve reliability
3. **Better Composability**: Tools can be chained together more easily
4. **Reduced Token Usage**: JSON is more compact than markdown tables
5. **Type Safety**: Structured data enables better validation
6. **Future Compatibility**: Easier to version and extend APIs

## Migration Strategy

1. **Backward Compatibility**: Add optional `format` parameter to tools
   - Default: `"text"` (current behavior)
   - New: `"json"` (structured response)

2. **Gradual Migration**: 
   - Start with Phase 1 tools
   - Monitor usage and feedback
   - Continue with Phase 2 and 3

3. **Documentation**: Update tool descriptions to indicate JSON support

4. **Testing**: Comprehensive test suite for both formats

## Next Steps

1. Create standardized response builder utilities
2. Implement Phase 1 tools with JSON support
3. Update test suites for new response formats
4. Create migration guide for API consumers
5. Monitor adoption and gather feedback

## Conclusion

Optimizing property tools for structured JSON responses will significantly improve the Claude Desktop experience. The phased approach ensures minimal disruption while providing immediate benefits for the most commonly used tools.