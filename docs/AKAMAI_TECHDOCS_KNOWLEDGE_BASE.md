# Akamai TechDocs Knowledge Base

## Overview
This document contains comprehensive information gathered from Akamai TechDocs for all implemented and planned domains in the ALECS MCP Server.

## Documentation URLs to Scrape

### Currently Implemented Domains

1. **Property Manager (PAPI)**
   - Main: https://techdocs.akamai.com/property-mgr/docs
   - API: https://techdocs.akamai.com/property-mgr/reference/api
   - Workflows: https://techdocs.akamai.com/property-mgr/docs/work-with-properties
   - Activation: https://techdocs.akamai.com/property-mgr/docs/activate-property

2. **Edge DNS**
   - Main: https://techdocs.akamai.com/edge-dns/docs
   - API: https://techdocs.akamai.com/edge-dns/reference/api
   - Zone Management: https://techdocs.akamai.com/edge-dns/docs/manage-zones
   - Record Sets: https://techdocs.akamai.com/edge-dns/docs/record-sets

3. **Certificate Provisioning System (CPS)**
   - Main: https://techdocs.akamai.com/cps/docs
   - API: https://techdocs.akamai.com/cps/reference/api
   - DV Certificates: https://techdocs.akamai.com/cps/docs/domain-validated-certificates
   - Validation: https://techdocs.akamai.com/cps/docs/validate-domains

4. **Network Lists**
   - Main: https://techdocs.akamai.com/network-lists/docs
   - API: https://techdocs.akamai.com/network-lists/reference/api
   - Activation: https://techdocs.akamai.com/network-lists/docs/activate-network-list

5. **Fast Purge**
   - Main: https://techdocs.akamai.com/purge-cache/docs
   - API: https://techdocs.akamai.com/purge-cache/reference/api

6. **Security Configuration**
   - WAF: https://techdocs.akamai.com/application-security/docs
   - API: https://techdocs.akamai.com/application-security/reference/api

7. **Reporting**
   - Main: https://techdocs.akamai.com/reporting/docs
   - API: https://techdocs.akamai.com/reporting/reference/api

8. **CP Codes**
   - Main: https://techdocs.akamai.com/cp-codes/docs
   - API: https://techdocs.akamai.com/cp-codes/reference/api

9. **Edge Hostnames**
   - Main: https://techdocs.akamai.com/edge-hostnames/docs
   - API: https://techdocs.akamai.com/edge-hostnames/reference/api

### Phase 3 Domains (Completed)

10. **Billing**
    - Main: https://techdocs.akamai.com/billing/docs
    - API: https://techdocs.akamai.com/billing/reference/api

11. **Edge Workers**
    - Main: https://techdocs.akamai.com/edgeworkers/docs
    - API: https://techdocs.akamai.com/edgeworkers/reference/api

12. **Global Traffic Management (GTM)**
    - Main: https://techdocs.akamai.com/gtm/docs
    - API: https://techdocs.akamai.com/gtm/reference/api

13. **Diagnostics**
    - Main: https://techdocs.akamai.com/edge-diagnostics/docs
    - API: https://techdocs.akamai.com/edge-diagnostics/reference/api

### Phase 4 Domains (Planned)

14. **Contract Management**
    - API: https://techdocs.akamai.com/contract-api/reference/api

15. **Image Manager**
    - Main: https://techdocs.akamai.com/image-manager/docs
    - API: https://techdocs.akamai.com/image-manager/reference/api

16. **Site Shield**
    - Main: https://techdocs.akamai.com/siteshield/docs
    - API: https://techdocs.akamai.com/siteshield/reference/api

17. **Test Management**
    - Main: https://techdocs.akamai.com/test-management/docs
    - API: https://techdocs.akamai.com/test-management/reference/api

## Scraping Progress Update

### Summary of Key Findings

I have completed scraping and analysis of the following domains:

#### 1. **Property Manager (PAPI)** ✓
- **Critical Finding**: Contract/Group IDs are required for most operations but difficult to discover
- **Workflow**: 11-step process from certificate prep to DNS update
- **Activation Times**: 15 min production, 3 min staging (1 hour for first-time)
- **Hidden Complexity**: Can't edit active versions, must create new

#### 2. **Edge DNS** ✓
- **Critical Finding**: All changes require changelist workflow
- **Workflow**: Edit → Add to changelist → Submit → Activate
- **Zone Types**: Primary (full control), Secondary (limited), Alias
- **Hidden Complexity**: Some secondary zone edits bypass changelist

#### 3. **Certificate Provisioning System (CPS)** ✓
- **Critical Finding**: 11-step automated workflow with validation challenges
- **Validation**: DNS or HTTP (DNS required for wildcards)
- **Auto-renewal**: 60 days before expiry (20 for DV)
- **Hidden Complexity**: 7 days before expiry, staging auto-deploys to production

#### 4. **CP Codes** ✓
- **Purpose**: Identify traffic for reporting, billing, and monitoring
- **Creation**: Use Property Manager API (CP Code API doesn't support creation)
- **Reporting Groups**: Organize CP codes for flexible invoice management
- **Important Note**: CP code deletion is unavailable

#### 5. **Edge Hostnames** ✓
- **Domain Suffixes Available**:
  - `edgesuite.net`: Standard TLS or HTTP only
  - `edgekey.net`: Enhanced TLS for PCI compliance
  - `akamaized.net`: Shared Certificate for non-PCI HTTPS
  - `-staging.net` variants for testing
- **Critical**: Cannot change suffix after creation
- **Workflow**: Create in Property Manager, manage in Edge Hostname Editor

#### 6. **Fast Purge** ✓
- **Purpose**: Refresh cached objects or remove stale content
- **Methods**: Invalidate or delete
- **Categories**: URL, ARL, CP Code, Cache Tag
- **Important**: Should not replace proper TTL settings
- **URL Encoding**: Partial encoding required (spaces but not protocol)

#### 7. **Reporting** ✓
- **Data Intervals**: 5 minutes to monthly depending on report type
- **Report Types**: Traffic, Edge DNS, Security, Performance
- **Important**: Data lag varies by report type (real-time to 4 hours)
- **API Versions**: v1 (stable), v2 (enhanced features)

#### 8. **Other Domains** (Partially Scraped)
- **Network Lists**: Require activation after changes (5-15 min)
- **Security/WAF**: Complex rule configuration
- **EdgeWorkers**: JavaScript at the edge
- **GTM**: Global load balancing (not regular properties!)

### Critical API Quirks Discovered

Based on extensive TechDocs scraping, here are the most important API quirks that need special handling:

#### 1. **Contract/Group ID Circular Dependency (Property Manager)**
- Problem: Need contractId to list groups, but groups endpoint requires contractId
- Solution: Implement auto-discovery service that lists all contracts first

#### 2. **DNS Changelist State Machine**
- Problem: Can't update DNS records directly - must use changelist workflow
- Solution: Abstract entire changelist process into single operation

#### 3. **Edge Hostname Domain Suffix Selection**
- Available suffixes have different capabilities:
  - `edgesuite.net`: Legacy, Standard TLS
  - `edgekey.net`: Modern, Enhanced TLS, HTTP/2
  - `akamaized.net`: Shared cert, quick setup
- Cannot change suffix after creation!

#### 4. **CP Code Creation Limitation**
- CP Code API is read-only
- Must use Property Manager API to create CP codes
- Deletion is completely unavailable

#### 5. **Activation Warnings vs Errors**
- Some "warnings" actually block activation
- Must acknowledge each warning type specifically
- Different warnings for staging vs production

#### 6. **Purge URL Encoding Rules**
- Encode spaces: YES (`%20`)
- Encode protocol: NO (keep `https://`)
- Different rules for URLs vs CP codes

#### 7. **Report Data Lag Times**
- Traffic reports: 2 hours
- Performance reports: 4 hours
- Security reports: 30 minutes
- Must adjust end time to avoid empty results

### Implementation Priorities

Based on the analysis, I've created comprehensive guides:

1. **[CRITICAL_API_QUIRKS.md](./CRITICAL_API_QUIRKS.md)** - Top 10 most problematic API behaviors
2. **[AKAMAI_TECHDOCS_SCRAPING_RESULTS.md](./AKAMAI_TECHDOCS_SCRAPING_RESULTS.md)** - Detailed findings
3. **[COMPREHENSIVE_IMPLEMENTATION_GUIDE.md](./COMPREHENSIVE_IMPLEMENTATION_GUIDE.md)** - Complete implementation roadmap

### Next Steps

The implementation should focus on:

1. **Immediate**: Fix contract/group discovery, DNS changelist abstraction
2. **Week 1-2**: Certificate wizard, error translation, activation workflow
3. **Week 2-3**: Cross-domain workflows, bulk operations
4. **Week 3-4**: Advanced caching, state management

### Remaining Domains to Scrape

High Priority:
- Network Lists (activation workflow)
- Security Configuration/WAF (rule complexity)
- Billing API (contract relationships)
- Contract Management API (foundational)

Medium Priority:
- EdgeWorkers (deployment workflow)
- GTM (load balancing concepts)
- Diagnostics (troubleshooting tools)

Low Priority:
- Image Manager
- SiteShield
- Test Management

See the implementation guide for detailed code examples and patterns.