# Property Tools Claude Desktop Optimization Roadmap

## Overview
This roadmap outlines the optimization strategy for converting property tools from formatted text responses to structured JSON responses optimized for Claude Desktop consumption.

## Key Principle
**For MCP tools consumed by LLMs: Complete structured data > Pre-formatted summaries**

## Current Status (2025-01-28)

### ✅ Completed Optimizations
- `listProperties()` - Returns structured JSON with properties array and metadata
- `getProperty()` - Returns structured JSON with property details
- `createProperty()` - Returns structured JSON with success status

### 🚧 In Progress
- Finishing property server implementation
- Adding missing high-value PAPI tools

## High Priority Roadmap

### Phase 1 - Essential Workflow Tools (HIGH PRIORITY)
These tools are critical for basic property management workflows and should be optimized first:

1. **`listGroups()`** - Essential for property creation
   - Current: Returns markdown hierarchy
   - Target: JSON with group tree structure and metadata

2. **`listContracts()`** - Essential for property creation
   - Current: Returns markdown table
   - Target: JSON array with contract details

3. **`createPropertyVersion()`** - Core workflow
   - Current: Returns text with [DONE] prefix
   - Target: JSON with version details and next steps

4. **`activateProperty()`** - Core workflow
   - Current: Returns formatted progress text
   - Target: JSON with activation ID and status

5. **`listPropertyActivations()`** - Status checking
   - Current: Returns markdown table
   - Target: JSON array with activation history

### Phase 2 - Common Operations (MEDIUM PRIORITY)
Frequently used tools that enhance the user experience:

1. **`listProducts()`** - Property creation support
2. **`getPropertyRules()`** - Configuration viewing
3. **`updatePropertyRules()`** - Configuration editing
4. **`listEdgeHostnames()`** - Hostname management
5. **`searchProperties()`** - Discovery operations

### Phase 3 - Advanced Operations (LOW PRIORITY)
Less common but still important tools:

1. `listPropertiesTreeView()` - Alternative visualization
2. `cloneProperty()` - Advanced operation
3. `addPropertyHostname()` - Hostname management
4. `removePropertyHostname()` - Hostname management
5. All remaining property tools

### Phase 4 - Future Enhancements (LOW PRIORITY)
Features to implement later:

1. **INCLUDES management tools** - Advanced configuration sharing
2. **Bulk operations** - Batch property updates
3. **Field filtering with detail levels** - summary/detailed/full responses
4. **Schema pre-compilation** - Performance optimization

## Recommended JSON Structure Pattern

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
  "filters": {
    // Applied filters echoed back
  },
  "parameters": {
    // Input parameters echoed back
  }
}
```

## Error Response Pattern

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {
      // Specific error details
    }
  },
  "resolution": {
    "steps": ["Step 1", "Step 2"],
    "documentation": "URL to docs"
  },
  "metadata": {
    "timestamp": "ISO-8601",
    "requestId": "unique-id"
  }
}
```

## Implementation Guidelines

1. **Maintain backward compatibility**: Add optional `format` parameter
   - Default: `"text"` (current behavior)
   - New: `"json"` (structured response)

2. **Consistent field naming**: Use camelCase for all JSON fields

3. **Include metadata**: Always include execution time, counts, filters

4. **Echo parameters**: Include input parameters in response for context

5. **Null handling**: Use `null` for missing values, not `undefined`

## Benefits of This Approach

- **Improved LLM Processing**: Structured JSON is easier for Claude to parse
- **Context-Aware Presentation**: Claude can format data based on user intent
- **No Information Loss**: Complete data allows pattern recognition
- **Efficient Token Usage**: JSON is more compact than markdown
- **Better Composability**: Tools can be chained together
- **Type Safety**: Enables better validation and error handling

## Next Steps

1. Complete property server implementation with missing tools
2. Create standardized JSON response utilities
3. Implement Phase 1 tools with JSON support
4. Update test suites for new response formats
5. Monitor adoption and gather feedback

## Notes

- The streaming approach (PropertyResponseBuilder) has been removed in favor of structured JSON
- Let Claude handle presentation formatting based on user context
- Focus on data completeness and structure over pre-formatting