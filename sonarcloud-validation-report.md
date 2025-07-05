# SonarCloud Issue Validation Report
Generated: 2025-07-04T05:51:09.307Z

## Summary
- Total Issues: 2167
- Still Exists: 2167 (100.0%)
- Fixed: 0 (0.0%)
- File Not Found: 0

## Issues to Close

## Issues Still Present

### AZfHhAmlNCjsD7TVtQTX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:115
- **Current Code**: `    logger.debug({ disableWrapper: disableWrapper || false }, 'Compatibility wrapper disabled');`
- **Suggestion**: Manual review required for this issue type

### AZfHaV8bw7PMlRvm6nXA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/orchestration/index.ts:291
- **Current Code**: `    console.error(`${icons.rocket} Parallel: ${format.yellow((_options.parallel || 1).toString())}`);`
- **Suggestion**: Manual review required for this issue type

### AZfHUpkRfqo5ISh2Mpjw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/cli.ts:326
- **Current Code**: `          process.exit(code || 0);`
- **Suggestion**: Manual review required for this issue type

### AZfHUpmyfqo5ISh2Mpjx
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/alecs-cli-wrapper.ts:99
- **Current Code**: `  if (arg.includes(';') || arg.includes('&') || arg.includes('|')) return false;`
- **Suggestion**: Manual review required for this issue type

### AZfFlDLNhJXSHKKiONOj
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/akamai-client.ts:186
- **Current Code**: `      const operationType = `${_options.method || 'GET'} ${requestPath}`;`
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2277
- **Current Code**: `  output += `**[TOOL] Required DNS Records:**\n`;`
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2278
- **Current Code**: `  config.dnsRecords.forEach((record: any, index: number) => {`
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2594
- **Current Code**: `    const hierarchy = topLevelGroups.map((group: PapiGroup) => buildHierarchy(group));`
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOH
- **Message**: Complete the task associated to this "TODO" comment.
- **Severity**: INFO
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2599
- **Current Code**: `      if (g.contractIds) {`
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2671
- **Current Code**: ` * List all products available for a contract`
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2693
- **Current Code**: `        contractId: contractId,`
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2696
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2726
- **Current Code**: `    const otherProducts: any[] = [];`
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2778
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONON
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2874
- **Current Code**: `  const _context: ErrorContext = {`
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOO
- **Message**: Unnecessary escape character: \/.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2888
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2905
- **Current Code**: `    const response = await withRetry(async () => {`
- **Suggestion**: Manual review required for this issue type

### AZfFlDCrhJXSHKKiONOQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2926
- **Current Code**: `            bulkSearchId,`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOU
- **Message**: Member 'cache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:111
- **Current Code**: `  private cache: AkamaiCacheService;`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:208
- **Current Code**: `        options.customer || 'default'`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:213
- **Current Code**: `          type: match.resourceType || 'property',`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:214
- **Current Code**: `          id: match.resourceId || match.propertyId,`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:215
- **Current Code**: `          name: match.resourceName || match.propertyName,`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:217
- **Current Code**: `          relevanceScore: match.score || 100,`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOa
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:284
- **Current Code**: `    const groups = (groupsResponse as PapiGroupsListResponse).groups?.items || [];`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOb
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:295
- **Current Code**: `          const properties = (propertiesResponse as PapiPropertiesListResponse).properties?.items || [];`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:320
- **Current Code**: `    return results.slice(0, options.maxResults || 20);`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:396
- **Current Code**: `    return queries[searchType] || queries['custom'];`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOe
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:415
- **Current Code**: `          relevanceScore: result.matchLocations?.length || 1,`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:439
- **Current Code**: `          property.propertyName.toLowerCase().includes(queryLower) ||`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOg
- **Message**: Refactor this function to reduce its Cognitive Complexity from 29 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:471
- **Current Code**: `  private async formatSearchResults(`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOh
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:494
- **Current Code**: `      if (!acc[result.type]) {acc[result.type] = [];}`
- **Suggestion**: Manual review required for this issue type

### AZfFlDGOhJXSHKKiONOi
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/unified-search-service.ts:543
- **Current Code**: `    text += `Search completed in ${searchTimeMs}ms using ${results[0]?.source || 'unknown'} source\n`;`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNo
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:71
- **Current Code**: `    const response = rawResponse as PapiGroupsListResponse;`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:91
- **Current Code**: `                searchTerm: args.searchTerm || null,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:112
- **Current Code**: `          g.groupName.toLowerCase().includes(searchLower) ||`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:119
- **Current Code**: `      page: args.page || 1,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNs
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:120
- **Current Code**: `      pageSize: args.pageSize || 50,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNt
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:131
- **Current Code**: `          if (!acc[group.parentGroupId]) {`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNu
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:143
- **Current Code**: `      const children = groupsByParent[group.groupId] || [];`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:147
- **Current Code**: `        contractIds: group.contractIds || [],`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:148
- **Current Code**: `        parentGroupId: group.parentGroupId || null,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNx
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:170
- **Current Code**: `          contractIds: group.contractIds || [],`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:171
- **Current Code**: `          parentGroupId: group.parentGroupId || null,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONNz
- **Message**: Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:175
- **Current Code**: `        unique: Array.from(allContracts).sort(),`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:185
- **Current Code**: `        searchTerm: args.searchTerm || null,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN1
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:265
- **Current Code**: `    const response = rawResponse as PapiPropertiesListResponse;`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:294
- **Current Code**: `      page: args.page || 1,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:295
- **Current Code**: `      pageSize: args.pageSize || 25, // Smaller page size for properties`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:307
- **Current Code**: `        productId: prop.productId || null,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:308
- **Current Code**: `        assetId: prop.assetId || null,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:309
- **Current Code**: `        latestVersion: prop.latestVersion || null,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:310
- **Current Code**: `        productionVersion: prop.productionVersion || null,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:311
- **Current Code**: `        stagingVersion: prop.stagingVersion || null,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:312
- **Current Code**: `        updatedDate: prop.updatedDate || null,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN-
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:402
- **Current Code**: `    const response = rawResponse as PapiPropertyVersionsResponse;`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONN_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:430
- **Current Code**: `      page: args.page || 1,`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONOA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:431
- **Current Code**: `      pageSize: args.pageSize || 20, // Even smaller for versions`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONOB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:444
- **Current Code**: `        productionStatus: version.productionStatus || 'INACTIVE',`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONOC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:445
- **Current Code**: `        stagingStatus: version.stagingStatus || 'INACTIVE',`
- **Suggestion**: Manual review required for this issue type

### AZfFlC9zhJXSHKKiONOD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools-paginated.ts:446
- **Current Code**: `        note: version.note || null,`
- **Suggestion**: Manual review required for this issue type

### AZfFlDDuhJXSHKKiONOR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/search-tool.ts:46
- **Current Code**: `    customer: args.customer || client.getCustomer(),`
- **Suggestion**: Manual review required for this issue type

### AZfFlDDuhJXSHKKiONOS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/search-tool.ts:56
- **Current Code**: `      maxResults: args.maxResults || 20,`
- **Suggestion**: Manual review required for this issue type

### AZfFlDDuhJXSHKKiONOT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/search-tool.ts:57
- **Current Code**: `      searchDepth: args.searchDepth || 'shallow',`
- **Suggestion**: Manual review required for this issue type

### AZfFlC6JhJXSHKKiONNg
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-search-helper.ts:66
- **Current Code**: `    query.bulkSearchQuery.queryFields = query.bulkSearchQuery.queryFields || [];`
- **Suggestion**: Manual review required for this issue type

### AZfFlC6JhJXSHKKiONNh
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-search-helper.ts:72
- **Current Code**: `    query.bulkSearchQuery.queryFields = query.bulkSearchQuery.queryFields || [];`
- **Suggestion**: Manual review required for this issue type

### AZfFlC6JhJXSHKKiONNi
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-search-helper.ts:78
- **Current Code**: `    query.bulkSearchQuery.queryFields = query.bulkSearchQuery.queryFields || [];`
- **Suggestion**: Manual review required for this issue type

### AZfFlC6JhJXSHKKiONNj
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-search-helper.ts:89
- **Current Code**: `export async function performIntelligentSearch(`
- **Suggestion**: Manual review required for this issue type

### AZfFlC6JhJXSHKKiONNk
- **Message**: Member 'index' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-search-helper.ts:200
- **Current Code**: `  private index: Map<string, Set<any>> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZfFlC6JhJXSHKKiONNl
- **Message**: Member 'items' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-search-helper.ts:201
- **Current Code**: `  private items: any[] = [];`
- **Suggestion**: Manual review required for this issue type

### AZfFlC6JhJXSHKKiONNm
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-search-helper.ts:208
- **Current Code**: `  private buildIndex(fields: string[]): void {`
- **Suggestion**: Manual review required for this issue type

### AZfFlC6JhJXSHKKiONNn
- **Message**: Add an initial value to this "reduce()" call.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-search-helper.ts:233
- **Current Code**: `    const intersection = resultSets.reduce((acc, set) => {`
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNM
- **Message**: Member 'translator' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:96
- **Current Code**: `  private translator = getAkamaiIdTranslator();`
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNN
- **Message**: Member 'cache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:97
- **Current Code**: `  private cache: LRUCache<string, HostnameRoute>;`
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNO
- **Message**: Member 'config' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:98
- **Current Code**: `  private config: Required<HostnameRouterConfig>;`
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNP
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:115
- **Current Code**: `    if (!AkamaiHostnameRouter.instance) {`
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:141
- **Current Code**: `        hostname: hostnames[0] || '', `
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNR
- **Message**: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:214
- **Current Code**: `  private async fetchBatchWithFallback(`
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:311
- **Current Code**: `    const textContent = searchResult.content?.[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNT
- **Message**: Replace this alternation with a character class.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:370
- **Current Code**: `    if (/^api(-|\.)/i.test(analyzeHost)) {`
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNU
- **Message**: Replace this alternation with a character class.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:372
- **Current Code**: `    } else if (/^cdn(-|\.)/i.test(analyzeHost) || analyzeHost.includes('.akamai')) {`
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNV
- **Message**: Replace this alternation with a character class.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:374
- **Current Code**: `    } else if (/-(us|eu|asia|au)(-|\.)/i.test(analyzeHost)) {`
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNW
- **Message**: Replace this alternation with a character class.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:376
- **Current Code**: `    } else if (/v\d+(-|\.)/i.test(analyzeHost)) {`
- **Suggestion**: Manual review required for this issue type

### AZfFlCylhJXSHKKiONNY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/hostname-router.ts:407
- **Current Code**: `      const textContent = searchResult.content?.[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZfFlC53hJXSHKKiONNb
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/pagination-helper.ts:97
- **Current Code**: `  const page = options.page || 1;`
- **Suggestion**: Manual review required for this issue type

### AZfFlC53hJXSHKKiONNc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/pagination-helper.ts:98
- **Current Code**: `  const pageSize = options.pageSize || calculateOptimalPageSize(items, options);`
- **Suggestion**: Manual review required for this issue type

### AZfFlC53hJXSHKKiONNd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/pagination-helper.ts:246
- **Current Code**: `  const pageSize = params.pageSize || params.limit || 50;`
- **Suggestion**: Manual review required for this issue type

### AZfFlC53hJXSHKKiONNe
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/pagination-helper.ts:246
- **Current Code**: `  const pageSize = params.pageSize || params.limit || 50;`
- **Suggestion**: Manual review required for this issue type

### AZfFlC53hJXSHKKiONNf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/pagination-helper.ts:247
- **Current Code**: `  const page = params.page || 1;`
- **Suggestion**: Manual review required for this issue type

### AZfFlC2ihJXSHKKiONNZ
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/request-timeout-handler.ts:72
- **Current Code**: `  try {`
- **Suggestion**: Manual review required for this issue type

### AZfFlC2ihJXSHKKiONNa
- **Message**: Member 'controllers' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/request-timeout-handler.ts:142
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZfDMlsrJGRBuKYzoPNf
- **Message**: Member 'translator' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/translation-middleware.ts:42
- **Current Code**: `  private translator: ReturnType<typeof getAkamaiIdTranslator>;`
- **Suggestion**: Manual review required for this issue type

### AZfDMlsrJGRBuKYzoPNg
- **Message**: Member 'config' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/translation-middleware.ts:43
- **Current Code**: `  private config: TranslationConfig;`
- **Suggestion**: Manual review required for this issue type

### AZfDMlsrJGRBuKYzoPNh
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/translation-middleware.ts:140
- **Current Code**: `      const matches = text.match(pattern);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HhohJXSHKKi1fwr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/index.ts:144
- **Current Code**: `      type: _error?.constructor?.name || typeof _error`
- **Suggestion**: Manual review required for this issue type

### AZfC9HKmhJXSHKKi1fuN
- **Message**: Member '_configManager' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/network-lists-server.ts:122
- **Current Code**: `  private client: AkamaiClient;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuO
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:169
- **Current Code**: `    const response = await client.request({`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuP
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:197
- **Current Code**: `      if (validated.group_by && response.data[0] && response.data[0][validated.group_by]) {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:199
- **Current Code**: `        const sorted = [...response.data].sort((a, b) => (b.edgeHits || 0) - (a.edgeHits || 0)).slice(0, 10);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:199
- **Current Code**: `        const sorted = [...response.data].sort((a, b) => (b.edgeHits || 0) - (a.edgeHits || 0)).slice(0, 10);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:202
- **Current Code**: `          text += `   - Edge Hits: ${formatNumber(item.edgeHits || 0)}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:203
- **Current Code**: `          text += `   - Edge Bandwidth: ${formatBytes(item.edgeBandwidth || 0)}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuU
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:270
- **Current Code**: `    const response = await client.request({`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuV
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:296
- **Current Code**: `        const offloadResponse = await client.request({`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuW
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:377
- **Current Code**: `    const response = await client.request({`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuX
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:472
- **Current Code**: `    const response = await client.request({`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:552
- **Current Code**: `      const has404s = (errorCounts['404'] || 0) > 0;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fuZ
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:656
- **Current Code**: `    // Type assertion needed: MCP provides Record<string, unknown> but handlers expect specific types`
- **Suggestion**: Manual review required for this issue type

### AZfC9HK3hJXSHKKi1fua
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:656
- **Current Code**: `    // Type assertion needed: MCP provides Record<string, unknown> but handlers expect specific types`
- **Suggestion**: Manual review required for this issue type

### AZfC9HcNhJXSHKKi1fwl
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/BaseAkamaiClient.ts:463
- **Current Code**: `                instance: lastError.details.instance || requestId,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HbLhJXSHKKi1fwh
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:65
- **Current Code**: `    status: 'normal' | 'warning' | 'critical';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HbLhJXSHKKi1fwi
- **Message**: Consider removing 'undefined' type or '?' specifier, one of them is redundant.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:79
- **Current Code**: `  private monitoringInterval?: NodeJS.Timeout | undefined;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HbLhJXSHKKi1fwj
- **Message**: Consider removing 'undefined' type or '?' specifier, one of them is redundant.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:80
- **Current Code**: `  private alertInterval?: NodeJS.Timeout | undefined;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HbfhJXSHKKi1fwk
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/TrafficAnalyticsService.ts:282
- **Current Code**: `        forecastPoints: forecasts?.length || 0,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HgghJXSHKKi1fwp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/template-engine.ts:150
- **Current Code**: `  const domainPrefix = template.edgeHostnameConfig.domainPrefix || edgeHostnamePrefix || 'www';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HgghJXSHKKi1fwq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/template-engine.ts:150
- **Current Code**: `  const domainPrefix = template.edgeHostnameConfig.domainPrefix || edgeHostnamePrefix || 'www';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HWihJXSHKKi1fvX
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/all-tools-registry.ts:283
- **Current Code**: `// import {`
- **Suggestion**: Remove commented out code

### AZfC9HWihJXSHKKi1fvY
- **Message**: Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/all-tools-registry.ts:571
- **Current Code**: `  return async (client: AkamaiClient, params: ToolParameters): Promise<MCPToolResponse> => {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HWihJXSHKKi1fvZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/all-tools-registry.ts:675
- **Current Code**: `        isError: result.isError || false`
- **Suggestion**: Manual review required for this issue type

### AZfC9HRDhJXSHKKi1fuy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:204
- **Current Code**: `  try {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HRDhJXSHKKi1fuz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:270
- **Current Code**: `    return {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HRDhJXSHKKi1fu0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:804
- **Current Code**: `  };`
- **Suggestion**: Manual review required for this issue type

### AZfC9HNkhJXSHKKi1fuv
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-dnssec-operations.ts:155
- **Current Code**: `  const response = obj as Record<string, unknown>;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HNkhJXSHKKi1fuw
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-dnssec-operations.ts:162
- **Current Code**: `      return false;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HSthJXSHKKi1fvB
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-operations-priority.ts:187
- **Current Code**: `// const TSIGKeySchema = z.object({`
- **Suggestion**: Remove commented out code

### AZfC9HSthJXSHKKi1fvC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-operations-priority.ts:265
- **Current Code**: `    interface ChangelistsResponse {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HSthJXSHKKi1fvD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-operations-priority.ts:330
- **Suggestion**: Manual review required for this issue type

### AZfC9HSthJXSHKKi1fvE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-operations-priority.ts:804
- **Current Code**: `      path: '/config-dns/v2/tsig-keys',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fub
- **Message**: Refactor this function to reduce its Cognitive Complexity from 58 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:267
- **Current Code**: `export async function createZone(`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fuc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:437
- **Current Code**: `      comment: args.comment || `Created via ALECS MCP server`,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fud
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:500
- **Current Code**: `        const statusCode = error?.statusCode || error?.response?.status || error?.status;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fue
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:500
- **Current Code**: `        const statusCode = error?.statusCode || error?.response?.status || error?.status;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fuf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:849
- **Current Code**: `            error.headers?.['retry-after'] ||`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fug
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1088
- **Current Code**: `    const recordCount = changelist.recordSets?.length || 0;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fuh
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1334
- **Current Code**: `        `${icons.info} Last modified by: ${format.dim(existingChangeList.lastModifiedBy || 'Unknown')}`,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fui
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1335
- **Current Code**: `        `${icons.info} Last modified: ${format.dim(existingChangeList.lastModifiedDate || 'Unknown')}`,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fuj
- **Message**: Refactor this function to reduce its Cognitive Complexity from 36 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1392
- **Current Code**: `export async function upsertRecord(`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fuk
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1456
- **Current Code**: `      const records = (existingRecords as EdgeDNSRecordSetsResponse).recordsets || [];`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1ful
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1513
- **Current Code**: `        args.comment || `${operation === 'ADD' ? 'Created' : 'Updated'} ${args.type} record for ${args.name}``
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fum
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1568
- **Current Code**: `              args.comment || `Updated ${args.type} record for ${args.name}``
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fun
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1771
- **Current Code**: `    console.log(`${icons.info} Last modified by: ${format.dim(changelist.lastModifiedBy || 'Unknown')}`);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fuo
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1772
- **Current Code**: `    console.log(`${icons.info} Last modified: ${format.dim(changelist.lastModifiedDate || 'Unknown')}`);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fup
- **Message**: Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1872
- **Current Code**: `export async function delegateSubzone(`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fuq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1883
- **Current Code**: `  const providerName = args.provider || 'external provider';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fur
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1884
- **Current Code**: `  const ttl = args.ttl || 300;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fus
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1947
- **Current Code**: `    } catch (error) {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fut
- **Message**: Move this array "sort" operation to a separate statement or replace it with "toSorted".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1967
- **Current Code**: `      const newNS = args.nameservers.sort();`
- **Suggestion**: Manual review required for this issue type

### AZfC9HMIhJXSHKKi1fuu
- **Message**: Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1967
- **Current Code**: `      const newNS = args.nameservers.sort();`
- **Suggestion**: Manual review required for this issue type

### AZfC9HQLhJXSHKKi1fux
- **Message**: Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:123
- **Current Code**: `        async () => {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HWJhJXSHKKi1fvW
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-error-handling-tools.ts:141
- **Current Code**: `  `
- **Suggestion**: Manual review required for this issue type

### AZfC9HUUhJXSHKKi1fvF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:154
- **Current Code**: `      const status = eh['status'] || 'Active';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HUUhJXSHKKi1fvG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:253
- **Current Code**: `    text += `- **Status:** ${eh['status'] || 'Active'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HUUhJXSHKKi1fvH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:258
- **Current Code**: `      text += `- **Serial Number:** ${mapDetails?.['serialNumber'] || 'N/A'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HUUhJXSHKKi1fvI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:259
- **Current Code**: `      text += `- **Slot Number:** ${mapDetails?.['slotNumber'] || 'N/A'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HUUhJXSHKKi1fvJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:635
- **Current Code**: `    );`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fva
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:164
- **Current Code**: `        throw new Error('Invalid property response structure');`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvb
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:199
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:203
- **Current Code**: `    `
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvd
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:321
- **Current Code**: `      const propertyResponse = await client.request({`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fve
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:347
- **Current Code**: `        Accept: 'application/vnd.akamai.papirules.v2023-10-30+json',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:351
- **Current Code**: `    // CODE KAI: Type-safe response handling with official Akamai types`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvg
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:409
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvh
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:412
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvi
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:415
- **Current Code**: `    // Extract key behaviors from default rule`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvj
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:439
- **Current Code**: `          type: 'text',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvk
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:465
- **Current Code**: `      const propertyResponse = await client.request({`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvl
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:490
- **Current Code**: `      headers: {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvm
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:528
- **Current Code**: `            op: 'replace',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvn
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:621
- **Current Code**: `  args: {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvo
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:674
- **Current Code**: `        secureNetwork: args.secure || domainSuffix.includes('edgekey') ? 'ENHANCED_TLS' : undefined,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvp
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:747
- **Current Code**: `  client: AkamaiClient,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvq
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:766
- **Current Code**: `      }`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvr
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:853
- **Current Code**: ` * 4. Returns success with reminder to update DNS`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvs
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:872
- **Current Code**: `  },`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvt
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:953
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvu
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1043
- **Current Code**: `        content: [`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvv
- **Message**: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1195
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvw
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1217
- **Current Code**: `          type: 'text',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvx
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1360
- **Current Code**: `      ],`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1476
- **Current Code**: `        `
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fvz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1477
- **Current Code**: `        if (act.status === 'ACTIVE') {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fv2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1515
- **Current Code**: `          staging: byNetwork.STAGING?.latestVersion || null`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fv3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1570
- **Current Code**: `        ],`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fv4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1594
- **Current Code**: `          text: JSON.stringify(jsonResponse, null, 2),`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fv5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1724
- **Current Code**: `    return formatError('create enhanced property version', _error);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fv6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1725
- **Current Code**: `  }`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fv7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1800
- **Current Code**: `          type: 'hostnames',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fv8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1915
- **Current Code**: `      }`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fv9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2053
- **Current Code**: `    text += `[DONE] Rolled back to version ${args.targetVersion}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fv-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2060
- **Current Code**: `    // Auto-activate if requested`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fv_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2061
- **Current Code**: `    if (args.autoActivate && args.network) {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fwA
- **Message**: Expected a `for-of` loop instead of a `for` loop with this simple iteration.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2107
- **Current Code**: `  args: {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fwB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2122
- **Current Code**: `    if (args.parallel) {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fwC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2129
- **Current Code**: `              result = await createPropertyVersionEnhanced(client, {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXMhJXSHKKi1fwD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2130
- **Current Code**: `                propertyId: op.propertyId,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HRlhJXSHKKi1fu1
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:817
- **Current Code**: `export async function updatePropertyRules(`
- **Suggestion**: Manual review required for this issue type

### AZfC9HRlhJXSHKKi1fu6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2052
- **Current Code**: `    const currentHostnames = currentResponse_typed.hostnames?.items || [];`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXihJXSHKKi1fwE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:154
- **Current Code**: `      const responseText = propertiesResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXihJXSHKKi1fwF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:169
- **Current Code**: `      const responseText = edgeHostnamesResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HXihJXSHKKi1fwG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:187
- **Current Code**: `      const responseText = dnsResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HSGhJXSHKKi1fu7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:174
- **Current Code**: `      const response_typed = response as { properties?: { items?: Array<{ propertyId: string; propertyName: string; [key: string]: unknown }> } };`
- **Suggestion**: Manual review required for this issue type

### AZfC9HSGhJXSHKKi1fu8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:182
- **Suggestion**: Manual review required for this issue type

### AZfC9HSGhJXSHKKi1fu9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:197
- **Current Code**: `              queryParams: { contractId, groupId: group.groupId },`
- **Suggestion**: Manual review required for this issue type

### AZfC9HSGhJXSHKKi1fu-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:213
- **Current Code**: `          method: 'GET',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HSGhJXSHKKi1fu_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:293
- **Current Code**: `      path: '/papi/v1/groups',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HSGhJXSHKKi1fvA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:311
- **Current Code**: `            path: '/papi/v1/properties',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HVyhJXSHKKi1fvK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:449
- **Current Code**: `          ruleFormat: prop.ruleFormat || null,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HVyhJXSHKKi1fvL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:450
- **Current Code**: `        };`
- **Suggestion**: Manual review required for this issue type

### AZfC9HVyhJXSHKKi1fvM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:452
- **Current Code**: `      pagination: {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HVyhJXSHKKi1fvN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:453
- **Current Code**: `        page,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HVyhJXSHKKi1fvP
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1694
- **Current Code**: `  },`
- **Suggestion**: Manual review required for this issue type

### AZfC9HVyhJXSHKKi1fvQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1703
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZfC9HVyhJXSHKKi1fvR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1704
- **Suggestion**: Manual review required for this issue type

### AZfC9HVyhJXSHKKi1fvS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1706
- **Current Code**: `    const validationErrors: string[] = [];`
- **Suggestion**: Manual review required for this issue type

### AZfC9HVyhJXSHKKi1fvT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1707
- **Suggestion**: Manual review required for this issue type

### AZfC9HVyhJXSHKKi1fvU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1722
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZfC9HVyhJXSHKKi1fvV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1723
- **Suggestion**: Manual review required for this issue type

### AZfC9G_YhJXSHKKi1fsi
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/certificate.ts:6
- **Current Code**: `// import { ListResponse } from './common'; // Currently unused`
- **Suggestion**: Remove commented out code

### AZfC9G_nhJXSHKKi1fsj
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns.ts:6
- **Current Code**: `// import { ListResponse } from './common'; // Currently unused`
- **Suggestion**: Remove commented out code

### AZfC9HB-hJXSHKKi1fsx
- **Message**: Consider removing 'undefined' type or '?' specifier, one of them is redundant.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/reporting.ts:207
- **Current Code**: `  cpCodes?: number[] | undefined;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HB-hJXSHKKi1fsy
- **Message**: Consider removing 'undefined' type or '?' specifier, one of them is redundant.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/reporting.ts:208
- **Current Code**: `  hostnames?: string[] | undefined;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HB-hJXSHKKi1fsz
- **Message**: Consider removing 'undefined' type or '?' specifier, one of them is redundant.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/reporting.ts:209
- **Current Code**: `  countries?: string[] | undefined;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HB-hJXSHKKi1fs0
- **Message**: Consider removing 'undefined' type or '?' specifier, one of them is redundant.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/reporting.ts:210
- **Current Code**: `  regions?: string[] | undefined;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HB-hJXSHKKi1fs1
- **Message**: Consider removing 'undefined' type or '?' specifier, one of them is redundant.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/reporting.ts:211
- **Current Code**: `  userAgents?: string[] | undefined;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HB-hJXSHKKi1fs2
- **Message**: Consider removing 'undefined' type or '?' specifier, one of them is redundant.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/reporting.ts:212
- **Current Code**: `  httpStatus?: string[] | undefined;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HB-hJXSHKKi1fs3
- **Message**: Consider removing 'undefined' type or '?' specifier, one of them is redundant.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/reporting.ts:213
- **Current Code**: `  cacheStatus?: string[] | undefined;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HCdhJXSHKKi1fs4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-id-validator.ts:240
- **Current Code**: `    numericPart = propertyMatch[1] || null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HCdhJXSHKKi1fs5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-id-validator.ts:251
- **Current Code**: `    numericPart = wrongPrefixMatch[1] || null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HDLhJXSHKKi1fs6
- **Message**: This conditional operation returns the same value whether the condition is "true" or "false".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/formatting.ts:272
- **Current Code**: `  return showRaw ? `Security Config ${configId}` : `Security Config ${configId}`;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HIrhJXSHKKi1fuJ
- **Message**: Member 'tools' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/modular-server-factory.ts:74
- **Current Code**: `  private server: Server;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HIrhJXSHKKi1fuK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/modular-server-factory.ts:136
- **Current Code**: `          type: 'object',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HIrhJXSHKKi1fuL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/modular-server-factory.ts:137
- **Current Code**: `          properties: this.extractZodProperties(tool.schema),`
- **Suggestion**: Manual review required for this issue type

### AZfC9HIrhJXSHKKi1fuM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/modular-server-factory.ts:187
- **Current Code**: `        // All tools follow the pattern: handler(client, params) => Promise<MCPToolResponse>`
- **Suggestion**: Manual review required for this issue type

### AZfC9HmbhJXSHKKi1fxG
- **Message**: Replace this shell form with exec form.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:Dockerfile:52
- **Current Code**: `  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"`
- **Suggestion**: Manual review required for this issue type

### AZfC9HmDhJXSHKKi1fxB
- **Message**: Consider wrapping this instruction in a script file and call it with exec form.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:Dockerfile.modular:57
- **Current Code**: `  CMD node -e "require('http').get('http://localhost:3010/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1`
- **Suggestion**: Manual review required for this issue type

### AZfC9HlqhJXSHKKi1fw8
- **Message**: Replace this shell form with exec form.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:Dockerfile.sse:44
- **Current Code**: `  CMD node -e "require('http').get('http://localhost:3013/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"`
- **Suggestion**: Manual review required for this issue type

### AZfC9HlLhJXSHKKi1fw3
- **Message**: Consider wrapping this instruction in a script file and call it with exec form.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:Dockerfile.websocket:44
- **Current Code**: `  CMD node -e "require('http').get('http://localhost:8082/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1`
- **Suggestion**: Manual review required for this issue type

### AZfC9HkZhJXSHKKi1fwz
- **Message**: Remove this unused import of 'execSync'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:scripts/update-docs.ts:12
- **Current Code**: `import { execSync } from 'child_process';`
- **Suggestion**: Remove unused import: execSync

### AZfC9HcqhJXSHKKi1fwm
- **Message**: Remove this unused import of 'beforeAll'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/alecs-comprehensive.test.ts:7
- **Current Code**: `import { describe, it, expect, beforeAll, afterAll } from '@jest/testing-library/jest-dom';`
- **Suggestion**: Remove unused import: beforeAll

### AZfC9HHchJXSHKKi1ftw
- **Message**: Member 'logger' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:36
- **Current Code**: `  private logger: Logger;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ftx
- **Message**: Member 'context' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:37
- **Current Code**: `  private context: ErrorContext;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1fty
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:57
- **Current Code**: `    const errorWithRequestId = error as { requestId?: string };`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ftz
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:57
- **Current Code**: `    const errorWithRequestId = error as { requestId?: string };`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:96
- **Current Code**: `  private extractStatusCode(error: any): number | undefined {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:97
- **Current Code**: `    return error?.statusCode || `
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:98
- **Current Code**: `           error?.response?.status || `
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:106
- **Current Code**: `  private extractAkamaiError(error: any): AkamaiErrorDetails | undefined {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:107
- **Current Code**: `    return error?.akamaiError || `
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft5
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:116
- **Current Code**: `    try {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft6
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:117
- **Current Code**: `      const jsonMatch = message.match(/Full error response: ({.*})/);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:204
- **Current Code**: `      if (err.field) {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:206
- **Current Code**: `      } else {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:295
- **Current Code**: `        akamaiError.errors.forEach((err, index) => {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft9
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:295
- **Current Code**: `        akamaiError.errors.forEach((err, index) => {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1ft_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:301
- **Current Code**: `    // Add request ID`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1fuA
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:301
- **Current Code**: `    // Add request ID`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHchJXSHKKi1fuB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-handler.ts:342
- **Current Code**: `    };`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1ftS
- **Message**: Member 'propertyCache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:55
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1ftT
- **Message**: Member 'groupCache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:56
- **Current Code**: `type AkamaiIdType = 'property' | 'group' | 'contract';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1ftU
- **Message**: Member 'contractCache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:57
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1ftV
- **Message**: Member 'pendingRequests' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:58
- **Current Code**: `export class AkamaiIdTranslator {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1ftW
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:123
- **Current Code**: `    // Check if we're already fetching this property`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1ftX
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:133
- **Current Code**: `    this.pendingRequests.set(propertyId, fetchPromise);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1ftY
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:161
- **Current Code**: `    // Check if we're already fetching this group`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1ftZ
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:171
- **Current Code**: `    this.pendingRequests.set(groupId, fetchPromise);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1fta
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:199
- **Current Code**: `    // Check if we're already fetching this contract`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1ftb
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:209
- **Current Code**: `    this.pendingRequests.set(contractId, fetchPromise);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1ftc
- **Message**: This check ignores index 0; consider using 'includes' method to make this check safe and explicit.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:259
- **Current Code**: `    `
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1ftd
- **Message**: Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:277
- **Current Code**: `  }`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGahJXSHKKi1fte
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-translator.ts:541
- **Current Code**: `      if (isPapiContractsResponse(response) && response.contracts?.items) {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGAhJXSHKKi1ftO
- **Message**: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:612
- **Current Code**: `      }`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHEhJXSHKKi1ftl
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/health-check.ts:92
- **Current Code**: `        logLevel: process.env['LOG_LEVEL'] || 'info',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHEhJXSHKKi1ftm
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/health-check.ts:95
- **Current Code**: `        nodeEnv: process.env['NODE_ENV'] || 'production'`
- **Suggestion**: Manual review required for this issue type

### AZfC9HIehJXSHKKi1fuG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/pino-logger.ts:47
- **Current Code**: `  level: process.env['LOG_LEVEL'] || 'info',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HIehJXSHKKi1fuH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/pino-logger.ts:52
- **Current Code**: `    env: process.env['NODE_ENV'] || 'development'`
- **Suggestion**: Manual review required for this issue type

### AZfC9HIehJXSHKKi1fuI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/pino-logger.ts:128
- **Current Code**: `    customer: customer || 'default'`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZGhJXSHKKi1fwI
- **Message**: Remove this unused import of 'AkamaiResponseFactory'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/base/reliable-test-base.ts:7
- **Current Code**: `import { AkamaiResponseFactory } from '../factories/response-factory';`
- **Suggestion**: Remove unused import: AkamaiResponseFactory

### AZfC9HZGhJXSHKKi1fwJ
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/base/reliable-test-base.ts:148
- **Current Code**: `    } catch (error) {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZGhJXSHKKi1fwK
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/base/reliable-test-base.ts:222
- **Current Code**: `    } catch (error) {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZGhJXSHKKi1fwL
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/base/reliable-test-base.ts:235
- **Current Code**: `      } catch (error) {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HYEhJXSHKKi1fwH
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/factories/response-factory.ts:135
- **Current Code**: `text: `Purge Status: ${status}\n\nPurge ID: 12345-67890\nSubmitted: ${new Date().toISOString()}\nProgress: ${status === 'DONE' ? '100%' : status === 'IN_PROGRESS' ? '60%' : '0%'}`,`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZfC9HGAhJXSHKKi1ftJ
- **Message**: Member 'compatibilityWrapper' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:90
- **Current Code**: `  private compatibilityWrapper?: MCPCompatibilityWrapper;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGAhJXSHKKi1ftL
- **Message**: Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:245
- **Current Code**: `   */`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGAhJXSHKKi1ftM
- **Message**: Refactor this function to reduce its Cognitive Complexity from 82 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:323
- **Current Code**: `   */`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGAhJXSHKKi1ftN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:534
- **Current Code**: `          type: 'string', `
- **Suggestion**: Manual review required for this issue type

### AZfC9HG1hJXSHKKi1ftf
- **Message**: Member 'server' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-compatibility-wrapper.ts:48
- **Current Code**: `  private server: Server;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HG1hJXSHKKi1ftg
- **Message**: Member 'config' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-compatibility-wrapper.ts:50
- **Current Code**: `  private config: CompatibilityConfig;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HG1hJXSHKKi1fth
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-compatibility-wrapper.ts:69
- **Current Code**: `    const version = initializeParams?.protocolVersion || '2024-11-05';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HG1hJXSHKKi1fti
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-compatibility-wrapper.ts:153
- **Current Code**: `          properties: schema.properties || {},`
- **Suggestion**: Manual review required for this issue type

### AZfC9HG1hJXSHKKi1ftj
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-compatibility-wrapper.ts:154
- **Current Code**: `          required: schema.required || [],`
- **Suggestion**: Manual review required for this issue type

### AZfC9HG1hJXSHKKi1ftk
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-compatibility-wrapper.ts:215
- **Current Code**: `      const response = await wrappedHandler(client, args || {});`
- **Suggestion**: Manual review required for this issue type

### AZfC9HkFhJXSHKKi1fwu
- **Message**: Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:scripts/openapi-alignment-analyzer.ts:56
- **Current Code**: `  extractEndpoints(): OpenAPIEndpoint[] {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HkFhJXSHKKi1fwv
- **Message**: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:scripts/openapi-alignment-analyzer.ts:99
- **Current Code**: `  analyzeFile(filePath: string): FunctionMapping[] {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HkFhJXSHKKi1fww
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:scripts/openapi-alignment-analyzer.ts:203
- **Current Code**: `        return `z.enum([${schema.enum.map((v: string) => `'${v}'`).join(', ')}])`;`
- **Suggestion**: Manual review required for this issue type

### AZfC9G67hJXSHKKi1fr1
- **Message**: Rename interface "paths" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/cps-api.ts:7
- **Current Code**: `export interface paths {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G67hJXSHKKi1fr2
- **Message**: Rename interface "operations" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/cps-api.ts:256
- **Current Code**: `export interface operations {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G67hJXSHKKi1fr3
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/cps-api.ts:319
- **Current Code**: `                certificateChainType?: "default" | "symantec1kroot" | null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9G67hJXSHKKi1fr4
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/cps-api.ts:324
- **Current Code**: `                certificateType: "san" | "single" | "wildcard" | "wildcard-san" | "third-party";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G67hJXSHKKi1fr5
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/cps-api.ts:386
- **Current Code**: `                  geography: "core" | "china+core" | "russia+core";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G67hJXSHKKi1fr6
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/cps-api.ts:393
- **Current Code**: `                  ocspStapling?: "on" | "off" | "not-set" | null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9G67hJXSHKKi1fr7
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/cps-api.ts:433
- **Current Code**: `                    changeType?: "new-certificate" | "modify-certificate" | "modify-san" | "renewal" | null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9G67hJXSHKKi1fr8
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/cps-api.ts:443
- **Current Code**: `                ra: "symantec" | "lets-encrypt" | "third-party";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G67hJXSHKKi1fr9
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/cps-api.ts:448
- **Current Code**: `                signatureAlgorithm?: "SHA-1" | "SHA-256" | null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9G67hJXSHKKi1fr-
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/cps-api.ts:487
- **Current Code**: `                validationType: "dv" | "ev" | "ov" | "third-party";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G67hJXSHKKi1fr_
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/cps-api.ts:2009
- **Current Code**: `                ocspStapling?: "on" | "off" | "not-set";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G9NhJXSHKKi1fsA
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/index.ts:11
- **Current Code**: `// export * as REPORTING_TYPES from './reporting'; // File doesn't exist yet`
- **Suggestion**: Remove commented out code

### AZfC9G9NhJXSHKKi1fsB
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/index.ts:13
- **Current Code**: `// export * as EDGE_HOSTNAMES_TYPES from './edge-hostnames'; // File doesn't exist yet`
- **Suggestion**: Remove commented out code

### AZfC9G9NhJXSHKKi1fsC
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/index.ts:21
- **Current Code**: `// export type { paths as ReportingPaths } from './reporting'; // File doesn't exist yet`
- **Suggestion**: Remove commented out code

### AZfC9G9NhJXSHKKi1fsD
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/index.ts:23
- **Current Code**: `// export type { paths as EdgeHostnamesPaths } from './edge-hostnames'; // File doesn't exist yet`
- **Suggestion**: Remove commented out code

### AZfC9G9ghJXSHKKi1fsE
- **Message**: Rename interface "paths" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/reporting-api.ts:7
- **Current Code**: `export interface paths {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G9ghJXSHKKi1fsF
- **Message**: Rename interface "operations" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/reporting-api.ts:88
- **Current Code**: `export interface operations {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G9ghJXSHKKi1fsG
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/reporting-api.ts:137
- **Current Code**: `                  type?: "string" | "int" | "enum";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G9ghJXSHKKi1fsH
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/generated/reporting-api.ts:495
- **Current Code**: `        interval: "FIVE_MINUTES" | "HOUR" | "DAY" | "WEEK" | "MONTH";`
- **Suggestion**: Manual review required for this issue type

### AZfC9HEthJXSHKKi1ftB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/ajv-validator.ts:57
- **Current Code**: `      errors: (validate.errors || []).map(err => ({`
- **Suggestion**: Manual review required for this issue type

### AZfC9HEthJXSHKKi1ftC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/ajv-validator.ts:58
- **Current Code**: `        field: err.instancePath || err.schemaPath,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HEthJXSHKKi1ftD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/ajv-validator.ts:59
- **Current Code**: `        message: err.message || 'Validation error',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HEthJXSHKKi1ftE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/ajv-validator.ts:229
- **Current Code**: `    const errors = result.errors?.map(e => `${e.field}: ${e.message}`).join(', ') || 'Unknown validation error';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGAhJXSHKKi1ftF
- **Message**: Member 'server' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:86
- **Current Code**: `  private server: Server;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGAhJXSHKKi1ftG
- **Message**: Member 'tools' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:87
- **Current Code**: `  private tools: Map<string, ToolDefinition> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGAhJXSHKKi1ftH
- **Message**: Member 'config' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:88
- **Current Code**: `  private config: ServerConfig;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGAhJXSHKKi1ftI
- **Message**: Member 'toolExecutionCount' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:89
- **Current Code**: `  private toolExecutionCount: Map<string, number> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGAhJXSHKKi1ftP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:634
- **Current Code**: `          const availableTools = Array.from(this.tools.keys()).slice(0, 10).join(', ');`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGAhJXSHKKi1ftQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:659
- **Current Code**: `            );`
- **Suggestion**: Manual review required for this issue type

### AZfC9HGAhJXSHKKi1ftR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-server-factory.ts:665
- **Suggestion**: Manual review required for this issue type

### AZfC9HHRhJXSHKKi1ftt
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/json-response-builder.ts:60
- **Current Code**: `// this._maxSize = options.maxResponseSize || 1024 * 1024; // 1MB default - Not used currently`
- **Suggestion**: Remove commented out code

### AZfC9HdbhJXSHKKi1fwo
- **Message**: Remove this unused import of 'beforeAll'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/baseline/runtime-behavior.test.ts:8
- **Current Code**: `import { describe, it, expect, beforeAll } from '@jest/globals';`
- **Suggestion**: Remove unused import: beforeAll

### AZfC9HZohJXSHKKi1fwb
- **Message**: Member 'outputDir' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery-standalone.ts:46
- **Current Code**: `  private outputDir = join(process.cwd(), 'api-discovery-results');`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZohJXSHKKi1fwc
- **Message**: Refactor this function to reduce its Cognitive Complexity from 63 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery-standalone.ts:496
- **Current Code**: `  private validateResponse(endpointKey: string, response: any, category: 'akamai' | 'mcp'): {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZohJXSHKKi1fwd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery-standalone.ts:735
- **Current Code**: `  const customer = args[2] || 'testing';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZohJXSHKKi1fwe
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery-standalone.ts:766
- **Current Code**: `        const results = await discovery.discoverAll(customer);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwM
- **Message**: Member 'captures' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:54
- **Current Code**: `  private captures: ResponseCapture[] = [];`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwN
- **Message**: Member 'outputDir' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:55
- **Current Code**: `  private outputDir = join(process.cwd(), 'api-discovery-results');`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwO
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:195
- **Current Code**: `      const capture = captureApiResponse(endpoint, error.response?.data, error.response?.status || 500);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwP
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:250
- **Current Code**: `// const response = await this.client.get(endpoint, { customer });`
- **Suggestion**: Remove commented out code

### AZfC9HZahJXSHKKi1fwQ
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:296
- **Current Code**: `// const response = await this.client.get(endpoint, {`
- **Suggestion**: Remove commented out code

### AZfC9HZahJXSHKKi1fwR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:349
- **Current Code**: `      const capture = captureApiResponse(endpoint, error.response?.data, error.response?.status || 500);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:360
- **Current Code**: `          statusCode: error.response?.status || 500,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:362
- **Current Code**: `          responseStructure: error.response?.data || error.message,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:951
- **Current Code**: `      const capture = captureApiResponse(endpoint, error.response?.data, error.response?.status || 500);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:1021
- **Current Code**: `      const capture = captureApiResponse(endpoint, error.response?.data, error.response?.status || 500);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:1121
- **Current Code**: `      const capture = captureApiResponse(endpoint, error.response?.data, error.response?.status || 500);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:1402
- **Current Code**: `  const customer = args[2] || 'testing';`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwY
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:1423
- **Current Code**: `        const result = await discovery.discoverEndpoint(endpointType, customer);`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwZ
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:1432
- **Current Code**: `        const endpoints = [`
- **Suggestion**: Manual review required for this issue type

### AZfC9HZahJXSHKKi1fwa
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/scripts/api-discovery.ts:1452
- **Current Code**: `        const report = discovery.generateReport();`
- **Suggestion**: Manual review required for this issue type

### AZfC9HBPhJXSHKKi1fst
- **Message**: Rename interface "paths" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cpcodes-openapi.ts:6
- **Current Code**: `export interface paths {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HBPhJXSHKKi1fsu
- **Message**: Rename interface "components" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cpcodes-openapi.ts:195
- **Current Code**: `export interface components {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HBPhJXSHKKi1fsv
- **Message**: Rename interface "operations" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cpcodes-openapi.ts:204
- **Current Code**: `export interface operations {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fsW
- **Message**: Rename interface "paths" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:6
- **Current Code**: `export interface paths {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fsX
- **Message**: Rename interface "components" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:365
- **Current Code**: `export interface components {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fsY
- **Message**: Rename interface "operations" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:374
- **Current Code**: `export interface operations {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fsZ
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:558
- **Current Code**: `                            certificateChainType?: "default" | "symantec1kroot" | null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fsa
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:563
- **Current Code**: `                            certificateType: "san" | "single" | "wildcard" | "wildcard-san" | "third-party";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fsb
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:625
- **Current Code**: `                                geography: "core" | "china+core" | "russia+core";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fsc
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:632
- **Current Code**: `                                ocspStapling?: "on" | "off" | "not-set" | null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fsd
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:672
- **Current Code**: `                                changeType?: "new-certificate" | "modify-certificate" | "modify-san" | "renewal" | null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fse
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:682
- **Current Code**: `                            ra: "symantec" | "lets-encrypt" | "third-party";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fsf
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:687
- **Current Code**: `                            signatureAlgorithm?: "SHA-1" | "SHA-256" | null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fsg
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:726
- **Current Code**: `                            validationType: "dv" | "ev" | "ov" | "third-party";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G_MhJXSHKKi1fsh
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/cps-openapi.ts:2564
- **Current Code**: `                                ocspStapling?: "on" | "off" | "not-set";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-bhJXSHKKi1fsI
- **Message**: Rename interface "paths" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns-openapi.ts:6
- **Current Code**: `export interface paths {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-bhJXSHKKi1fsJ
- **Message**: Rename interface "components" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns-openapi.ts:1209
- **Current Code**: `export interface components {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-bhJXSHKKi1fsK
- **Message**: Rename interface "operations" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns-openapi.ts:1218
- **Current Code**: `export interface operations {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-bhJXSHKKi1fsL
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns-openapi.ts:1583
- **Current Code**: `                                fromValue?: (boolean | number | Record<string, never> | string) | null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-bhJXSHKKi1fsM
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns-openapi.ts:1590
- **Current Code**: `                                operation: "ADD" | "DELETE" | "EDIT";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-bhJXSHKKi1fsN
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns-openapi.ts:2055
- **Current Code**: `                        activationState: "NEW" | "PENDING_APPROVAL" | "ACTIVE" | "OBSOLETE" | "ERROR" | "LOCKED";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-bhJXSHKKi1fsO
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns-openapi.ts:2078
- **Current Code**: `                        signAndServeAlgorithm?: "RSA_SHA1" | "RSA_SHA256" | "RSA_SHA512" | "ECDSA_P256_SHA256" | "ECDSA_P384_SHA384" | null;`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-bhJXSHKKi1fsP
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns-openapi.ts:2086
- **Current Code**: `                            algorithm: "HMAC-MD5.SIG-ALG.REG.INT" | "hmac-md5" | "hmac-sha1" | "hmac-sha224" | "hmac-sha256" | "hmac-sha384" | "hmac-sha512";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-bhJXSHKKi1fsQ
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns-openapi.ts:2096
- **Current Code**: `                        type: "PRIMARY" | "SECONDARY" | "ALIAS";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-bhJXSHKKi1fsR
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns-openapi.ts:2167
- **Current Code**: `                    signAndServeAlgorithm?: "RSA_SHA1" | "RSA_SHA256" | "RSA_SHA512" | "ECDSA_P256_SHA256" | "ECDSA_P384_SHA384";`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-bhJXSHKKi1fsS
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/edge-dns-openapi.ts:2398
- **Current Code**: `                            permissions: ("READ" | "WRITE" | "ADD" | "DELETE")[];`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-shJXSHKKi1fsT
- **Message**: Rename interface "paths" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/fastpurge-openapi.ts:6
- **Current Code**: `export interface paths {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-shJXSHKKi1fsU
- **Message**: Rename interface "components" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/fastpurge-openapi.ts:165
- **Current Code**: `export interface components {`
- **Suggestion**: Manual review required for this issue type

### AZfC9G-shJXSHKKi1fsV
- **Message**: Rename interface "operations" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/fastpurge-openapi.ts:174
- **Current Code**: `export interface operations {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HAThJXSHKKi1fsk
- **Message**: Rename interface "paths" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/network-lists-openapi.ts:6
- **Current Code**: `export interface paths {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HAThJXSHKKi1fsl
- **Message**: Rename interface "components" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/network-lists-openapi.ts:308
- **Current Code**: `export interface components {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HAThJXSHKKi1fsm
- **Message**: Rename interface "operations" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/network-lists-openapi.ts:317
- **Current Code**: `export interface operations {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HAThJXSHKKi1fsn
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/network-lists-openapi.ts:409
- **Current Code**: `                            activationStatus: "INACTIVE" | "ACTIVE" | "MODIFIED" | "PENDING_ACTIVATION" | "FAILED" | "PENDING_DEACTIVATION";`
- **Suggestion**: Manual review required for this issue type

### AZfC9HAshJXSHKKi1fso
- **Message**: Rename interface "paths" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/reporting-openapi.ts:6
- **Current Code**: `export interface paths {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HAshJXSHKKi1fsp
- **Message**: Rename interface "components" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/reporting-openapi.ts:121
- **Current Code**: `export interface components {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HAshJXSHKKi1fsq
- **Message**: Rename interface "operations" to match the regular expression ^[A-Z][a-zA-Z0-9]*$.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/reporting-openapi.ts:130
- **Current Code**: `export interface operations {`
- **Suggestion**: Manual review required for this issue type

### AZfC9HAshJXSHKKi1fsr
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/reporting-openapi.ts:568
- **Current Code**: `                            type?: "string" | "int" | "enum";`
- **Suggestion**: Manual review required for this issue type

### AZfC9HAshJXSHKKi1fss
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/reporting-openapi.ts:1437
- **Current Code**: `                interval: "FIVE_MINUTES" | "HOUR" | "DAY" | "WEEK" | "MONTH";`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHRhJXSHKKi1ftn
- **Message**: Member 'startTime' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/json-response-builder.ts:53
- **Current Code**: `  private startTime: number;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHRhJXSHKKi1fto
- **Message**: Member 'requestId' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/json-response-builder.ts:54
- **Current Code**: `  private requestId: string;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHRhJXSHKKi1ftp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/json-response-builder.ts:58
- **Current Code**: `    this.startTime = options.executionStartTime || Date.now();`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHRhJXSHKKi1ftq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/json-response-builder.ts:59
- **Current Code**: `    this.requestId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHRhJXSHKKi1fts
- **Message**: '(from: number, length?: number | undefined): string' is deprecated.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/json-response-builder.ts:59
- **Current Code**: `    this.requestId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHRhJXSHKKi1ftu
- **Message**: Correct one of the identical sub-expressions on both sides of operator "-"
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/json-response-builder.ts:235
- **Current Code**: `      executionTime: Date.now() - Date.now(),`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHRhJXSHKKi1ftv
- **Message**: Correct one of the identical sub-expressions on both sides of operator "-"
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/json-response-builder.ts:267
- **Current Code**: `      executionTime: Date.now() - Date.now(),`
- **Suggestion**: Manual review required for this issue type

### AZfC9HEFhJXSHKKi1fs8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/timeout-handler.ts:170
- **Current Code**: `        args: options.context || {},`
- **Suggestion**: Manual review required for this issue type

### AZfC9HEFhJXSHKKi1fs9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/timeout-handler.ts:225
- **Current Code**: `      return error.message?.includes('timed out') ||`
- **Suggestion**: Manual review required for this issue type

### AZfC9HEFhJXSHKKi1fs-
- **Message**: Member 'startTime' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/timeout-handler.ts:258
- **Current Code**: `  private startTime: number;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HEFhJXSHKKi1fs_
- **Message**: Member 'timeout' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/timeout-handler.ts:260
- **Current Code**: `  private timeout: number;`
- **Suggestion**: Manual review required for this issue type

### AZfC9HEFhJXSHKKi1ftA
- **Message**: Member 'onProgress?: (message: string) => void' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/timeout-handler.ts:265
- **Current Code**: `    private onProgress?: (message: string) => void`
- **Suggestion**: Manual review required for this issue type

### AZfC9HBehJXSHKKi1fsw
- **Message**: Member 'tools' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/tool-infrastructure.ts:147
- **Current Code**: `  private tools = new Map<string, ToolDefinition<any>>();`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHyhJXSHKKi1fuC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-validation.ts:128
- **Current Code**: `        code: statusCode || 0,`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHyhJXSHKKi1fuD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-validation.ts:129
- **Current Code**: `        message: error.message || 'Unknown error occurred',`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHyhJXSHKKi1fuE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-validation.ts:161
- **Current Code**: `      suggestion: validation.error?.suggestion || 'Property does not exist'`
- **Suggestion**: Manual review required for this issue type

### AZfC9HHyhJXSHKKi1fuF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/property-validation.ts:172
- **Current Code**: `      suggestion: validation.error?.suggestion || 'No access to property'`
- **Suggestion**: Manual review required for this issue type

### AZe6knm1qTomVwOqf_ga
- **Message**: Refactor this function to reduce its Cognitive Complexity from 131 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/property-server.ts:517
- **Current Code**: `    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_nt
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:183
- **Current Code**: `      },`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_nv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:247
- **Current Code**: `        ],`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1371
- **Current Code**: ` * `
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1391
- **Current Code**: ` * @param args.format - Response format: 'json' or 'text'`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1393
- **Current Code**: ` */`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oM
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1401
- **Current Code**: `  },`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1450
- **Current Code**: `      network: act.network,`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oO
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1451
- **Current Code**: `      activationType: act.activationType,`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1456
- **Current Code**: `      notifyEmails: act.notifyEmails || [],`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_m_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2080
- **Current Code**: `    'default-dv': {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2131
- **Current Code**: `      priority: 'Required for Default DV',`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2132
- **Current Code**: `    });`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2133
- **Current Code**: `  }`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2134
- **Current Code**: `  `
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2135
- **Current Code**: `  return records;`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2141
- **Current Code**: `function generateDVValidation(config: any): any {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2142
- **Current Code**: `  if (config.domainValidationMethod === 'auto-dns') {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2155
- **Current Code**: `        'DNS propagation typically takes 5-15 minutes',`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2217
- **Current Code**: `  `
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nO
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2306
- **Current Code**: `    output += `${step}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2327
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nQ
- **Message**: Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2336
- **Current Code**: `  try {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2346
- **Current Code**: `    if (!isPapiContractsResponse(rawResponse)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnlqTomVwOqf_hH
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-management.ts:172
- **Current Code**: `  default?: string | number | boolean | unknown[] | Record<string, unknown>;`
- **Suggestion**: Manual review required for this issue type

### AZe6knm1qTomVwOqf_gW
- **Message**: Remove this unused import of '_wrapToolHandler'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/property-server.ts:80
- **Current Code**: `import { wrapToolHandler as _wrapToolHandler } from '../utils/mcp-2025-migration';`
- **Suggestion**: Remove unused import: _wrapToolHandler

### AZe6knm1qTomVwOqf_gZ
- **Message**: Member 'tools' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/property-server.ts:98
- **Current Code**: `  private tools: Map<string, Mcp2025ToolDefinition> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knm1qTomVwOqf_gc
- **Message**: Complete the task associated to this "TODO" comment.
- **Severity**: INFO
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/property-server.ts:833
- **Current Code**: `            // TODO: Handle batch removal - for now just remove first hostname`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:187
- **Current Code**: `        sum + (item.edgeHits || 0), 0);`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:189
- **Current Code**: `        sum + (item.edgeBandwidth || 0), 0);`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fL
- **Message**: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:254
- **Current Code**: `  handler: async (args: z.infer<typeof cacheReportSchema>) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:284
- **Current Code**: `        sum + (item.cacheableResponses || 0), 0);`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:286
- **Current Code**: `        sum + (item.uncacheableResponses || 0), 0);`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fO
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:304
- **Current Code**: `            sum + (item.offloadRate || 0), 0) / offloadResponse.data.length;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:393
- **Current Code**: `        const location = item[validated.level] || 'Unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fQ
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:394
- **Current Code**: `        if (!locationData[location]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:397
- **Current Code**: `        locationData[location].hits += item.edgeHits || 0;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:398
- **Current Code**: `        locationData[location].bandwidth += item.edgeBandwidth || 0;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fT
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:406
- **Current Code**: `text += `## Top ${validated.level === 'country' ? 'Countries' : validated.level === 'region' ? 'Regions' : 'Cities'}\n\n`;`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knmDqTomVwOqf_fU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:494
- **Current Code**: `              errorCounts[code] = (errorCounts[code] || 0) + value;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:608
- **Current Code**: `  return descriptions[code] || 'Unknown Error';`
- **Suggestion**: Manual review required for this issue type

### AZe6knmDqTomVwOqf_fW
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/reporting-server.ts:659
- **Current Code**: `    return { content: result.content || [] };`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_ua
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:88
- **Current Code**: `  validationType: 'dv' | 'ov' | 'ev' | 'third-party';`
- **Suggestion**: Manual review required for this issue type

### AZe6knodqTomVwOqf_ii
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-dnssec-operations.ts:194
- **Current Code**: `  },`
- **Suggestion**: Manual review required for this issue type

### AZe6knodqTomVwOqf_ij
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-dnssec-operations.ts:219
- **Suggestion**: Manual review required for this issue type

### AZe6knodqTomVwOqf_ik
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-dnssec-operations.ts:417
- **Suggestion**: Manual review required for this issue type

### AZe6knodqTomVwOqf_il
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-dnssec-operations.ts:425
- **Suggestion**: Manual review required for this issue type

### AZe6knodqTomVwOqf_im
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-dnssec-operations.ts:629
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZe6knodqTomVwOqf_in
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-dnssec-operations.ts:639
- **Current Code**: `    10: 'RSASHA512',`
- **Suggestion**: Manual review required for this issue type

### AZe6knqQqTomVwOqf_ls
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-operations-priority.ts:534
- **Current Code**: `      // CODE KAI: Display contract with clear zone usage`
- **Suggestion**: Manual review required for this issue type

### AZe6knqQqTomVwOqf_lt
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-operations-priority.ts:534
- **Current Code**: `      // CODE KAI: Display contract with clear zone usage`
- **Suggestion**: Manual review required for this issue type

### AZe6knqQqTomVwOqf_lu
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-operations-priority.ts:757
- **Current Code**: `      output += `\nPropagation Status:\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hj
- **Message**: Refactor this function to reduce its Cognitive Complexity from 50 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:759
- **Current Code**: `export async function submitChangeList(`
- **Suggestion**: Manual review required for this issue type

### AZe6knwJqTomVwOqf_yx
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-error-handling-tools.ts:161
- **Current Code**: `/**`
- **Suggestion**: Manual review required for this issue type

### AZe6knwJqTomVwOqf_yy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-error-handling-tools.ts:222
- **Current Code**: `    // CODE KAI: Type-safe validation result processing`
- **Suggestion**: Manual review required for this issue type

### AZe6knwJqTomVwOqf_y3
- **Message**: Refactor this function to reduce its Cognitive Complexity from 29 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-error-handling-tools.ts:441
- **Current Code**: `/**`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_u1
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:296
- **Current Code**: `            text: `No properties found${args.contractId ? ` for contract ${args.contractId}` : ''}.\n\n[INFO] **Next Steps:**\n- Use "create_property" to create a new property\n- Check if you have access to the correct contract and group`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_u2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:319
- **Current Code**: `      text += `- **Production Version:** ${property.productionVersion || 'None'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_u3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:320
- **Current Code**: `      text += `- **Staging Version:** ${property.stagingVersion || 'None'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_u4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:323
- **Current Code**: `      text += `- **Note:** ${property.note || 'No note'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_u5
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:365
- **Current Code**: `            text: `[ERROR] Invalid Property ID Format\n\n${error}\n\n**You provided:** ${args.propertyId}\n${fixed ? `**Did you mean:** ${fixed}\n` : ''}\n**Example:** get_property --propertyId prp_123456`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_u6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:405
- **Current Code**: `    text += `- **Note:** ${property.note || 'No note'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_u7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:409
- **Current Code**: `    text += `- **Production Version:** ${property.productionVersion || 'Not activated'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_u8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:410
- **Current Code**: `    text += `- **Staging Version:** ${property.stagingVersion || 'Not activated'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_u9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:493
- **Current Code**: `      text += `- **Source Version:** ${args.cloneFrom.version || 'Latest'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_u-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1004
- **Current Code**: `      domainSuffix: args.domainSuffix || '.edgekey.net', // Most common choice`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_u_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1006
- **Current Code**: `      ipVersionBehavior: args.ipVersion || 'IPV4_IPV6', // Future-proof with dual-stack`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1026
- **Current Code**: `    const fullEdgeHostname = `${args.domainPrefix}${args.domainSuffix || '.edgekey.net'}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1032
- **Current Code**: `    text += `**Domain Suffix:** ${args.domainSuffix || '.edgekey.net'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1034
- **Current Code**: `    text += `**IP Support:** ${args.ipVersion || 'IPv4 + IPv6 (Dual Stack)'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vD
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1141
- **Current Code**: `            text: `No edge hostnames found${args.contractId ? ` for contract ${args.contractId}` : ''}.\n\n**Why this might happen:**\n- No properties have been created yet\n- Hostnames exist in different contracts/groups\n- Account permissions may be limited\n\n**Next Steps:**\n- Create a property first (properties auto-create edge hostnames)\n- Use "create_edge_hostname" to manually create one\n- Check if you're looking in the right contract/group`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vE
- **Message**: Refactor this function to reduce its Cognitive Complexity from 23 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1260
- **Current Code**: `export async function activateProperty(`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vF
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1323
- **Current Code**: `            text: `[ERROR] Invalid Property ID Format\n\n${error}\n\n**You provided:** ${args.propertyId}\n${fixed ? `**Did you mean:** ${fixed}\n` : ''}\n**Example:** activate_property --propertyId prp_123456 --version 1 --network STAGING`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vG
- **Message**: Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1498
- **Current Code**: `export async function getActivationStatus(`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1735
- **Current Code**: `        text += `- **Submitted By:** ${activation.submitUser || 'Unknown'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vN
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1951
- **Current Code**: `      if (args.edgeHostnameIds && args.edgeHostnameIds[index]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vP
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:1973
- **Current Code**: `      if (args.edgeHostnameIds && args.edgeHostnameIds[index]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2158
- **Current Code**: `          const prodStatus = hostname.certStatus.production[0]?.status || 'Unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2162
- **Current Code**: `          const stagingStatus = hostname.certStatus.staging[0]?.status || 'Unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2242
- **Current Code**: `      text += `- **Type:** ${contract.contractTypeName || 'Standard'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2404
- **Current Code**: `    const webProducts = products_response_typed.products.items.filter((p) => `
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2405
- **Current Code**: `      p.productName.toLowerCase().includes('web') || `
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2410
- **Current Code**: `    const securityProducts = products_response_typed.products.items.filter((p) => `
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2411
- **Current Code**: `      p.productName.toLowerCase().includes('security') || `
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vZ
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2527
- **Current Code**: `      `
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_va
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2528
- **Current Code**: `      // Use source property's values as defaults`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vb
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2529
- **Current Code**: `      if (!args.productId) {args.productId = sourceProperty.productId;}`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2559
- **Current Code**: `    text += `**New Property Name:** ${args.newPropertyName}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vg
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2676
- **Current Code**: `    text += `**Last Modified:** ${version.updatedDate}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vh
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2677
- **Current Code**: `    text += `**Modified By:** ${version.updatedByUser}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vi
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2771
- **Current Code**: `    let text = `# [ANALYTICS] CP Codes (${cpcodes_response_typed.cpcodes.items.length} found)\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vj
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2787
- **Current Code**: `      cpcodes.forEach((cpcode) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vk
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2921
- **Current Code**: `      const fixed = fixAkamaiId(args.cpcodeId, 'cpcode');`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vl
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2950
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vm
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2951
- **Current Code**: `    const cpcode = cpcode_details_response_typed.cpcodes.items[0];`
- **Suggestion**: Manual review required for this issue type

### AZe6knuzqTomVwOqf_vn
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager.ts:2967
- **Current Code**: `    `
- **Suggestion**: Manual review required for this issue type

### AZe6knp2qTomVwOqf_k1
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:98
- **Current Code**: `      } catch (error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knp2qTomVwOqf_k2
- **Message**: Refactor this function to reduce its Cognitive Complexity from 35 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:147
- **Current Code**: `async function searchByHostname(`
- **Suggestion**: Manual review required for this issue type

### AZe6knp2qTomVwOqf_k5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:188
- **Suggestion**: Manual review required for this issue type

### AZe6knp2qTomVwOqf_k8
- **Message**: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:275
- **Current Code**: `/**`
- **Suggestion**: Manual review required for this issue type

### AZe6knp2qTomVwOqf_k-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:301
- **Current Code**: `      : groups.slice(0, 5); // CODE KAI: Limit fallback scope`
- **Suggestion**: Manual review required for this issue type

### AZe6knp2qTomVwOqf_lB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:382
- **Current Code**: `    const status = result.productionVersion`
- **Suggestion**: Manual review required for this issue type

### AZe6knp2qTomVwOqf_lC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:382
- **Current Code**: `    const status = result.productionVersion`
- **Suggestion**: Manual review required for this issue type

### AZe6knp2qTomVwOqf_lE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-search-optimized.ts:421
- **Current Code**: `      : result.stagingVersion`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mS
- **Message**: Refactor this function to reduce its Cognitive Complexity from 35 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:302
- **Current Code**: `  return withToolErrorHandling(async () => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:454
- **Current Code**: `        pageSize,`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:455
- **Current Code**: `        totalPages,`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:457
- **Current Code**: `        hasNextPage: page < totalPages,`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_ma
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:458
- **Current Code**: `        hasPreviousPage: page > 1,`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mb
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:461
- **Current Code**: `        totalProperties: allProperties.length,`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:462
- **Current Code**: `        totalGroups: groupStats.size,`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_md
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:474
- **Current Code**: `            contractCount: stats.contractIds.size,`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mm
- **Message**: Refactor this function to reduce its Cognitive Complexity from 56 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1165
- **Current Code**: `      output += '\n### Contract Breakdown:\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1363
- **Current Code**: `            result.content[0].text = searchNote + result.content[0].text;`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_ms
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1364
- **Current Code**: `          }`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mt
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1365
- **Current Code**: `          return result;`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mu
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1366
- **Current Code**: `        }`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1367
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1371
- **Current Code**: `        // Show up to 10 matches`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mx
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1372
- **Current Code**: `        const matchesToShow = foundProperties.slice(0, 10);`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_my
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1380
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1381
- **Current Code**: `        if (foundProperties.length > 10) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_m0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1387
- **Current Code**: `        text +=`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_m1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1388
- **Current Code**: `          '[INFO] **Tip:** Using the exact property ID (prp_XXXXX) is always faster and more reliable.';`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_m2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1393
- **Current Code**: `              type: 'text',`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_m3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1394
- **Current Code**: `              text,`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_m8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1554
- **Current Code**: `          throw new Error('Invalid property details response structure from PAPI API');`
- **Suggestion**: Manual review required for this issue type

### AZe6knd0qTomVwOqf_Zr
- **Message**: Use concise character class syntax '\w' instead of '[A-Za-z0-9_]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-id-validator.ts:111
- **Current Code**: `  return /^prd_[A-Za-z0-9_]+$/.test(id);`
- **Suggestion**: Manual review required for this issue type

### AZe6knd0qTomVwOqf_Zs
- **Message**: Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-id-validator.ts:120
- **Current Code**: `export function validateAkamaiId(id: string): {`
- **Suggestion**: Manual review required for this issue type

### AZe6knd0qTomVwOqf_Zt
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-id-validator.ts:238
- **Current Code**: `  const propertyMatch = id.match(/property\s+(\d+)/i);`
- **Suggestion**: Manual review required for this issue type

### AZe6knd0qTomVwOqf_Zu
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-id-validator.ts:249
- **Current Code**: `  const wrongPrefixMatch = id.match(/^[a-z]+_(\d+)$/);`
- **Suggestion**: Manual review required for this issue type

### AZe6knd0qTomVwOqf_Zv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/akamai-id-validator.ts:310
- **Current Code**: `  const prefix = prefixMap[expectedType] || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knkzqTomVwOqf_eP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/etag-handler.ts:40
- **Current Code**: `  const etag = response.headers?.etag || `
- **Suggestion**: Manual review required for this issue type

### AZe6knkzqTomVwOqf_eQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/etag-handler.ts:41
- **Current Code**: `                response.headers?.ETag || `
- **Suggestion**: Manual review required for this issue type

### AZe6knkzqTomVwOqf_eR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/etag-handler.ts:42
- **Current Code**: `                response.headers?.['etag'] ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knkzqTomVwOqf_eS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/etag-handler.ts:43
- **Current Code**: `                response.etag ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knkzqTomVwOqf_eT
- **Message**: Group parts of the regex together to make the intended operator precedence explicit.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/etag-handler.ts:48
- **Current Code**: `    return etag.replace(/^W?\/?"?|"$/g, '');`
- **Suggestion**: Manual review required for this issue type

### AZe6knkzqTomVwOqf_eU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/etag-handler.ts:71
- **Current Code**: `  return etagCache.get(resourcePath) || null;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkzqTomVwOqf_eV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/etag-handler.ts:109
- **Current Code**: `    const etag = options.etag || getStoredETag(options.path);`
- **Suggestion**: Manual review required for this issue type

### AZe6knkzqTomVwOqf_eW
- **Message**: Member 'client: AkamaiClient' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/etag-handler.ts:236
- **Current Code**: `  constructor(private client: AkamaiClient) {}`
- **Suggestion**: Manual review required for this issue type

### AZe6knj6qTomVwOqf_ce
- **Message**: Member 'chunks' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-streaming.ts:31
- **Current Code**: `  private chunks: ContentChunk[] = [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knj6qTomVwOqf_cf
- **Message**: Member 'metadata' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-streaming.ts:32
- **Current Code**: `  private metadata: {`
- **Suggestion**: Manual review required for this issue type

### AZe6knj6qTomVwOqf_cg
- **Message**: Move this array "sort" operation to a separate statement or replace it with "toSorted".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-streaming.ts:206
- **Current Code**: `    const sortedChunks = this.chunks.sort((a, b) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knj6qTomVwOqf_ch
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-streaming.ts:208
- **Current Code**: `      const aPriority = priorityOrder[a.priority || 'medium'];`
- **Suggestion**: Manual review required for this issue type

### AZe6knj6qTomVwOqf_ci
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-streaming.ts:209
- **Current Code**: `      const bPriority = priorityOrder[b.priority || 'medium'];`
- **Suggestion**: Manual review required for this issue type

### AZe6knj6qTomVwOqf_cj
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-streaming.ts:267
- **Current Code**: `    } else if (status.latestVersion && status.latestVersion > (status.productionVersion || 0)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knj6qTomVwOqf_ck
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-streaming.ts:283
- **Current Code**: `      if (status.latestVersion > (status.productionVersion || 0)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knj6qTomVwOqf_cl
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-streaming.ts:309
- **Current Code**: `      h.status || '[ACTIVE] Active'`
- **Suggestion**: Manual review required for this issue type

### AZe6knh2qTomVwOqf_aa
- **Message**: Member 'cache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/request-coalescer.ts:60
- **Current Code**: `  private cache = new Map<string, CacheEntry<any>>();`
- **Suggestion**: Manual review required for this issue type

### AZe6knh2qTomVwOqf_ab
- **Message**: Member 'config' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/request-coalescer.ts:61
- **Current Code**: `  private config: CoalescerConfig;`
- **Suggestion**: Manual review required for this issue type

### AZe6knh2qTomVwOqf_ad
- **Message**: Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/request-coalescer.ts:167
- **Current Code**: `      .sort()`
- **Suggestion**: Manual review required for this issue type

### AZe6knh2qTomVwOqf_af
- **Message**: Move this array "sort" operation to a separate statement or replace it with "toSorted".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/request-coalescer.ts:225
- **Current Code**: `      entries`
- **Suggestion**: Manual review required for this issue type

### AZe6knh2qTomVwOqf_ag
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/request-coalescer.ts:290
- **Current Code**: `    if (!this.instance) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knh2qTomVwOqf_ah
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/request-coalescer.ts:319
- **Current Code**: `    const { propertyId, version, customer, contractId, groupId } = args || {};`
- **Suggestion**: Manual review required for this issue type

### AZe6knh2qTomVwOqf_ai
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/request-coalescer.ts:335
- **Current Code**: `    const { query, propertyName, hostname, contractId, groupId } = args || {};`
- **Suggestion**: Manual review required for this issue type

### AZe6knh2qTomVwOqf_aj
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/request-coalescer.ts:351
- **Current Code**: `    const { contractId, groupId, customer, limit, offset } = args || {};`
- **Suggestion**: Manual review required for this issue type

### AZe6knlTqTomVwOqf_en
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/rfc7807-errors.ts:140
- **Current Code**: `    const errorType = this.type.split('/').pop() || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knlTqTomVwOqf_eo
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/rfc7807-errors.ts:308
- **Current Code**: `        detail: data.detail || data.title,`
- **Suggestion**: Manual review required for this issue type

### AZe6knlTqTomVwOqf_ep
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/rfc7807-errors.ts:309
- **Current Code**: `        status: error.response.status || 500,`
- **Suggestion**: Manual review required for this issue type

### AZe6knlTqTomVwOqf_eq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/rfc7807-errors.ts:320
- **Current Code**: `        detail: data.message || data.error || 'An unknown error occurred',`
- **Suggestion**: Manual review required for this issue type

### AZe6knlTqTomVwOqf_er
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/rfc7807-errors.ts:320
- **Current Code**: `        detail: data.message || data.error || 'An unknown error occurred',`
- **Suggestion**: Manual review required for this issue type

### AZe6knlTqTomVwOqf_es
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/rfc7807-errors.ts:321
- **Current Code**: `        status: error.response.status || 500,`
- **Suggestion**: Manual review required for this issue type

### AZe6knlTqTomVwOqf_et
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/rfc7807-errors.ts:358
- **Current Code**: `      detail: error.message || `HTTP ${status} error occurred`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knlTqTomVwOqf_eu
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/rfc7807-errors.ts:367
- **Current Code**: `    detail: error.message || 'An unexpected error occurred',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3aqTomVwOqf_7P
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/config/transport-config.ts:29
- **Current Code**: `          port: parseInt(process.env['WS_PORT'] || '8080'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3aqTomVwOqf_7Q
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/config/transport-config.ts:30
- **Current Code**: `          host: process.env['WS_HOST'] || '0.0.0.0',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3aqTomVwOqf_7R
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/config/transport-config.ts:31
- **Current Code**: `          path: process.env['WS_PATH'] || '/mcp',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3aqTomVwOqf_7S
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/config/transport-config.ts:32
- **Current Code**: `          auth: (process.env['AUTH_TYPE'] as 'none' | 'token') || 'token',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3aqTomVwOqf_7T
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/config/transport-config.ts:41
- **Current Code**: `          port: parseInt(process.env['SSE_PORT'] || '3001'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3aqTomVwOqf_7U
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/config/transport-config.ts:42
- **Current Code**: `          host: process.env['SSE_HOST'] || '0.0.0.0',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3aqTomVwOqf_7V
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/config/transport-config.ts:43
- **Current Code**: `          path: process.env['SSE_PATH'] || '/mcp/sse',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3aqTomVwOqf_7W
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/config/transport-config.ts:45
- **Current Code**: `          auth: (process.env['AUTH_TYPE'] as 'none' | 'token') || 'none'`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1JqTomVwOqf_4F
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/authentication.ts:182
- **Current Code**: `    const normalizedPath = path.split('?')[0]?.toLowerCase() || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1JqTomVwOqf_4G
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/authentication.ts:258
- **Current Code**: `      return forwardedValue?.split(',')[0]?.trim() || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1JqTomVwOqf_4H
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/authentication.ts:264
- **Current Code**: `      return realIpValue || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1ZqTomVwOqf_4Q
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/security.ts:267
- **Current Code**: `      return forwardedValue?.split(',')[0]?.trim() || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1ZqTomVwOqf_4R
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/security.ts:274
- **Current Code**: `      return realIpValue || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_f9
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:682
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_f-
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:685
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_f_
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:688
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gA
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:691
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gB
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:694
- **Current Code**: `          case 'enroll-certificate-with-validation':`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_ud
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:263
- **Current Code**: `        'CPSEnrollmentCreateResponse'`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_ue
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:264
- **Current Code**: `      );`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_ug
- **Message**: Refactor this function to reduce its Cognitive Complexity from 30 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:287
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_uh
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:312
- **Current Code**: `        'CPSEnrollmentStatusResponse'`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_ui
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:465
- **Current Code**: `        'CPSEnrollmentStatusResponse'`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_uj
- **Message**: Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:588
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_uk
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:619
- **Current Code**: `        'CPSEnrollmentsListResponse'`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_uq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:801
- **Current Code**: `    expired: '[ERROR]',`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_ur
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:858
- **Current Code**: `        'CPSCSRResponse'`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_us
- **Message**: Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:996
- **Current Code**: `/**`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_ut
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:1159
- **Current Code**: `    if (!isCPSEnrollmentStatusResponse(statusResponse)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_uu
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:1256
- **Current Code**: `): Promise<MCPToolResponse> {`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_uv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:1257
- **Current Code**: `  try {`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_uw
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:1274
- **Current Code**: `    if (!isCPSEnrollmentStatusResponse(initialResponse)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_ux
- **Message**: Review this redundant assignment: "estimatedMinutes" already holds the assigned value along all execution paths.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:1389
- **Current Code**: `      // Remaining deployment time`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_he
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:158
- **Current Code**: `    const response = rawResponse as EdgeDNSZonesResponse;`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hg
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:223
- **Current Code**: `    const response = rawResponse as EdgeDNSZoneResponse;`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hh
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:645
- **Current Code**: `    const response = rawResponse as EdgeDNSRecordSetsResponse;`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hr
- **Message**: Refactor this function to reduce its Cognitive Complexity from 30 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1131
- **Current Code**: `export async function waitForZoneActivation(`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hs
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1171
- **Current Code**: `      const status = rawResponse as EdgeDNSZoneActivationStatusResponse;`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_h1
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1707
- **Current Code**: `    const submitResponse = rawSubmitResponse as EdgeDNSZoneSubmitResponse;`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:237
- **Current Code**: `    'prd_Enterprise': 'Enterprise'`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_m4
- **Message**: Refactor this function to reduce its Cognitive Complexity from 29 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1417
- **Current Code**: `  } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knqeqTomVwOqf_lw
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:707
- **Current Code**: `function cleanFilter(filter?: ReportingFilterInput): ReportingFilter | undefined {`
- **Suggestion**: Manual review required for this issue type

### AZe6knqeqTomVwOqf_lx
- **Message**: Complete the task associated to this "TODO" comment.
- **Severity**: INFO
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:770
- **Current Code**: `    // TODO Phase 2: Add customer validation`
- **Suggestion**: Manual review required for this issue type

### AZe6knqeqTomVwOqf_lz
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1139
- **Current Code**: `cacheEfficiency: avgHitRatio >= 85 ? 'Optimal' : avgHitRatio >= 70 ? 'Good' : 'Needs Improvement',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_l0
- **Message**: Remove this redundant "undefined".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1253
- **Current Code**: `    const params = reportingService.buildReportingParams(period as ReportingPeriod, undefined);`
- **Suggestion**: Manual review required for this issue type

### AZe6knqeqTomVwOqf_l2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1358
- **Current Code**: `        dataPoints: timeSeriesData['bandwidth']?.length || 0,`
- **Suggestion**: Manual review required for this issue type

### AZe6knqeqTomVwOqf_l3
- **Message**: Refactor this function to reduce its Cognitive Complexity from 35 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1375
- **Current Code**: `export async function generatePerformanceReport(args: GeneratePerformanceReportArgs): Promise<{ success: boolean; data?: PerformanceReport; error?: string; details?: string; message?: string }> {`
- **Suggestion**: Manual review required for this issue type

### AZe6knqeqTomVwOqf_l4
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1415
- **Current Code**: `speed: trafficSummary.responseTime < 100 ? 'A' : trafficSummary.responseTime < 300 ? 'B' : trafficSummary.responseTime < 500 ? 'C' : trafficSummary.responseTime < 1000 ? 'D' : 'F',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_l5
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1415
- **Current Code**: `speed: trafficSummary.responseTime < 100 ? 'A' : trafficSummary.responseTime < 300 ? 'B' : trafficSummary.responseTime < 500 ? 'C' : trafficSummary.responseTime < 1000 ? 'D' : 'F',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_l6
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1415
- **Current Code**: `speed: trafficSummary.responseTime < 100 ? 'A' : trafficSummary.responseTime < 300 ? 'B' : trafficSummary.responseTime < 500 ? 'C' : trafficSummary.responseTime < 1000 ? 'D' : 'F',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_l7
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1416
- **Current Code**: `caching: trafficSummary.cacheHitRatio > 90 ? 'A' : trafficSummary.cacheHitRatio > 80 ? 'B' : trafficSummary.cacheHitRatio > 70 ? 'C' : trafficSummary.cacheHitRatio > 60 ? 'D' : 'F',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_l8
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1416
- **Current Code**: `caching: trafficSummary.cacheHitRatio > 90 ? 'A' : trafficSummary.cacheHitRatio > 80 ? 'B' : trafficSummary.cacheHitRatio > 70 ? 'C' : trafficSummary.cacheHitRatio > 60 ? 'D' : 'F',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_l9
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1416
- **Current Code**: `caching: trafficSummary.cacheHitRatio > 90 ? 'A' : trafficSummary.cacheHitRatio > 80 ? 'B' : trafficSummary.cacheHitRatio > 70 ? 'C' : trafficSummary.cacheHitRatio > 60 ? 'D' : 'F',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_l-
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1417
- **Current Code**: `reliability: trafficSummary.errorRate < 0.1 ? 'A' : trafficSummary.errorRate < 1 ? 'B' : trafficSummary.errorRate < 2 ? 'C' : trafficSummary.errorRate < 5 ? 'D' : 'F',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_l_
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1417
- **Current Code**: `reliability: trafficSummary.errorRate < 0.1 ? 'A' : trafficSummary.errorRate < 1 ? 'B' : trafficSummary.errorRate < 2 ? 'C' : trafficSummary.errorRate < 5 ? 'D' : 'F',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_mA
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1417
- **Current Code**: `reliability: trafficSummary.errorRate < 0.1 ? 'A' : trafficSummary.errorRate < 1 ? 'B' : trafficSummary.errorRate < 2 ? 'C' : trafficSummary.errorRate < 5 ? 'D' : 'F',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_mB
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1446
- **Current Code**: `return score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Needs Improvement';`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_mC
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1446
- **Current Code**: `return score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Needs Improvement';`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knqeqTomVwOqf_mD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1504
- **Current Code**: `          grade: getPerformanceGrade(regionMetrics['response-time']?.average || 0),`
- **Suggestion**: Manual review required for this issue type

### AZe6knqeqTomVwOqf_mE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1541
- **Current Code**: `  const responseTime = metrics['response-time']?.average || 1000;`
- **Suggestion**: Manual review required for this issue type

### AZe6knqeqTomVwOqf_mF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1554
- **Current Code**: `  const values = Object.values(geoData).map((data: any) => data.metrics[metric]?.average || 0);`
- **Suggestion**: Manual review required for this issue type

### AZe6knxGqTomVwOqf_zE
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/reporting.ts:154
- **Current Code**: `      speed: 'A' | 'B' | 'C' | 'D' | 'F';`
- **Suggestion**: Manual review required for this issue type

### AZe6kni8qTomVwOqf_a-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-diagnostics.ts:60
- **Current Code**: `    technicalDetails: error.message || 'Unknown error',`
- **Suggestion**: Manual review required for this issue type

### AZe6kni8qTomVwOqf_a_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-diagnostics.ts:72
- **Current Code**: `  const detail = error.response?.data?.detail || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kni8qTomVwOqf_bA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-diagnostics.ts:73
- **Current Code**: `  const title = error.response?.data?.title || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kni8qTomVwOqf_bB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-diagnostics.ts:123
- **Current Code**: `    technicalDetails: `403 Forbidden: ${detail || title}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kni8qTomVwOqf_bC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-diagnostics.ts:134
- **Current Code**: `  const detail = error.response?.data?.detail || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kni8qTomVwOqf_bD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-diagnostics.ts:164
- **Current Code**: `  const detail = error.response?.data?.detail || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kni8qTomVwOqf_bE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-diagnostics.ts:165
- **Current Code**: `  const errors = error.response?.data?.errors || [];`
- **Suggestion**: Manual review required for this issue type

### AZe6kni8qTomVwOqf_bF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-diagnostics.ts:169
- **Current Code**: `    const errorMessages = errors.map((e: any) => e.detail || e.message).join(', ');`
- **Suggestion**: Manual review required for this issue type

### AZe6kni8qTomVwOqf_bG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-diagnostics.ts:178
- **Current Code**: `        return e.detail || e.message;`
- **Suggestion**: Manual review required for this issue type

### AZe6kni8qTomVwOqf_bH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/error-diagnostics.ts:299
- **Current Code**: `      await new Promise(resolve => setTimeout(resolve, diagnostic.retryDelay || 5000));`
- **Suggestion**: Manual review required for this issue type

### AZe6knk6qTomVwOqf_eX
- **Message**: Member 'server' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/modular-server-factory.ts:73
- **Current Code**: `export class AkamaiMCPServer {`
- **Suggestion**: Manual review required for this issue type

### AZe6knk6qTomVwOqf_eY
- **Message**: Member 'config' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/modular-server-factory.ts:75
- **Current Code**: `  private tools: Map<string, ToolDefinition> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knjkqTomVwOqf_cF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/security.ts:285
- **Current Code**: `  parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000'),`
- **Suggestion**: Manual review required for this issue type

### AZe6knjkqTomVwOqf_cG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/security.ts:286
- **Current Code**: `  parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100')`
- **Suggestion**: Manual review required for this issue type

### AZe6knkcqTomVwOqf_dg
- **Message**: Member 'operation' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/safe-console.ts:97
- **Current Code**: `  private operation: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkcqTomVwOqf_dh
- **Message**: Member 'startTime' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/safe-console.ts:98
- **Current Code**: `  private startTime: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkcqTomVwOqf_di
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/safe-console.ts:112
- **Current Code**: `    const finalMessage = message || `${this.operation} completed`;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6L
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:875
- **Current Code**: `      progress.update({ current: 1, message: steps[0] || 'Create property' });`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6O
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:889
- **Current Code**: `      progress.update({ current: 2, message: steps[1] || 'Create edge hostname' });`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6Q
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:897
- **Current Code**: `      progress.update({ current: 3, message: steps[2] || 'Configure origin' });`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6R
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:901
- **Current Code**: `      progress.update({ current: 4, message: steps[3] || 'Apply performance template' });`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6S
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:905
- **Current Code**: `      progress.update({ current: 5, message: steps[4] || 'Apply security template' });`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6T
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:909
- **Current Code**: `      progress.update({ current: 6, message: steps[5] || 'Add hostnames' });`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6U
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:915
- **Current Code**: `      progress.update({ current: 7, message: steps[6] || 'Provision certificates' });`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6V
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:922
- **Current Code**: `        progress.update({ current: ++currentStep, message: steps[currentStep - 1] || 'Activate to staging' });`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6W
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:930
- **Current Code**: `        progress.update({ current: ++currentStep, message: steps[currentStep - 1] || 'Activate to production' });`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5m
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:806
- **Current Code**: `              name: parts[0] || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5n
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:807
- **Current Code**: `              type: parts[2] || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5o
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:808
- **Current Code**: `              ttl: parseInt(parts[1] || '300') || 300,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5N
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:281
- **Current Code**: `      const responseText = searchResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5P
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:299
- **Current Code**: `      const responseText = edgeHostnamesResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5S
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:340
- **Current Code**: `      const responseText = productsResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5U
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:395
- **Current Code**: `      const responseText = _result.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5W
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:428
- **Current Code**: `      const responseText = result.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5Y
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:692
- **Current Code**: `      const responseText = zonesResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5a
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:811
- **Current Code**: `      const responseText = result.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn18qTomVwOqf_5C
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-production-activation.agent.ts:49
- **Current Code**: `      const responseText = propertyResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn18qTomVwOqf_5F
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-production-activation.agent.ts:67
- **Current Code**: `      const activationResponseText = activationResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn18qTomVwOqf_5I
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-production-activation.agent.ts:146
- **Current Code**: `        const responseText = statusResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1qqTomVwOqf_4c
- **Message**: Member 'edgeGrid' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/akamai-client.ts:40
- **Current Code**: `  private edgeGrid: EdgeGrid;  // EdgeGrid SDK instance for auth`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1qqTomVwOqf_4d
- **Message**: Member 'accountSwitchKey' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/akamai-client.ts:41
- **Current Code**: `  private accountSwitchKey?: string;  // Optional key for multi-customer support`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1qqTomVwOqf_4e
- **Message**: Member 'debug' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/akamai-client.ts:42
- **Current Code**: `  private debug: boolean;  // Enable detailed logging when DEBUG=1`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1qqTomVwOqf_4f
- **Message**: Member 'section' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/akamai-client.ts:43
- **Current Code**: `  private section: string;  // Which section to use from .edgerc file`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_0y
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:54
- **Current Code**: `      edgercPath: config.edgercPath || process.env['EDGERC_PATH'] || '~/.edgerc',`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_0z
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:54
- **Current Code**: `      edgercPath: config.edgercPath || process.env['EDGERC_PATH'] || '~/.edgerc',`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_00
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:55
- **Current Code**: `      section: config.section || process.env['EDGERC_SECTION'] || 'default',`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_01
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:55
- **Current Code**: `      section: config.section || process.env['EDGERC_SECTION'] || 'default',`
- **Suggestion**: Manual review required for this issue type

### AZe6knyFqTomVwOqf_0m
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/TokenManager.ts:111
- **Current Code**: `    this.masterKey = process.env['TOKEN_MASTER_KEY'] || this.generateMasterKey();`
- **Suggestion**: Manual review required for this issue type

### AZe6knyFqTomVwOqf_0n
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/TokenManager.ts:112
- **Current Code**: `    this.storageDir = process.env['TOKEN_STORAGE_DIR'] || join(process.cwd(), '.tokens');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3aqTomVwOqf_7O
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/config/transport-config.ts:22
- **Current Code**: `  const transportType = (process.env['MCP_TRANSPORT'] || 'stdio') as TransportType;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3hqTomVwOqf_7X
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/index.ts:74
- **Current Code**: `  if (scriptName && scriptName.startsWith('start:') && scriptName !== 'start:stdio') {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1iqTomVwOqf_4W
- **Message**: This conditional operation returns the same value whether the condition is "true" or "false".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/orchestration/index.ts:211
- **Current Code**: `      `${icons.shield} Security: WAF ${_options.enableWAF ? '[EMOJI]' : '[EMOJI]'} | DDoS ${_options.enableDDoS ? '[EMOJI]' : '[EMOJI]'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1iqTomVwOqf_4X
- **Message**: This conditional operation returns the same value whether the condition is "true" or "false".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/orchestration/index.ts:211
- **Current Code**: `      `${icons.shield} Security: WAF ${_options.enableWAF ? '[EMOJI]' : '[EMOJI]'} | DDoS ${_options.enableDDoS ? '[EMOJI]' : '[EMOJI]'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0HqTomVwOqf_2u
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/cache-factory.ts:66
- **Current Code**: `      maxSize: options?.maxSize || parseInt(process.env['CACHE_MAX_SIZE'] || '10000'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0HqTomVwOqf_2v
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/cache-factory.ts:66
- **Current Code**: `      maxSize: options?.maxSize || parseInt(process.env['CACHE_MAX_SIZE'] || '10000'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0HqTomVwOqf_2w
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/cache-factory.ts:67
- **Current Code**: `      maxMemoryMB: options?.maxMemoryMB || parseInt(process.env['CACHE_MAX_MEMORY_MB'] || '100'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0HqTomVwOqf_2x
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/cache-factory.ts:67
- **Current Code**: `      maxMemoryMB: options?.maxMemoryMB || parseInt(process.env['CACHE_MAX_MEMORY_MB'] || '100'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0HqTomVwOqf_2y
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/cache-factory.ts:68
- **Current Code**: `      defaultTTL: options?.defaultTTL || parseInt(process.env['CACHE_DEFAULT_TTL'] || '300'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0HqTomVwOqf_2z
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/cache-factory.ts:68
- **Current Code**: `      defaultTTL: options?.defaultTTL || parseInt(process.env['CACHE_DEFAULT_TTL'] || '300'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0HqTomVwOqf_20
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/cache-factory.ts:69
- **Current Code**: `      evictionPolicy: (process.env['CACHE_EVICTION_POLICY'] as 'LRU' | 'LFU' | 'FIFO' | 'LRU-K' | undefined) || 'LRU',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0HqTomVwOqf_21
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/cache-factory.ts:72
- **Current Code**: `      compressionThreshold: parseInt(process.env['CACHE_COMPRESSION_THRESHOLD'] || '10240'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0HqTomVwOqf_22
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/cache-factory.ts:74
- **Current Code**: `      persistencePath: process.env['CACHE_PERSISTENCE_PATH'] || '.cache/smart-cache.json',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0HqTomVwOqf_23
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/cache-factory.ts:97
- **Current Code**: `  if (!defaultCache) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2c
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:235
- **Current Code**: `        network: latest.targetEnvironment || latest.primaryCertificate?.network || latest.network || 'unknown',`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2d
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:235
- **Current Code**: `        network: latest.targetEnvironment || latest.primaryCertificate?.network || latest.network || 'unknown',`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2e
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:236
- **Current Code**: `        status: this.mapDeploymentStatus(latest.deploymentStatus || latest.status),`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2f
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:237
- **Current Code**: `        startTime: new Date(latest.deploymentDate || latest.createdDate || Date.now()),`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2g
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:238
- **Current Code**: `        progress: (latest.deploymentStatus || latest.status) === 'active' ? 100 : 50,`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2i
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:317
- **Current Code**: `    interface ResponseWithHeaders {`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2j
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:317
- **Current Code**: `    interface ResponseWithHeaders {`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2o
- **Message**: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:499
- **Current Code**: `      cancelled: 'rolled_back',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3k
- **Message**: Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:444
- **Current Code**: `  private async performAutoValidation(`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0YqTomVwOqf_3S
- **Message**: Refactor this function to reduce its Cognitive Complexity from 30 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-validation-monitor.ts:225
- **Current Code**: `  private async checkValidationStatus(enrollmentId: number): Promise<boolean> {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0YqTomVwOqf_3T
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-validation-monitor.ts:281
- **Current Code**: `                    token: challenge.token || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knzlqTomVwOqf_2K
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/index.ts:19
- **Current Code**: `// export * from './external-cache-service'; // File doesn't exist`
- **Suggestion**: Remove commented out code

### AZe6knydqTomVwOqf_1G
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/comprehensive-test.ts:6
- **Current Code**: `// import { ALECSServer } from '../index'; // Temporarily comment out until ALECSServer is available`
- **Suggestion**: Remove commented out code

### AZe6knydqTomVwOqf_1H
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/comprehensive-test.ts:12
- **Current Code**: `// const server = new ALECSServer(); // Temporarily disabled`
- **Suggestion**: Remove commented out code

### AZe6knzEqTomVwOqf_1m
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/simple-mcp-test.ts:58
- **Current Code**: `      } catch (error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knzEqTomVwOqf_1n
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/simple-mcp-test.ts:103
- **Current Code**: `  async runTests(): Promise<void> {`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_ts
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:251
- **Current Code**: `        const newPropertyId = validatedCreateResponse.propertyLink.split('/').pop() || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_tw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:501
- **Current Code**: `            status = validatedStatusResponse.activations?.items?.[0]?.status || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_ty
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:709
- **Current Code**: `          version = parseInt(validatedVersionResponse.versionLink.split('/').pop() || '0');`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_t0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:962
- **Current Code**: `          version = parseInt(validatedVersionResponse.versionLink.split('/').pop() || '0');`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_te
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:167
- **Current Code**: `          return statusMap[dep.deploymentStatus] || '[EMOJI]';`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_tn
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:488
- **Current Code**: `          return statusMap[entry.status] || '[EMOJI]';`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_ya
- **Message**: Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:247
- **Current Code**: `    return formatError('get CP Code details', _error);`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yb
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:289
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_g2
- **Message**: Refactor this function to reduce its Cognitive Complexity from 35 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:25
- **Current Code**: `export async function createACMEValidationRecords(`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_g5
- **Message**: Refactor this function to reduce its Cognitive Complexity from 29 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:192
- **Current Code**: `function parseACMERecords(content: string): ACMERecord[] {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_g6
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:203
- **Current Code**: `    const domainMatch = line.match(/###\s+\[(DONE|ERROR|EMOJI)\]\s+(.+)/u);`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_g7
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:204
- **Current Code**: `    if (domainMatch && domainMatch[2]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_hD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:273
- **Current Code**: `    `[TIME] Will check every ${args.checkIntervalSeconds || 30} seconds for up to ${args.maxWaitMinutes || 30} minutes\n`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_hE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:273
- **Current Code**: `    `[TIME] Will check every ${args.checkIntervalSeconds || 30} seconds for up to ${args.maxWaitMinutes || 30} minutes\n`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_hF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:318
- **Current Code**: `        const emoji = statusMap[domain.validationStatus] || '[EMOJI]';`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_hG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:369
- **Current Code**: `        text: `[TIME] Validation monitoring timed out after ${args.maxWaitMinutes || 30} minutes. Please check the status manually: "Check DV enrollment status ${args.enrollmentId}"`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kntUqTomVwOqf_sh
- **Message**: Refactor this function to reduce its Cognitive Complexity from 51 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/debug-secure-onboarding.ts:17
- **Current Code**: `export async function debugSecurePropertyOnboarding(`
- **Suggestion**: Manual review required for this issue type

### AZe6kntUqTomVwOqf_sk
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/debug-secure-onboarding.ts:334
- **Current Code**: `      text += `[DONE] API accessible (found ${validatedResponse.groups?.items?.length || 0} groups)\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6kntUqTomVwOqf_sl
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/debug-secure-onboarding.ts:369
- **Current Code**: `    } catch (_productError: any) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kntUqTomVwOqf_sm
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/debug-secure-onboarding.ts:384
- **Current Code**: `    text += validatedResult.content[0]?.text || 'No response';`
- **Suggestion**: Manual review required for this issue type

### AZe6kntMqTomVwOqf_sd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-advanced-tools.ts:241
- **Current Code**: `    text += `Contract ID: ${format.yellow(validatedResponse.contractId || 'Unknown')}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kT
- **Message**: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:160
- **Current Code**: `export async function parseZoneFile(`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kf
- **Message**: Refactor this function to reduce its Cognitive Complexity from 61 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:924
- **Current Code**: `function convertToAkamaiFormat(records: ZoneFileRecord[], _zone: string): DNSRecordSet[] {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:965
- **Current Code**: `  const statusCode = errorObj.statusCode || errorObj.response?.status;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:298
- **Current Code**: `        const edgeHostnameId = validatedBulkResponse.edgeHostnameLink?.split('/').pop()?.split('?')[0] || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w0
- **Message**: Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:382
- **Current Code**: `export async function getEdgeHostnameDetails(`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xO
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:803
- **Current Code**: `          responseText += `- **Common Name:** ${validatedCertResponse.cn || 'N/A'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:804
- **Current Code**: `          responseText += `- **SANs:** ${validatedCertResponse.sans?.join(', ') || 'None'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:805
- **Current Code**: `          responseText += `- **Status:** ${validatedCertResponse.status || 'Unknown'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:806
- **Current Code**: `          responseText += `- **Valid From:** ${validatedCertResponse.validFrom || 'N/A'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:807
- **Current Code**: `          responseText += `- **Valid To:** ${validatedCertResponse.validTo || 'N/A'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:1305
- **Current Code**: `  const validSection = text.split('## [DONE] Valid Hostnames')[1]?.split('##')[0] || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knv_qTomVwOqf_yk
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/includes-tools.ts:40
- **Current Code**: `    const includes = validatedResponse.includes?.items || [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knv_qTomVwOqf_yo
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/includes-tools.ts:130
- **Current Code**: `): Promise<MCPToolResponse> {`
- **Suggestion**: Manual review required for this issue type

### AZe6knv_qTomVwOqf_ys
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/includes-tools.ts:643
- **Current Code**: `  },`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_pY
- **Message**: Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:148
- **Current Code**: `export async function checkAPIHealth(`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_pZ
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:199
- **Current Code**: `result.status === 'healthy' ? '[DONE]' : result.status === 'timeout' ? '[TIME]' : '[ERROR]';`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knptqTomVwOqf_kh
- **Message**: Move this array "sort" operation to a separate statement or replace it with "toSorted".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:69
- **Current Code**: `    const sortedProducts = validatedResponse.products.items.sort((a, b) =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_ks
- **Message**: Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:436
- **Current Code**: `export async function listBillingProducts(`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_t_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:183
- **Current Code**: `    const hostnames = validatedHostnamesResponse.hostnames?.items || [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uA
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:283
- **Current Code**: `const icon = check.status === 'PASSED' ? '[DONE]' : check.status === 'FAILED' ? '[ERROR]' : '[WARNING]';`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knuIqTomVwOqf_uB
- **Message**: Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:336
- **Current Code**: `export async function activatePropertyWithMonitoring(`
- **Suggestion**: Manual review required for this issue type

### AZe6knwJqTomVwOqf_y4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-error-handling-tools.ts:549
- **Current Code**: `        if (!isHostnamesResponse(validatedCertResponse)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xW
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:131
- **Current Code**: `            text: `No edge hostnames found${args.contractId ? ` for contract ${args.contractId}` : ''}.\n\n[INFO] **Tip:** Edge hostnames are created automatically when you:\n- Create properties\n- Use the "create_edge_hostname" tool`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xo
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:455
- **Current Code**: `          {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:455
- **Current Code**: `          {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_x2
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:782
- **Current Code**: `    text += `- **Rule Format:** ${version.ruleFormat || 'Unknown'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_x3
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:783
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:57
- **Current Code**: `      ruleFormat = ruleFormat || validatedRulesResponse.ruleFormat;`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:107
- **Current Code**: `    for (const [category, behaviors] of Object.entries(behaviorsByCategory)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:198
- **Current Code**: `      productId = productId || property.productId;`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:248
- **Current Code**: `    `
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v4
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:294
- **Current Code**: `    text += `- View current rules: \`"Get property ${args.propertyId} rules"\`\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v8
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:482
- **Current Code**: `    text +=`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:513
- **Current Code**: `    });`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:514
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_wB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:564
- **Current Code**: `          groupId: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_n_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:685
- **Current Code**: `    });`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1051
- **Current Code**: `    if (args.network === 'STAGING' && property.stagingVersion === version) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oZ
- **Message**: Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1547
- **Current Code**: `                           ['PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3'].includes(act.status) ? '[TIME]' : '[INFO]';`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oc
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1633
- **Current Code**: `      if (!isPapiPropertyVersionsResponse(versionsResponse)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oi
- **Message**: Refactor this function to reduce its Cognitive Complexity from 28 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1781
- **Current Code**: `          method: 'GET',`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_om
- **Message**: This conditional operation returns the same value whether the condition is "true" or "false".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1833
- **Current Code**: `- Merge versions: "Merge property ${args.propertyId} version ${args.version2} into ${args.version1}"`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oo
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1990
- **Current Code**: `      });`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_o3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2338
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_o4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2342
- **Current Code**: `    // Provide specific solutions based on error type`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_o5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2342
- **Current Code**: `    // Provide specific solutions based on error type`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lX
- **Message**: Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:750
- **Current Code**: `export async function detectConfigurationDrift(`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:127
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:140
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mU
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:333
- **Current Code**: `    const allProperties: Array<PapiProperty & { groupInfo: PapiGroup }> = [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mW
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:386
- **Current Code**: `            contractStat.propertyCount += properties.length;`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_me
- **Message**: Refactor this function to reduce its Cognitive Complexity from 123 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:527
- **Current Code**: `    customer?: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mf
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:570
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mg
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:672
- **Current Code**: `        ],`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mh
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:723
- **Current Code**: `          note: prop.note || null,`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mi
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:801
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mj
- **Message**: Refactor this function to reduce its Cognitive Complexity from 62 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:939
- **Current Code**: `          if (!contractSummary.has(contractId)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mk
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:970
- **Current Code**: `                  try {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_ml
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1032
- **Current Code**: `              );`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mn
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1192
- **Current Code**: `      ],`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mo
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1242
- **Current Code**: `          };`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mp
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1295
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mq
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1348
- **Current Code**: `                  "If your property wasn't found, please use its exact property ID.",`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_m5
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1464
- **Current Code**: `      const priorityGroupNames = ['acedergr', 'default', 'production', 'main'];`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_m6
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1487
- **Current Code**: `          const propertiesRawResponse = await client.request({`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_m7
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:1525
- **Current Code**: `          content: [`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_m-
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2068
- **Current Code**: `  if (certificateType === 'shared-cert') {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nJ
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2205
- **Current Code**: `    return {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nS
- **Message**: Refactor this function to reduce its Cognitive Complexity from 31 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2403
- **Current Code**: `                }`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nT
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2423
- **Current Code**: `      const type = c.contractTypeName || 'Standard';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:294
- **Current Code**: `        const newVersion = validatedVersionResp.versionLink?.split('/versions/')[1] || '0';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wO
- **Message**: Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:379
- **Current Code**: `export async function getVersionTimeline(`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wU
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:490
- **Current Code**: `const icon = event.event === 'created' ? '[DOCS]' : event.event === 'activated' ? '[DEPLOY]' : '[EMOJI]';`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knvLqTomVwOqf_wV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:603
- **Current Code**: `      backupVersion = parseInt(validatedBackupResp.versionLink?.split('/versions/')[1] || '0');`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:641
- **Current Code**: `    const newVersion = parseInt(validatedRollbackResp.versionLink?.split('/versions/')[1] || '0');`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:928
- **Current Code**: `      finalVersion = parseInt(validatedVersionResp.versionLink?.split('/versions/')[1] || '0');`
- **Suggestion**: Manual review required for this issue type

### AZe6knvtqTomVwOqf_yP
- **Message**: Refactor this function to not always return the same value.
- **Severity**: BLOCKER
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/resilience-tools.ts:529
- **Current Code**: `function getStatusEmoji(status: string): string {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvtqTomVwOqf_yQ
- **Message**: Remove this conditional structure or edit its code blocks so that they're not all the same.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/resilience-tools.ts:530
- **Current Code**: `  switch (status) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvtqTomVwOqf_yR
- **Message**: Refactor this function to not always return the same value.
- **Severity**: BLOCKER
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/resilience-tools.ts:542
- **Current Code**: `function getCircuitBreakerEmoji(state: CircuitBreakerState): string {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvtqTomVwOqf_yS
- **Message**: Remove this conditional structure or edit its code blocks so that they're not all the same.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/resilience-tools.ts:543
- **Current Code**: `  switch (state) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_iO
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:105
- **Current Code**: `export async function validateRuleTree(`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_iT
- **Message**: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:301
- **Current Code**: `export async function createRuleTreeFromTemplate(`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_iU
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:327
- **Current Code**: `            text: `[ERROR] Template variable validation failed:\n\n${validationErrors.map((e) => `- ${e}`).join('\n')}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_iX
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:374
- **Current Code**: `              text: `[ERROR] Failed to apply template:\n\n${updateResponse.errors.map((_e: any) => `- ${_e.detail}`).join('\n')}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnlqTomVwOqf_hI
- **Message**: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-management.ts:365
- **Current Code**: `export async function updatePropertyRulesEnhanced(`
- **Suggestion**: Manual review required for this issue type

### AZe6knnlqTomVwOqf_hJ
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-management.ts:530
- **Current Code**: `            text: `[ERROR] Template '${args.templateId}' not found.\n\nAvailable templates:\n${availableTemplates.map((t) => `- ${t}`).join('\n')}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnlqTomVwOqf_hK
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-management.ts:573
- **Current Code**: `              text: `[ERROR] Generated rule tree validation failed.\n\nErrors:\n${validation.errors.map((e) => `- ${e.message}`).join('\n')}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uS
- **Message**: Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:201
- **Current Code**: `export async function onboardSecureByDefaultProperty(`
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uT
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:236
- **Current Code**: `              text: `[ERROR] **Prerequisites Validation Failed**\n\n${validation.errors.map((e) => `- ${e}`).join('\n')}\n\n**Solution:** Fix the issues above and try again.`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_iq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:65
- **Current Code**: `      const configurations = validatedResponse.configurations || [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_ix
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:271
- **Current Code**: `      const events = validatedResponse.securityEvents || [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_iy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:277
- **Current Code**: `          totalEvents: validatedResponse.totalEvents || 0,`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_i2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:417
- **Current Code**: `          progress: validatedResponse.progress || 0,`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:80
- **Current Code**: `      const configurations = validatedResponse.configurations || [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:299
- **Current Code**: `            text: `Security Events (${parsed.from} to ${parsed.to}):\nTotal Events: ${validatedData.totalEvents || 0}\n\n${formatTable(`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:430
- **Current Code**: `            text: `Activation ${args.activationId} status: ${validatedData.status}\nNetwork: ${validatedData.network}\nProgress: ${validatedData.progress || 0}%\n\n${formatJson(validatedData)}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knotqTomVwOqf_i3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-activation.ts:30
- **Current Code**: `  return statusMap[status] || `[EMOJI] ${status}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knotqTomVwOqf_i6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-activation.ts:228
- **Current Code**: `    const activations = validatedResponse.activations || [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_ju
- **Message**: Refactor this function to reduce its Cognitive Complexity from 32 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:57
- **Current Code**: `export async function importNetworkListFromCSV(`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jv
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:129
- **Current Code**: `              text: `[ERROR] **Validation Failed**\n\nInvalid elements for ${currentList.type} list:\n${invalidElements.slice(0, 20).join('\n')}${invalidElements.length > 20 ? `\n... and ${invalidElements.length - 20} more` : ''}\n\nUse skipInvalid option to import only valid elements.`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:99
- **Current Code**: `  return statusMap[status] || `[EMOJI] ${status}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knqmqTomVwOqf_mK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/token-tools.ts:334
- **Current Code**: `            text: `[ERROR] Failed to rotate token: ${result.error || 'Unknown error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_o6
- **Message**: Refactor this function to reduce its Cognitive Complexity from 127 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:63
- **Current Code**: `export async function universalSearchWithCacheHandler(`
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_pC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:339
- **Current Code**: `    method: 'GET',`
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_pD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:352
- **Current Code**: `    },`
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_pE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:361
- **Current Code**: `    method: 'GET',`
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_pF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:370
- **Current Code**: `    method: 'GET',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_6v
- **Message**: Member 'sessions' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:111
- **Current Code**: `  private sessions: Map<string, WebSocketSession> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_6w
- **Message**: Member 'messageHandlers' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:112
- **Current Code**: `  private messageHandlers: Map<string, (message: JSONRPCMessage) => void> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_6x
- **Message**: Member 'rateLimitCache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:117
- **Current Code**: `  private rateLimitCache = new SmartCache<number>({`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_6y
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:136
- **Current Code**: `      host: options.host || '0.0.0.0',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_6z
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:138
- **Current Code**: `      path: options.path || '/mcp',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_60
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:141
- **Current Code**: `        tokenHeader: options.auth?.tokenHeader || 'sec-websocket-protocol',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_61
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:144
- **Current Code**: `        maxMessageSize: options.limits?.maxMessageSize || 1024 * 1024, // 1MB`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_62
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:145
- **Current Code**: `        maxMessagesPerMinute: options.limits?.maxMessagesPerMinute || 100,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_63
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:146
- **Current Code**: `        maxPendingRequests: options.limits?.maxPendingRequests || 50,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_64
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:147
- **Current Code**: `        requestTimeout: options.limits?.requestTimeout || 30000, // 30s`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_65
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:150
- **Current Code**: `        interval: options.heartbeat?.interval || 30000, // 30s`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_66
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:151
- **Current Code**: `        timeout: options.heartbeat?.timeout || 60000, // 60s`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_67
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:226
- **Current Code**: `      const token = info.req.headers[this.options.auth.tokenHeader] ||`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_69
- **Message**: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:361
- **Current Code**: `  async send(message: JSONRPCMessage): Promise<void> {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_6_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:423
- **Current Code**: `      id: id || null,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3LqTomVwOqf_7A
- **Message**: 'If' statement should not be the only statement in 'else' block
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/websocket-transport.ts:466
- **Current Code**: `          if (session.client.readyState === WebSocket.OPEN) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knwgqTomVwOqf_y_
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/api-responses/papi-properties.ts:73
- **Current Code**: `    status?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED';`
- **Suggestion**: Manual review required for this issue type

### AZe6knf5qTomVwOqf_Zx
- **Message**: Member 'size' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/bloom-filter.ts:18
- **Current Code**: `  private size: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6knf5qTomVwOqf_Zy
- **Message**: Member 'hashFunctions' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/bloom-filter.ts:19
- **Current Code**: `  private hashFunctions: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6kngAqTomVwOqf_Zz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/circuit-breaker.ts:42
- **Current Code**: `      failureThreshold: options.failureThreshold || 5,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngAqTomVwOqf_Z0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/circuit-breaker.ts:43
- **Current Code**: `      successThreshold: options.successThreshold || 2,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngAqTomVwOqf_Z1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/circuit-breaker.ts:44
- **Current Code**: `      timeout: options.timeout || 60000,        // 1 minute`
- **Suggestion**: Manual review required for this issue type

### AZe6kngAqTomVwOqf_Z2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/circuit-breaker.ts:45
- **Current Code**: `      maxTimeout: options.maxTimeout || 300000, // 5 minutes`
- **Suggestion**: Manual review required for this issue type

### AZe6kngAqTomVwOqf_Z3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/circuit-breaker.ts:46
- **Current Code**: `      windowSize: options.windowSize || 60000,  // 1 minute window`
- **Suggestion**: Manual review required for this issue type

### AZe6kngAqTomVwOqf_Z4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/circuit-breaker.ts:47
- **Current Code**: `      volumeThreshold: options.volumeThreshold || 10`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dj
- **Message**: Member 'httpAgent' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:60
- **Current Code**: `  private httpAgent: HttpAgent;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dk
- **Message**: Member 'httpsAgent' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:61
- **Current Code**: `  private httpsAgent: HttpsAgent;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dl
- **Message**: Member 'options' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:62
- **Current Code**: `  private options: Required<ConnectionPoolOptions>;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dm
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:66
- **Current Code**: `      maxSockets: options.maxSockets || 50,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dn
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:67
- **Current Code**: `      maxTotalSockets: options.maxTotalSockets || 100,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_do
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:68
- **Current Code**: `      maxFreeSockets: options.maxFreeSockets || 10,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:69
- **Current Code**: `      timeout: options.timeout || 60000,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:70
- **Current Code**: `      keepAliveTimeout: options.keepAliveTimeout || 30000,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:72
- **Current Code**: `      keepAliveInitialDelay: options.keepAliveInitialDelay || 1000,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_ds
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:148
- **Current Code**: `          (acc, key) => acc + (this.httpAgent.sockets[key]?.length || 0),`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dt
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:152
- **Current Code**: `          (acc, key) => acc + (this.httpAgent.freeSockets[key]?.length || 0),`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_du
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:156
- **Current Code**: `          (acc, key) => acc + (this.httpAgent.requests[key]?.length || 0),`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:162
- **Current Code**: `          (acc, key) => acc + (this.httpsAgent.sockets[key]?.length || 0),`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:166
- **Current Code**: `          (acc, key) => acc + (this.httpsAgent.freeSockets[key]?.length || 0),`
- **Suggestion**: Manual review required for this issue type

### AZe6knkjqTomVwOqf_dx
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/connection-pool.ts:170
- **Current Code**: `          (acc, key) => acc + (this.httpsAgent.requests[key]?.length || 0),`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_b6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:337
- **Current Code**: `      response += `[EMOJI] ${result.resource || result.name}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_b7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:345
- **Current Code**: `      response += `[EMOJI] ${result.resource || result.name}: ${result.error}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjKqTomVwOqf_bO
- **Message**: Member 'prefixPool' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/key-store.ts:16
- **Current Code**: `  private prefixPool: Map<string, string> = new Map(); // Interned prefixes`
- **Suggestion**: Manual review required for this issue type

### AZe6knjKqTomVwOqf_bP
- **Message**: Member 'suffixMap' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/key-store.ts:17
- **Current Code**: `  private suffixMap: Map<string, Set<string>> = new Map(); // Prefix -> suffixes`
- **Suggestion**: Manual review required for this issue type

### AZe6knjKqTomVwOqf_bQ
- **Message**: Member 'keyToPrefix' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/key-store.ts:18
- **Current Code**: `  private keyToPrefix: Map<string, string> = new Map(); // Full key -> prefix`
- **Suggestion**: Manual review required for this issue type

### AZe6knjKqTomVwOqf_bR
- **Message**: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/key-store.ts:98
- **Current Code**: `  getByPattern(pattern: string): string[] {`
- **Suggestion**: Manual review required for this issue type

### AZe6knjDqTomVwOqf_bI
- **Message**: Member 'emitter' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-progress.ts:33
- **Current Code**: `  private emitter: EventEmitter;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjDqTomVwOqf_bJ
- **Message**: Member 'startTime' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-progress.ts:34
- **Current Code**: `  private startTime: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjDqTomVwOqf_bK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-progress.ts:59
- **Current Code**: `      message: initialMessage || `Starting ${this.operation}...`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knjDqTomVwOqf_bL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-progress.ts:93
- **Current Code**: `      message: message || `${this.operation} completed successfully`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knjDqTomVwOqf_bM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-progress.ts:142
- **Current Code**: `    const estimatedTotal = this.options.estimatedDuration || 300; // 5 min default`
- **Suggestion**: Manual review required for this issue type

### AZe6knjDqTomVwOqf_bN
- **Message**: Member 'tokens' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/mcp-progress.ts:177
- **Current Code**: `  private tokens: Map<string, ProgressToken> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:156
- **Current Code**: `    this.stream.write(`\r[DONE] ${message || this.lastMessage}\n`);`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:161
- **Current Code**: `    this.stream.write(`\r[ERROR] ${message || this.lastMessage}\n`);`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:166
- **Current Code**: `    this.stream.write(`\r[WARNING]  ${message || this.lastMessage}\n`);`
- **Suggestion**: Manual review required for this issue type

### AZe6knjkqTomVwOqf_b9
- **Message**: Member 'requests' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/security.ts:13
- **Current Code**: `  private requests: Map<string, number[]> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knjkqTomVwOqf_b-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/security.ts:188
- **Current Code**: `  origin: process.env['CORS_ORIGIN'] || 'http://localhost:*',`
- **Suggestion**: Manual review required for this issue type

### AZe6knjkqTomVwOqf_cA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/security.ts:214
- **Current Code**: `  const ip = request.ip || request.connection?.remoteAddress || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjkqTomVwOqf_cB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/security.ts:214
- **Current Code**: `  const ip = request.ip || request.connection?.remoteAddress || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjkqTomVwOqf_cC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/security.ts:215
- **Current Code**: `  const userAgent = request.headers?.['user-agent'] || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjkqTomVwOqf_cD
- **Message**: Member 'shutdownCallbacks' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/security.ts:226
- **Current Code**: `  private shutdownCallbacks: Array<() => Promise<void>> = [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knjkqTomVwOqf_cE
- **Message**: Member 'shutdownTimeout' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/security.ts:228
- **Current Code**: `  private shutdownTimeout = 30000; // 30 seconds`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cm
- **Message**: Member 'cache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:134
- **Current Code**: `  private cache: Map<string, CacheEntry<T>> = new Map();              // Main cache storage`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cn
- **Message**: Member 'segments' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:135
- **Current Code**: `  private segments: Map<string, CacheSegment<T>> = new Map();         // Segmented cache storage`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_co
- **Message**: Member 'keyToSegment' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:136
- **Current Code**: `  private keyToSegment: Map<string, string> = new Map();              // Key to segment mapping`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cp
- **Message**: Member 'keysByPattern' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:137
- **Current Code**: `  private keysByPattern: Map<string, Set<string>> = new Map();        // Track keys by patterns`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cq
- **Message**: Member 'refreshingKeys' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:138
- **Current Code**: `  private refreshingKeys: Set<string> = new Set();                    // Keys being refreshed`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cr
- **Message**: Member 'pendingRequests' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:139
- **Current Code**: `  private pendingRequests: Map<string, PendingRequest<T>> = new Map(); // Request coalescing`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cs
- **Message**: Member 'negativeCache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:140
- **Current Code**: `  private negativeCache: Set<string> = new Set();                     // Track non-existent keys`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_ct
- **Message**: Member 'negativeCacheBloom' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:141
- **Current Code**: `  private negativeCacheBloom: BloomFilter;                            // Bloom filter for negative cache`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cu
- **Message**: Member 'circuitBreaker' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:142
- **Current Code**: `  private circuitBreaker: CircuitBreaker;                             // Circuit breaker for fetch operations`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cv
- **Message**: Member 'keyStore' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:143
- **Current Code**: `  private keyStore: KeyStore;                                         // Memory-efficient key storage`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cw
- **Message**: Member 'cleanupInterval' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:156
- **Current Code**: `  private cleanupInterval?: NodeJS.Timeout;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cx
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:161
- **Current Code**: `      maxSize: options.maxSize || 10000,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:162
- **Current Code**: `      maxMemoryMB: options.maxMemoryMB || 100,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_cz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:163
- **Current Code**: `      defaultTTL: options.defaultTTL || 300, // 5 minutes in seconds`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:165
- **Current Code**: `      evictionPolicy: options.evictionPolicy || 'LRU',`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:166
- **Current Code**: `      refreshThreshold: options.refreshThreshold || 0.2,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:168
- **Current Code**: `      compressionThreshold: options.compressionThreshold || 10240, // 10KB`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:170
- **Current Code**: `      persistencePath: options.persistencePath || '.cache/smart-cache.json',`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:175
- **Current Code**: `      segmentSize: options.segmentSize || 1000,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:177
- **Current Code**: `      lruKValue: options.lruKValue || 2,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c6
- **Message**: Refactor this asynchronous operation outside of the constructor.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:204
- **Current Code**: `      this.loadCache().catch(err => this.emit('load-error', err));`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c7
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:262
- **Current Code**: `      if (!entry.accessHistory) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c8
- **Message**: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:283
- **Current Code**: `  async set<V = T>(key: string, value: V, ttl?: number): Promise<boolean> {`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:305
- **Current Code**: `      const actualTTL = this.calculateAdaptiveTTL(key, ttl || this.options.defaultTTL);`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:320
- **Current Code**: `      const updateCount = existing ? (existing.updateCount || 0) + 1 : 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_c_
- **Message**: Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:365
- **Current Code**: `  async del(keys: string | string[]): Promise<number> {`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_dA
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:376
- **Current Code**: `          if (segment && segment.entries.delete(key)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_dB
- **Message**: Refactor this function to reduce its Cognitive Complexity from 35 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:419
- **Current Code**: `  async getWithRefresh<V>(`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_dC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:441
- **Current Code**: `      const refreshAt = ttl * (options.refreshThreshold || this.options.refreshThreshold);`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_dD
- **Message**: Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:524
- **Current Code**: `  async scanAndDelete(pattern: string): Promise<number> {`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_dE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:686
- **Current Code**: `    return firstKey || null;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_dF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:799
- **Current Code**: `          this.metrics.memoryUsage += entry.size || 0;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_dG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:807
- **Current Code**: `        this.metrics.memoryUsage += entry.size || 0;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_dH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:898
- **Current Code**: `    `
- **Suggestion**: Manual review required for this issue type

### AZe6knkFqTomVwOqf_dI
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/smart-cache.ts:977
- **Current Code**: `      this.removeFromPatterns(keyToEvict);`
- **Suggestion**: Manual review required for this issue type

### AZe6knhgqTomVwOqf_aM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/tool-error-handling.ts:25
- **Current Code**: `  let errorMessage = `[ERROR] Failed to ${_context.operation || 'complete operation'}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cH
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:26
- **Current Code**: `  } catch (error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cI
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:42
- **Current Code**: `      const wsPort = config.options.port || 8080;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:42
- **Current Code**: `      const wsPort = config.options.port || 8080;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cK
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:43
- **Current Code**: `      const wsHost = config.options.host || '0.0.0.0';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:43
- **Current Code**: `      const wsHost = config.options.host || '0.0.0.0';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cM
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:44
- **Current Code**: `      const wsPath = config.options.path || '/mcp';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:44
- **Current Code**: `      const wsPath = config.options.path || '/mcp';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cO
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:46
- **Current Code**: `      const wsTransport = new WebSocketServerTransport({`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cP
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:70
- **Current Code**: `      const sseApp = express();`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cQ
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:71
- **Current Code**: `      const sseTransport = new SSEServerTransport();`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cR
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:72
- **Current Code**: `      const ssePath = config.options.path || '/mcp/sse';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:72
- **Current Code**: `      const ssePath = config.options.path || '/mcp/sse';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cT
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:78
- **Current Code**: `      const ssePort = config.options.port || 3001;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:78
- **Current Code**: `      const ssePort = config.options.port || 3001;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cV
- **Message**: Unexpected lexical declaration in case block.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:79
- **Current Code**: `      const sseHost = config.options.host || '0.0.0.0';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjqqTomVwOqf_cW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/transport-factory.ts:79
- **Current Code**: `      const sseHost = config.options.host || '0.0.0.0';`
- **Suggestion**: Manual review required for this issue type

### AZe6knhnqTomVwOqf_aN
- **Message**: Refactor this function to reduce its Cognitive Complexity from 38 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/tree-view.ts:46
- **Current Code**: `  nodes.forEach((node, index) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7Y
- **Message**: Simplify this regular expression to reduce its complexity from 28 to the 20 allowed.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:123
- **Current Code**: `  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IPv4 address');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7Z
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:123
- **Current Code**: `  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IPv4 address');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7a
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:123
- **Current Code**: `  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IPv4 address');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7b
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:123
- **Current Code**: `  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IPv4 address');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7c
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:123
- **Current Code**: `  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IPv4 address');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7d
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:123
- **Current Code**: `  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IPv4 address');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7e
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:123
- **Current Code**: `  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IPv4 address');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7f
- **Message**: Unnecessary escape character: \/.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:203
- **Current Code**: `      return /^\/[^?#]*(\*)?$/.test(url) || /^[^\/\s]+$/.test(url);`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7g
- **Message**: Simplify this regular expression to reduce its complexity from 34 to the 20 allowed.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:224
- **Current Code**: `  .or(z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/, 'Invalid CIDR notation'))`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7h
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:224
- **Current Code**: `  .or(z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/, 'Invalid CIDR notation'))`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7i
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:224
- **Current Code**: `  .or(z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/, 'Invalid CIDR notation'))`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7j
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:224
- **Current Code**: `  .or(z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/, 'Invalid CIDR notation'))`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7k
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:224
- **Current Code**: `  .or(z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/, 'Invalid CIDR notation'))`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7l
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:224
- **Current Code**: `  .or(z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/, 'Invalid CIDR notation'))`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7m
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:224
- **Current Code**: `  .or(z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/, 'Invalid CIDR notation'))`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7n
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:224
- **Current Code**: `  .or(z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/, 'Invalid CIDR notation'))`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7o
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:224
- **Current Code**: `  .or(z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/, 'Invalid CIDR notation'))`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7p
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:225
- **Current Code**: `  .or(z.string().regex(/^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\/(?:[0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8])$/, 'Invalid IPv6 CIDR notation'));`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7q
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:225
- **Current Code**: `  .or(z.string().regex(/^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\/(?:[0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8])$/, 'Invalid IPv6 CIDR notation'));`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3pqTomVwOqf_7r
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/validation/akamai-schemas.ts:225
- **Current Code**: `  .or(z.string().regex(/^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\/(?:[0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8])$/, 'Invalid IPv6 CIDR notation'));`
- **Suggestion**: Manual review required for this issue type

### AZe6kny0qTomVwOqf_1c
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/test-utils.ts:45
- **Current Code**: `  validationError: (field?: string) => new Error(`Validation error${field ? `: ${field}` : ''}`),`
- **Suggestion**: Manual review required for this issue type

### AZe6koApqTomVwOqgABz
- **Message**: Replace this shell form with exec form.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:build/docker/Dockerfile.remote:53
- **Current Code**: `  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"`
- **Suggestion**: Manual review required for this issue type

### AZe6koAaqTomVwOqgABr
- **Message**: Replace this shell form with exec form.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:build/docker/Dockerfile.full:43
- **Current Code**: `  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"`
- **Suggestion**: Manual review required for this issue type

### AZe6koAwqTomVwOqgAB3
- **Message**: Consider wrapping this instruction in a script file and call it with exec form.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:build/docker/Dockerfile.minimal:49
- **Current Code**: `  CMD node -e "process.exit(0)" || exit 1`
- **Suggestion**: Manual review required for this issue type

### AZe6koA-qTomVwOqgACA
- **Message**: Consider wrapping this instruction in a script file and call it with exec form.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:build/docker/Dockerfile.modular:56
- **Current Code**: `  CMD node -e "require('http').get('http://localhost:3010/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1`
- **Suggestion**: Manual review required for this issue type

### AZe6koA2qTomVwOqgAB7
- **Message**: Replace this shell form with exec form.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:build/docker/Dockerfile.sse:43
- **Current Code**: `  CMD node -e "require('http').get('http://localhost:3013/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"`
- **Suggestion**: Manual review required for this issue type

### AZe6koAhqTomVwOqgABv
- **Message**: Consider wrapping this instruction in a script file and call it with exec form.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:build/docker/Dockerfile.websocket:43
- **Current Code**: `  CMD node -e "require('http').get('http://localhost:8082/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1`
- **Suggestion**: Manual review required for this issue type

### AZe6koATqTomVwOqgABn
- **Message**: Replace this shell form with exec form.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:build/docker/Dockerfile:51
- **Current Code**: `  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7B
- **Message**: Member 'app' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:38
- **Current Code**: `  private app: express.Application;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7C
- **Message**: Member 'clients' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:40
- **Current Code**: `  private clients: Map<string, SSEClient> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7D
- **Message**: Member 'messageEmitter' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:41
- **Current Code**: `  private messageEmitter = new EventEmitter();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7E
- **Message**: Member 'messageQueue' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:42
- **Current Code**: `  private messageQueue: JSONRPCMessage[] = [];`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7F
- **Message**: Member 'options' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:43
- **Current Code**: `  private options: SSETransportOptions;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7G
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:79
- **Current Code**: `    const basePath = this.options.path || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7H
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:173
- **Current Code**: `          this.options.host || '0.0.0.0',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7I
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:177
- **Current Code**: `              host: this.options.host || '0.0.0.0',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7J
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:179
- **Current Code**: `              path: this.options.path || '/'`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7K
- **Message**: Expected the Promise rejection reason to be an Error.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:188
- **Current Code**: `          reject(error);`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7L
- **Message**: Expected the Promise rejection reason to be an Error.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:191
- **Current Code**: `        reject(error);`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3TqTomVwOqf_7N
- **Message**: Add a "yield" statement to this generator.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/transport/sse-transport.ts:245
- **Current Code**: `  *[Symbol.asyncIterator](): AsyncIterator<JSONRPCMessage> {`
- **Suggestion**: Manual review required for this issue type

### AZe6koAFqTomVwOqgABf
- **Message**: Sort these package names alphanumerically.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:build/docker/archived/Dockerfile.websocket:4
- **Current Code**: `RUN apk add --no-cache python3 make g++`
- **Suggestion**: Manual review required for this issue type

### AZe6knyFqTomVwOqf_0s
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/TokenManager.ts:454
- **Current Code**: `  private async loadTokensFromStorage(): Promise<void> {`
- **Suggestion**: Manual review required for this issue type

### AZe6knlpqTomVwOqf_e5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/workflow-assistant-stubs.ts:14
- **Current Code**: `  const intent = args?.intent || 'help';`
- **Suggestion**: Manual review required for this issue type

### AZe6knlpqTomVwOqf_e6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/workflow-assistant-stubs.ts:42
- **Current Code**: `  const intent = args?.intent || 'help';`
- **Suggestion**: Manual review required for this issue type

### AZe6knlpqTomVwOqf_e7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/workflow-assistant-stubs.ts:43
- **Current Code**: `  const domain = args?.domain || 'your domain';`
- **Suggestion**: Manual review required for this issue type

### AZe6knlpqTomVwOqf_e8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/workflow-assistant-stubs.ts:79
- **Current Code**: `  const intent = args?.intent || 'help';`
- **Suggestion**: Manual review required for this issue type

### AZe6knlpqTomVwOqf_e9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/workflow-assistant-stubs.ts:115
- **Current Code**: `  const intent = args?.intent || 'help';`
- **Suggestion**: Manual review required for this issue type

### AZe6knh9qTomVwOqf_ak
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/auth.ts:13
- **Current Code**: `    customer: params?.customer || 'default',`
- **Suggestion**: Manual review required for this issue type

### AZe6knh9qTomVwOqf_al
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/auth.ts:26
- **Current Code**: `    customer: customer || 'default',`
- **Suggestion**: Manual review required for this issue type

### AZe6knyFqTomVwOqf_0j
- **Message**: Member 'masterKey' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/TokenManager.ts:97
- **Current Code**: `  private masterKey: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knyFqTomVwOqf_0k
- **Message**: Member 'storageDir' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/TokenManager.ts:98
- **Current Code**: `  private storageDir: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knyFqTomVwOqf_0o
- **Message**: Refactor this asynchronous operation outside of the constructor.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/TokenManager.ts:115
- **Current Code**: `    this.ensureStorageDir();`
- **Suggestion**: Manual review required for this issue type

### AZe6knyFqTomVwOqf_0r
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/TokenManager.ts:445
- **Current Code**: `    } catch (error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knlbqTomVwOqf_ev
- **Message**: Member 'server' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/appsec-server.ts:89
- **Current Code**: `class AppSecServer {`
- **Suggestion**: Manual review required for this issue type

### AZe6knlbqTomVwOqf_ew
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/appsec-server.ts:90
- **Current Code**: `  private server: Server;`
- **Suggestion**: Manual review required for this issue type

### AZe6knlbqTomVwOqf_ex
- **Message**: Member 'configManager' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/appsec-server.ts:91
- **Current Code**: `  private client: AkamaiClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6knlbqTomVwOqf_ey
- **Message**: Member 'tools' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/appsec-server.ts:92
- **Current Code**: `  private configManager: CustomerConfigManager;`
- **Suggestion**: Manual review required for this issue type

### AZe6knlbqTomVwOqf_ez
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/appsec-server.ts:297
- **Current Code**: `            type: 'text',`
- **Suggestion**: Manual review required for this issue type

### AZe6knlbqTomVwOqf_e0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/appsec-server.ts:333
- **Current Code**: `        return {`
- **Suggestion**: Manual review required for this issue type

### AZe6knlbqTomVwOqf_e1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/appsec-server.ts:336
- **Current Code**: `              type: 'text',`
- **Suggestion**: Manual review required for this issue type

### AZe6knnEqTomVwOqf_gk
- **Message**: Member 'server' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/fastpurge-server.ts:81
- **Suggestion**: Manual review required for this issue type

### AZe6knnEqTomVwOqf_gl
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/fastpurge-server.ts:82
- **Current Code**: `class FastPurgeServer {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnEqTomVwOqf_gm
- **Message**: Member 'configManager' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/fastpurge-server.ts:83
- **Current Code**: `  private server: Server;`
- **Suggestion**: Manual review required for this issue type

### AZe6knnEqTomVwOqf_gn
- **Message**: Member 'tools' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/fastpurge-server.ts:84
- **Current Code**: `  private client: AkamaiClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6knnEqTomVwOqf_go
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/fastpurge-server.ts:169
- **Current Code**: `      handler: async (client, params) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnEqTomVwOqf_gp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/fastpurge-server.ts:275
- **Current Code**: `          content: [{`
- **Suggestion**: Manual review required for this issue type

### AZe6knnEqTomVwOqf_gq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/fastpurge-server.ts:311
- **Current Code**: `        if (tool.schema) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnEqTomVwOqf_gr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/fastpurge-server.ts:314
- **Current Code**: `        `
- **Suggestion**: Manual review required for this issue type

### AZe6knl6qTomVwOqf_fC
- **Message**: Member 'server' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/network-lists-server.ts:120
- **Current Code**: `class NetworkListsServer {`
- **Suggestion**: Manual review required for this issue type

### AZe6knl6qTomVwOqf_fD
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/network-lists-server.ts:121
- **Current Code**: `  private server: Server;`
- **Suggestion**: Manual review required for this issue type

### AZe6knl6qTomVwOqf_fG
- **Message**: Member 'tools' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/network-lists-server.ts:123
- **Current Code**: `  private _configManager: CustomerConfigManager; // CODE KAI: Customer context validation (used for auth)`
- **Suggestion**: Manual review required for this issue type

### AZe6knl6qTomVwOqf_fH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/network-lists-server.ts:402
- **Current Code**: `        return {`
- **Suggestion**: Manual review required for this issue type

### AZe6knl6qTomVwOqf_fI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/network-lists-server.ts:405
- **Current Code**: `              type: 'text',`
- **Suggestion**: Manual review required for this issue type

### AZe6knyFqTomVwOqf_0l
- **Message**: Member 'tokenCache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/TokenManager.ts:101
- **Current Code**: `  private tokenCache: Map<string, TokenMetadata> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knyFqTomVwOqf_0p
- **Message**: Refactor this asynchronous operation outside of the constructor.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/TokenManager.ts:118
- **Current Code**: `    this.loadTokensFromStorage();`
- **Suggestion**: Manual review required for this issue type

### AZe6knyFqTomVwOqf_0q
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/TokenManager.ts:284
- **Current Code**: `        description: `Rotated from ${oldTokenId}: ${oldMetadata.description || 'No description'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1JqTomVwOqf_3-
- **Message**: Member 'tokenManager' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/authentication.ts:71
- **Current Code**: `  private tokenManager: TokenManager;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1JqTomVwOqf_3_
- **Message**: Member 'securityMiddleware' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/authentication.ts:72
- **Current Code**: `  private securityMiddleware: SecurityMiddleware;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1JqTomVwOqf_4A
- **Message**: Member 'config: AuthenticationConfig' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/authentication.ts:75
- **Current Code**: `    private config: AuthenticationConfig = { enabled: true },`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1JqTomVwOqf_4B
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/authentication.ts:106
- **Current Code**: `      if (this.isPublicPath(req.url || '')) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1JqTomVwOqf_4C
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/authentication.ts:128
- **Current Code**: `        this.logAuthFailure(req, validationResult.error || 'Invalid token', token);`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1JqTomVwOqf_4D
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/authentication.ts:131
- **Current Code**: `          error: validationResult.error || 'Invalid token' `
- **Suggestion**: Manual review required for this issue type

### AZe6kn1JqTomVwOqf_4E
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/authentication.ts:166
- **Current Code**: `        message: result.error || 'Authentication required',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1JqTomVwOqf_4I
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/authentication.ts:267
- **Current Code**: `    return req.socket.remoteAddress || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1ZqTomVwOqf_4M
- **Message**: Member 'rateLimitStore' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/security.ts:96
- **Current Code**: `  private rateLimitStore: Map<string, RequestRecord> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1ZqTomVwOqf_4N
- **Message**: Member 'cleanupInterval' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/security.ts:98
- **Current Code**: `  private cleanupInterval: NodeJS.Timeout;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1ZqTomVwOqf_4O
- **Message**: Member 'rateLimitConfig: RateLimitConfig' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/security.ts:101
- **Current Code**: `    private rateLimitConfig: RateLimitConfig = {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1ZqTomVwOqf_4P
- **Message**: Member 'securityHeaders: SecurityHeadersConfig' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/security.ts:105
- **Current Code**: `    private securityHeaders: SecurityHeadersConfig = {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1ZqTomVwOqf_4S
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/security.ts:278
- **Current Code**: `    return req.socket.remoteAddress || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1ZqTomVwOqf_4T
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/security.ts:291
- **Current Code**: `    const auth = req.headers.authorization || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knqmqTomVwOqf_mG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/token-tools.ts:47
- **Current Code**: `**Description:** ${args.description || 'N/A'}`
- **Suggestion**: Manual review required for this issue type

### AZe6knqmqTomVwOqf_mI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/token-tools.ts:126
- **Current Code**: `**Description:** ${token.description || 'N/A'}`
- **Suggestion**: Manual review required for this issue type

### AZe6knqmqTomVwOqf_mJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/token-tools.ts:261
- **Current Code**: `**Error:** ${result.error || 'Unknown validation error'}`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zK
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:101
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zL
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:108
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zO
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:121
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zP
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:142
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zQ
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:154
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zR
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:166
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zS
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:179
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zT
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:191
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zU
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:205
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zW
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:225
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zX
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:262
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zt
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:406
- **Current Code**: `        validTypes.forEach((type) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zx
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:488
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zy
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:509
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zz
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:535
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z0
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:561
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z5
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:624
- **Current Code**: `        validPriorities.forEach((priority) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_0H
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:713
- **Current Code**: `        validTypes.forEach((type) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_0I
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:721
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_0J
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:732
- **Current Code**: `        expect(() =>`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2cqTomVwOqf_52
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cleanup-agent.ts:408
- **Current Code**: `  private async executeCleanup(plan: CleanupPlan): Promise<CleanupResult> {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5O
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:288
- **Current Code**: `    } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5Q
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:303
- **Current Code**: `    } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1qqTomVwOqf_4h
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/akamai-client.ts:149
- **Current Code**: `        method: _options.method || 'GET',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1qqTomVwOqf_4i
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/akamai-client.ts:168
- **Current Code**: `        console.error(`[AkamaiClient] Making _request: ${_options.method || 'GET'} ${requestPath}`);`
- **Suggestion**: Manual review required for this issue type

### AZe6knyWqTomVwOqf_0-
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EdgeGridAuth.ts:143
- **Current Code**: `    } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knyWqTomVwOqf_0_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EdgeGridAuth.ts:160
- **Current Code**: `      baseURL: _options.baseUrl || `https://${this.credentials.host}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knyWqTomVwOqf_1A
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EdgeGridAuth.ts:186
- **Current Code**: `    const key = _options.customer || 'default';`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_0t
- **Message**: Member 'edgeGrid' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:36
- **Current Code**: `  private edgeGrid: EdgeGrid;`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_0u
- **Message**: Member 'optimizedClient' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:37
- **Current Code**: `  private optimizedClient: OptimizedHTTPClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_0v
- **Message**: Member 'circuitBreaker' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:38
- **Current Code**: `  private circuitBreaker: CircuitBreaker;`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_0w
- **Message**: Member 'config' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:39
- **Current Code**: `  private config: Required<EnhancedEdgeGridConfig>;`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_0x
- **Message**: Member 'metrics' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:40
- **Current Code**: `  private metrics: AuthenticationMetrics = {`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_02
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:65
- **Current Code**: `      timeoutMs: config.timeoutMs || 30000,`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_03
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:66
- **Current Code**: `      retryAttempts: config.retryAttempts || 3,`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_04
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:110
- **Current Code**: `          authenticatedOptions.hostname ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_05
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:111
- **Current Code**: `          authenticatedOptions.host ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_06
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:189
- **Current Code**: `          timeout: _options.timeout || this.config.timeoutMs,`
- **Suggestion**: Manual review required for this issue type

### AZe6knyNqTomVwOqf_07
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EnhancedEdgeGrid.ts:190
- **Current Code**: `          maxRedirects: _options.maxRedirects || 5,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2vqTomVwOqf_6X
- **Message**: Member 'httpsAgents' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/core/OptimizedHTTPClient.ts:46
- **Current Code**: `  private httpsAgents = new Map<string, HttpsAgent>();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2vqTomVwOqf_6Y
- **Message**: Member 'httpAgents' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/core/OptimizedHTTPClient.ts:47
- **Current Code**: `  private httpAgents = new Map<string, HttpAgent>();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2vqTomVwOqf_6Z
- **Message**: Member 'dnsCache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/core/OptimizedHTTPClient.ts:48
- **Current Code**: `  private dnsCache = new LRUCache<string, DNSCacheEntry>({`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2vqTomVwOqf_6a
- **Message**: Member 'metrics' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/core/OptimizedHTTPClient.ts:52
- **Current Code**: `  private metrics: ConnectionMetrics = {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2vqTomVwOqf_6b
- **Message**: Member 'config' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/core/OptimizedHTTPClient.ts:60
- **Current Code**: `  private config: OptimizedHTTPConfig;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2vqTomVwOqf_6c
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/core/OptimizedHTTPClient.ts:149
- **Current Code**: `      const cacheKey = `${hostname}:${_options.family || 4}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2vqTomVwOqf_6d
- **Message**: This conditional operation returns the same value whether the condition is "true" or "false".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/core/OptimizedHTTPClient.ts:159
- **Current Code**: `      const lookupFn = _options.family === 6 ? dns.lookup : dns.lookup;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2vqTomVwOqf_6e
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/core/OptimizedHTTPClient.ts:191
- **Current Code**: `    const hostname = options.hostname || options.host;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2vqTomVwOqf_6f
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/core/OptimizedHTTPClient.ts:229
- **Current Code**: `            connectionReused: result.socket?.reused || false,`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0d
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:311
- **Current Code**: `    } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1iqTomVwOqf_4V
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/orchestration/index.ts:208
- **Current Code**: `      `${icons.lock} Certificate: ${format.green(_options.certificateType || 'default-dv')}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1iqTomVwOqf_4Y
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/orchestration/index.ts:238
- **Current Code**: `        type: _options.certificateType || 'default-dv',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1iqTomVwOqf_4a
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/orchestration/index.ts:307
- **Current Code**: `      const parallel = _options.parallel || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1CqTomVwOqf_33
- **Message**: Member 'config' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/resilience/CircuitBreaker.ts:36
- **Current Code**: `  private config: Required<CircuitBreakerConfig>;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1CqTomVwOqf_34
- **Message**: Member 'metrics' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/resilience/CircuitBreaker.ts:37
- **Current Code**: `  private metrics: CircuitBreakerMetrics;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1CqTomVwOqf_35
- **Message**: Member 'startTime' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/resilience/CircuitBreaker.ts:42
- **Current Code**: `  private startTime: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1CqTomVwOqf_36
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/resilience/CircuitBreaker.ts:48
- **Current Code**: `      failureThreshold: config.failureThreshold || 5,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1CqTomVwOqf_37
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/resilience/CircuitBreaker.ts:49
- **Current Code**: `      successThreshold: config.successThreshold || 2,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1CqTomVwOqf_38
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/resilience/CircuitBreaker.ts:50
- **Current Code**: `      recoveryTimeout: config.recoveryTimeout || 60000, // 1 minute`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1CqTomVwOqf_39
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/resilience/CircuitBreaker.ts:51
- **Current Code**: `      monitorTimeout: config.monitorTimeout || 10000, // 10 seconds`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gT
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:781
- **Current Code**: `          `Tool execution failed: ${_error instanceof Error ? _error.message : String(_error)}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_f1
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:624
- **Current Code**: `          );`
- **Suggestion**: Manual review required for this issue type

### AZe6knnOqTomVwOqf_gt
- **Message**: Refactor this function to reduce its Cognitive Complexity from 38 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/security-server.ts:456
- **Current Code**: `    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnOqTomVwOqf_g1
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/security-server.ts:658
- **Current Code**: `            ErrorCode.InvalidParams,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3q
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:186
- **Current Code**: `          const retryAfter = parseInt(_error.headers?.['retry-after'] || '0') * 1000;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3t
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:312
- **Current Code**: `            _error.response.data.detail || _error.response.data.title,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3u
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:313
- **Current Code**: `            _error.response.status || 500,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3v
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:392
- **Current Code**: `            _error.response.data.detail || _error.response.data.title,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3w
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:393
- **Current Code**: `            _error.response.status || 500,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3x
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:478
- **Current Code**: `            _error.response.data.detail || _error.response.data.title,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3y
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:479
- **Current Code**: `            _error.response.status || 500,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_30
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:534
- **Current Code**: `          _error.response.data.detail || _error.response.data.title,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_31
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:535
- **Current Code**: `          _error.response.status || 500,`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_16
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:253
- **Current Code**: `        } catch (_err) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_17
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:276
- **Current Code**: `    const dedupKey = this.generateDedupKey(_request.type || 'url', _request.objects);`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_18
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:287
- **Current Code**: `      type: _request.type || 'url',`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_19
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:290
- **Current Code**: `      priority: this.calculatePriority(_request.type || 'url', _request.objects.length),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_3A
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:126
- **Current Code**: `  private async loadOperations(): Promise<void> {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_3E
- **Message**: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:271
- **Current Code**: `  private async updateOperationStatus(operationId: string): Promise<void> {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_3K
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:536
- **Current Code**: `      } catch (_error: any) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2b
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:191
- **Current Code**: `        } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2h
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:240
- **Current Code**: `    } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2k
- **Message**: Expected the Promise rejection reason to be an Error.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:358
- **Current Code**: `          } else if (checkCount >= maxChecks) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2l
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:393
- **Current Code**: `      if (status === 'deployed') {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3CqTomVwOqf_6t
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/property-templates.ts:967
- **Current Code**: `          } catch (_e) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn24qTomVwOqf_6o
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/template-engine.ts:357
- **Current Code**: `    contractId: _context.contractId || 'ctr_C-1234567',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn24qTomVwOqf_6p
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/template-engine.ts:358
- **Current Code**: `    groupId: _context.groupId || 'grp_12345',`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1N
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:171
- **Current Code**: `      } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1T
- **Message**: Use `this` type instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:368
- **Current Code**: `  category(_category: TestScenario['category']): TestScenarioBuilder {`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_tx
- **Message**: Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:646
- **Current Code**: `export async function bulkUpdatePropertyRules(`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_tz
- **Message**: Refactor this function to reduce its Cognitive Complexity from 32 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:891
- **Current Code**: `export async function bulkManageHostnames(`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yc
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:314
- **Current Code**: `        const validatedProductsResponse = validateApiResponse<{ products?: { items?: any[] } }>(productsResponse);`
- **Suggestion**: Manual review required for this issue type

### AZe6kntMqTomVwOqf_sb
- **Message**: Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-advanced-tools.ts:77
- **Current Code**: `export async function getZonesDNSSECStatus(`
- **Suggestion**: Manual review required for this issue type

### AZe6kntMqTomVwOqf_se
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-advanced-tools.ts:376
- **Current Code**: `          error: _error.message || 'Unknown error',`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kU
- **Message**: Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:281
- **Current Code**: `export async function bulkImportRecords(`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_ka
- **Message**: Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:615
- **Current Code**: `export async function importFromCloudflare(`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kc
- **Message**: Refactor this function to reduce its Cognitive Complexity from 56 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:799
- **Current Code**: `function parseBindZoneFile(content: string, zone: string): ZoneFileRecord[] {`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kg
- **Message**: Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:1051
- **Current Code**: `async function validateSingleRecord(record: DNSRecordSet): Promise<{`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hu
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1272
- **Current Code**: `        _error instanceof Error ? _error.message : String(_error || 'Unknown error');`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_st
- **Message**: Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:172
- **Current Code**: `export async function generateFeatureDocumentation(`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_sx
- **Message**: Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:347
- **Current Code**: `export async function generateChangelog(`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_tL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:825
- **Current Code**: `  return categoryNames[_category] || _category;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xL
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:736
- **Current Code**: `export async function validateEdgeHostnameCertificate(`
- **Suggestion**: Manual review required for this issue type

### AZe6kntoqTomVwOqf_tR
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:370
- **Current Code**: `      } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kntoqTomVwOqf_tW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:467
- **Current Code**: `  const minProperties = _options.minPropertiesForPattern || 3;`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_h3
- **Message**: Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:86
- **Current Code**: `export async function analyzeHostnameOwnership(`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_h8
- **Message**: Refactor this function to reduce its Cognitive Complexity from 23 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:441
- **Current Code**: `export async function validateHostnamesBulk(`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_pX
- **Message**: Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:19
- **Current Code**: `export async function runIntegrationTestSuite(`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_pe
- **Message**: Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:550
- **Current Code**: `  }`
- **Suggestion**: Manual review required for this issue type

### AZe6knrrqTomVwOqf_pQ
- **Message**: Refactor this function to reduce its Cognitive Complexity from 30 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/performance-tools.ts:234
- **Current Code**: `export async function profilePerformance(`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:629
- **Current Code**: `  return resolutions[_error.type] || 'Review the error details and update configuration';`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uI
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:716
- **Current Code**: `  } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_yG
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:878
- **Current Code**: `  } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_od
- **Message**: Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1663
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oq
- **Message**: Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2021
- **Current Code**: `        });`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_ou
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2073
- **Current Code**: `        text += `[DEPLOY] Auto-activated on ${args.network.toUpperCase()}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_o2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2142
- **Current Code**: `              result = await getVersionDiff(client, {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrhqTomVwOqf_pL
- **Message**: Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:131
- **Current Code**: `  return withToolErrorHandling(async () => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrhqTomVwOqf_pM
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:160
- **Current Code**: `    } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrhqTomVwOqf_pN
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:175
- **Current Code**: `    } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrhqTomVwOqf_pO
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:193
- **Current Code**: `    } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrhqTomVwOqf_pP
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:204
- **Current Code**: `      } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lM
- **Message**: Refactor this function to reduce its Cognitive Complexity from 29 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:167
- **Current Code**: `export async function compareProperties(`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lU
- **Message**: Refactor this function to reduce its Cognitive Complexity from 32 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:473
- **Current Code**: `export async function checkPropertyHealth(`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lb
- **Message**: Refactor this function to reduce its Cognitive Complexity from 56 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:936
- **Current Code**: `export async function bulkUpdateProperties(`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:316
- **Current Code**: `          error: _error.message || 'Unknown error',`
- **Suggestion**: Manual review required for this issue type

### AZe6knnlqTomVwOqf_hN
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-management.ts:1352
- **Current Code**: `      return evaluateExpression(trimmed, variables);`
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uN
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:48
- **Current Code**: `  } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uO
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:65
- **Current Code**: `  } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uP
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:106
- **Current Code**: `    } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uV
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:545
- **Current Code**: `        {`
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uZ
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:767
- **Current Code**: `    const validatedPropertyResponse = validateApiResponse<{ properties?: { items?: any } }>(propertyResponse);`
- **Suggestion**: Manual review required for this issue type

### AZe6knotqTomVwOqf_i4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-activation.ts:127
- **Current Code**: `          text: `Error activating network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knotqTomVwOqf_i5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-activation.ts:187
- **Current Code**: `          text: `Error retrieving activation status: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knotqTomVwOqf_i7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-activation.ts:277
- **Current Code**: `          text: `Error listing activations: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knotqTomVwOqf_i8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-activation.ts:368
- **Current Code**: `          text: `Error deactivating network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knotqTomVwOqf_i9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-activation.ts:433
- **Current Code**: `          error: akamaiError.title || akamaiError.detail || 'Unknown _error',`
- **Suggestion**: Manual review required for this issue type

### AZe6knotqTomVwOqf_i-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-activation.ts:467
- **Current Code**: `          text: `Error in bulk activation: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_j0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:258
- **Current Code**: `          text: `Error importing CSV: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_j1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:344
- **Current Code**: `          text: `Error exporting CSV: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_j2
- **Message**: Refactor this function to reduce its Cognitive Complexity from 49 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:354
- **Current Code**: `export async function bulkUpdateNetworkLists(`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_j3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:493
- **Current Code**: `          error: akamaiError.title || akamaiError.detail || 'Unknown _error',`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_j6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:529
- **Current Code**: `          text: `Error in bulk update: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_j7
- **Message**: Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:539
- **Current Code**: `export async function mergeNetworkLists(`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_j-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:675
- **Current Code**: `          text: `Error merging network lists: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kno_qTomVwOqf_jW
- **Message**: Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-geo-asn.ts:87
- **Current Code**: `export async function validateGeographicCodes(`
- **Suggestion**: Manual review required for this issue type

### AZe6kno_qTomVwOqf_jZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-geo-asn.ts:177
- **Current Code**: `          text: `Error validating geographic codes: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kno_qTomVwOqf_ja
- **Message**: Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-geo-asn.ts:187
- **Current Code**: `export async function getASNInformation(`
- **Suggestion**: Manual review required for this issue type

### AZe6kno_qTomVwOqf_jb
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-geo-asn.ts:266
- **Current Code**: `          text: `Error looking up ASN information: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kno_qTomVwOqf_jd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-geo-asn.ts:380
- **Current Code**: `          text: `Error generating recommendations: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kno_qTomVwOqf_jf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-geo-asn.ts:489
- **Current Code**: `          text: `Error generating ASN recommendations: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jO
- **Message**: Refactor this function to reduce its Cognitive Complexity from 23 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:118
- **Current Code**: `export async function listNetworkLists(`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:214
- **Current Code**: `          text: `Error listing network lists: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jQ
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:224
- **Current Code**: `export async function getNetworkList(`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:305
- **Current Code**: `          text: `Error retrieving network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:420
- **Current Code**: `          text: `Error creating network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jT
- **Message**: Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:430
- **Current Code**: `export async function updateNetworkList(`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:568
- **Current Code**: `          text: `Error updating network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:624
- **Current Code**: `          text: `Error deleting network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knoGqTomVwOqf_iN
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/tool-registry.ts:195
- **Current Code**: `/*`
- **Suggestion**: Remove commented out code

### AZe6knxOqTomVwOqf_zG
- **Message**: Promise-returning function provided to variable where a void return was expected.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/middleware.ts:164
- **Current Code**: `    const _next: NextFunction = async (_error?: Error) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knxOqTomVwOqf_zH
- **Message**: Unexpected `await` of a non-Promise (non-"Thenable") value.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/types/middleware.ts:182
- **Current Code**: `    await _next();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxOqTomVwOqf_zI
- **Message**: Unexpected `await` of a non-Promise (non-"Thenable") value.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/types/middleware.ts:287
- **Current Code**: `        await _next();`
- **Suggestion**: Manual review required for this issue type

### AZe6knhuqTomVwOqf_aU
- **Message**: Expected the Promise rejection reason to be an Error.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/edgegrid-client.ts:38
- **Current Code**: `      (_error) => Promise.reject(_error),`
- **Suggestion**: Manual review required for this issue type

### AZe6knhuqTomVwOqf_aX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/edgegrid-client.ts:144
- **Current Code**: `          errorMessage = data.errors.map((_e: any) => _e.detail || _e.error || _e).join(', ');`
- **Suggestion**: Manual review required for this issue type

### AZe6knhuqTomVwOqf_aY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/edgegrid-client.ts:144
- **Current Code**: `          errorMessage = data.errors.map((_e: any) => _e.detail || _e.error || _e).join(', ');`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:70
- **Current Code**: `    const requestId = akamaiError?.requestId || this.extractRequestId(_error);`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:174
- **Current Code**: `    let errorData = _error.response?.data || _error.data || _error;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:174
- **Current Code**: `    let errorData = _error.response?.data || _error.data || _error;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:195
- **Current Code**: `        status: errorData.status || this.extractHttpStatus(_error),`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:197
- **Current Code**: `        requestId: errorData.requestId || this.extractRequestId(_error),`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bY
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:208
- **Current Code**: `  private categorizeError(`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:256
- **Current Code**: `        (_err: any) => _err.field || _err.type === 'field-_error',`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_ba
- **Message**: Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:269
- **Current Code**: `  private generateSuggestions(`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bb
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:315
- **Current Code**: `              suggestions.push(`Fix the '${_err.field}' field: ${_err.detail || _err.title}`);`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:317
- **Current Code**: `              suggestions.push(_err.detail || _err.title);`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bf
- **Message**: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:402
- **Current Code**: `  private formatUserMessage(`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bg
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:408
- **Current Code**: `    const operation = _context.operation || 'operation';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bi
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:481
- **Current Code**: `    const retryAfter = _error.response?.headers?.['retry-after'] || _error.headers?.['retry-after'];`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bj
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:496
- **Current Code**: `      _error.response?.headers?.['x-request-id'] ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bk
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:497
- **Current Code**: `      _error.headers?.['x-request-id'] ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bl
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:498
- **Current Code**: `      _error.response?.headers?.['x-trace-id'] ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bm
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:499
- **Current Code**: `      _error.headers?.['x-trace-id'] ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_bq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:77
- **Current Code**: `          `Please provide the required field: ${_error.errorLocation || _error.field}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_bz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:217
- **Current Code**: `        message: _error.message || 'System error occurred',`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_b0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:225
- **Current Code**: `      message: this.cleanErrorMessage(_error.message || 'An error occurred'),`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_b2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:259
- **Current Code**: `    const field = _error.field || _error.errorLocation || 'value';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_b3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:259
- **Current Code**: `    const field = _error.field || _error.errorLocation || 'value';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_b4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:260
- **Current Code**: `    const format = _error.expectedFormat || _error.format;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:34
- **Current Code**: `    this.total = _options.total || 100;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:35
- **Current Code**: `    this.format = _options.format || '[:bar] :percent :message';`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:36
- **Current Code**: `    this.barCompleteChar = _options.barCompleteChar || '█';`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:37
- **Current Code**: `    this.barIncompleteChar = _options.barIncompleteChar || '░';`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:38
- **Current Code**: `    this.barWidth = _options.barWidth || 40;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:39
- **Current Code**: `    this.stream = _options.stream || process.stderr;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:263
- **Current Code**: `    format: _options.format || '[:bar] :percent :current/:total :message',`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:266
- **Current Code**: `  const concurrent = _options.concurrent || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eO
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:283
- **Current Code**: `      progress.increment(1, _options.message || `Processing item ${currentIndex + 1}`);`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_am
- **Message**: Handle this exception or don't catch it at all.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:301
- **Current Code**: `          } catch (_e) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_an
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:457
- **Current Code**: `    let errorData: any = _error.response?.data || _error.data || _error;`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_ao
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:457
- **Current Code**: `    let errorData: any = _error.response?.data || _error.data || _error;`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_ap
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:467
- **Current Code**: `          status: _error.response?.status || _error.status || 500,`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_aq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:467
- **Current Code**: `          status: _error.response?.status || _error.status || 500,`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_ar
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:474
- **Current Code**: `      title: errorData.title || errorData._error || 'Unknown Error',`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_as
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:474
- **Current Code**: `      title: errorData.title || errorData._error || 'Unknown Error',`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_at
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:475
- **Current Code**: `      detail: errorData.detail || errorData.message || errorData._error,`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_au
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:475
- **Current Code**: `      detail: errorData.detail || errorData.message || errorData._error,`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_av
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:476
- **Current Code**: `      status: errorData.status || _error.response?.status || _error.status,`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_aw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:476
- **Current Code**: `      status: errorData.status || _error.response?.status || _error.status,`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_ax
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:479
- **Current Code**: `      requestId: errorData.requestId || _error.response?.headers?.['x-request-id'],`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_ay
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:486
- **Current Code**: `        title: _err.title || _err.message,`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_az
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:487
- **Current Code**: `        detail: _err.detail || _err.description,`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_a0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:488
- **Current Code**: `        field: _err.field || _err.path,`
- **Suggestion**: Manual review required for this issue type

### AZe6knxsqTomVwOqf_0S
- **Message**: Expected an error object to be thrown.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/response-handling.test.ts:666
- **Current Code**: `          throw {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1RqTomVwOqf_4J
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/jsonrpc-middleware.ts:108
- **Current Code**: `        data?: unknown;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1RqTomVwOqf_4K
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/jsonrpc-middleware.ts:109
- **Current Code**: `      };`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1RqTomVwOqf_4L
- **Message**: Member 'prefix' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/middleware/jsonrpc-middleware.ts:181
- **Current Code**: `   * Extract metadata from request`
- **Suggestion**: Manual review required for this issue type

### AZe6kn06qTomVwOqf_32
- **Message**: Unexpected empty class.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/customer-config-manager.ts:6
- **Current Code**: `export class CustomerConfigManager {`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_t3
- **Message**: Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:1286
- **Current Code**: `  const setValueAtPath = (obj: any, path: string, value: any): void => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_t4
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:1296
- **Current Code**: `        if (!current[key]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_t5
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:1299
- **Current Code**: `        if (!current[key][index]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_t6
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:1304
- **Current Code**: `        if (!current[part]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_t7
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:1316
- **Current Code**: `      if (!current[key]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_td
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:148
- **Current Code**: `      if (!byNetwork[network]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_tk
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:465
- **Current Code**: `      if (!byDomain[domain]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yU
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:69
- **Current Code**: `      if (!acc[contract]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_ul
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:641
- **Current Code**: `    const byStatus = validatedResponse.enrollments.reduce(`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hv
- **Message**: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1291
- **Current Code**: `export async function ensureCleanChangeList(`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xF
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:598
- **Current Code**: `        if (!acc[key]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_h7
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:363
- **Current Code**: `        if (!acc[suffix]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iF
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:1159
- **Current Code**: `        if (!groups[domain]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iG
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:1180
- **Current Code**: `        if (!groups[category]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iH
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:1199
- **Current Code**: `        if (!groups[env]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iI
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:1217
- **Current Code**: `          if (!groups[key]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iJ
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:1223
- **Current Code**: `          if (!groups[key]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iK
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:1229
- **Current Code**: `          if (!groups[domain]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vt
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:90
- **Current Code**: `      displayName?: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v1
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:231
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v_
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:542
- **Current Code**: `          {`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lc
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:1031
- **Current Code**: `            if (!rules.behaviors) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nM
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2289
- **Current Code**: `      output += `• Requirements:\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wY
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:773
- **Current Code**: `      if (!rules.comments) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wh
- **Message**: Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1314
- **Current Code**: `function setValueAtPath(obj: any, path: string, value: any): void {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wi
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1330
- **Current Code**: `      if (!current[key]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wj
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1333
- **Current Code**: `      if (!current[key][index]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wk
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1339
- **Current Code**: `      if (!current[part]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wl
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1353
- **Current Code**: `    if (!current[key]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_ic
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:757
- **Current Code**: `        if (!acc[cat]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_ig
- **Message**: Refactor this function to reduce its Cognitive Complexity from 33 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:1441
- **Current Code**: `                options: {`
- **Suggestion**: Manual review required for this issue type

### AZe6knw_qTomVwOqf_zD
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/jsonrpc.ts:16
- **Current Code**: `  id: string | number | null;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn18qTomVwOqf_5D
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-production-activation.agent.ts:57
- **Current Code**: `      const version = config.version || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn18qTomVwOqf_5E
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-production-activation.agent.ts:62
- **Current Code**: `        note: config.note || 'Production activation after staging validation',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn18qTomVwOqf_5G
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-production-activation.agent.ts:68
- **Current Code**: `      const activationIdMatch = activationResponseText.match(/Activation ID:\*\* (atv_\d+)/);`
- **Suggestion**: Manual review required for this issue type

### AZe6kn18qTomVwOqf_5H
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-production-activation.agent.ts:98
- **Current Code**: `        const maxWaitTime = config.maxWaitTime || 60; // Default 60 minutes`
- **Suggestion**: Manual review required for this issue type

### AZe6koBOqTomVwOqgACD
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:docs/user-guides/request-templates/property-manager/create-property.ts:14
- **Current Code**: `  groupId: z.string().regex(/^grp_[0-9]+$/, 'Group ID must match pattern grp_*'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_57
- **Message**: Member 'customer' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:68
- **Current Code**: `    private customer = 'default',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_5_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:161
- **Current Code**: `        note || `Cloned from ${sourcePropertyId} v${sourceVersion}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6D
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:554
- **Current Code**: `    const v = version || (await this.getLatestVersion(propertyId));`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4q
- **Message**: Member 'customer' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:108
- **Current Code**: `    private customer = 'default',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_5A
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:778
- **Current Code**: `      await this.deployCertificate(certificate.enrollmentId, options.network || 'production');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5f
- **Message**: Member 'customer' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:57
- **Current Code**: `  constructor(private customer = 'default') {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5p
- **Message**: Move this array "sort" operation to a separate statement or replace it with "toSorted".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:842
- **Current Code**: `      JSON.stringify(expected.rdata.sort()) === JSON.stringify(actual.rdata.sort())`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2TqTomVwOqf_5q
- **Message**: Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:842
- **Current Code**: `      JSON.stringify(expected.rdata.sort()) === JSON.stringify(actual.rdata.sort())`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2TqTomVwOqf_5r
- **Message**: Move this array "sort" operation to a separate statement or replace it with "toSorted".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:842
- **Current Code**: `      JSON.stringify(expected.rdata.sort()) === JSON.stringify(actual.rdata.sort())`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2TqTomVwOqf_5s
- **Message**: Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:842
- **Current Code**: `      JSON.stringify(expected.rdata.sort()) === JSON.stringify(actual.rdata.sort())`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5M
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:242
- **Current Code**: `      customer: config.customer || 'default',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5R
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:330
- **Current Code**: `    const contractId = config.contractId || 'ctr_1-5C13O2'; // Default contract`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5T
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:370
- **Current Code**: `        `[PropertyOnboarding] Selected product: ${productId} for use case: ${useCase || 'default'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knyWqTomVwOqf_08
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EdgeGridAuth.ts:72
- **Current Code**: `  queryParams?: Record<string, string | number | boolean>;`
- **Suggestion**: Manual review required for this issue type

### AZe6knyWqTomVwOqf_1D
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EdgeGridAuth.ts:449
- **Current Code**: `      return data.errors.map((e) => e.detail || e.title || e.error || 'Unknown error').join(', ');`
- **Suggestion**: Manual review required for this issue type

### AZe6knyWqTomVwOqf_1E
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EdgeGridAuth.ts:449
- **Current Code**: `      return data.errors.map((e) => e.detail || e.title || e.error || 'Unknown error').join(', ');`
- **Suggestion**: Manual review required for this issue type

### AZe6knyWqTomVwOqf_1F
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EdgeGridAuth.ts:449
- **Current Code**: `      return data.errors.map((e) => e.detail || e.title || e.error || 'Unknown error').join(', ');`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0U
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:34
- **Current Code**: `  overall: 'healthy' | 'degraded' | 'unhealthy';`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0g
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:410
- **Current Code**: `          recentMetrics[recentMetrics.length - 1]?.costMetrics.projectedMonthly || 0,`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0h
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:411
- **Current Code**: `        efficiency: recentMetrics[recentMetrics.length - 1]?.costMetrics.efficiency || 0,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnOqTomVwOqf_gv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/security-server.ts:484
- **Current Code**: `                typedArgs.type,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnOqTomVwOqf_g0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/security-server.ts:628
- **Current Code**: `              result = await generateDeploymentChecklist(`
- **Suggestion**: Manual review required for this issue type

### AZe6knzuqTomVwOqf_2S
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/BaseAkamaiClient.ts:464
- **Current Code**: `                status: lastError.statusCode || 500,`
- **Suggestion**: Manual review required for this issue type

### AZe6knzuqTomVwOqf_2U
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/BaseAkamaiClient.ts:505
- **Current Code**: `    config?: Omit<RequestConfig<T>, 'path' | 'method' | 'body'>,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_3G
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:480
- **Current Code**: `          ? completedOps.reduce((sum, op) => sum + (op.summary?.duration || 0), 0) /`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_3H
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:484
- **Current Code**: `        (sum, op) => sum + (op.summary?.successfullyPurged || 0),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_3I
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:493
- **Current Code**: `            ? completedOps.reduce((sum, op) => sum + (op.summary?.averageBatchTime || 0), 0) /`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_3J
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:496
- **Current Code**: `        throughput: todayOps.reduce((sum, op) => sum + (op.summary?.successfullyPurged || 0), 0),`
- **Suggestion**: Manual review required for this issue type

### AZe6knzNqTomVwOqf_1q
- **Message**: Provide multiple methods instead of using "lowerIsBetter" to determine which action to take.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/ReportingService.ts:701
- **Current Code**: `    if (lowerIsBetter) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0iqTomVwOqf_3Y
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/TrafficAnalyticsService.ts:643
- **Current Code**: `trend: bandwidthGrowth > 5 ? 'increasing' : bandwidthGrowth < -5 ? 'decreasing' : 'stable',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6kn0iqTomVwOqf_3Z
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/TrafficAnalyticsService.ts:747
- **Current Code**: `      analysisData.contentTypeData.find((ct: any) => ct.contentType === 'image')?.percentage || 0;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3h
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:345
- **Current Code**: `      report += Array.isArray(statusResponse.content) ? statusResponse.content[0]?.text || '' : '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1O
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:235
- **Current Code**: `      const categoryResults = this.testResults.filter((r) => r.scenario.includes(category || ''));`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1b
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:556
- **Current Code**: `    const errors = results.filter((r) => !r.success).map((r) => r.error || 'Unknown error');`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_t1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:1011
- **Current Code**: `                cnameTo: hostnameOp.edgeHostname || `${hostnameOp.hostname}.edgekey.net`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_tl
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:476
- **Current Code**: `        (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_tm
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:476
- **Current Code**: `        (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:92
- **Current Code**: `      text += '| CP Code | Name | Products | Created |\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6kntMqTomVwOqf_sc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-advanced-tools.ts:188
- **Current Code**: `            : format.red(status.lastTransferResult || 'UNKNOWN')`
- **Suggestion**: Manual review required for this issue type

### AZe6kntMqTomVwOqf_sf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-advanced-tools.ts:593
- **Current Code**: `        comment: args.comment || `Reactivated version ${args.versionId}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6kntMqTomVwOqf_sg
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-advanced-tools.ts:713
- **Current Code**: `        comment: args.comment || `Created ${args.recordSets.length} record sets`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hf
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:176
- **Current Code**: `          `${icons.dns} ${format.cyan(zone.zone)} (${format.green(zone.type)})${zone.comment ? ` - ${format.dim(zone.comment)}` : ''}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_ho
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:930
- **Current Code**: `            `Zone ${zone} activated successfully (${status.propagationStatus?.percentage || 100}% propagated)`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_h0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1694
- **Current Code**: `        comment: args.comment || `Deleted ${args.type} record for ${args.name}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_ss
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:122
- **Current Code**: `    const toolFiles = files.filter((f) => f.endsWith('-tools.ts') || f.endsWith('-tools.js'));`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:541
- **Current Code**: `      version: metadata.version || '1.0.0',`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wm
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:15
- **Current Code**: `  domainSuffix: '.edgekey.net' | '.edgesuite.net' | '.akamaized.net';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:132
- **Current Code**: `      args.domainSuffix || determineOptimalSuffix(args.domainPrefix, args.secure);`
- **Suggestion**: Manual review required for this issue type

### AZe6kntoqTomVwOqf_tQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:298
- **Current Code**: `      minPropertiesForPattern: args.minPropertiesForPattern || 3,`
- **Suggestion**: Manual review required for this issue type

### AZe6kntoqTomVwOqf_tV
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:457
- **Current Code**: `coveredHostnames.length > 5 ? 'complete' : coveredHostnames.length > 2 ? 'partial' : 'none',`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6kntoqTomVwOqf_ta
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:733
- **Current Code**: `    (h.cnameFrom || h.hostname).includes(domain),`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_ki
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:70
- **Current Code**: `      (a.productName || '').localeCompare(b.productName || ''),`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kj
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:70
- **Current Code**: `      (a.productName || '').localeCompare(b.productName || ''),`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kt
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:451
- **Current Code**: `    const year = args.year || now.getFullYear();`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_ku
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:452
- **Current Code**: `    const month = args.month || now.getMonth() + 1; // JavaScript months are 0-based`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:491
- **Current Code**: `      const productId = product.productId || 'Unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:492
- **Current Code**: `      const billingName = product.productName || 'Unnamed';`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kx
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:551
- **Current Code**: `            text += `| ${region.regionName || region.regionId} | ${region.usage || 0} | ${region.unit || 'N/A'} |\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_ky
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:551
- **Current Code**: `            text += `| ${region.regionName || region.regionId} | ${region.usage || 0} | ${region.unit || 'N/A'} |\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:551
- **Current Code**: `            text += `| ${region.regionName || region.regionId} | ${region.usage || 0} | ${region.unit || 'N/A'} |\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_yI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:949
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_ov
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2087
- **Current Code**: `- Compare: "Compare property ${args.propertyId} versions ${backupVersionId} and ${newVersionId}"`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_ow
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2093
- **Current Code**: `          text,`
- **Suggestion**: Manual review required for this issue type

### AZe6knrhqTomVwOqf_pK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:69
- **Current Code**: `      useCase: args.useCase || 'web-app',`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_la
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:825
- **Current Code**: `        compareHostnames.hostnames?.items || [],`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2533
- **Current Code**: `                  page: 1,`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:309
- **Current Code**: `            prop.note || args.defaultNote || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:309
- **Current Code**: `            prop.note || args.defaultNote || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_if
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:1053
- **Current Code**: `        const validReqPath = reqPaths.find((rPath) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_io
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:32
- **Current Code**: `    result += keys.map((key) => row[key] || 'N/A').join('\t') + '\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_ir
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:76
- **Current Code**: `              Description: config.description || 'N/A',`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_it
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:79
- **Current Code**: `              'Staging Version': config.stagingVersion || 'None',`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:90
- **Current Code**: `                Description: config.description || 'N/A',`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:93
- **Current Code**: `                'Staging Version': config.stagingVersion || 'None',`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:302
- **Current Code**: `                  event.httpMessage?.start || event.timestamp,`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kO
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:310
- **Current Code**: `              })) || [],`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jg
- **Message**: Simplify this regular expression to reduce its complexity from 36 to the 20 allowed.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:20
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jh
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:20
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_ji
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:20
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jj
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:20
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jk
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:20
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jl
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:20
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jm
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:20
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jn
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:20
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jo
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:20
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jp
- **Message**: Simplify this regular expression to reduce its complexity from 28 to the 20 allowed.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:22
- **Current Code**: `    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$|^::1(\/128)?$|^::(\/0)?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jq
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:22
- **Current Code**: `    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$|^::1(\/128)?$|^::(\/0)?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jr
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:22
- **Current Code**: `    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$|^::1(\/128)?$|^::(\/0)?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_js
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:22
- **Current Code**: `    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$|^::1(\/128)?$|^::(\/0)?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jt
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:50
- **Current Code**: `    .map((line) => line.split(',')[0]?.trim() || '') // Take first column, ignore descriptions`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_i_
- **Message**: Simplify this regular expression to reduce its complexity from 36 to the 20 allowed.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:58
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jA
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:58
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jB
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:58
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jC
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:58
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jD
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:58
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jE
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:58
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jF
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:58
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jG
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:58
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jH
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:58
- **Current Code**: `    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jI
- **Message**: Simplify this regular expression to reduce its complexity from 28 to the 20 allowed.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:62
- **Current Code**: `    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$|^::1(\/128)?$|^::(\/0)?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jJ
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:62
- **Current Code**: `    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$|^::1(\/128)?$|^::(\/0)?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jK
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:62
- **Current Code**: `    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$|^::1(\/128)?$|^::(\/0)?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jL
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:62
- **Current Code**: `    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$|^::1(\/128)?$|^::(\/0)?$/;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjyqTomVwOqf_cX
- **Message**: Member 'edgercPath' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/customer-config.ts:76
- **Current Code**: `  private edgercPath = '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bS
- **Message**: Member 'defaultRetryConfig' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:53
- **Current Code**: `  private defaultRetryConfig: RetryConfig = {`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:389
- **Current Code**: `          .map((e) => (e.field ? `${e.field}: ${e.detail || e.title}` : e.detail || e.title))`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_be
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:389
- **Current Code**: `          .map((e) => (e.field ? `${e.field}: ${e.detail || e.title}` : e.detail || e.title))`
- **Suggestion**: Manual review required for this issue type

### AZe6knjTqTomVwOqf_bh
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/enhanced-error-handling.ts:430
- **Current Code**: `            .map((e) => `${e.field}: ${e.detail || e.title}`)`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_bt
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:110
- **Current Code**: `    const message = data.detail || "You don't have permission to perform this action";`
- **Suggestion**: Manual review required for this issue type

### AZe6knhZqTomVwOqf_aK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/formatting.ts:156
- **Current Code**: `    typeMap[contractType] ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knhZqTomVwOqf_aL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/formatting.ts:304
- **Current Code**: `    ...data.map((item) => keys.map((key) => String(item[key] || '')).join(' | ')),`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_Z5
- **Message**: Use concise character class syntax '\w' instead of '[a-zA-Z0-9_]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:15
- **Current Code**: `  product: /^prd_[a-zA-Z0-9_]+$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_Z-
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:60
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_Z6
- **Message**: Simplify this regular expression to reduce its complexity from 28 to the 20 allowed.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:60
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_Z7
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:60
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_Z8
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:60
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_Z9
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:60
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_Z_
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:60
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_aA
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:60
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_aB
- **Message**: Simplify this regular expression to reduce its complexity from 34 to the 20 allowed.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:69
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_aC
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:69
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_aD
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:69
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_aE
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:69
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_aF
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:69
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_aG
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:69
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_aH
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:69
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_aI
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:69
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6kngIqTomVwOqf_aJ
- **Message**: Use concise character class syntax '\d' instead of '[0-9]'.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/parameter-validation.ts:69
- **Current Code**: `      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:154
- **Current Code**: `      timeWindowMs ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knlEqTomVwOqf_ec
- **Message**: Member 'config: CircuitBreakerConfig' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/resilience-manager.ts:133
- **Current Code**: `    private config: CircuitBreakerConfig,`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_a1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:563
- **Current Code**: `      result.operationId = response.activationId || response.changeId || response.purgeId;`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_a2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:563
- **Current Code**: `      result.operationId = response.activationId || response.changeId || response.purgeId;`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_a3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:599
- **Current Code**: `        parsedData = ResponseParser.parsePropertyResponse(response.data || response);`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_a4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:602
- **Current Code**: `        parsedData = ResponseParser.parseDNSResponse(response.data || response);`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_a5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:605
- **Current Code**: `        parsedData = ResponseParser.parseCertificateResponse(response.data || response);`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_a6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:608
- **Current Code**: `        parsedData = ResponseParser.parseFastPurgeResponse(response.data || response);`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_a7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:611
- **Current Code**: `        parsedData = ResponseParser.parseNetworkListResponse(response.data || response);`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_a8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:614
- **Current Code**: `        parsedData = response.data || response;`
- **Suggestion**: Manual review required for this issue type

### AZe6kni0qTomVwOqf_a9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/response-parsing.ts:624
- **Current Code**: `    return response.data || response;`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zM
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:115
- **Current Code**: `        expect(() => validateParameters(PropertyManagerSchemas.listProperties, invalid)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zN
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:118
- **Current Code**: `        expect(() => validateParameters(PropertyManagerSchemas.listProperties, negative)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zV
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:216
- **Current Code**: `        expect(() => validateParameters(PropertyManagerSchemas.createProperty, longName)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zY
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:278
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.listZones, valid)).not.toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zZ
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:286
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.listZones, invalidSort)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_za
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:294
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.listZones, invalidOrder)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zb
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:299
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.listZones, negativeOffset)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zc
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:302
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.listZones, validOffset)).not.toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zd
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:314
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.createZone, validPrimary)).not.toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_ze
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:323
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.createZone, secondaryWithoutMasters)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zh
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:331
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.createZone, secondaryWithMasters)).not.toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zi
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:340
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.createZone, aliasWithoutTarget)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zj
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:348
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.createZone, aliasWithTarget)).not.toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zl
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:358
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.createZone, invalidIPs)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zm
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:368
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.createZone, longComment)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zo
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:381
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.upsertRecord, validTTL)).not.toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zq
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:391
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.upsertRecord, tooLowTTL)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zs
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:401
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.upsertRecord, tooHighTTL)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zu
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:424
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.upsertRecord, invalidType)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zv
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:435
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.upsertRecord, emptyRdata)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_zw
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:444
- **Current Code**: `        expect(() => validateParameters(DNSSchemas.upsertRecord, emptyString)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z1
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:602
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, validUrls)).not.toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z2
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:609
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, invalidUrls)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z3
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:615
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, noUrls)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z4
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:619
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, tooManyUrls)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z6
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:630
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, invalidPriority)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z7
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:638
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, longDescription)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z8
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:659
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, validCodes)).not.toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z9
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:666
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, invalidCodes)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z-
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:672
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, noCodes)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_z_
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:676
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, tooManyCodes)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_0A
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:681
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, negativeCodes)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_0B
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:684
- **Current Code**: `        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, floatCodes)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_0E
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:698
- **Current Code**: `        expect(() => validateParameters(NetworkListSchemas.createNetworkList, valid)).not.toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_0F
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:704
- **Current Code**: `        expect(() => validateParameters(NetworkListSchemas.createNetworkList, emptyName)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxhqTomVwOqf_0G
- **Message**: Refactor this code to not nest functions more than 4 levels deep.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/parameter-validation.test.ts:708
- **Current Code**: `        expect(() => validateParameters(NetworkListSchemas.createNetworkList, longName)).toThrow();`
- **Suggestion**: Manual review required for this issue type

### AZe6knxsqTomVwOqf_0Q
- **Message**: Expected an error object to be thrown.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/response-handling.test.ts:636
- **Current Code**: `          throw { response: { status: 503 } };`
- **Suggestion**: Manual review required for this issue type

### AZe6knxsqTomVwOqf_0R
- **Message**: Expected an error object to be thrown.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/response-handling.test.ts:650
- **Current Code**: `        throw { response: { status: 400 } };`
- **Suggestion**: Manual review required for this issue type

### AZe6knxsqTomVwOqf_0T
- **Message**: Expected an error object to be thrown.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/__tests__/utils/response-handling.test.ts:702
- **Current Code**: `          throw { response: { status: 503 } };`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5V
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:397
- **Current Code**: `      const cpCodeMatch = responseText.match(/(?:CP Code ID:|CP Code:)\s*(?:cpc_)?(\d+)/i);`
- **Suggestion**: Manual review required for this issue type

### AZe6kn18qTomVwOqf_5B
- **Message**: Member 'client: AkamaiClient' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-production-activation.agent.ts:32
- **Current Code**: `  constructor(private client: AkamaiClient) {}`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_ub
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:222
- **Current Code**: `      validationType: 'dv',`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_uc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:227
- **Current Code**: `        quicEnabled: args.quicEnabled !== false, // Default to true for modern performance`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1013
- **Current Code**: `    fastPush?: boolean;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5J
- **Message**: Member 'client: AkamaiClient' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:103
- **Current Code**: `  constructor(private client: AkamaiClient) {}`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5K
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:238
- **Current Code**: `      network: config.network || 'ENHANCED_TLS',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5L
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:239
- **Current Code**: `      certificateType: config.certificateType || 'DEFAULT',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5X
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:429
- **Current Code**: `      const propertyIdMatch = responseText.match(/Property ID:\*\* (prp_\d+)/);`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5Z
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:736
- **Current Code**: `    const acmeRecord = `_acme-challenge.${hostname.replace(`.${domain}`, '')}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2HqTomVwOqf_5b
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/property-onboarding.agent.ts:812
- **Current Code**: `      const activationIdMatch = responseText.match(/Activation ID:\*\* (atv_\d+)/);`
- **Suggestion**: Manual review required for this issue type

### AZe6knrhqTomVwOqf_pG
- **Message**: "aws" is overridden by string in this union type.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:39
- **Current Code**: `    dnsProvider?: 'aws' | 'cloudflare' | 'azure' | 'other' | string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knrhqTomVwOqf_pH
- **Message**: "cloudflare" is overridden by string in this union type.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:39
- **Current Code**: `    dnsProvider?: 'aws' | 'cloudflare' | 'azure' | 'other' | string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knrhqTomVwOqf_pI
- **Message**: "azure" is overridden by string in this union type.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:39
- **Current Code**: `    dnsProvider?: 'aws' | 'cloudflare' | 'azure' | 'other' | string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knrhqTomVwOqf_pJ
- **Message**: "other" is overridden by string in this union type.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-onboarding-tools.ts:39
- **Current Code**: `    dnsProvider?: 'aws' | 'cloudflare' | 'azure' | 'other' | string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_o7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:78
- **Current Code**: `    const customer = args.customer || 'default';`
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_o8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:116
- **Current Code**: `            type: 'property',`
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_o9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:177
- **Current Code**: `                const queryLower = args.query.toLowerCase();`
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_o-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:178
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_o_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:289
- **Current Code**: `          responseText += `[PACKAGE] **${r.propertyName}** \`${r.propertyId}\`\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_pA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:289
- **Current Code**: `          responseText += `[PACKAGE] **${r.propertyName}** \`${r.propertyId}\`\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knraqTomVwOqf_pB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/universal-search-with-cache.ts:304
- **Current Code**: `          responseText += '\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:307
- **Current Code**: `      path: '/papi/v1/groups',`
- **Suggestion**: Manual review required for this issue type

### AZe6knhnqTomVwOqf_aO
- **Message**: Extract this nested ternary operation into an independent statement.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/tree-view.ts:71
- **Current Code**: `line += count === 0 ? ' - Empty' : ` - ${count} ${count === 1 ? 'property' : 'properties'}`;`
- **Suggestion**: Extract nested ternary to if-else or separate variables

### AZe6knhnqTomVwOqf_aP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/tree-view.ts:224
- **Current Code**: `      version: property.latestVersion || property.version,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_55
- **Message**: Member 'auth' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:62
- **Current Code**: `  private auth: EdgeGridAuth;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_56
- **Message**: Member 'multiProgress' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:63
- **Current Code**: `  private multiProgress: MultiProgress;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_58
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:74
- **Current Code**: `    this.contractId = contractId || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_59
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:75
- **Current Code**: `    this.groupId = groupId || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_5-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:124
- **Current Code**: `      const versionNumber = parseInt(versionLink.split('/').pop() || '0');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6A
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:287
- **Current Code**: `        domainSuffix: options.domainSuffix || 'edgesuite.net',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6B
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:288
- **Current Code**: `        ipVersionBehavior: options.ipVersionBehavior || 'IPV4',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6C
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:289
- **Current Code**: `        secureNetwork: options.secureNetwork || 'STANDARD_TLS',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6E
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:560
- **Current Code**: `    return response.etag || response.headers?.etag || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6F
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:560
- **Current Code**: `    return response.etag || response.headers?.etag || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6G
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:641
- **Current Code**: `        hostname: options.originHostname || 'origin.example.com',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6H
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:642
- **Current Code**: `        forwardHostHeader: options.forwardHostHeader || 'REQUEST_HOST_HEADER',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6I
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:646
- **Current Code**: `        httpPort: options.httpPort || 80,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6J
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:647
- **Current Code**: `        httpsPort: options.httpsPort || 443,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6K
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:682
- **Current Code**: `                ttl: options.staticTtl || '7d',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6M
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:882
- **Current Code**: `          productId: options.productId || 'prd_Web_Accel',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6N
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:886
- **Current Code**: `      propertyId = createResponse.propertyLink.split('/').pop() || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2nqTomVwOqf_6P
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cdn-provisioning.agent.ts:891
- **Current Code**: `        options.productId || 'prd_Web_Accel',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2cqTomVwOqf_5u
- **Message**: Member 'projectRoot' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cleanup-agent.ts:60
- **Current Code**: `  private projectRoot: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2cqTomVwOqf_5v
- **Message**: Member 'oldDir' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cleanup-agent.ts:61
- **Current Code**: `  private oldDir: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2cqTomVwOqf_5w
- **Message**: Member 'dryRun' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cleanup-agent.ts:62
- **Current Code**: `  private dryRun: boolean;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2cqTomVwOqf_5x
- **Message**: Member 'interactive' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cleanup-agent.ts:63
- **Current Code**: `  private interactive: boolean;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2cqTomVwOqf_5y
- **Message**: Member 'backupPath' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cleanup-agent.ts:64
- **Current Code**: `  private backupPath: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2cqTomVwOqf_5z
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cleanup-agent.ts:129
- **Current Code**: `    this.projectRoot = options.projectRoot || process.cwd();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2cqTomVwOqf_50
- **Message**: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cleanup-agent.ts:265
- **Current Code**: `  private categorizeFile(file: FileInfo): {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2cqTomVwOqf_51
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cleanup-agent.ts:400
- **Current Code**: `    if (!this.rl) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2cqTomVwOqf_53
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cleanup-agent.ts:566
- **Current Code**: `    dryRun: args.includes('--dry-run') || args.includes('-d'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2cqTomVwOqf_54
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cleanup-agent.ts:567
- **Current Code**: `    interactive: args.includes('--interactive') || args.includes('-i'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4m
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:11
- **Current Code**: `  certificateType: 'third-party' | 'default-dv' | 'ev' | 'ov';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4n
- **Message**: Member 'auth' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:103
- **Current Code**: `  private auth: EdgeGridAuth;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4o
- **Message**: Member 'multiProgress' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:104
- **Current Code**: `  private multiProgress: MultiProgress;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4p
- **Message**: Member 'dnsAgent' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:105
- **Current Code**: `  private dnsAgent: any; // Will be injected for DNS operations`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4r
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:168
- **Current Code**: `      const location = response.location || response.headers?.location || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4s
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:168
- **Current Code**: `      const location = response.location || response.headers?.location || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4t
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:169
- **Current Code**: `      const enrollmentId = parseInt(location.split('/').pop() || '0');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4u
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:315
- **Current Code**: `      const location = response.location || response.headers?.location || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4v
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:315
- **Current Code**: `      const location = response.location || response.headers?.location || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4w
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:316
- **Current Code**: `      const deploymentId = parseInt(location.split('/').pop() || '0');`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4x
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:398
- **Current Code**: `        renewalWindow: options.renewalWindow || 30,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_41
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:565
- **Current Code**: `      validationType: type === 'default-dv' ? 'dv' : options.validationType || 'ov',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_42
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:569
- **Current Code**: `        c: options.csr?.c || 'US',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_43
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:570
- **Current Code**: `        st: options.csr?.st || 'MA',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_44
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:571
- **Current Code**: `        l: options.csr?.l || 'Cambridge',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_45
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:572
- **Current Code**: `        o: options.csr?.o || 'Example Corp',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_46
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:576
- **Current Code**: `        geography: options.networkConfiguration?.geography || 'core',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_47
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:577
- **Current Code**: `        secureNetwork: options.networkConfiguration?.secureNetwork || 'enhanced-tls',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_48
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:578
- **Current Code**: `        mustHaveCiphers: options.networkConfiguration?.mustHaveCiphers || 'ak-akamai-default',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_49
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:579
- **Current Code**: `        preferredCiphers: options.networkConfiguration?.preferredCiphers || 'ak-akamai-default',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:582
- **Current Code**: `      signatureAlgorithm: options.signatureAlgorithm || 'SHA-256',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn10qTomVwOqf_4_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/cps-certificate.agent.ts:763
- **Current Code**: `        options.type || 'default-dv',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5c
- **Message**: Member 'auth' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:53
- **Current Code**: `  private auth: EdgeGridAuth;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5d
- **Message**: Member 'multiProgress' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:54
- **Current Code**: `  private multiProgress: MultiProgress;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5e
- **Message**: Member 'changeListCache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:55
- **Current Code**: `  private changeListCache: Map<string, string> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5g
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:204
- **Current Code**: `          acc[r.type] = (acc[r.type] || 0) + 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5h
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:241
- **Current Code**: `    const batchSize = options.batchSize || 100;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5i
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:688
- **Current Code**: `      const location = response.location || response.headers?.location || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5j
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:688
- **Current Code**: `      const location = response.location || response.headers?.location || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5k
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:689
- **Current Code**: `      const newChangeListId = location.split('/').pop() || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2SqTomVwOqf_5l
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:757
- **Current Code**: `      name: r.name === '@' ? r.zone || '@' : r.name,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn2TqTomVwOqf_5t
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/agents/dns-migration.agent.ts:876
- **Current Code**: `    return instructions[registrar.toLowerCase()] || 'Update nameservers at your domain registrar';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1qqTomVwOqf_4g
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/akamai-client.ts:68
- **Current Code**: `      if (!accountSwitchKey) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1qqTomVwOqf_4j
- **Message**: Expected the Promise rejection reason to be an Error.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/akamai-client.ts:212
- **Current Code**: `                reject(handledError);`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1qqTomVwOqf_4k
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/akamai-client.ts:271
- **Current Code**: `        message += `\n- ${err.title}: ${err.detail || ''}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1qqTomVwOqf_4l
- **Message**: Group parts of the regex together to make the intended operator precedence explicit.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/akamai-client.ts:373
- **Current Code**: `            accountSwitchKey = value.replace(/^["']|["']$/g, '');`
- **Suggestion**: Manual review required for this issue type

### AZe6knyWqTomVwOqf_09
- **Message**: Member 'instances' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EdgeGridAuth.ts:129
- **Current Code**: `  private static instances: Map<string, EdgeGridAuth> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knyWqTomVwOqf_1B
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EdgeGridAuth.ts:248
- **Current Code**: `      config.method?.toUpperCase() || 'GET',`
- **Suggestion**: Manual review required for this issue type

### AZe6knyWqTomVwOqf_1C
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/auth/EdgeGridAuth.ts:249
- **Current Code**: `      config.url || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0V
- **Message**: Member 'fastPurgeService' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:72
- **Current Code**: `  private fastPurgeService: FastPurgeService;`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0W
- **Message**: Member 'queueManager' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:73
- **Current Code**: `  private queueManager: PurgeQueueManager;`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0X
- **Message**: Member 'statusTracker' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:74
- **Current Code**: `  private statusTracker: PurgeStatusTracker;`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0Y
- **Message**: Member 'configManager' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:75
- **Current Code**: `  private configManager: CustomerConfigManager;`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0Z
- **Message**: Member 'metrics' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:76
- **Current Code**: `  private metrics: Map<string, FastPurgeMetrics[]> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0a
- **Message**: Unexpected `await` of a non-Promise (non-"Thenable") value.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:168
- **Current Code**: `      const customers = await this.configManager.getCustomers();`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0b
- **Message**: Unexpected `await` of a non-Promise (non-"Thenable") value.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:281
- **Current Code**: `      const customers = await this.configManager.getCustomers();`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0c
- **Message**: Unexpected `await` of a non-Promise (non-"Thenable") value.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:303
- **Current Code**: `      await this.fastPurgeService.getRateLimitStatus(customer);`
- **Suggestion**: Manual review required for this issue type

### AZe6knx1qTomVwOqf_0f
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/monitoring/FastPurgeMonitor.ts:408
- **Current Code**: `        totalOperations: recentMetrics[recentMetrics.length - 1]?.costMetrics.operationsToday || 0,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1iqTomVwOqf_4U
- **Message**: Member 'options: OrchestrationOptions' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/orchestration/index.ts:24
- **Current Code**: `  constructor(private options: OrchestrationOptions = {}) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn1iqTomVwOqf_4b
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/orchestration/index.ts:313
- **Current Code**: `            const targetZone = zone.target || zone.source;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_f2
- **Message**: Member 'server' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:80
- **Current Code**: `    log('INFO', '[EMOJI] ALECS Certificates Server starting...');`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_f3
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:81
- **Current Code**: `    log('INFO', 'Node version:', { version: process.version });`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_f4
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:665
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_f5
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:668
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_f6
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:671
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_f7
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:674
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_f8
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:677
- **Current Code**: `          case 'download-csr':`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gC
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:699
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gD
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:702
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gE
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:705
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gF
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:708
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gG
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:711
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gH
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:714
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gI
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:717
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gJ
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:720
- **Current Code**: `          case 'generate-domain-validation-challenges':`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gK
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:725
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gL
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:728
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gM
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:733
- **Current Code**: `          case 'associate-certificate-with-edge-hostname':`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gN
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:736
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gO
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:741
- **Current Code**: `          case 'quick-secure-property-setup':`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gP
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:744
- **Current Code**: `          case 'check-secure-property-status':`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gQ
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:749
- **Current Code**: `            throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gR
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:752
- **Current Code**: `        const duration = Date.now() - startTime;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmpqTomVwOqf_gS
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/certs-server.ts:755
- **Current Code**: `        return result;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fc
- **Message**: Member 'server' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:67
- **Current Code**: `  private client: AkamaiClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fd
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:68
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fe
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:524
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_ff
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:527
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fg
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:530
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fh
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:533
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fi
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:536
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fj
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:539
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fk
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:542
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fl
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:547
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fm
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:550
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fn
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:553
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fo
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:556
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fp
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:559
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fq
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:562
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fr
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:567
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fs
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:570
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_ft
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:573
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fu
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:576
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fv
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:581
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fw
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:584
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fx
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:587
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fy
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:590
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_fz
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:595
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knmeqTomVwOqf_f0
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/dns-server.ts:598
- **Current Code**: `            break;`
- **Suggestion**: Manual review required for this issue type

### AZe6knm1qTomVwOqf_gX
- **Message**: Member 'server' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/property-server.ts:96
- **Current Code**: `  private server: Server;`
- **Suggestion**: Manual review required for this issue type

### AZe6knm1qTomVwOqf_gY
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/property-server.ts:97
- **Current Code**: `  private client: AkamaiClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6knm1qTomVwOqf_gb
- **Message**: Reduce the number of non-empty switch cases from 32 to at most 30.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/property-server.ts:532
- **Current Code**: `        switch (name) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnOqTomVwOqf_gs
- **Message**: Member 'server' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/security-server.ts:57
- **Current Code**: `  private server: Server;`
- **Suggestion**: Manual review required for this issue type

### AZe6knnOqTomVwOqf_gu
- **Message**: This assertion is unnecessary since it does not change the type of the expression.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/security-server.ts:465
- **Current Code**: `        // Args is already typed from the request parameter`
- **Suggestion**: Manual review required for this issue type

### AZe6knnOqTomVwOqf_gw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/security-server.ts:578
- **Current Code**: `              // Extract the uniqueId from the response`
- **Suggestion**: Manual review required for this issue type

### AZe6knnOqTomVwOqf_gx
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/security-server.ts:579
- **Current Code**: `              const responseText = createResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knnOqTomVwOqf_gy
- **Message**: Remove duplicates in this character class.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/security-server.ts:579
- **Current Code**: `              const responseText = createResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knnOqTomVwOqf_gz
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/servers/security-server.ts:580
- **Current Code**: `              const uniqueIdMatch = responseText.match(/ID:\s*([^\s\n]+)/);`
- **Suggestion**: Manual review required for this issue type

### AZe6knzuqTomVwOqf_2P
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/BaseAkamaiClient.ts:460
- **Current Code**: `                type: lastError.details.type || 'EdgeGrid Error',`
- **Suggestion**: Manual review required for this issue type

### AZe6knzuqTomVwOqf_2Q
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/BaseAkamaiClient.ts:461
- **Current Code**: `                title: lastError.details.title || 'Authentication Error',`
- **Suggestion**: Manual review required for this issue type

### AZe6knzuqTomVwOqf_2R
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/BaseAkamaiClient.ts:462
- **Current Code**: `                detail: lastError.details.detail || lastError.message,`
- **Suggestion**: Manual review required for this issue type

### AZe6knzuqTomVwOqf_2T
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/BaseAkamaiClient.ts:469
- **Current Code**: `            lastError.statusCode || 500,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3n
- **Message**: Member 'clients' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:103
- **Current Code**: `  private clients: Map<string, EdgeGridClient> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3o
- **Message**: Member 'resilienceManager' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:104
- **Current Code**: `  private resilienceManager: ResilienceManager;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3p
- **Message**: Member 'rateLimiters' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:105
- **Current Code**: `  private rateLimiters: Map<string, TokenBucket> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3r
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:216
- **Current Code**: `      limit: parseInt(headers?.['x-ratelimit-limit'] || '100'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3s
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:217
- **Current Code**: `      remaining: parseInt(headers?.['x-ratelimit-remaining'] || '0'),`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0zqTomVwOqf_3z
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/FastPurgeService.ts:523
- **Current Code**: `        purgedCount: response.data.purgedCount || 0,`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_1u
- **Message**: Member 'window' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:60
- **Current Code**: `  private window: Map<number, number> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_1v
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:78
- **Current Code**: `    this.window.set(bucket, (this.window.get(bucket) || 0) + count);`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_1w
- **Message**: Member 'fastPurgeService' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:98
- **Current Code**: `  private fastPurgeService: FastPurgeService;`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_1x
- **Message**: Member 'queues' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:99
- **Current Code**: `  private queues: Map<string, QueueItem[]> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_1y
- **Message**: Member 'rateLimiters' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:100
- **Current Code**: `  private rateLimiters: Map<string, SlidingWindowRateLimiter> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_1z
- **Message**: Member 'processing' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:101
- **Current Code**: `  private processing: Map<string, boolean> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_10
- **Message**: Member 'queueDir' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:102
- **Current Code**: `  private queueDir: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_11
- **Message**: Member 'dedupWindow' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:103
- **Current Code**: `  private dedupWindow: Map<string, number> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_12
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:110
- **Current Code**: `    this.queueDir = process.env['QUEUE_PERSISTENCE_DIR'] || '/tmp/alecs-mcp-akamai/purge-queues';`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_14
- **Message**: Refactor this asynchronous operation outside of the constructor.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:111
- **Current Code**: `    this.initializePersistence();`
- **Suggestion**: Manual review required for this issue type

### AZe6knzWqTomVwOqf_15
- **Message**: Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeQueueManager.ts:196
- **Current Code**: `    const sorted = [...objects].sort();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_24
- **Message**: Member 'fastPurgeService' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:86
- **Current Code**: `  private fastPurgeService: FastPurgeService;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_25
- **Message**: Member 'operations' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:87
- **Current Code**: `  private operations: Map<string, PurgeOperation> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_26
- **Message**: Member 'statusDir' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:88
- **Current Code**: `  private statusDir: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_27
- **Message**: Member 'progressCallbacks' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:89
- **Current Code**: `  private progressCallbacks: Map<string, (update: ProgressUpdate) => void> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_28
- **Message**: Member 'pollingIntervals' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:90
- **Current Code**: `  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_29
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:96
- **Current Code**: `    this.statusDir = process.env['STATUS_PERSISTENCE_DIR'] || '/tmp/alecs-mcp-akamai/purge-status';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_2_
- **Message**: Refactor this asynchronous operation outside of the constructor.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:97
- **Current Code**: `    this.initializePersistence();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_3C
- **Message**: '(from: number, length?: number | undefined): string' is deprecated.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:193
- **Current Code**: `    const operationId = `${customer}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_3D
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:249
- **Current Code**: `    const elapsed = Date.now() - (operation.startedAt?.getTime() || Date.now());`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0QqTomVwOqf_3F
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/PurgeStatusTracker.ts:334
- **Current Code**: `      const elapsed = Date.now() - (operation.startedAt?.getTime() || Date.now());`
- **Suggestion**: Manual review required for this issue type

### AZe6knzfqTomVwOqf_1-
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:73
- **Current Code**: `  private client: EdgeGridClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6knzfqTomVwOqf_1_
- **Message**: Member 'performanceMonitor' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:74
- **Current Code**: `  private performanceMonitor: PerformanceMonitor;`
- **Suggestion**: Manual review required for this issue type

### AZe6knzfqTomVwOqf_2A
- **Message**: Member 'alertRules' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:76
- **Current Code**: `  private alertRules: Map<string, AlertRule> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knzfqTomVwOqf_2B
- **Message**: Member 'activeAlerts' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:77
- **Current Code**: `  private activeAlerts: Map<string, AlertEvent> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knzfqTomVwOqf_2C
- **Message**: Member 'metricHistory' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:78
- **Current Code**: `  private metricHistory: Map<string, RealTimeMetric[]> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knzfqTomVwOqf_2D
- **Message**: 'If' statement should not be the only statement in 'else' block
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:450
- **Current Code**: `        if (rule.consecutiveViolations > 0) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knzfqTomVwOqf_2E
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:548
- **Current Code**: `    return response.data.value || 0;`
- **Suggestion**: Manual review required for this issue type

### AZe6knzfqTomVwOqf_2F
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:718
- **Current Code**: `    return units[metric] || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knzfqTomVwOqf_2H
- **Message**: '(from: number, length?: number | undefined): string' is deprecated.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:722
- **Current Code**: `    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knzfqTomVwOqf_2J
- **Message**: '(from: number, length?: number | undefined): string' is deprecated.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/RealTimeMonitoringService.ts:726
- **Current Code**: `    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knzNqTomVwOqf_1o
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/ReportingService.ts:113
- **Current Code**: `  private client: EdgeGridClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6knzNqTomVwOqf_1p
- **Message**: Member 'performanceMonitor' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/ReportingService.ts:114
- **Current Code**: `  private performanceMonitor: PerformanceMonitor;`
- **Suggestion**: Manual review required for this issue type

### AZe6knzNqTomVwOqf_1s
- **Message**: '(from: number, length?: number | undefined): string' is deprecated.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/ReportingService.ts:717
- **Current Code**: `    return `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knzNqTomVwOqf_1t
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/ReportingService.ts:731
- **Current Code**: `    return contentTypes[format] || 'application/octet-stream';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0iqTomVwOqf_3V
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/TrafficAnalyticsService.ts:114
- **Current Code**: `  private client: EdgeGridClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0iqTomVwOqf_3W
- **Message**: Member 'performanceMonitor' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/TrafficAnalyticsService.ts:115
- **Current Code**: `  private performanceMonitor: PerformanceMonitor;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0iqTomVwOqf_3X
- **Message**: Move this array "sort" operation to a separate statement or replace it with "toSorted".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/TrafficAnalyticsService.ts:154
- **Current Code**: `      const topConsumers = hostnameBreakdown`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2X
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:67
- **Current Code**: `  private client: AkamaiClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2Y
- **Message**: Member 'activeDeployments' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:68
- **Current Code**: `  private activeDeployments: Map<number, DeploymentState> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2Z
- **Message**: Member 'propertyStates' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:69
- **Current Code**: `  private propertyStates: Map<string, PropertyLinkState> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2a
- **Message**: Member 'deploymentMonitors' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:70
- **Current Code**: `  private deploymentMonitors: Map<number, NodeJS.Timeout> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2m
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:417
- **Current Code**: `        method: 'GET',`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2n
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:493
- **Current Code**: `  private mapDeploymentStatus(apiStatus: string): DeploymentState['status'] {`
- **Suggestion**: Manual review required for this issue type

### AZe6knz3qTomVwOqf_2p
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-deployment-coordinator.ts:547
- **Current Code**: `        for (const [propertyId, state] of Array.from(this.propertyStates)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3a
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:78
- **Current Code**: `  private client: AkamaiClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3b
- **Message**: Member 'config' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:79
- **Current Code**: `  private config: CertificateEnrollmentConfig;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3c
- **Message**: Member 'performanceMonitor' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:80
- **Current Code**: `  private performanceMonitor: PerformanceMonitor;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3d
- **Message**: Member 'activeEnrollments' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:81
- **Current Code**: `  private activeEnrollments: Map<number, EnrollmentState> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3e
- **Message**: Member 'workflowEvents' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:82
- **Current Code**: `  private workflowEvents: WorkflowEvent[] = [];`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3f
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:178
- **Current Code**: `          args.targetNetwork || 'production',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3g
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:288
- **Current Code**: `        ? statusResponse.content[0]?.text || ''`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3i
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:352
- **Current Code**: `          ? challengesResponse.content[0]?.text || ''`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3j
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:418
- **Current Code**: `          quicEnabled: args.quicEnabled || false,`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3l
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:470
- **Current Code**: `          ? recordsResult.content[0]?.text || ''`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0rqTomVwOqf_3m
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-enrollment-service.ts:526
- **Current Code**: `        ? monitorResult.content[0]?.text || ''`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0YqTomVwOqf_3O
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-validation-monitor.ts:65
- **Current Code**: `  private client: AkamaiClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0YqTomVwOqf_3P
- **Message**: Member 'monitors' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-validation-monitor.ts:66
- **Current Code**: `  private monitors: Map<number, NodeJS.Timeout> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0YqTomVwOqf_3Q
- **Message**: Member 'validationStates' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-validation-monitor.ts:67
- **Current Code**: `  private validationStates: Map<number, Map<string, DomainValidation>> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0YqTomVwOqf_3R
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-validation-monitor.ts:171
- **Current Code**: `      const answers = data.Answer || [];`
- **Suggestion**: Manual review required for this issue type

### AZe6kn0YqTomVwOqf_3U
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/services/certificate-validation-monitor.ts:300
- **Current Code**: `          domainState.error = domain.validationDetails?.error || 'Validation failed';`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3CqTomVwOqf_6q
- **Message**: Refactor this function to reduce its Cognitive Complexity from 37 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/property-templates.ts:902
- **Current Code**: `export function validateTemplateInputs(`
- **Suggestion**: Manual review required for this issue type

### AZe6kn3CqTomVwOqf_6u
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/property-templates.ts:974
- **Current Code**: `        return inputs[expression.trim()] || match;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn24qTomVwOqf_6h
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/template-engine.ts:119
- **Current Code**: `      inputs[input.key] = input.placeholder || `example-${input.key}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6kn24qTomVwOqf_6j
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/template-engine.ts:168
- **Current Code**: `    cpCode: cpCode || 'GENERATED_CP_CODE',`
- **Suggestion**: Manual review required for this issue type

### AZe6kn24qTomVwOqf_6k
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/template-engine.ts:212
- **Current Code**: `      notifyEmails: [inputs.notificationEmail || 'devops@example.com'],`
- **Suggestion**: Manual review required for this issue type

### AZe6kn24qTomVwOqf_6l
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/template-engine.ts:217
- **Current Code**: `      notifyEmails: [inputs.notificationEmail || 'devops@example.com'],`
- **Suggestion**: Manual review required for this issue type

### AZe6kn24qTomVwOqf_6m
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/templates/template-engine.ts:227
- **Current Code**: `      productId: productId || 'prd_Web_Accel',`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1J
- **Message**: Member 'suites' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:52
- **Current Code**: `  private suites: Map<string, TestSuite> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1K
- **Message**: Member 'validationRules' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:53
- **Current Code**: `  private validationRules: Map<string, ValidationRule> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1M
- **Message**: '(from: number, length?: number | undefined): string' is deprecated.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:71
- **Current Code**: `    const testId = `${scenario.category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1P
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:239
- **Current Code**: `      report += `### ${category?.toUpperCase() || 'UNKNOWN'} Tests\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1Q
- **Message**: Member 'scenario' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:356
- **Current Code**: `  private scenario: Partial<TestScenario> = {};`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1R
- **Message**: Use `this` type instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:358
- **Current Code**: `  name(name: string): TestScenarioBuilder {`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1S
- **Message**: Use `this` type instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:363
- **Current Code**: `  description(description: string): TestScenarioBuilder {`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1U
- **Message**: Use `this` type instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:373
- **Current Code**: `  priority(priority: TestScenario['priority']): TestScenarioBuilder {`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1V
- **Message**: Use `this` type instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:378
- **Current Code**: `  prerequisites(prerequisites: string[]): TestScenarioBuilder {`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1W
- **Message**: Use `this` type instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:383
- **Current Code**: `  tags(tags: string[]): TestScenarioBuilder {`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1X
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:395
- **Current Code**: `      description: this.scenario.description || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1Y
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:397
- **Current Code**: `      priority: this.scenario.priority || 'medium',`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1Z
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:414
- **Current Code**: `  private client: AkamaiClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6knytqTomVwOqf_1a
- **Message**: Member 'client' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/integration-test-framework.ts:474
- **Current Code**: `  private client: AkamaiClient;`
- **Suggestion**: Manual review required for this issue type

### AZe6kny8qTomVwOqf_1d
- **Message**: Member 'suites' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/test-suites.ts:347
- **Current Code**: `  private suites: Map<string, TestSuite> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6kny8qTomVwOqf_1f
- **Message**: '(from: number, length?: number | undefined): string' is deprecated.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/test-suites.ts:407
- **Current Code**: `    const random = Math.random().toString(36).substr(2, 5);`
- **Suggestion**: Manual review required for this issue type

### AZe6kny8qTomVwOqf_1h
- **Message**: '(from: number, length?: number | undefined): string' is deprecated.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/test-suites.ts:413
- **Current Code**: `    const random = Math.random().toString(36).substr(2, 5);`
- **Suggestion**: Manual review required for this issue type

### AZe6kny8qTomVwOqf_1j
- **Message**: '(from: number, length?: number | undefined): string' is deprecated.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/testing/test-suites.ts:419
- **Current Code**: `    const random = Math.random().toString(36).substr(2, 5);`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_tp
- **Message**: Member 'operations' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:95
- **Current Code**: `  private operations: Map<string, BulkOperation> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_tq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:244
- **Current Code**: `            productId: args.productId || sourceProperty.productId,`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_tr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:246
- **Current Code**: `            ruleFormat: args.ruleFormat || sourceProperty.ruleFormat,`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_tt
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:284
- **Current Code**: `              network: args.network || 'STAGING',`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_tu
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:477
- **Current Code**: `            note: args.note || `Bulk activation - ${new Date().toISOString()}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_tv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:488
- **Current Code**: `          const maxWait = args.maxWaitTime || 300000; // 5 minutes default`
- **Suggestion**: Manual review required for this issue type

### AZe6knt9qTomVwOqf_t2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/bulk-operations-manager.ts:1104
- **Current Code**: `      const propName = propResults[0]?.propertyName || 'Unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_tb
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:147
- **Current Code**: `      const network = dep.primaryCertificate?.network || dep.targetEnvironment || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_tc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:147
- **Current Code**: `      const network = dep.primaryCertificate?.network || dep.targetEnvironment || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_tf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:170
- **Current Code**: `        text += `### ${statusEmoji} Deployment ${dep.deploymentId || 'Current'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_tg
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:240
- **Current Code**: `      ? statusResponse.content[0]?.text || ''`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_th
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:280
- **Current Code**: `        ? validationResult.content[0]?.text || ''`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_ti
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:294
- **Current Code**: `        ? deployResult.content[0]?.text || ''`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_tj
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:464
- **Current Code**: `      const domain = entry.domain || 'unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6kntwqTomVwOqf_to
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/certificate-enrollment-tools.ts:491
- **Current Code**: `        text += `### ${statusEmoji} ${entry.validationMethod || 'dns-01'} - ${entry.status}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:68
- **Current Code**: `      const contract = cpcode.contractIds?.[0] || 'Unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:90
- **Current Code**: `      );`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:180
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:182
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:216
- **Current Code**: `    text += '### Assign to Property Rule\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yd
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:319
- **Current Code**: `          }`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_ye
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:339
- **Current Code**: `      queryParams: {`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:362
- **Current Code**: `    text += '## CP Code Details\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yg
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:455
- **Current Code**: `        ],`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yh
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:457
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yi
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:479
- **Current Code**: `    text += `Found ${matchingCpcodes.length} CP Code(s) matching "${args.searchTerm}":\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knv2qTomVwOqf_yj
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cpcode-tools.ts:480
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_g3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:46
- **Current Code**: `      ? challengesResponse.content[0]?.text || ''`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_g4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:55
- **Current Code**: `      ? challengesResponse.content[0]?.text || ''`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_g8
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:217
- **Current Code**: `      const nameMatch = line.match(/Record Name:\s+`([^`]+)`/);`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_g9
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:218
- **Current Code**: `      if (nameMatch && nameMatch[1]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_g-
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:222
- **Current Code**: `      const valueMatch = line.match(/Record Value:\s+`([^`]+)`/);`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_g_
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:223
- **Current Code**: `      if (valueMatch && valueMatch[1]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_hB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:267
- **Current Code**: `  const maxWait = (args.maxWaitMinutes || 30) * 60 * 1000; // Convert to milliseconds`
- **Suggestion**: Manual review required for this issue type

### AZe6knnWqTomVwOqf_hC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-dns-integration.ts:268
- **Current Code**: `  const checkInterval = (args.checkIntervalSeconds || 30) * 1000;`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_um
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:659
- **Current Code**: `      }`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_un
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:659
- **Current Code**: `      }`
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_uo
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:683
- **Suggestion**: Manual review required for this issue type

### AZe6knufqTomVwOqf_up
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/cps-tools.ts:733
- **Current Code**: `      throw new Error('Property not found');`
- **Suggestion**: Manual review required for this issue type

### AZe6kntUqTomVwOqf_si
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/debug-secure-onboarding.ts:172
- **Current Code**: `        const propMatch = createPropResult.content[0].text.match(/Property ID:\*\* (\w+)/);`
- **Suggestion**: Manual review required for this issue type

### AZe6kntUqTomVwOqf_sj
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/debug-secure-onboarding.ts:182
- **Current Code**: `        text += `Response: ${createPropResult.content[0]?.text || 'No response'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:113
- **Current Code**: `      comment: args.comment || `Imported from ${args.masterServer} via AXFR`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:316
- **Current Code**: `                error: validation.error || 'Validation failed',`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:359
- **Current Code**: `          comment: args.comment || `Bulk import of ${successCount} records`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:373
- **Current Code**: `    text += `- **Request ID:** ${submitResponse.requestId || submitResponse.changeListId || 'N/A'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:373
- **Current Code**: `    text += `- **Request ID:** ${submitResponse.requestId || submitResponse.changeListId || 'N/A'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:457
- **Current Code**: `        comment: args.comment || 'Converted from secondary to primary zone',`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kb
- **Message**: Group parts of the regex together to make the intended operator precedence explicit.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:727
- **Current Code**: `          akamaiRecord.rdata = [cfRecord.content.replace(/^"|"$/g, '')];`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_kd
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:816
- **Current Code**: `      const ttlMatch = cleanLine.match(/\$TTL\s+(\d+)/);`
- **Suggestion**: Manual review required for this issue type

### AZe6knpkqTomVwOqf_ke
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-migration-tools.ts:817
- **Current Code**: `      if (ttlMatch && ttlMatch[1]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hk
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:811
- **Current Code**: `            comment: comment || `Submitting pending changes for ${zone}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hm
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:880
- **Current Code**: `      throw lastError || new Error('Failed to submit changelist after retries');`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hn
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:914
- **Current Code**: `      recordCount: changelist.recordSets?.length || 0,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1023
- **Current Code**: `  throw lastError || new Error('Failed to discard changelist after retries');`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_hw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1308
- **Current Code**: `      recordCount: existingChangeList.recordSets?.length || 0,`
- **Suggestion**: Manual review required for this issue type

### AZe6knnxqTomVwOqf_h2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/dns-tools.ts:1767
- **Current Code**: `    const changeCount = changelist.recordSets?.length || 0;`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_sn
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:38
- **Current Code**: `  const docsPath = args.docsPath || 'docs';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_so
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:39
- **Current Code**: `  const outputPath = args.outputPath || path.join(docsPath, 'index.json');`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_sp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:115
- **Current Code**: `  const toolsPath = args.toolsPath || 'src/tools';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_sq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:116
- **Current Code**: `  const outputPath = args.outputPath || 'docs/api-reference.md';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_sr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:117
- **Current Code**: `  const outputFormat = args.format || 'markdown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_su
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:181
- **Current Code**: `  const depth = args.analysisDepth || 'detailed';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_sv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:183
- **Current Code**: `  const outputPath = args.outputPath || `docs/features/${args.feature}.md`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_sw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:333
- **Current Code**: `- Examples added: ${args.updates.examples?.length || 0}`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_sy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:357
- **Current Code**: `  const outputPath = args.outputPath || 'CHANGELOG.md';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_sz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:461
- **Current Code**: `  const outputPath = args.outputPath || `docs/knowledge-base/${args.category}/${slug}.md`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:507
- **Current Code**: `- Tags: ${args.tags?.join(', ') || 'none'}`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s1
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:522
- **Current Code**: `  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:536
- **Current Code**: `      title: metadata.title || getTitleFromFilename(filename),`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:537
- **Current Code**: `      description: metadata.description || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:538
- **Current Code**: `      category: metadata.category || getCategoryFromFilename(filename),`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:540
- **Current Code**: `      lastUpdated: metadata.lastUpdated || new Date().toISOString(),`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s7
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:546
- **Current Code**: `  const titleMatch = content.match(/^# (.+)$/m);`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:548
- **Current Code**: `    title: titleMatch?.[1] || getTitleFromFilename(filename),`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s9
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:628
- **Current Code**: `    const jsdocMatch = match[0].match(/\/\*\*([\s\S]*?)\*\//);`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:631
- **Current Code**: `      const jsdoc = jsdocMatch[1] || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_s_
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:632
- **Current Code**: `      const description = jsdoc.match(/\* (.+)$/m)?.[1] || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_tA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:632
- **Current Code**: `      const description = jsdoc.match(/\* (.+)$/m)?.[1] || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_tB
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:648
- **Current Code**: `  const paramMatch = functionDef.match(/\(([^)]*)\)/);`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_tD
- **Message**: Prefer using an optional chain expression instead, as it's more concise and easier to read.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:650
- **Current Code**: `  if (paramMatch && paramMatch[1]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_tE
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:670
- **Current Code**: `  const returnMatch = jsdoc.match(/@returns?\s+(.+)$/m);`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_tG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:671
- **Current Code**: `  return returnMatch?.[1]?.trim() || 'Promise<MCPToolResponse>';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_tH
- **Message**: Use the "RegExp.exec()" method instead.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:757
- **Current Code**: `  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_tI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:760
- **Current Code**: `    let frontmatter = frontmatterMatch[1] || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_tJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:803
- **Current Code**: `    const category = change.type || 'other';`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_tK
- **Message**: 'If' statement should not be the only statement in 'else' block
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:807
- **Current Code**: `      if (grouped['other']) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knteqTomVwOqf_tM
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/documentation-tools.ts:862
- **Current Code**: `    if (!index.articles) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wn
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:17
- **Current Code**: `  ipVersion: 'IPV4' | 'IPV6' | 'IPV4_IPV6';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wo
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:122
- **Current Code**: `        contractId = contractId || property.contractId;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:123
- **Current Code**: `        groupId = groupId || property.groupId;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:124
- **Current Code**: `        productId = productId || property.productId;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_ws
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:134
- **Current Code**: `    const ipVersion = args.ipVersion || 'IPV4_IPV6'; // Default to dual-stack`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wt
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:154
- **Current Code**: `        contractId: contractId || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wu
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:155
- **Current Code**: `        groupId: groupId || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:159
- **Current Code**: `        productId: productId || 'prd_Ion',`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_ww
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:189
- **Current Code**: `    responseText += `- **Product:** ${productId || 'prd_Ion'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wx
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:280
- **Current Code**: `            productId: args.productId || 'prd_Ion',`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_wy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:285
- **Current Code**: `            ipVersionBehavior: args.ipVersion || 'IPV4_IPV6',`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:454
- **Current Code**: `    responseText += `## ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w2
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:454
- **Current Code**: `    responseText += `## ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w3
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:458
- **Current Code**: `    responseText += `- **Domain:** ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w4
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:458
- **Current Code**: `    responseText += `- **Domain:** ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:459
- **Current Code**: `    responseText += `- **Product:** ${eh.productId || 'Unknown'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:461
- **Current Code**: `    responseText += `- **IP Version:** ${eh.ipVersionBehavior || 'IPV4'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:462
- **Current Code**: `    responseText += `- **Status:** ${eh.status || 'Active'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:463
- **Current Code**: `    responseText += `- **Network:** ${eh.secureNetwork || 'Standard'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:467
- **Current Code**: `      responseText += `- **Serial Number:** ${eh.mapDetails.serialNumber || 'N/A'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:468
- **Current Code**: `      responseText += `- **Slot Number:** ${eh.mapDetails.slotNumber || 'N/A'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_w_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:469
- **Current Code**: `      responseText += `- **Map Algorithm Version:** ${eh.mapDetails.mapAlgorithmVersion || 'N/A'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:475
- **Current Code**: `      responseText += `- **Certificate Status:** ${eh.certStatus || 'Unknown'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:491
- **Current Code**: `        contractId: args.contractId || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:492
- **Current Code**: `        groupId: args.groupId || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:531
- **Current Code**: `    responseText += `www.example.com  CNAME  ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xE
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:531
- **Current Code**: `    responseText += `www.example.com  CNAME  ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:610
- **Current Code**: `    responseText += `**Purpose:** ${args.purpose || 'mixed'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:611
- **Current Code**: `    responseText += `**Security Requirement:** ${args.securityRequirement || 'enhanced'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:612
- **Current Code**: `    responseText += `**Performance Requirement:** ${args.performanceRequirement || 'optimized'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:613
- **Current Code**: `    responseText += `**Geographic Scope:** ${args.geographicScope || 'global'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:670
- **Current Code**: `        acc[rec.certificateStrategy] = (acc[rec.certificateStrategy] || 0) + 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:758
- **Current Code**: `    const edgeHostnameDomain = eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:785
- **Current Code**: `      responseText += `- **Status:** ${eh.certStatus || 'Unknown'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:843
- **Current Code**: `    responseText += `${args.hostname || 'your-hostname.com'}  CNAME  ${edgeHostnameDomain}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:914
- **Current Code**: `    const edgeHostnameDomain = eh?.edgeHostnameDomain || 'Unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvWqTomVwOqf_xV
- **Message**: Review this redundant assignment: "ipVersion" already holds the assigned value along all execution paths.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/edge-hostname-management.ts:1048
- **Current Code**: `    ipVersion = 'IPV4_IPV6';`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:62
- **Current Code**: `    operationId: operation.id || operation.purgeId,`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:63
- **Current Code**: `    message: operation.detail || 'FastPurge operation initiated successfully',`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:64
- **Current Code**: `    estimatedCompletionTime: estimatedTime || operation.estimatedSeconds || 5,`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:64
- **Current Code**: `    estimatedCompletionTime: estimatedTime || operation.estimatedSeconds || 5,`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:67
- **Current Code**: `    totalObjects: operation.purgedCount || operation.totalObjects,`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_na
- **Message**: Unexpected `await` of a non-Promise (non-"Thenable") value.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:133
- **Current Code**: `      const customers = await configManager.getCustomers();`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nb
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:156
- **Current Code**: `          network: params.network || 'staging',`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:164
- **Current Code**: `          message: `${params.urls.length} URLs queued for purge on ${params.network || 'staging'}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:178
- **Current Code**: `          params.network || 'staging',`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_ne
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:186
- **Current Code**: `          params.network || 'staging',`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nf
- **Message**: Unexpected `await` of a non-Promise (non-"Thenable") value.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:253
- **Current Code**: `      const customers = await configManager.getCustomers();`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_ng
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:273
- **Current Code**: `            network: params.network || 'staging',`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nh
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:285
- **Current Code**: `        params.network || 'staging',`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_ni
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:293
- **Current Code**: `        params.network || 'staging',`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nj
- **Message**: Unexpected `await` of a non-Promise (non-"Thenable") value.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:357
- **Current Code**: `      const customers = await configManager.getCustomers();`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nk
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:371
- **Current Code**: `        params.network || 'staging',`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nl
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:379
- **Current Code**: `        params.network || 'staging',`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nm
- **Message**: Unexpected `await` of a non-Promise (non-"Thenable") value.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:430
- **Current Code**: `      const customers = await configManager.getCustomers();`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_nn
- **Message**: Unexpected `await` of a non-Promise (non-"Thenable") value.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:524
- **Current Code**: `      const customers = await configManager.getCustomers();`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_no
- **Message**: Unexpected `await` of a non-Promise (non-"Thenable") value.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:636
- **Current Code**: `      const customers = await configManager.getCustomers();`
- **Suggestion**: Manual review required for this issue type

### AZe6knrAqTomVwOqf_np
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/fastpurge-tools.ts:666
- **Current Code**: `          network: params.network || 'staging',`
- **Suggestion**: Manual review required for this issue type

### AZe6kntoqTomVwOqf_tP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:98
- **Current Code**: `    responseText += `**Analysis Scope:** ${args.analysisScope || 'all'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6kntoqTomVwOqf_tS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:388
- **Current Code**: `        hostnames.add(hostname.cnameFrom || hostname.hostname);`
- **Suggestion**: Manual review required for this issue type

### AZe6kntoqTomVwOqf_tT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:452
- **Current Code**: `      propertyId: property?.propertyId || 'unknown',`
- **Suggestion**: Manual review required for this issue type

### AZe6kntoqTomVwOqf_tU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:453
- **Current Code**: `      propertyName: property?.propertyName || 'unknown',`
- **Suggestion**: Manual review required for this issue type

### AZe6kntoqTomVwOqf_tX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:475
- **Current Code**: `        const domain = extractDomain(hostname.cnameFrom || hostname.hostname);`
- **Suggestion**: Manual review required for this issue type

### AZe6kntoqTomVwOqf_tY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:495
- **Current Code**: `          hostnames: p.hostnames.map((h: any) => h.cnameFrom || h.hostname),`
- **Suggestion**: Manual review required for this issue type

### AZe6kntoqTomVwOqf_tZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-discovery-engine.ts:691
- **Current Code**: `        if ((h.cnameFrom || h.hostname) === hostname) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_h4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:324
- **Current Code**: `      let suffix = args.preferredSuffix || '.edgekey.net';`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_h5
- **Message**: Review this redundant assignment: "certificateType" already holds the assigned value along all execution paths.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:326
- **Current Code**: `      let certificateType: 'DEFAULT_DV' | 'CPS' | 'THIRD_PARTY' = 'DEFAULT_DV';`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_h6
- **Message**: Review this redundant assignment: "certificateType" already holds the assigned value along all execution paths.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:331
- **Current Code**: `        certificateType = 'DEFAULT_DV';`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_h9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:596
- **Current Code**: `          acc[reason] = (acc[reason] || 0) + 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_h-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:656
- **Current Code**: `    const strategy = args.groupingStrategy || 'auto';`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_h_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:657
- **Current Code**: `    const maxPerProperty = args.maxHostnamesPerProperty || 100;`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:689
- **Current Code**: `        responseText += `- **Current Hostnames:** ${matchingProperty.hostnameCount || 0}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:690
- **Current Code**: `        responseText += `- **Available Capacity:** ${maxPerProperty - (matchingProperty.hostnameCount || 0)}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:850
- **Current Code**: `    responseText += `**Product:** ${args.productId || 'Ion (auto-selected)'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:851
- **Current Code**: `    responseText += `**Security Level:** ${args.securityLevel || 'enhanced'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:907
- **Current Code**: `    responseText += `akamai property create --name "property-name" --product ${args.productId || 'prd_Ion'} --contract ${args.contractId} --group ${args.groupId}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knn-qTomVwOqf_iL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/hostname-management-advanced.ts:1293
- **Current Code**: `      domainCounts[domain] = (domainCounts[domain] || 0) + 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knv_qTomVwOqf_yl
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/includes-tools.ts:59
- **Current Code**: `      const type = include.includeType || 'UNKNOWN';`
- **Suggestion**: Manual review required for this issue type

### AZe6knv_qTomVwOqf_ym
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/includes-tools.ts:60
- **Current Code**: `      if (!groups[type]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knv_qTomVwOqf_yn
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/includes-tools.ts:73
- **Current Code**: `        includeId: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knv_qTomVwOqf_yp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/includes-tools.ts:150
- **Current Code**: `            type: 'text',`
- **Suggestion**: Manual review required for this issue type

### AZe6knv_qTomVwOqf_yq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/includes-tools.ts:336
- **Current Code**: `    responseText += `**Contract:** ${args.contractId}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knv_qTomVwOqf_yr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/includes-tools.ts:445
- **Current Code**: `    includeId: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_pa
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:299
- **Current Code**: `    const count = args.count || 5;`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_pb
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:300
- **Current Code**: `    const prefix = args.prefix || 'test';`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_pc
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:353
- **Current Code**: `      if (!groups[type]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_pd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:453
- **Current Code**: `    if (args.toolName) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_pf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:564
- **Current Code**: `    includeAnalysis?: boolean;`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_pg
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:565
- **Current Code**: `  },`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_ph
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:566
- **Current Code**: `): Promise<MCPToolResponse> {`
- **Suggestion**: Manual review required for this issue type

### AZe6knr0qTomVwOqf_pi
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/integration-testing-tools.ts:567
- **Current Code**: `  try {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrrqTomVwOqf_pR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/performance-tools.ts:243
- **Current Code**: `    const iterations = args.iterations || 5;`
- **Suggestion**: Manual review required for this issue type

### AZe6knrrqTomVwOqf_pT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/performance-tools.ts:382
- **Current Code**: `    operationStats.sort((a, b) => (b?.avgDuration || 0) - (a?.avgDuration || 0));`
- **Suggestion**: Manual review required for this issue type

### AZe6knrrqTomVwOqf_pU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/performance-tools.ts:382
- **Current Code**: `    operationStats.sort((a, b) => (b?.avgDuration || 0) - (a?.avgDuration || 0));`
- **Suggestion**: Manual review required for this issue type

### AZe6knrrqTomVwOqf_pV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/performance-tools.ts:453
- **Current Code**: `    const interval = args.interval || 5000; // 5 seconds`
- **Suggestion**: Manual review required for this issue type

### AZe6knrrqTomVwOqf_pW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/performance-tools.ts:454
- **Current Code**: `    const duration = args.duration || 30000; // 30 seconds`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kk
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:74
- **Current Code**: `      const productId = product.productId || 'Unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kl
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:75
- **Current Code**: `      const productName = product.productName || 'Unnamed Product';`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_km
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:79
- **Current Code**: `      const category = product.category || 'General';`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kn
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:108
- **Current Code**: `    text += `   \`"Create property with product ${bestProduct?.productId || 'prd_fresca'}"\`\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_ko
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:110
- **Current Code**: `    text += `   \`"List use cases for product ${bestProduct?.productId || 'prd_fresca'}"\`\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:112
- **Current Code**: `    text += `   \`"Create CP code with product ${bestProduct?.productId || 'prd_fresca'}"\``;`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:190
- **Current Code**: `    text += `- **Product Name:** ${product.productName || 'Unknown'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knptqTomVwOqf_kr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/product-tools.ts:192
- **Current Code**: `    text += `- **Category:** ${product.category || 'General'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_t-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:136
- **Current Code**: `    const version = args.version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_t9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:136
- **Current Code**: `    const version = args.version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:359
- **Current Code**: `      const validationText = validationResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:380
- **Current Code**: `    const version = args.version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:380
- **Current Code**: `    const version = args.version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:391
- **Current Code**: `            note: args.note || `Activated via MCP on ${new Date().toISOString()}`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:421
- **Current Code**: `    const maxWaitTime = options.maxWaitTime || 1800000; // 30 minutes default`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:777
- **Current Code**: `  const percentComplete = statusPercentages[activation.status] || 0;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:802
- **Current Code**: `      message: statusMessages[activation.status] || activation.status,`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:1011
- **Current Code**: `  const strategy = args.strategy || 'SEQUENTIAL';`
- **Suggestion**: Manual review required for this issue type

### AZe6knuIqTomVwOqf_uM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-activation-advanced.ts:1122
- **Current Code**: `    const version = prop.version || prop.details.latestVersion;`
- **Suggestion**: Manual review required for this issue type

### AZe6knwJqTomVwOqf_yz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-error-handling-tools.ts:225
- **Current Code**: `    responseText += `**Version:** ${args.version}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knwJqTomVwOqf_y0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-error-handling-tools.ts:226
- **Current Code**: `    responseText += `**Contract:** ${args.contractId}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:151
- **Current Code**: `      const hostname = eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:152
- **Current Code**: `      const product = eh.productId || 'Unknown';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xa
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:155
- **Current Code**: `      const serial = eh.mapDetails?.serialNumber || 'N/A';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xb
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:245
- **Current Code**: `    let text = `# Edge Hostname Details: ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xc
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:245
- **Current Code**: `    let text = `# Edge Hostname Details: ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:249
- **Current Code**: `    text += `- **Domain:** ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xe
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:249
- **Current Code**: `    text += `- **Domain:** ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:250
- **Current Code**: `    text += `- **Product:** ${eh.productId || 'Unknown'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xg
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:252
- **Current Code**: `    text += `- **IP Version:** ${eh.ipVersionBehavior || 'IPV4'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xk
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:275
- **Current Code**: `    text += 'Example DNS configuration:\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xl
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:275
- **Current Code**: `    text += 'Example DNS configuration:\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xm
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:335
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xn
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:336
- **Current Code**: `    // Use source property's contract/group if not specified`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:496
- **Current Code**: `): Promise<MCPToolResponse> {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xr
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:529
- **Current Code**: `    `
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xs
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:548
- **Current Code**: `    for (const version of response.versions.items) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xt
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:552
- **Current Code**: `        status = '[EMOJI] Production';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xu
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:631
- **Current Code**: `    const propertyResponse = validateApiResponse(`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:636
- **Current Code**: `    `
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xx
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:638
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:649
- **Current Code**: `    if (version.note) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_xz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:656
- **Current Code**: `    if (property?.productionVersion === versionNum) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_x0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:771
- **Current Code**: `    if (!version) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_x1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:773
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_yH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:914
- **Current Code**: `          content: [`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_yJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:950
- **Current Code**: `    let text = `# Hostnames for Property ${args.propertyId} (v${version})\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvjqTomVwOqf_yK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-advanced-tools.ts:953
- **Current Code**: `    text += '| Hostname | Edge Hostname | Type | Cert Status |\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vo
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:47
- **Current Code**: `      productId = productId || property.productId;`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:50
- **Current Code**: `      const version = args.version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vq
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:50
- **Current Code**: `      const version = args.version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vs
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:89
- **Current Code**: `      name: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vu
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:101
- **Current Code**: `        acc[category] = [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:188
- **Current Code**: `        return {`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vx
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:191
- **Current Code**: `              type: 'text',`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_vy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:191
- **Current Code**: `              type: 'text',`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:230
- **Current Code**: `      };`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v2
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:242
- **Current Code**: `      description?: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:329
- **Current Code**: `  try {`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v6
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:329
- **Current Code**: `  try {`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_v7
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:443
- **Current Code**: `    }`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_wA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:557
- **Current Code**: `        text += '## Matching Properties\n\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_wC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:600
- **Current Code**: `    text += '- View property details: `"Get property [propertyId]"`\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_wF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:755
- **Current Code**: `    endDate?: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_wG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:763
- **Suggestion**: Manual review required for this issue type

### AZe6knu-qTomVwOqf_wH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-rules-tools.ts:764
- **Current Code**: `    const response = await client.request({`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_nx
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:362
- **Current Code**: `    // Format rules for display`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_ny
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:375
- **Current Code**: `            output += `: ${JSON.stringify(c.options, null, 2).replace(/\n/g, `\n${indent}    `)}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_nz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:377
- **Current Code**: `          output += '\n';`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_n0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:379
- **Current Code**: `      }`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_n1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:379
- **Current Code**: `      }`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_n2
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:381
- **Current Code**: `      if (rule.behaviors?.length > 0) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_n8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:627
- **Current Code**: `    ipVersion?: 'IPV4' | 'IPV6' | 'IPV4_IPV6';`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_n9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:628
- **Current Code**: `    certificateEnrollmentId?: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_n-
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:650
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oC
- **Message**: This conditional operation returns the same value whether the condition is "true" or "false".
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:773
- **Current Code**: `      if (!typedResponse.properties?.items?.[0]) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oF
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:985
- **Current Code**: ` * - Enabled by default for faster deployments`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oG
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:985
- **Current Code**: ` * - Enabled by default for faster deployments`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oe
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1675
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oh
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1749
- **Current Code**: `        client.request({`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_ok
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1801
- **Current Code**: `          changes: hostnamesDiff.length,`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_ol
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:1802
- **Current Code**: `          details: hostnamesDiff,`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_op
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2001
- **Current Code**: `        body: { createFromVersion: latestVersion },`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_ox
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2099
- **Current Code**: `  }`
- **Suggestion**: Manual review required for this issue type

### AZe6knrQqTomVwOqf_oy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-manager-tools.ts:2100
- **Current Code**: `}`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lF
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:81
- **Current Code**: `  type: 'added' | 'removed' | 'modified';`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:201
- **Current Code**: `    const versionA = args.versionA || propA.latestVersion;`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lO
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:202
- **Current Code**: `    const versionB = args.versionB || propB.latestVersion;`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:264
- **Current Code**: `      const hostSetA = new Set(hostnamesA.hostnames?.items?.map((h: any) => h.cnameFrom) || []);`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:265
- **Current Code**: `      const hostSetB = new Set(hostnamesB.hostnames?.items?.map((h: any) => h.cnameFrom) || []);`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:440
- **Current Code**: `        responseText += `Both at v${diff.versionA || 'none'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:442
- **Current Code**: `        responseText += `v${diff.versionA || 'none'} → v${diff.versionB || 'none'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:442
- **Current Code**: `        responseText += `v${diff.versionA || 'none'} → v${diff.versionB || 'none'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:496
- **Current Code**: `    const version = args.version || property.latestVersion;`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:545
- **Current Code**: `    const hostnames = hostnamesResponse.hostnames?.items || [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:775
- **Current Code**: `    const compareVersion = args.compareVersion || property.latestVersion;`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:824
- **Current Code**: `        baselineHostnames.hostnames?.items || [],`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_ld
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:1267
- **Current Code**: `    criteria.name ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_le
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:1268
- **Current Code**: `    criteria.hostname ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:1269
- **Current Code**: `    criteria.edgeHostname ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lg
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:1270
- **Current Code**: `    criteria.contractId ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lh
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:1271
- **Current Code**: `    criteria.groupId ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_li
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:1272
- **Current Code**: `    criteria.productId ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lj
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:1273
- **Current Code**: `    criteria.activationStatus ||`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lk
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:1426
- **Current Code**: `    const count = behaviorCounts.get(b.name) || 0;`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_ll
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:1538
- **Current Code**: `      expectedValue: diff.optionsA || 'Not present',`
- **Suggestion**: Manual review required for this issue type

### AZe6knqFqTomVwOqf_lm
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-operations-advanced.ts:1539
- **Current Code**: `      actualValue: diff.optionsB || 'Not present',`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_mV
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:340
- **Current Code**: `    for (const group of groupsResponse.groups.items) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2101
- **Current Code**: `  };`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2239
- **Current Code**: `  output += `• Hostname: ${config.hostname}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knq1qTomVwOqf_nN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-tools.ts:2301
- **Current Code**: `    output += `${step}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:82
- **Current Code**: `  const compareType = args.compareType || 'all';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:279
- **Current Code**: `        const baseVersion = prop.baseVersion || property.latestVersion;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:390
- **Current Code**: `  const limit = args.limit || 50;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:479
- **Current Code**: `    responseText += `**Production Version:** ${property.productionVersion || 'None'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:480
- **Current Code**: `    responseText += `**Staging Version:** ${property.stagingVersion || 'None'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wS
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:483
- **Current Code**: `      responseText += `**Date Range:** ${args.startDate || 'Beginning'} to ${args.endDate || 'Now'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:483
- **Current Code**: `      responseText += `**Date Range:** ${args.startDate || 'Beginning'} to ${args.endDate || 'Now'}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:644
- **Current Code**: `    const note = args.note || `Rollback from v${currentVersion} to v${args.targetVersion}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wa
- **Message**: Refactor this function to reduce its Cognitive Complexity from 58 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1008
- **Current Code**: `  const compareObjects = (obj1: any, obj2: any, path: string) => {`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wb
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1141
- **Current Code**: `      text += `- ${diff.description || diff.path}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1152
- **Current Code**: `      text += `- ${diff.description || diff.path}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1163
- **Current Code**: `      text += `- ${diff.description || diff.path}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_we
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1188
- **Current Code**: `      const hostname = diff.newValue?.cnameFrom || diff.path.split('/').pop();`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wf
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1189
- **Current Code**: `      const edgeHostname = diff.newValue?.cnameTo || 'N/A';`
- **Suggestion**: Manual review required for this issue type

### AZe6knvLqTomVwOqf_wg
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/property-version-management.ts:1198
- **Current Code**: `      const hostname = diff.oldValue?.cnameFrom || diff.path.split('/').pop();`
- **Suggestion**: Manual review required for this issue type

### AZe6knqeqTomVwOqf_ly
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/reporting-tools.ts:1007
- **Current Code**: `          acc[threshold.metric] = (acc[threshold.metric] || 0) + 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvtqTomVwOqf_yM
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/resilience-tools.ts:308
- **Current Code**: `    const iterations = args.iterations || 5;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvtqTomVwOqf_yN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/resilience-tools.ts:329
- **Current Code**: `    responseText += `- **Total Calls:** ${initialMetrics?.totalCalls || 0}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knvtqTomVwOqf_yO
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/resilience-tools.ts:375
- **Current Code**: `    responseText += `- **Total Calls:** ${finalMetrics?.totalCalls || 0}\n\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_iP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:135
- **Current Code**: `      version = version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_iQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:135
- **Current Code**: `      version = version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_iV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:343
- **Current Code**: `        propertyId: args.propertyId || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_iW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:348
- **Current Code**: `      const validationText = validationResult.content[0]?.text || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_iY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:470
- **Current Code**: `      version = version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_iZ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:470
- **Current Code**: `      version = version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_ia
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:615
- **Current Code**: `      const version = args.version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_ib
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:615
- **Current Code**: `      const version = args.version || property.latestVersion || 1;`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_id
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:1033
- **Current Code**: `        path1: paths1[0] || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knoTqTomVwOqf_ie
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-advanced.ts:1034
- **Current Code**: `        path2: paths2[0] || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knnlqTomVwOqf_hL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-management.ts:841
- **Current Code**: `    const level = args.optimizationLevel || 'standard';`
- **Suggestion**: Manual review required for this issue type

### AZe6knnlqTomVwOqf_hO
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-management.ts:1521
- **Current Code**: `function appendRules(source: any, target: any, result: any): void {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnlqTomVwOqf_hP
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-management.ts:1535
- **Current Code**: `  if (source.behaviors) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knnlqTomVwOqf_ha
- **Message**: Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/rule-tree-management.ts:1800
- **Current Code**: `  // Ensure behaviors array exists`
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:153
- **Current Code**: `  const productId = args.productId || property.productId;`
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uR
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:177
- **Current Code**: `      ipVersionBehavior: args.ipVersion || 'IPV4_IPV6',`
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uU
- **Message**: Remove this commented out code.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:247
- **Current Code**: `// let edgeHostnameId: string;`
- **Suggestion**: Remove commented out code

### AZe6knuSqTomVwOqf_uW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:629
- **Current Code**: `    });`
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:630
- **Suggestion**: Manual review required for this issue type

### AZe6knuSqTomVwOqf_uY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/secure-by-default-onboarding.ts:709
- **Current Code**: `  } catch (_error) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_ip
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:54
- **Current Code**: `    const client = new AkamaiClient(args.customer || 'default');`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_is
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:78
- **Current Code**: `              'Production Version': config.productionVersion || 'None',`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_iu
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:118
- **Current Code**: `    const client = new AkamaiClient(args.customer || 'default');`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_iv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:181
- **Current Code**: `    const client = new AkamaiClient(args.customer || 'default');`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_iw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:250
- **Current Code**: `    const client = new AkamaiClient(args.customer || 'default');`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_iz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:285
- **Current Code**: `              'Event Time': new Date(event.httpMessage?.start || event.timestamp).toLocaleString(),`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_i0
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:339
- **Current Code**: `    const client = new AkamaiClient(args.customer || 'default');`
- **Suggestion**: Manual review required for this issue type

### AZe6knolqTomVwOqf_i1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools-v2.ts:401
- **Current Code**: `    const client = new AkamaiClient(args.customer || 'default');`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kE
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:69
- **Current Code**: `    const client = new AkamaiClient(args.customer || 'default');`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kH
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:92
- **Current Code**: `                'Production Version': config.productionVersion || 'None',`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kJ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:138
- **Current Code**: `    const client = new AkamaiClient(parsed.customer || 'default');`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kK
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:207
- **Current Code**: `    const customer = parsed.customer || 'default';`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kL
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:275
- **Current Code**: `    const customer = parsed.customer || 'default';`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kP
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:354
- **Current Code**: `    const customer = parsed.customer || 'default';`
- **Suggestion**: Manual review required for this issue type

### AZe6knpZqTomVwOqf_kQ
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/appsec-basic-tools.ts:412
- **Current Code**: `    const customer = args.customer || 'default';`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:159
- **Current Code**: `      output += `**Operation:** ${options.operation || 'replace'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jx
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:163
- **Current Code**: `      switch (options.operation || 'replace') {`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jy
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:204
- **Current Code**: `    switch (options.operation || 'replace') {`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_jz
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:227
- **Current Code**: `    output += `**Operation:** ${options.operation || 'replace'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_j4
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:506
- **Current Code**: `    const totalAdded = results.reduce((sum, r) => sum + (r.elementsAdded || 0), 0);`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_j5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:507
- **Current Code**: `    const totalRemoved = results.reduce((sum, r) => sum + (r.elementsRemoved || 0), 0);`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_j8
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:587
- **Current Code**: `    switch (options.operation || 'union') {`
- **Suggestion**: Manual review required for this issue type

### AZe6knpJqTomVwOqf_j9
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-bulk.ts:630
- **Current Code**: `    output += `**Operation:** ${options.operation || 'union'}\n`;`
- **Suggestion**: Manual review required for this issue type

### AZe6kno_qTomVwOqf_jX
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-geo-asn.ts:112
- **Current Code**: `        const countryCode = parts[0] || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kno_qTomVwOqf_jY
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-geo-asn.ts:125
- **Current Code**: `        const countryCode2 = parts2[0] || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6kno_qTomVwOqf_jc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-geo-asn.ts:287
- **Current Code**: `    const purpose = options.purpose || 'security';`
- **Suggestion**: Manual review required for this issue type

### AZe6kno_qTomVwOqf_je
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-geo-asn.ts:402
- **Current Code**: `    const purpose = options.purpose || 'bot-protection';`
- **Suggestion**: Manual review required for this issue type

### AZe6knpRqTomVwOqf_j_
- **Message**: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-integration.ts:70
- **Current Code**: `export async function getSecurityPolicyIntegrationGuidance(`
- **Suggestion**: Manual review required for this issue type

### AZe6knpRqTomVwOqf_kA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-integration.ts:77
- **Current Code**: `  const policyType = options.policyType || 'ACCESS_CONTROL';`
- **Suggestion**: Manual review required for this issue type

### AZe6knpRqTomVwOqf_kB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-integration.ts:78
- **Current Code**: `  const listType = options.listType || 'IP';`
- **Suggestion**: Manual review required for this issue type

### AZe6knpRqTomVwOqf_kC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-integration.ts:200
- **Current Code**: `  const targetNetwork = options.targetNetwork || 'STAGING';`
- **Suggestion**: Manual review required for this issue type

### AZe6knpRqTomVwOqf_kD
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-integration.ts:201
- **Current Code**: `  const securityLevel = options.securityLevel || 'MEDIUM';`
- **Suggestion**: Manual review required for this issue type

### AZe6kno2qTomVwOqf_jN
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/tools/security/network-lists-tools.ts:112
- **Current Code**: `  return typeMap[type] || type;`
- **Suggestion**: Manual review required for this issue type

### AZe6knxWqTomVwOqf_zJ
- **Message**: Replace this union type with a type alias.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/akamai.ts:68
- **Current Code**: `  productionStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING';`
- **Suggestion**: Manual review required for this issue type

### AZe6knxOqTomVwOqf_zF
- **Message**: Member 'middlewares' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/types/middleware.ts:149
- **Current Code**: `  private middlewares: MiddlewareFunction[] = [];`
- **Suggestion**: Manual review required for this issue type

### AZe6knjyqTomVwOqf_cY
- **Message**: Member 'sections' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/customer-config.ts:88
- **Current Code**: `  private sections: Map<string, EdgeRcSection> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knjyqTomVwOqf_cZ
- **Message**: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/customer-config.ts:121
- **Current Code**: `  private loadConfig(): void {`
- **Suggestion**: Manual review required for this issue type

### AZe6knjyqTomVwOqf_ca
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/customer-config.ts:143
- **Current Code**: `        currentSection = sectionMatch[1] || null;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjyqTomVwOqf_cc
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/customer-config.ts:151
- **Current Code**: `        const key = keyValueMatch[1]?.trim() || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjyqTomVwOqf_cd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/customer-config.ts:152
- **Current Code**: `        const value = keyValueMatch[2]?.trim() || '';`
- **Suggestion**: Manual review required for this issue type

### AZe6knhuqTomVwOqf_aQ
- **Message**: Member 'instances' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/edgegrid-client.ts:18
- **Current Code**: `  private static instances: Map<string, EdgeGridClient> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knhuqTomVwOqf_aR
- **Message**: Member 'axiosInstance' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/edgegrid-client.ts:19
- **Current Code**: `  private axiosInstance: AxiosInstance;`
- **Suggestion**: Manual review required for this issue type

### AZe6knhuqTomVwOqf_aS
- **Message**: Member 'config' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/edgegrid-client.ts:20
- **Current Code**: `  private config: EdgeRcSection;`
- **Suggestion**: Manual review required for this issue type

### AZe6knhuqTomVwOqf_aT
- **Message**: Member 'customerName' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/edgegrid-client.ts:21
- **Current Code**: `  private customerName: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knhuqTomVwOqf_aV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/edgegrid-client.ts:59
- **Current Code**: `      config.method?.toUpperCase() || 'GET',`
- **Suggestion**: Manual review required for this issue type

### AZe6knhuqTomVwOqf_aW
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/edgegrid-client.ts:60
- **Current Code**: `      config.url || '',`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_bo
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:65
- **Current Code**: `    const errors = data.errors || [{ detail: data.detail || data.message }];`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_bp
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:65
- **Current Code**: `    const errors = data.errors || [{ detail: data.detail || data.message }];`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_br
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:94
- **Current Code**: `    const message = data.detail || data.message || 'Authentication failed';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_bs
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:94
- **Current Code**: `    const message = data.detail || data.message || 'Authentication failed';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_bu
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:125
- **Current Code**: `    const resource = this.extractResourceType(context?.operation || '');`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_bv
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:126
- **Current Code**: `    const message = data.detail || `${resource} not found`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_bw
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:141
- **Current Code**: `    const message = data.detail || 'Resource already exists';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_bx
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:145
- **Current Code**: `      const resourceId = data.existingResource || data.conflictingResource;`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_by
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:156
- **Current Code**: `    const retryAfter = response.headers?.['retry-after'] || '60';`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_b1
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:244
- **Current Code**: `      message: statusMessages[status] || `HTTP ${status} error`,`
- **Suggestion**: Manual review required for this issue type

### AZe6knjcqTomVwOqf_b5
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/errors.ts:271
- **Current Code**: `    return formatSuggestions[format] || `Check the format of ${field}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dJ
- **Message**: Member 'activeOperations' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:48
- **Current Code**: `  private activeOperations: Map<string, PerformanceMetrics> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dK
- **Message**: Member 'thresholds' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:49
- **Current Code**: `  private thresholds: PerformanceThresholds;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dM
- **Message**: '(from: number, length?: number | undefined): string' is deprecated.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:62
- **Current Code**: `    const operationId = `${operationType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dO
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:201
- **Current Code**: `    return sortedArray[Math.max(0, index)] || 0;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dP
- **Message**: Member 'cache' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:267
- **Current Code**: `  private cache: Map<string, CacheEntry<T>> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dQ
- **Message**: Member 'defaultTtl' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:268
- **Current Code**: `  private defaultTtl: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dR
- **Message**: Member 'maxSize' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:269
- **Current Code**: `  private maxSize: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dS
- **Message**: Member 'performanceMonitor' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:270
- **Current Code**: `  private performanceMonitor?: PerformanceMonitor;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dT
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:277
- **Current Code**: `    this.defaultTtl = options?.defaultTtl || 300000; // 5 minutes`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dU
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:278
- **Current Code**: `    this.maxSize = options?.maxSize || 1000;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dV
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:314
- **Current Code**: `      ttl: ttl || this.defaultTtl,`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dW
- **Message**: Member 'batchQueue' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:401
- **Current Code**: `  private batchQueue: Map<string, any[]> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dX
- **Message**: Member 'batchTimers' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:402
- **Current Code**: `  private batchTimers: Map<string, NodeJS.Timeout> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dY
- **Message**: Member 'maxBatchSize' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:403
- **Current Code**: `  private maxBatchSize: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dZ
- **Message**: Member 'batchTimeoutMs' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:404
- **Current Code**: `  private batchTimeoutMs: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_da
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:407
- **Current Code**: `    this.maxBatchSize = options?.maxBatchSize || 10;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_db
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:408
- **Current Code**: `    this.batchTimeoutMs = options?.batchTimeoutMs || 100;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkOqTomVwOqf_dc
- **Message**: 'If' statement should not be the only statement in 'else' block
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/performance-monitor.ts:430
- **Current Code**: `        if (!this.batchTimers.has(batchKey)) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knkVqTomVwOqf_dd
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/product-mapping.ts:57
- **Current Code**: `  return PRODUCT_NAME_MAP[productId] || productId;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkVqTomVwOqf_de
- **Message**: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
- **Severity**: CRITICAL
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/product-mapping.ts:89
- **Current Code**: `export function selectBestProduct(`
- **Suggestion**: Manual review required for this issue type

### AZe6knkVqTomVwOqf_df
- **Message**: Refactor this code to not use nested template literals.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/product-mapping.ts:162
- **Current Code**: `    return `${friendlyName} (${productId})${productName ? ` - ${productName}` : ''}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_dy
- **Message**: Member 'startTime' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:23
- **Current Code**: `  private startTime: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_dz
- **Message**: Member 'format' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:24
- **Current Code**: `  private format: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d0
- **Message**: Member 'barCompleteChar' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:25
- **Current Code**: `  private barCompleteChar: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d1
- **Message**: Member 'barIncompleteChar' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:26
- **Current Code**: `  private barIncompleteChar: string;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d2
- **Message**: Member 'barWidth' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:27
- **Current Code**: `  private barWidth: number;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d3
- **Message**: Member 'stream' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:28
- **Current Code**: `  private stream: NodeJS.WriteStream;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d4
- **Message**: Member 'clear' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:29
- **Current Code**: `  private clear: boolean;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_d_
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:49
- **Current Code**: `    this.render(update.message || '', update.status);`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eA
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:54
- **Current Code**: `    this.render(message || '');`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eB
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:59
- **Current Code**: `    this.render(message || 'Complete', 'success');`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eC
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:126
- **Current Code**: `    return `${colors[status] || ''}${text}${reset}`;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eD
- **Message**: Member 'frames' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:131
- **Current Code**: `  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eE
- **Message**: Member 'stream' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:134
- **Current Code**: `  private stream: NodeJS.WriteStream;`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eI
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:171
- **Current Code**: `    this.stream.write(`\r[INFO] ${message || this.lastMessage}\n`);`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eJ
- **Message**: Member 'bars' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:184
- **Current Code**: `  private bars: Map<string, ProgressBar> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eK
- **Message**: Member 'spinners' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:185
- **Current Code**: `  private spinners: Map<string, Spinner> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knkrqTomVwOqf_eL
- **Message**: Member 'stream' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/progress.ts:186
- **Current Code**: `  private stream: NodeJS.WriteStream;`
- **Suggestion**: Manual review required for this issue type

### AZe6knlEqTomVwOqf_eb
- **Message**: Member 'operationType: OperationType' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/resilience-manager.ts:132
- **Current Code**: `    private operationType: OperationType,`
- **Suggestion**: Manual review required for this issue type

### AZe6knlEqTomVwOqf_ed
- **Message**: This branch's code block is the same as the block for the branch on line 188.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/resilience-manager.ts:190
- **Current Code**: `    } else if (this.failureCount >= this.config.failureThreshold) {`
- **Suggestion**: Manual review required for this issue type

### AZe6knlEqTomVwOqf_ee
- **Message**: Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
- **Severity**: MINOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/resilience-manager.ts:229
- **Current Code**: `    return sorted[index] || 0;`
- **Suggestion**: Manual review required for this issue type

### AZe6knlEqTomVwOqf_ef
- **Message**: Member 'config: RetryConfig' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/resilience-manager.ts:239
- **Current Code**: `  constructor(private config: RetryConfig) {}`
- **Suggestion**: Manual review required for this issue type

### AZe6knlEqTomVwOqf_eh
- **Message**: Member 'categories' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/resilience-manager.ts:289
- **Current Code**: `  private static categories: Map<string, ErrorCategory> = new Map([`
- **Suggestion**: Manual review required for this issue type

### AZe6knlEqTomVwOqf_ei
- **Message**: Member 'circuitBreakers' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/resilience-manager.ts:474
- **Current Code**: `  private circuitBreakers: Map<OperationType, CircuitBreaker> = new Map();`
- **Suggestion**: Manual review required for this issue type

### AZe6knlEqTomVwOqf_ej
- **Message**: Member 'errorTranslator' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/resilience-manager.ts:482
- **Current Code**: `  private errorTranslator: ErrorTranslator = new ErrorTranslator();`
- **Suggestion**: Manual review required for this issue type

### AZe6knlEqTomVwOqf_ek
- **Message**: Member 'defaultCircuitBreakerConfig' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/resilience-manager.ts:485
- **Current Code**: `  private static defaultCircuitBreakerConfig: CircuitBreakerConfig = {`
- **Suggestion**: Manual review required for this issue type

### AZe6knlEqTomVwOqf_el
- **Message**: Member 'defaultRetryConfig' is never reassigned; mark it as `readonly`.
- **Severity**: MAJOR
- **File**: acedergren_alecs-mcp-server-akamai:src/utils/resilience-manager.ts:492
- **Current Code**: `  private static defaultRetryConfig: RetryConfig = {`
- **Suggestion**: Manual review required for this issue type
