# EdgeDNS Change-List Handling

## Overview

The Akamai EdgeDNS v2 API uses a change-list workflow for DNS modifications. This document explains how the ALECS MCP Server handles change-lists to prevent 409 Conflict errors.

## The Problem

EdgeDNS v2 only allows one active change-list per zone at a time. If you try to create a new change-list when one already exists, the API returns a 409 Conflict error:

```
409 Conflict: A change list already exists for this zone
```

## The Solution

We've implemented a helper function `ensureCleanChangeList()` that:

1. **Checks** if a change-list exists for the zone
2. **Deletes** any existing change-list if found
3. **Creates** a new clean change-list

This ensures that DNS operations always start with a fresh change-list, preventing conflicts.

## Implementation Details

### Helper Function

```typescript
export async function ensureCleanChangeList(
  client: AkamaiClient,
  zone: string,
  spinner?: Spinner
): Promise<void>
```

This function is used internally by:
- `upsertRecord()` - Create or update DNS records
- `deleteRecord()` - Delete DNS records
- `bulkImportRecords()` - Bulk import records during migration

### API Calls

The function makes the following API calls:

1. `GET /config-dns/v2/changelists/{zone}` - Check if change-list exists
2. `DELETE /config-dns/v2/changelists/{zone}` - Delete existing change-list (if found)
3. `POST /config-dns/v2/changelists?zone={zone}` - Create new change-list

### Error Handling

- **404 Not Found**: Expected when no change-list exists, silently ignored
- **Other errors**: Propagated to the caller

## Usage Examples

### Creating/Updating a Record

```typescript
// This will automatically handle any existing change-list
const result = await upsertRecord(client, {
  zone: 'example.com',
  name: 'www.example.com',
  type: 'A',
  ttl: 300,
  rdata: ['192.0.2.1']
});
```

### Deleting a Record

```typescript
// This will automatically handle any existing change-list
const result = await deleteRecord(client, {
  zone: 'example.com',
  name: 'old.example.com',
  type: 'A'
});
```

### Bulk Import

```typescript
// This will automatically handle any existing change-list
const result = await bulkImportRecords(client, {
  zone: 'example.com',
  records: recordsArray
});
```

## Benefits

1. **Reliability**: Eliminates 409 Conflict errors
2. **Simplicity**: No need to manually manage change-lists
3. **Safety**: Always starts with a clean state
4. **Consistency**: Same behavior across all DNS operations

## Considerations

- **Performance**: Adds 1-2 extra API calls per operation
- **Concurrent Operations**: Not suitable for concurrent modifications to the same zone
- **Existing Changes**: Any uncommitted changes in an existing change-list will be discarded

## Best Practices

1. **Sequential Operations**: Perform DNS operations sequentially, not in parallel
2. **Error Handling**: Always handle errors appropriately in your code
3. **Monitoring**: Check the MCP logs if operations fail unexpectedly

## Future Improvements

Potential enhancements could include:
- Option to preserve existing change-lists
- Ability to review changes before discarding
- Support for concurrent operations via change-list queuing
- Change-list status reporting