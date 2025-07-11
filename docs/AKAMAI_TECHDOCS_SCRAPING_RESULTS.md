# Akamai TechDocs Scraping Results

## Overview
This document contains the comprehensive findings from scraping Akamai TechDocs to understand API workflows, quirks, and intended usage patterns.

## Key Findings by Domain

### 1. Property Manager (PAPI)

#### Workflow Overview
The Property Manager workflow follows these stages:
1. **Prepare certificates** - Set up SSL/TLS certificates before creating properties
2. **Prepare origin server** - Configure your origin (NetStorage, custom, or third-party)
3. **Create or clone property** - Start with a new property or copy existing
4. **Configure property**:
   - Set up hostnames (edge hostnames)
   - Add origin server configuration
   - Configure rules and behaviors
5. **Activate on staging** - Deploy to test environment (typically 3 minutes)
6. **Test on staging** - Validate configuration
7. **Activate on production** - Deploy to live network (typically 15 minutes)
8. **Update DNS** - Point your domain to Akamai edge hostname

#### Critical Requirements
- **Contract and Group IDs Required**: Most PAPI endpoints require both `contractId` and `groupId` parameters
- **Version Management**: Can't edit active versions - must create new version
- **Rule Formats**: Properties use versioned rule formats for stability
- **Activation Times**:
  - Standard: 15 minutes production, 3 minutes staging
  - First-time or hostname changes: ~1 hour
  - Fast Fallback: Can revert within 1 hour in under a minute

#### Hidden Complexities
1. **Circular Dependency**: Need contractId to get groups, but groups endpoint requires contractId
2. **Default Rules**: Products add default rules and behaviors automatically
3. **Error Rate Monitoring**: Activations auto-cancel if error rates spike
4. **Hostname Buckets**: Optional feature for managing hostnames without version changes

### 2. Edge DNS

#### Zone Management Workflow
1. **Edit zone** - Make changes to zone settings or records
2. **Add to change list** - Changes are queued in a changelist
3. **Review and submit** - Submit the changelist for processing
4. **Propagation** - Zone Transfer Agents (ZTAs) propagate changes

#### Key Insights
- **Changelist Required**: All DNS changes must go through changelist workflow
- **Zone Types**:
  - Primary zones: Full control over records
  - Secondary zones: Slave zones with limited modifications
  - Alias zones: Point to other zones
- **Bulk Editing**: Secondary zones support bulk property changes
- **Direct Updates**: Some secondary zone edits bypass changelist mechanism

### 3. Certificate Provisioning System (CPS)

#### Certificate Workflow (11 Steps)
1. **Collect information** - Organization details, contacts
2. **Create CSR** - CPS generates and stores private key
3. **Submit CSR** - Sent to Certificate Authority
4. **Validate certificate** - CA validates request
5. **Issue certificate** - CA signs certificate
6. **Retrieve certificate** - CPS auto-retrieves and verifies
7. **Deploy to staging** - Test deployment
8. **Test on staging** - Manual testing if enabled
9. **Check deployment date** - Honor scheduled deployments
10. **Deploy to production** - Live deployment
11. **Auto-renewal** - 60 days before expiry (20 for DV)

#### Important Details
- **Validation Types**: DNS or HTTP validation for DV certificates
- **Always Test on Staging**: Optional setting requiring manual approval
- **Auto-deployment**: 7 days before expiry, staging certs auto-push to production
- **Network Selection**: Enhanced TLS recommended over Standard TLS

### 4. Reporting

#### Data Availability
- **Lag Times**:
  - Traffic reports: 2 hours
  - Performance reports: 4 hours
  - Security reports: 30 minutes
- **Dimension Limitations**: Can't group by all dimensions simultaneously
- **Rate Limits**: Stricter for detailed data

### 5. Fast Purge

#### URL Encoding Requirements
- **Partial encoding required**: Encode spaces but not protocol
- **Different rules**: URLs vs CP codes have different encoding
- **Rate limits**: Apply per purge type

## Workflow Abstractions Needed

### 1. Smart Contract/Group Discovery
```typescript
// Problem: Users don't know contract/group IDs
// Solution: Auto-discovery service that:
1. Lists all contracts
2. Searches across all contract/group combinations
3. Caches successful mappings
4. Provides intelligent defaults
```

### 2. DNS Changelist Abstraction
```typescript
// Problem: Complex multi-step changelist workflow
// Solution: Single-command updates that internally:
1. Create changelist automatically
2. Add changes
3. Submit changelist
4. Activate changelist
5. Handle cleanup on error
```

### 3. Certificate Provisioning Wizard
```typescript
// Problem: 11-step process with validation complexity
// Solution: Guided wizard that:
1. Auto-generates CSR
2. Explains validation options
3. Shows exact DNS records needed
4. Monitors validation status
5. Auto-deploys when ready
```

### 4. Property Activation Helper
```typescript
// Problem: Multi-step activation with warnings
// Solution: Smart activation that:
1. Creates new version if needed
2. Validates configuration
3. Auto-fixes common warnings
4. Suggests staging first
5. Monitors progress
```

## Best Practices from Documentation

### General Patterns
1. **Always test on staging first** - Standard practice across all products
2. **Version everything** - Properties, includes, configurations
3. **Use templates** - Products provide optimized default configurations
4. **Monitor activations** - Watch for auto-cancellations due to errors

### API Usage
1. **Batch operations** - Use bulk endpoints when available
2. **Cache lookups** - Contract/group mappings rarely change
3. **Handle async operations** - Poll for completion
4. **Respect rate limits** - Implement exponential backoff

### User Experience
1. **Hide complexity** - Abstract multi-step workflows
2. **Provide defaults** - Use intelligent defaults based on common patterns
3. **Clear error messages** - Translate API errors to actionable guidance
4. **Progress tracking** - Show status for long operations

## Implementation Priorities

### Critical (Week 1)
1. Contract/Group auto-discovery for Property Manager
2. DNS changelist abstraction
3. Property activation guided workflow
4. Error message translation

### Important (Week 2)
1. Certificate provisioning wizard
2. Smart network list creation
3. Reporting data lag handling
4. Bulk operations support

### Nice to Have (Week 3+)
1. Cross-domain workflows (new site deployment)
2. Template library for common configurations
3. Performance optimization suggestions
4. Cost estimation tools

## Conclusion

Akamai's APIs are powerful but complex, with many hidden requirements and multi-step workflows. By implementing the abstractions and improvements outlined above, we can transform these APIs into user-friendly tools that "just work" while maintaining all the power and flexibility of the underlying platform.