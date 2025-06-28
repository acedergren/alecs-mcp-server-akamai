# Edge DNS API Delta Analysis

## Priority Categories Implementation Status

### 1. Zone Operations

#### Currently Implemented ✅
- `list-zones` (listZones) - List all DNS zones
- `get-zone` (getZone) - Get zone details
- `create-zone` (createZone) - Create new zone

#### Missing from API ❌
Based on Akamai Edge DNS v2 API, the following operations are needed:
- **DELETE /zones/{zone}** - Delete a zone
- **PUT /zones/{zone}** - Update zone configuration
- **GET /zones/{zone}/status** - Get zone activation status
- **POST /zones/{zone}/activate** - Activate zone changes

### 2. Zone Versions Operations

#### Currently Implemented ✅
- `get-zone-version` (getZoneVersion) - Get specific zone version
- `get-version-record-sets` (getVersionRecordSets) - Get records for version
- `get-version-master-zone-file` (getVersionMasterZoneFile) - Get zone file
- `reactivate-zone-version` (reactivateZoneVersion) - Reactivate old version

#### Missing from API ❌
- **GET /zones/{zone}/versions** - List all versions for a zone
- **GET /zones/{zone}/versions/{version}/diff** - Compare versions
- **POST /zones/{zone}/versions/{version}/clone** - Clone a specific version

### 3. Record Sets Operations

#### Currently Implemented ✅
- `list-records` (listRecords) - List DNS records *(needs changelist fix)*
- `create-record` (upsertRecord) - Create/update record *(needs changelist fix)*
- `delete-record` (deleteRecord) - Delete record *(needs changelist fix)*
- `get-record-set` (getRecordSet) - Get record set details
- `create-multiple-record-sets` (createMultipleRecordSets) - Bulk create

#### Implementation Issues 🔧
**CRITICAL**: Record operations currently use direct zone endpoints instead of changelist workflow:
- ❌ Using: `/zones/{zone}/recordsets`
- ✅ Should use: `/changelists/{zone}/recordsets/add-change`

#### Missing from API ❌
- **PATCH /changelists/{zone}/recordsets/{name}/{type}** - Partial update of record
- **GET /changelists/{zone}/recordsets/validate** - Validate records before submit

### 4. Change Lists Operations

#### Currently Implemented ✅
- `activate-zone-changes` (activateZoneChanges) - Submit changelist *(needs update)*
- Helper functions: `ensureCleanChangeList`, `submitChangeList`, `getChangeList`

#### Implementation Issues 🔧
- Not creating explicit changelists with `POST /changelists`
- Missing proper changelist lifecycle management

#### Missing from API ❌
- **GET /changelists** - List all changelists
- **POST /changelists/search** - Search changelists
- **GET /changelists/{zone}/diff** - Show changelist differences
- **PATCH /changelists/{zone}** - Update changelist metadata

### 5. Data Services Operations

#### Currently Implemented ✅
None

#### Missing from API ❌
- **GET /data/authorities** - Get Akamai nameservers
- **GET /data/contracts** - List available contracts
- **GET /data/dns-sec-algorithms** - Get DNSSEC algorithms
- **GET /data/edgehostnames** - List edge hostnames
- **GET /data/groups** - List available groups
- **GET /data/recordsets/types** - Get supported record types

### 6. TSIG Keys Operations

#### Currently Implemented ✅
- `update-tsig-key-for-zones` (updateTSIGKeyForZones) - Update TSIG keys

#### Missing from API ❌
- **GET /tsig-keys** - List all TSIG keys
- **POST /tsig-keys** - Create new TSIG key
- **GET /tsig-keys/{keyId}** - Get TSIG key details
- **PUT /tsig-keys/{keyId}** - Update TSIG key
- **DELETE /tsig-keys/{keyId}** - Delete TSIG key
- **GET /zones/{zone}/tsig-keys** - List TSIG keys for zone
- **POST /zones/{zone}/tsig-keys/{keyId}** - Associate TSIG key with zone

## Implementation Priority

### Phase 1: Fix Existing Functions (HIGH PRIORITY) 🔴
1. **Fix Record Operations to use Changelist Workflow**
   - Update `upsertRecord` to use changelist
   - Update `deleteRecord` to use changelist
   - Update `createMultipleRecordSets` to use changelist
   
2. **Implement Proper Changelist Lifecycle**
   - Create changelist explicitly
   - Add changes via add-change endpoint
   - Submit changelist

### Phase 2: Implement Missing Core Operations (HIGH PRIORITY) 🟠
1. **Zone Management**
   - Delete zone
   - Update zone configuration
   
2. **Changelist Operations**
   - List changelists
   - Search changelists
   - Show changelist diff

3. **Data Services**
   - Get Akamai nameservers
   - List supported record types

### Phase 3: Advanced Features (MEDIUM PRIORITY) 🟡
1. **Zone Versions**
   - List all versions
   - Compare versions
   - Clone version

2. **TSIG Keys Management**
   - Full CRUD for TSIG keys
   - Zone association management

3. **Validation and Safety**
   - Record validation before submit
   - Changelist diff viewing

## Code Changes Required

### 1. Update Record Operations
```typescript
// Current (WRONG)
await client.request({
  path: `/config-dns/v2/zones/${args.zone}/recordsets`,
  method: 'POST',
  body: recordData
});

// Should be (CORRECT)
// Step 1: Create changelist
await client.request({
  path: '/config-dns/v2/changelists',
  method: 'POST',
  queryParams: { zone: args.zone }
});

// Step 2: Add change
await client.request({
  path: `/config-dns/v2/changelists/${args.zone}/recordsets/add-change`,
  method: 'POST',
  body: {
    name: args.name,
    type: args.type,
    op: 'ADD', // or 'EDIT', 'DELETE'
    ttl: args.ttl,
    rdata: args.rdata
  }
});

// Step 3: Submit changelist
await client.request({
  path: `/config-dns/v2/changelists/${args.zone}/submit`,
  method: 'POST'
});
```

### 2. Add Pagination Support
All list operations should support:
- `page` parameter (default: 1)
- `pageSize` parameter (default: 25)
- `showAll` parameter (default: false)

### 3. Add Missing Response Types
Create Zod schemas for:
- Changelist responses
- Data service responses
- TSIG key responses
- Zone version responses

## Testing Requirements

1. **Unit Tests**: Update all DNS tool tests to verify changelist workflow
2. **Integration Tests**: Test complete changelist lifecycle
3. **Live API Tests**: Verify with actual Akamai Edge DNS API
4. **Error Handling**: Test all error scenarios (404, 409, 429, etc.)

## Conclusion

The current implementation has the foundation but needs significant updates to properly implement the Akamai Edge DNS v2 changelist workflow. The most critical fix is updating all record operations to use the proper changelist API endpoints instead of direct zone endpoints.