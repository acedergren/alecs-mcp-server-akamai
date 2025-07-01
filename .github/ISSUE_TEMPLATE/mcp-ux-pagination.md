---
name: "MCP UX: Pagination"
about: Implement consistent pagination across all list operations
title: "Add standardized pagination to prevent token limit issues"
labels: enhancement, performance, priority:high
assignees: ''

---

## Description
Implement consistent pagination across all list/search operations to handle large result sets without exceeding MCP's 25,000 token response limit.

## Requirements
- [ ] Add standard pagination parameters to all list operations
- [ ] Return standard pagination metadata
- [ ] Update bulk operations to use pagination internally
- [ ] Add streaming support for very large operations

## Standard Parameters
```typescript
interface PaginationParams {
  pageSize?: number;    // default: 20, max: 100
  pageToken?: string;   // cursor for next page
}

interface PaginationResponse {
  items: any[];
  pagination: {
    pageSize: number;
    nextPageToken?: string;  // null if no more pages
    totalCount?: number;      // if available from API
    hasMore: boolean;
  }
}
```

## Affected Tools (Partial List)
- [ ] `property.list` - Currently returns all properties
- [ ] `dns.list-zones` - Can return hundreds of zones
- [ ] `dns.list-records` - Large zones have thousands of records
- [ ] `network-list.list` - Can be very large
- [ ] `reporting.*` - All reporting tools need pagination
- [ ] All search tools
- [ ] All bulk operation tools

## Implementation Notes
- Use cursor-based pagination (not offset-based)
- Encode pagination state in opaque tokens
- Default pageSize should keep responses under 15k tokens
- Consider implementing streaming for real-time data

## Example Implementation
```typescript
async function listProperties(args: { pageSize?: number; pageToken?: string }) {
  const pageSize = Math.min(args.pageSize || 20, 100);
  const offset = decodePageToken(args.pageToken);
  
  const allItems = await getItems();
  const items = allItems.slice(offset, offset + pageSize);
  
  return {
    items,
    pagination: {
      pageSize,
      nextPageToken: items.length === pageSize ? encodePageToken(offset + pageSize) : null,
      totalCount: allItems.length,
      hasMore: offset + pageSize < allItems.length
    }
  };
}
```

## Acceptance Criteria
- [ ] No single response exceeds 20,000 tokens
- [ ] Pagination works consistently across all tools
- [ ] Clear documentation on how to fetch all pages
- [ ] Helper functions for common pagination patterns