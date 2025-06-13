# Multi-Customer Akamai MCP Server - Realistic Development Task Prompts

## Task 1: Multi-Customer Foundation + Core APIs

**HOW TO ACT FOR SUCCESS:**
- Act as a senior TypeScript developer specializing in API integration and multi-tenant applications
- Build reliable, well-tested code that handles API responses and errors gracefully
- Focus on solid CRUD operations and customer context switching
- Create maintainable code with clear separation of concerns
- Implement proper validation and error handling for API operations
- Write code that can be easily tested and debugged
- Keep complexity manageable for a solo developer project

**YOUR MISSION:**
Create the foundational multi-customer MCP server with Property Manager, Edge DNS, and Default DV Certificate management. Build reliable customer context switching for secure multi-tenant operations.

**CONTEXT:**
- Building a multi-customer Akamai API integration tool
- Target users: MSPs and teams managing multiple Akamai accounts
- Core capability: Secure customer context switching via account-switch-key
- Timeline: 4-6 weeks for solid foundation
- Scope: Essential API operations with proper error handling

**Task 1 DELIVERABLES:**

### 1.1 Multi-Customer Project Foundation
**package.json** - Standard NPM package with MCP and Akamai dependencies
**tsconfig.json** - TypeScript configuration for Node.js development
**src/types/index.ts** - TypeScript interfaces for Akamai API responses
**src/config/edgerc-parser.ts** - Parse .edgerc files with multiple customer sections
**src/auth/customer-context.ts** - Customer switching and validation logic

### 1.2 Customer Context Management
**src/customer/customer-manager.ts** - Core customer operations:
- `loadCustomerConfigs()` - Load all customer sections from .edgerc
- `validateCustomer(customerName)` - Check if customer exists and is accessible
- `getCustomerClient(customerName)` - Get EdgeGrid client for specific customer
- `listAvailableCustomers()` - Return array of configured customer names

### 1.3 Property Manager Tools
**src/tools/property-tools.ts** - Basic property operations:
```typescript
const PROPERTY_TOOLS = [
  'property.list',        // [{customer: "customer1"}] - List properties
  'property.get',         // [{customer, propertyId}] - Get property details
  'property.create',      // [{customer, propertyName, productId, groupId}] - Create property
  'property.activate',    // [{customer, propertyId, network: "STAGING|PRODUCTION"}] - Activate
  'property.status'       // [{customer, propertyId}] - Check activation status
];
```

### 1.4 Edge DNS Tools  
**src/tools/dns-tools.ts** - Basic DNS operations:
```typescript
const DNS_TOOLS = [
  'dns.zone.list',        // [{customer}] - List DNS zones
  'dns.zone.create',      // [{customer, zone, type}] - Create DNS zone
  'dns.record.list',      // [{customer, zone}] - List DNS records
  'dns.record.create',    // [{customer, zone, name, type, rdata}] - Create record
  'dns.record.delete'     // [{customer, zone, recordId}] - Delete record
];
```

### 1.5 Default DV Certificate Tools
**src/tools/certificate-tools.ts** - Basic certificate operations:
```typescript
const CERTIFICATE_TOOLS = [
  'certificate.dv.list',     // [{customer}] - List enrollments
  'certificate.dv.create',   // [{customer, domains}] - Create DV enrollment
  'certificate.dv.status'    // [{customer, enrollmentId}] - Check status
];
```

### 1.6 MCP Server Implementation
**src/index.ts** - Main MCP server:
- Register all tools with proper customer parameter validation
- Handle customer context switching for each tool call
- Provide clear error messages for invalid customers
- Format API responses as readable text for Claude

**SUCCESS CRITERIA (Task 1):**
- [ ] Can switch between multiple customer contexts securely
- [ ] Property operations work for different customers
- [ ] DNS operations create and manage zones/records
- [ ] Certificate enrollment initiates and tracks status
- [ ] All tools validate customer parameter before execution
- [ ] Error handling provides helpful messages
- [ ] No cross-customer data leakage

**REALISTIC SCOPE:**
- Simple API call wrapping, not complex business logic
- Text-based responses, not visual interfaces
- Basic validation, not complex rule engines
- Customer isolation through API calls, not complex security systems

---

## Task 2: Network Lists + Content Operations

---

**HOW TO ACT FOR SUCCESS:**
- Act as a developer focused on practical CDN operations and security
- Build straightforward API integrations without over-engineering
- Implement basic batching and validation logic
- Keep rate limiting simple and effective
- Focus on the most common operational use cases
- Create reliable tools that MSPs can depend on daily

**YOUR MISSION:**
Add Network Lists management and Fast Purge operations for content and security management across multiple customers.

**CONTEXT:**
Building on Task 1's solid foundation. Focus on essential operations that MSPs perform regularly: managing IP/GEO lists and purging content.

**Task 2 DELIVERABLES:**

### 2.1 Network Lists Management
**src/tools/network-list-tools.ts** - IP/GEO list operations:
```typescript
const NETWORK_LIST_TOOLS = [
  'networklist.list',        // [{customer, type?: "IP|GEO"}] - List network lists
  'networklist.get',         // [{customer, listId}] - Get list details
  'networklist.create',      // [{customer, name, type, items}] - Create list
  'networklist.update',      // [{customer, listId, items}] - Update list items
  'networklist.activate',    // [{customer, listId, network}] - Activate list
  'networklist.delete'       // [{customer, listId}] - Delete list
];
```

### 2.2 Fast Purge Operations
**src/tools/purge-tools.ts** - Content invalidation:
```typescript
const PURGE_TOOLS = [
  'purge.url',            // [{customer, urls, network}] - Purge URLs
  'purge.cpcode',         // [{customer, cpcode, network}] - Purge by CP code
  'purge.tag',            // [{customer, tags, network}] - Purge by cache tag
  'purge.status'          // [{customer, purgeId}] - Check purge status
];
```

### 2.3 Simple Batching Logic
**src/utils/batching.ts** - Basic batching for API limits:
- Split large URL lists into batches of 50 (FastPurge limit)
- Simple retry logic for rate limit responses
- Sequential processing (not complex parallel processing)

**SUCCESS CRITERIA (Task 2):**
- [ ] Network lists can be created and managed for each customer
- [ ] IP and GEO lists work with proper validation
- [ ] Purge operations handle URL batching automatically
- [ ] Rate limiting is handled gracefully with user feedback
- [ ] All operations maintain customer isolation

**REALISTIC SCOPE:**
- Basic list management, not complex security analysis
- Simple purge operations, not intelligent content optimization
- Basic batching logic, not sophisticated queue management
- Error handling and retry logic, not complex failure recovery

---

## Task 3: Security Configuration

---

**HOW TO ACT FOR SUCCESS:**
- Act as a developer implementing security API wrappers
- Focus on configuration management, not security analysis
- Build tools that manage WAF settings through API calls
- Keep security templates simple and practical
- Implement basic policy management without complex rule engines
- Focus on common security configurations MSPs actually use

**YOUR MISSION:**
Add Application Security API integration for WAF and security policy management across multiple customers.

**CONTEXT:**
Building on existing multi-customer foundation. Focus on practical security configuration management that MSPs need for client protection.

**Task 3 DELIVERABLES:**

### 3.1 Security Configuration Management
**src/tools/security-tools.ts** - Security configuration operations:
```typescript
const SECURITY_TOOLS = [
  'security.config.list',        // [{customer}] - List security configs
  'security.config.get',         // [{customer, configId}] - Get config details
  'security.policy.list',        // [{customer, configId}] - List policies
  'security.policy.get',         // [{customer, configId, policyId}] - Get policy
  'security.activate'             // [{customer, configId, network}] - Activate config
];
```

### 3.2 WAF Rule Management
**src/tools/waf-tools.ts** - Basic WAF operations:
```typescript
const WAF_TOOLS = [
  'waf.protection.get',          // [{customer, configId, policyId}] - Get protection settings
  'waf.protection.update',       // [{customer, configId, policyId, settings}] - Update settings
  'waf.ratelimit.get',           // [{customer, configId, policyId}] - Get rate limits
  'waf.ratelimit.update'         // [{customer, configId, policyId, limits}] - Update limits
];
```

### 3.3 Simple Security Templates
**src/templates/security-templates.ts** - Basic configuration templates:
```typescript
const BASIC_TEMPLATES = {
  webSiteProtection: {
    sqlInjection: 'on',
    xss: 'on',
    rateLimit: 100
  },
  apiProtection: {
    rateLimit: 1000,
    ipRestriction: true
  }
};
```

**SUCCESS CRITERIA (Task 3):**
- [ ] Can view and modify security configurations per customer
- [ ] WAF protection settings can be updated
- [ ] Rate limiting can be configured
- [ ] Security configurations can be activated to staging/production
- [ ] Basic templates provide common security setups

**REALISTIC SCOPE:**
- Configuration management through API calls
- Basic template application, not intelligent security analysis
- Simple rule updates, not complex policy engines
- Standard Akamai security features, not custom threat detection

---

## Task 4: Basic Reporting and Data Queries

**Copy this entire prompt to Claude Code:**

---

**HOW TO ACT FOR SUCCESS:**
- Act as a developer building API data retrieval and text formatting
- Focus on fetching and presenting data, not creating visualizations
- Build simple queries for common metrics MSPs need
- Format responses as readable text summaries
- Implement basic data export (CSV/JSON) for external tools
- Keep analysis simple - trends, comparisons, and summaries

**YOUR MISSION:**
Add essential reporting capabilities to query performance and usage metrics across multiple customers. Focus on text-based data retrieval and analysis.

**CONTEXT:**
Final Task completing the multi-customer platform. MSPs need basic visibility into customer performance and usage for management and billing purposes.

**Task 4 DELIVERABLES:**

### 4.1 Basic Traffic and Performance Queries
**src/tools/reporting-tools.ts** - Simple data retrieval:
```typescript
const REPORTING_TOOLS = [
  'report.traffic',              // [{customer, hostname, startDate, endDate}] - Traffic summary
  'report.bandwidth',            // [{customer, cpcode, period}] - Bandwidth usage
  'report.errors',               // [{customer, hostname, period}] - Error summary
  'report.cache.hits'            // [{customer, hostname, period}] - Cache performance
];
```

### 4.2 Usage Summary Tools
**src/tools/usage-tools.ts** - Usage information for MSPs:
```typescript
const USAGE_TOOLS = [
  'usage.summary',               // [{customer, period}] - Overall usage summary
  'usage.compare',               // [{customer, period1, period2}] - Period comparison
  'usage.export'                 // [{customer, period, format}] - Export data
];
```

### 4.3 Simple Data Export
**src/utils/export.ts** - Basic export functionality:
- Export data as CSV format for spreadsheets
- Export data as JSON for other tools
- Simple text formatting for reports

### 4.4 Text-Based Analysis
**src/utils/analysis.ts** - Basic data analysis:
- Calculate percentage changes between periods
- Identify top/bottom performers
- Simple trend identification (increasing/decreasing)
- Basic threshold checking (over/under limits)

**SUCCESS CRITERIA (Task 4):**
- [ ] Can query traffic data for specific customers and hostnames
- [ ] Bandwidth and usage data retrieval works
- [ ] Error rates can be retrieved and summarized
- [ ] Cache performance metrics are available
- [ ] Data can be exported in CSV/JSON formats
- [ ] Simple comparisons between time periods work
- [ ] Text summaries are clear and actionable

**REALISTIC SCOPE - WHAT'S INCLUDED:**
- API data retrieval and text formatting
- Basic calculations (percentages, totals, averages)
- Simple trend identification in text
- Data export for external visualization tools
- Text-based summaries and recommendations

**REALISTIC SCOPE - WHAT'S NOT INCLUDED:**
- Visual charts, graphs, or dashboards
- Real-time monitoring or alerts
- Complex data analysis or machine learning
- Interactive interfaces or web applications
- Persistent data storage or historical databases
- Advanced analytics or predictive modeling

**NATURAL LANGUAGE EXAMPLES:**
- "Show me traffic summary for customer1's website last week"
- "What was the bandwidth usage for customer2 last month?"
- "Compare cache hit rates for customer1 between last month and this month"
- "Export the error report for customer2 as CSV"
- "Give me a usage summary for all customers this quarter"

**TEXT-BASED REPORT EXAMPLE:**
```
Customer1 Traffic Summary (Oct 1-7, 2024)
========================================
Total Requests: 1.2M (+15% vs previous week)
Bandwidth: 45.2 GB (+8% vs previous week)
Cache Hit Rate: 87.3% (Good - above 85% target)
Error Rate: 0.02% (Excellent - below 0.1% target)
Top Content: /api/users (32%), /home (28%), /products (18%)

Recommendations:
- Cache hit rate is healthy
- Consider reviewing /api/users caching if dynamic
- Error rate is well within acceptable limits
```

## **Overall Platform Completion**

After Task 4, the platform provides:
- **Multi-customer management** with secure account switching
- **Essential API coverage** for daily CDN operations
- **Property management** for CDN configurations
- **DNS management** for domain operations
- **Certificate management** for SSL/TLS
- **Network lists** for security and routing
- **Content purging** for cache management
- **Security configuration** for WAF and protection
- **Basic reporting** for usage and performance visibility

**What the Platform CAN Do:**
- All standard Akamai API operations through natural language
- Multi-customer context switching and isolation
- Text-based data analysis and reporting
- Data export for external tools
- Professional error handling and validation

**What the Platform CANNOT Do:**
- Visual dashboards or real-time monitoring interfaces
- Complex data processing or machine learning
- Automated decision making or policy enforcement
- Real-time alerting or notification systems
- Advanced analytics beyond basic calculations

This creates a solid, professional multi-customer Akamai management tool that works within the realistic capabilities of an MCP server and LLM.