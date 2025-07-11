# Critical Akamai API Quirks & Solutions

## Top 10 Most Problematic API Behaviors

### 1. Property Manager: Contract/Group Dependency Hell
**The Problem**: 
```bash
# This fails without contract/group
GET /papi/v1/properties
400 Bad Request: "contractId and groupId are required"

# But to get contracts/groups, you need different permissions
GET /papi/v1/contracts  # Might return empty if no permission
GET /papi/v1/groups     # Requires contractId (!!)
```

**The Reality**: Circular dependency - need contractId to get groups, but need to list contracts first

**Our Solution**:
```typescript
// Smart discovery that tries multiple approaches:
async function findPropertyContext(propertyName: string) {
  // Plan A: List all contracts
  const contracts = await listContracts();
  
  // Plan B: If no contracts, try to get property directly with prefixes
  if (!contracts.length) {
    // Try common contract prefixes
    for (const prefix of ['ctr_', 'C-']) {
      try {
        const result = await searchWithPrefix(prefix);
        if (result) return result;
      } catch {}
    }
  }
  
  // Plan C: Parse from property ID if available
  // Some property IDs embed contract info
}
```

### 2. DNS: Hidden Changelist State Machine
**The Problem**:
```bash
# You can't just update a DNS record
PUT /config-dns/v2/zones/example.com/records/A/www
403 Forbidden: "Zone is not in changelist"

# Must follow this EXACT sequence:
POST /config-dns/v2/changelists  # Create
PUT /config-dns/v2/changelists/{id}/zones/{zone}  # Add zone
POST /config-dns/v2/changelists/{id}/records  # Modify
POST /config-dns/v2/changelists/{id}/submit  # Submit
POST /config-dns/v2/changelists/{id}/activate  # Activate
```

**Hidden Quirks**:
- Changelist expires after 10 minutes of inactivity
- Can't modify submitted changelist
- Must discard failed changelists manually
- Activation can be async (returns 202)

**Our Solution**:
```typescript
class DNSChangelistManager {
  private activeChangelists = new Map<string, ChangelistContext>();
  
  async autoManageChangelist(operation: () => Promise<void>) {
    const changelist = await this.createChangelist();
    
    try {
      await operation();
      await this.submitAndActivate(changelist);
    } catch (error) {
      await this.safeDiscard(changelist);
      throw error;
    } finally {
      this.cleanup(changelist);
    }
  }
}
```

### 3. Certificate Provisioning: The Validation Dance
**The Problem**:
```bash
# Create enrollment - seems successful
POST /cps/v2/enrollments
201 Created

# But certificate won't issue until validation
GET /cps/v2/enrollments/{id}/challenges
# Returns DNS/HTTP challenges

# Must poll for validation (can take 5-60 minutes)
GET /cps/v2/enrollments/{id}
# status: "pending-validation" → "validated" → "issued"
```

**Hidden Quirks**:
- DNS validation records must exist BEFORE checking
- HTTP validation fails if site redirects to HTTPS
- Wildcard certs ONLY support DNS validation
- Network deployment happens automatically but can fail silently

**Our Solution**:
```typescript
class CertificateWizard {
  async guidedProvision(domain: string) {
    // Step 1: Check existing DNS
    const dnsReady = await this.checkDNSPointing();
    if (!dnsReady) {
      return {
        step: "dns_setup_required",
        instructions: "Point domain to Akamai first",
        requiredRecords: [...]
      };
    }
    
    // Step 2: Smart validation choice
    const validation = domain.includes('*') ? 'dns' : 
                      await this.checkHTTPAccess() ? 'http' : 'dns';
    
    // Step 3: Create with monitoring
    const enrollment = await this.createWithRetry(domain, validation);
    return this.monitorWithUpdates(enrollment);
  }
}
```

### 4. Property Activation: The Warning Maze
**The Problem**:
```bash
POST /papi/v1/properties/{id}/activations
400 Bad Request: {
  "warnings": [
    {
      "type": "BEHAVIOR_CACHING_DEFAULT_TTL",
      "errorLocation": "#/rules/behaviors/1",
      "detail": "Default TTL should be at least 1 day"
    }
  ],
  "errors": []  # Warnings block activation!
}
```

**Hidden Quirks**:
- Some "warnings" are actually blockers
- Must acknowledge each warning type specifically
- Different warning types per network (staging vs prod)
- Can't activate same version twice

**Our Solution**:
```typescript
class SmartActivation {
  private warningHandlers = {
    'BEHAVIOR_CACHING_DEFAULT_TTL': async (context) => {
      // Auto-fix: Set reasonable default
      await this.updateRule(context, { ttl: '1d' });
      return { fixed: true };
    },
    'CERT_NOT_READY': async (context) => {
      // Can't auto-fix, need user action
      return { 
        fixed: false,
        userAction: "Certificate not deployed. Deploy cert first or remove HTTPS."
      };
    }
  };
  
  async activateWithAutoFix(propertyId: string, version: number) {
    let attempts = 0;
    while (attempts < 3) {
      const result = await this.tryActivate(propertyId, version);
      if (result.success) return result;
      
      // Try to auto-fix warnings
      const fixed = await this.autoFixWarnings(result.warnings);
      if (!fixed.some(f => f.fixed)) {
        // Can't fix automatically
        return this.promptUserForFixes(result.warnings);
      }
      attempts++;
    }
  }
}
```

### 5. Network Lists: The Activation Lag
**The Problem**:
```bash
# Add IPs to network list - instant
PUT /network-list/v2/network-lists/{id}
200 OK

# But changes aren't live until activated
POST /network-list/v2/network-lists/{id}/activate
200 OK { "activationId": 123 }

# Activation status check shows "IN_PROGRESS" for 5-15 minutes
GET /network-list/v2/network-lists/{id}/activate/{activationId}
```

**Hidden Quirks**:
- Can't modify list during activation
- Activation to prod requires staging first (sometimes)
- Rollback creates new activation, not instant

**Our Solution**:
```typescript
class NetworkListManager {
  private pendingActivations = new Map();
  
  async batchUpdateAndActivate(listId: string, updates: Update[]) {
    // Queue updates during activation
    if (this.pendingActivations.has(listId)) {
      return this.queueForNextBatch(listId, updates);
    }
    
    // Batch all updates
    await this.applyUpdates(listId, updates);
    
    // Smart activation
    const activation = await this.activate(listId, {
      notifyOnComplete: true,
      autoRetryOnConflict: true
    });
    
    this.pendingActivations.set(listId, activation);
    return this.monitorActivation(activation);
  }
}
```

### 6. Edge Hostnames: The Domain Suffix Mystery
**The Problem**:
```bash
POST /hapi/v1/edge-hostnames
{
  "domainPrefix": "www.example.com",
  "domainSuffix": "???"  # Which one to use?
}

# Options include:
# - edgesuite.net (legacy)
# - edgekey.net (standard)
# - edgekey-staging.net (testing)
# - akamaized.net (special)
# - akamaized-staging.net (special testing)
```

**Hidden Quirks**:
- Suffix determines features available
- Can't change suffix after creation
- Some suffixes require special contracts
- Staging suffixes don't work in production

**Our Solution**:
```typescript
class EdgeHostnameHelper {
  async selectBestSuffix(context: HostnameContext) {
    // Smart defaults based on use case
    if (context.testing) return 'edgekey-staging.net';
    if (context.requiresHTTP2) return 'edgekey.net';
    if (context.isChina) return 'akamaized.net';
    
    // Check contract for available options
    const available = await this.getAvailableSuffixes(context.contract);
    return available.includes('edgekey.net') ? 
           'edgekey.net' : 'edgesuite.net';
  }
}
```

### 7. Reporting: The Time Window Trap
**The Problem**:
```bash
# Ask for last 7 days of data
GET /reporting-api/v1/reports/traffic?start=2024-01-14&end=2024-01-21
200 OK { "data": [] }  # Empty!

# Why? Data has 2-4 hour lag
# If end > (now - 4 hours), returns empty
```

**Hidden Quirks**:
- Different reports have different lag times
- Some dimensions not available for all time ranges
- Aggregation affects available metrics
- Rate limits stricter for detailed data

**Our Solution**:
```typescript
class SmartReporting {
  private reportLagTime = {
    traffic: 2 * 60 * 60 * 1000,      // 2 hours
    performance: 4 * 60 * 60 * 1000,  // 4 hours  
    security: 30 * 60 * 1000,         // 30 minutes
  };
  
  async getReport(type: string, options: ReportOptions) {
    // Auto-adjust end time for lag
    const lag = this.reportLagTime[type];
    const now = Date.now();
    if (options.end > now - lag) {
      options.end = now - lag;
      console.warn(`Adjusted end time to ${new Date(options.end)} due to data lag`);
    }
    
    // Smart dimension selection
    return this.optimizeQuery(type, options);
  }
}
```

### 8. GTM Properties: The Load Balancing Learning Curve
**The Problem**:
```bash
# GTM "properties" are not Property Manager properties!
# They're load balancing configurations

PUT /config-gtm/v1/domains/{domain}/properties/{property}
{
  "type": "weighted-round-robin",  # or "performance", "geographic", etc.
  "trafficTargets": [...],
  "livenessTests": [...]  # Required but complex
}
```

**Hidden Quirks**:
- Liveness tests run from multiple locations
- Test failures affect traffic immediately  
- Can't delete property with active traffic
- Handout limits affect failover behavior

**Our Solution**:
```typescript
class GTMSimplified {
  templates = {
    'basic_failover': {
      type: 'failover',
      livenessTests: [{
        testObjectProtocol: 'HTTP',
        testObjectPath: '/health',
        testInterval: 60,
        testTimeout: 10
      }]
    },
    'geographic_routing': {
      type: 'geographic',
      // Pre-configured for common patterns
    }
  };
  
  async createLoadBalancer(name: string, targets: Target[], template = 'basic_failover') {
    const config = this.templates[template];
    return this.createWithValidation(name, targets, config);
  }
}
```

### 9. Purge API: The URL Encoding Nightmare
**The Problem**:
```bash
# This fails
POST /ccu/v3/invalidate/url
{
  "objects": ["https://example.com/path with spaces/file.html"]
}
400 Bad Request: "Invalid URL"

# Must encode, but not too much!
"https://example.com/path%20with%20spaces/file.html" ✓
"https%3A%2F%2Fexample.com%2Fpath%20with%20spaces%2Ffile.html" ✗
```

**Hidden Quirks**:
- Different encoding rules for URLs vs CP codes
- Tag purging affects unknown content
- Rate limits per type (URL vs CP code)
- Staging purge doesn't always reflect prod

**Our Solution**:
```typescript
class SmartPurge {
  async purgeContent(input: string | string[]) {
    const items = Array.isArray(input) ? input : [input];
    
    // Smart detection and encoding
    const encoded = items.map(item => {
      if (this.looksLikeURL(item)) {
        return this.encodeURLProperly(item);
      } else if (this.looksLikeCPCode(item)) {
        return this.validateCPCode(item);
      } else {
        // Assume tag
        return this.sanitizeTag(item);
      }
    });
    
    // Batch by type for better performance
    return this.batchPurgeByType(encoded);
  }
}
```

### 10. API Versioning: The Inconsistency Problem
**The Problem**:
```bash
# Different APIs use different versioning schemes
/papi/v1/...           # v1 for years
/config-dns/v2/...     # v2 is latest
/cps/v2/...            # But accepts: application/vnd.akamai.cps.enrollment.v11+json
/reporting-api/v1/...  # v1 forever
```

**Hidden Quirks**:
- Some APIs version via Accept header
- Some have breaking changes in minor versions
- Feature availability varies by version
- Can't always use latest version

**Our Solution**:
```typescript
class APIVersionManager {
  private versionMap = {
    property: { path: 'v1', header: null },
    dns: { path: 'v2', header: null },
    cps: { path: 'v2', header: 'application/vnd.akamai.cps.enrollment.v11+json' },
    reporting: { path: 'v1', header: null }
  };
  
  prepareRequest(api: string, request: Request) {
    const version = this.versionMap[api];
    if (version.header) {
      request.headers['Accept'] = version.header;
    }
    request.path = request.path.replace('{version}', version.path);
    return request;
  }
}
```

## Summary: Making It All Just Work

The key to great user experience is hiding all these quirks:

1. **Auto-discovery** - Find resources without requiring IDs
2. **Smart defaults** - Choose the right options automatically  
3. **Workflow automation** - Handle multi-step processes internally
4. **Error recovery** - Fix common issues without user intervention
5. **Clear feedback** - Explain what's happening in simple terms

Example of the transformation:
```typescript
// What users see:
await updateDNSRecord("example.com", "www", "1.2.3.4");

// What actually happens:
// 1. Find zone ID from domain
// 2. Create changelist with auto-generated name
// 3. Add zone to changelist
// 4. Update record in changelist
// 5. Submit changelist
// 6. Activate changelist  
// 7. Monitor activation
// 8. Clean up changelist
// 9. Clear caches
// 10. Return simple success message
```

This is how we turn Akamai's powerful but complex APIs into tools that developers love to use.