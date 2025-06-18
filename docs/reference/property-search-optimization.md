# Property Search Optimization Guide

## Overview

The ALECS MCP Server implements several optimizations to handle large Akamai accounts efficiently without causing timeouts or memory issues.

## The Problem

Large enterprise Akamai accounts can have:
- Hundreds of groups and contracts
- Thousands of properties per contract
- Complex organizational hierarchies

Without proper optimization, searching for properties could:
- Take several minutes to complete
- Cause timeouts in the MCP protocol
- Consume excessive memory
- Trigger API rate limits

## Implemented Solutions

### 1. Search Limits

When searching for properties by name/hostname, we implement these limits:

```typescript
const MAX_GROUPS_TO_SEARCH = 5;        // Only search first 5 groups
const MAX_PROPERTIES_PER_GROUP = 100;  // Max 100 properties per group
const MAX_TOTAL_PROPERTIES = 300;      // Stop after 300 total properties
```

This ensures:
- Fast response times (typically < 5 seconds)
- Predictable memory usage
- No timeouts

### 2. Early Exit on Exact Match

The search algorithm returns immediately when an exact match is found:

```typescript
if (exactMatch) {
  return await getPropertyById(client, exactMatch.propertyId, exactMatch);
}
```

### 3. Display Limits

When listing properties, we limit the output:

```typescript
const MAX_PROPERTIES_TO_DISPLAY = args.limit || 50;
```

This prevents:
- Overwhelming the user with too much data
- Claude Desktop UI performance issues
- Memory problems with large responses

### 4. Informative Error Messages

When limits are reached, users get clear guidance:

```
❌ No properties found matching "example" in the first 5 groups (searched 284 properties).

**Suggestions:**
1. Use the exact property ID (e.g., prp_12345)
2. Use "list properties" to browse available properties
3. Try a more specific search term

**Note:** To prevent timeouts, the search was limited to:
- First 5 groups
- Maximum 100 properties per group
- Total of 300 properties
```

## Best Practices for Users

### 1. Use Property IDs When Possible

Property IDs (e.g., `prp_12345`) are always the fastest:
```
"get property prp_12345"
```

### 2. Be Specific with Search Terms

More specific searches yield better results:
```
"get property www.example.com"  // Better than "example"
```

### 3. Use Filters for Large Accounts

Filter by group or contract to narrow the search:
```
"list properties in group grp_12345"
"list properties for contract ctr_C-1ABCDEF"
```

### 4. Increase Limits When Needed

For specific use cases, you can increase limits:
```
"list properties with limit 100"
```

## API Efficiency

The optimized implementation:
- Makes fewer API calls
- Respects Akamai's rate limits
- Uses batch operations where possible
- Caches group information during searches

## Future Improvements

Potential enhancements could include:
1. Implement proper PAPI search API when available
2. Add caching for frequently accessed properties
3. Implement pagination for large result sets
4. Add property name indexing for faster searches

## Technical Details

### Memory Management

- Properties are processed in batches
- Large responses are truncated with clear indicators
- Temporary data structures are minimized

### Error Handling

- Network errors are caught and reported clearly
- Partial failures don't stop the entire search
- Users get actionable error messages

### Performance Metrics

Typical search times:
- Property ID lookup: < 1 second
- Name search (limited): 2-5 seconds
- Full property list: 1-3 seconds

## Conclusion

These optimizations ensure ALECS can handle enterprise-scale Akamai accounts efficiently while providing a good user experience. The trade-off between search completeness and performance is clearly communicated to users, allowing them to make informed decisions about how to search for properties.