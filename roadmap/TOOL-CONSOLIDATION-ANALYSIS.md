# Akamai MCP Server Tool Consolidation Analysis

## Current State: 180 Tools Across 43 Files

### Issues with Current Architecture:

1. **Tool Sprawl**: Too many granular tools that could be combined
2. **Naming Inconsistencies**: Mix of camelCase, kebab-case, and snake_case
3. **Redundant Operations**: Multiple tools doing similar things
4. **Poor Discoverability**: Users don't know which tool to use
5. **Maintenance Burden**: 180 separate functions to maintain

## Analysis by Category

### 1. Property Management (47 tools) → Could be 5-7 tools

**Current tools include:**

- listProperties, listPropertiesTreeView, getProperty, createProperty
- createPropertyVersion, createPropertyVersionEnhanced
- activateProperty, activatePropertyWithMonitoring
- updatePropertyRules, updatePropertyRulesEnhanced
- cloneProperty, bulkCloneProperties
- Many more...

**Problems:**

- Too many variations of the same operation (e.g., create vs createEnhanced)
- Separate tools for what should be parameters
- Bulk operations as separate tools instead of array parameters

### 2. DNS Management (33 tools) → Could be 5-6 tools

**Current tools include:**

- listZones, getZone, createZone
- listRecords, upsertRecord, deleteRecord
- createMultipleRecordSets (why separate from upsertRecord?)
- importFromCloudflare, importZoneViaAXFR, parseZoneFile
- Many migration-specific tools

**Problems:**

- Import operations could be unified
- Record operations unnecessarily split

### 3. Certificate Management (19 tools) → Could be 3-4 tools

**Current tools include:**

- createDVEnrollment, enrollCertificateWithValidation
- checkDVEnrollmentStatus, monitorCertificateEnrollment
- deployCertificateToNetwork, linkCertificateToProperty
- Many validation and monitoring variations

**Problems:**

- Monitoring and status checking should be one tool
- Enrollment variations could be parameters

### 4. Hostname Management (20 tools) → Could be 3-4 tools

**Current tools include:**

- Multiple discovery tools
- Multiple analysis tools
- Separate bulk operations
- Edge hostname management split from regular hostnames

### 5. Other Categories with Similar Issues:

- Rule Tree Management (12 tools) → Could be 2-3 tools
- Bulk Operations (5 tools) → Should be parameters on base tools
- Include Management (8 tools) → Could be 2-3 tools
- Performance & Monitoring (8 tools) → Could be 2-3 tools

## Proposed Consolidated Architecture

### Design Principles:

1. **Resource-Oriented**: One primary tool per resource type
2. **Action as Parameter**: Use an "action" parameter instead of separate tools
3. **Bulk by Default**: Accept single items or arrays
4. **Consistent Naming**: Use resource.action pattern
5. **Smart Defaults**: Reduce required parameters through intelligent defaults

### Proposed Tool Structure (30-40 tools total):

#### 1. **property** (Replaces 47 tools)

```yaml
Actions:
  - list: List properties (with filters, tree view option)
  - get: Get property details (includes versions, hostnames)
  - create: Create new property
  - update: Update property (rules, hostnames, versions)
  - activate: Activate property version
  - clone: Clone property
  - delete: Remove property
  - search: Search properties (universal search)

Parameters:
  - action: Required action
  - id/ids: Property ID(s) for bulk operations
  - options: Action-specific options
```

#### 2. **dns** (Replaces 33 tools)

```yaml
Actions:
  - list-zones: List DNS zones
  - get-zone: Get zone details with records
  - create-zone: Create new zone
  - update-zone: Update zone settings
  - manage-records: Create/update/delete records (bulk capable)
  - import: Import from file/AXFR/Cloudflare
  - activate: Activate zone changes

Parameters:
  - action: Required action
  - zone/zones: Zone name(s)
  - records: Array of records for bulk operations
  - source: Import source type
```

#### 3. **certificate** (Replaces 19 tools)

```yaml
Actions:
  - list: List certificate enrollments
  - enroll: Create new enrollment (DV/EV/Third-party)
  - status: Check enrollment/deployment status
  - validate: Handle validation challenges
  - deploy: Deploy to network/property
  - renew: Renew certificate

Parameters:
  - action: Required action
  - id/ids: Enrollment ID(s)
  - type: Certificate type
  - domains: Domain list
```

#### 4. **hostname** (Replaces 20 tools)

```yaml
Actions:
  - discover: Discover hostnames (intelligent search)
  - analyze: Analyze conflicts, coverage, ownership
  - provision: Create provisioning plan and execute
  - validate: Validate DNS configuration

Parameters:
  - action: Required action
  - hostnames: Hostname array
  - analysis-type: Type of analysis needed
```

#### 5. **config** (New unified configuration tool)

```yaml
Actions:
  - get: Get any configuration (rules, cpcodes, includes)
  - update: Update any configuration
  - validate: Validate configuration
  - template: Apply templates

Parameters:
  - resource: Resource type (rules, cpcode, include)
  - action: Required action
  - id: Resource identifier
```

#### 6. **deploy** (Unified activation/deployment)

```yaml
Actions:
  - activate: Activate any resource (property, zone, cert, etc.)
  - status: Check activation status
  - rollback: Rollback activation
  - schedule: Schedule activation

Parameters:
  - resource: Resource type
  - action: Required action
  - target: Network (staging/production)
  - schedule: Optional schedule
```

#### 7. **analytics** (Replaces monitoring/reporting tools)

```yaml
Actions:
  - traffic: Get traffic statistics
  - performance: Get performance metrics
  - costs: Get cost analysis
  - alerts: Manage monitoring alerts

Parameters:
  - action: Required action
  - metrics: Metrics to retrieve
  - period: Time period
  - filters: Optional filters
```

#### 8. **search** (Universal search)

```yaml
Single universal search tool that searches across all resources
Parameters:
  - query: Search query
  - types: Optional resource types to search
  - detailed: Include detailed results
```

### Benefits of Consolidation:

1. **Better User Experience**:

   - Easier to discover functionality
   - More intuitive tool names
   - Consistent patterns

2. **Reduced Complexity**:

   - From 180 tools to ~35 tools
   - Fewer files to maintain
   - Clearer documentation

3. **More Powerful**:

   - Bulk operations built-in
   - Smarter parameter handling
   - Better error messages

4. **Easier to Extend**:
   - Add new actions to existing tools
   - Consistent patterns for new features

### Migration Strategy:

1. **Phase 1**: Create new consolidated tools alongside existing ones
2. **Phase 2**: Mark old tools as deprecated
3. **Phase 3**: Add migration helpers and warnings
4. **Phase 4**: Remove old tools in major version update

### Example Usage Comparisons:

**Old way (multiple tools):**

```
- Tool: createProperty
- Tool: createPropertyVersion
- Tool: updatePropertyRules
- Tool: addPropertyHostname
- Tool: activateProperty
```

**New way (one tool):**

```
- Tool: property
  - action: create
  - action: update (version, rules, hostnames)
  - action: activate
```

**Old way (separate bulk tools):**

```
- Tool: bulkActivateProperties
- Tool: bulkCloneProperties
- Tool: bulkUpdatePropertyRules
```

**New way (arrays in base tool):**

```
- Tool: property
  - action: activate
  - ids: [array of property IDs]
```

### Implementation Priority:

1. **High Priority** (Most used, most fragmented):

   - property tool
   - dns tool
   - search tool

2. **Medium Priority**:

   - certificate tool
   - config tool
   - deploy tool

3. **Lower Priority**:
   - hostname tool
   - analytics tool
   - admin tools

This consolidation would dramatically improve the user experience while maintaining all
functionality. The key is thoughtful design of the action parameters and smart handling of options.
