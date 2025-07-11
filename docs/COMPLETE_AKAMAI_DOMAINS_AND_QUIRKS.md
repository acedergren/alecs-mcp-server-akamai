# Complete Akamai Domains and API Quirks

## Core CDN & Delivery Domains

### 1. Property Manager (PAPI) ✓
**Purpose**: Manage CDN properties and configurations
**Critical Quirks**:
- Contract/Group ID circular dependency
- Cannot edit active versions
- Activation times: 3-15 min (staging/prod), 1hr for first-time
- Some warnings block activation
- CP Codes created here, not via CP Code API

### 2. Edge Hostnames ✓
**Purpose**: Map domains to Akamai edge
**Critical Quirks**:
- Domain suffix choice is PERMANENT:
  - `edgesuite.net`: Legacy, Standard TLS
  - `edgekey.net`: Modern, Enhanced TLS, HTTP/2
  - `akamaized.net`: Shared cert
- Cannot change suffix after creation
- Staging suffixes don't work in production

### 3. CP Codes ✓
**Purpose**: Traffic identification for billing/reporting
**Critical Quirks**:
- API is READ-ONLY
- Must create via Property Manager
- Deletion completely unavailable
- Reporting groups for invoice management

## DNS & Certificates

### 4. Edge DNS ✓
**Purpose**: Authoritative DNS service
**Critical Quirks**:
- Mandatory changelist workflow (5 steps)
- 10-minute changelist expiry
- Some secondary zone edits bypass changelist
- Must discard failed changelists manually

### 5. Certificate Provisioning System (CPS) ✓
**Purpose**: SSL/TLS certificate management
**Critical Quirks**:
- 11-step workflow
- DNS validation required for wildcards
- DNS records must exist BEFORE validation
- 7 days before expiry, staging auto-deploys to prod
- Enhanced TLS recommended over Standard

## Security Domains

### 6. Application Security (Modern WAF)
**Purpose**: API and web application protection
**Critical Quirks**:
- Replaced legacy Kona products
- Adaptive Security Engine (ASE) is the modern approach
- Hybrid deployment options (on-prem + cloud)
- Different products have different API support
- Configuration versioning like Property Manager

### 7. Network Lists ✓
**Purpose**: IP allowlists/blocklists
**Critical Quirks**:
- Fast activation (<10 minutes)
- Cannot modify during activation
- Shared across security products
- Akamai-managed lists available (TOR nodes, cloud providers)

### 8. Bot Manager
**Purpose**: Bot detection and management
**Note**: Separate from AppSec but integrates

## Edge Computing

### 9. EdgeWorkers ✓
**Purpose**: JavaScript at the edge
**Critical Quirks**:
- Event-driven model (request/response lifecycle)
- Code bundle format (TGZ)
- <5ms cold start
- Requires base delivery product
- Different events have different capabilities

### 10. EdgeKV ✓
**Purpose**: Key-value store for EdgeWorkers
**Critical Quirks**:
- String or JSON storage
- Namespace-based organization
- Geo-replication for availability
- Access from EdgeWorkers only (+ management API)
- Tokenized access control

### 11. Cloudlets ✓
**Purpose**: Edge logic without code
**Critical Quirks**:
- Self-service configuration
- Different types (redirects, load balancing, etc.)
- Policy-based activation
- Complement core delivery products

## Media & Performance

### 12. Adaptive Media Delivery
**Purpose**: Video/media optimization
**Features**:
- Automatic format selection
- Bitrate optimization
- Device detection

### 13. Cloud Wrapper ✓
**Purpose**: Optimize cloud-to-Akamai connectivity
**Critical Quirks**:
- Reduces origin requests
- Works with cloud providers (AWS, Azure, GCP)
- Configuration activation required
- Capacity inventory management

### 14. Image & Video Manager
**Purpose**: Dynamic image/video optimization
**Features**:
- Real-time transformations
- Format conversion
- Quality optimization

### 15. DataStream 2
**Purpose**: Real-time log streaming
**Features**:
- Stream to various endpoints
- Near real-time data
- Custom log formats

## Analytics & Monitoring

### 16. Reporting API ✓
**Purpose**: Traffic and performance analytics
**Critical Quirks**:
- Data lag varies by report:
  - Traffic: 2 hours
  - Performance: 4 hours
  - Security: 30 minutes
- Must adjust end time for lag
- Different dimensions per time range

### 17. Media Delivery Reports
**Purpose**: Media-specific analytics
**Features**:
- Viewer engagement metrics
- Quality of experience data
- Concurrent viewer tracking

### 18. Fast Purge ✓
**Purpose**: Content invalidation
**Critical Quirks**:
- URL encoding rules:
  - Encode spaces: YES
  - Encode protocol: NO
- Different rules for URLs vs CP codes
- Should not replace proper TTL

## Infrastructure & Admin

### 19. Global Traffic Management (GTM) ✓
**Purpose**: DNS-based load balancing
**Critical Quirks**:
- NOT regular properties!
- Liveness tests required
- Test failures affect traffic immediately
- Cannot delete with active traffic

### 20. Billing API ✓
**Purpose**: Usage data and invoicing
**Critical Quirks**:
- 18 months of historical data
- Current month compute usage only
- Separate Invoicing API for bills
- Usage by product/contract/reporting group

### 21. Contract Management API
**Purpose**: Contract and product info
**Features**:
- Read-only contract data
- Product entitlements
- Account hierarchy

### 22. Identity & Access Management (IAM)
**Purpose**: User and API credential management
**Features**:
- Role-based access
- API client management
- Group permissions

## Cross-Product Tools Needed

### 1. Universal Configuration Validator
- Validate configs across products before activation
- Check for conflicts (security rules vs caching)
- Dependency checking

### 2. Multi-Product Activation Orchestrator
- Coordinate activations across products
- Handle dependencies (cert before property)
- Rollback capabilities

### 3. Cross-Domain Search
- Search across all products for a hostname
- Find all configurations affecting a domain
- Impact analysis for changes

### 4. Unified Monitoring Dashboard
- Combine metrics from all products
- Correlate security events with performance
- Single pane of glass

### 5. Configuration Differ
- Compare configs across versions
- Compare staging vs production
- Track changes across products

### 6. Bulk Operations Manager
- Apply changes across multiple properties
- Bulk security rule updates
- Mass purging across CP codes

### 7. Cost Optimizer
- Analyze usage across products
- Suggest optimizations
- Predict cost impact of changes

### 8. Migration Assistant
- Move configs between accounts
- Product upgrade paths (legacy to modern)
- Safe migration validation

## Implementation Priority Matrix

### Immediate (Critical Path)
1. Contract/Group discovery for Property Manager
2. DNS changelist abstraction
3. Cross-product configuration search
4. Universal ID translator

### Week 1-2 (Core Functionality)
1. EdgeWorkers deployment pipeline
2. Security configuration manager
3. Certificate provisioning wizard
4. Bulk purge operations

### Week 2-3 (Enhanced Features)
1. Multi-product activation orchestrator
2. Cloud Wrapper optimizer
3. Media delivery configurator
4. Cost analysis tools

### Week 3-4 (Advanced)
1. Migration assistant
2. Performance optimizer
3. Security posture analyzer
4. Predictive scaling

## Key Takeaways

1. **Nothing is simple**: Every Akamai API has hidden complexity
2. **Activation patterns vary**: From instant to hours
3. **Dependencies everywhere**: Products rely on each other
4. **Versioning is critical**: Most products use version control
5. **IDs need translation**: Everything uses cryptic IDs
6. **Cross-product coordination**: Essential for real workflows