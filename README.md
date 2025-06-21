# ALECS - MCP Server for Akamai

**ALECS - A LaunchGrid for Edge & Cloud Services**

A comprehensive MCP (Model Context Protocol) server that enables AI assistants to manage Akamai's complete edge platform through natural language. ALECS provides enterprise-grade tools for Akamai properties, DNS, certificates, security, and performance optimization with OAuth 2.1 authentication and MCP 2025-06-18 compliance.

## 🎯 What Can ALECS Do for You?

### 🌐 **Complete Akamai Property Management**
- **End-to-End Property Onboarding**: From hostname to production activation in minutes
- **Rule Tree Optimization**: AI-powered performance tuning and security hardening  
- **Multi-Environment Deployments**: Staging, production, and A/B testing workflows
- **Version Control**: Property history, rollbacks, and change tracking
- **Bulk Operations**: Manage hundreds of properties simultaneously

### 🚀 **Performance & Delivery Optimization**
- **Ion Standard Templates**: Premium web/API delivery with HTTP/3 and adaptive acceleration
- **FastPurge Management**: Intelligent cache invalidation with queue management
- **CP Code Automation**: Automatic traffic categorization and billing
- **Edge Computing**: Property configurations for edge workloads
- **Real-time Analytics**: Performance monitoring and optimization recommendations

### 🔐 **Enterprise Security & Compliance**
- **OAuth 2.1 Resource Server**: RFC-compliant authentication with scope-based access control
- **Certificate Lifecycle Management**: DV certificates, Enhanced TLS, and ACME automation
- **WAF & Bot Protection**: Application security with 95+ security tools
- **Network Lists**: IP/Geo blocking, allowlists, and threat intelligence integration
- **Compliance Ready**: SOX, PCI-DSS, and regulatory requirement support

### 🌍 **DNS & Traffic Management**
- **Global DNS Management**: PRIMARY, SECONDARY, and ALIAS zones with DNSSEC
- **DNS Migration Tools**: Seamless migration from any DNS provider
- **Traffic Steering**: Geolocation, failover, and load balancing
- **ACME Integration**: Automatic certificate validation record management

## 🆕 MCP 2025-06-18 Specification & OAuth 2.1

**ALECS is the one of the first(?) MCP server with comprehensive OAuth 2.1 Resource Server implementation and 87.5% MCP 2025-06-18 compliance.**

### 🔐 **OAuth 2.1 Authentication**
- **Resource Server Metadata (RFC 9728)**: Standards-compliant discovery endpoints
- **Token Validation**: JWT and introspection support with caching
- **Resource Indicators (RFC 8707)**: Fine-grained access control per Akamai resource
- **Token Binding**: DPoP, mTLS, and client certificate binding support
- **Security Features**: Token replay prevention, rate limiting, HTTPS enforcement

### 📋 **MCP 2025-06-18 Compliance**
- **21/24 Tests Passing**: 87.5% compliance with comprehensive test suite
- **Scope-Based Authorization**: Granular tool access control
- **Protected vs Public Tools**: Configurable authentication requirements
- **Standards Compliance**: WWW-Authenticate headers, CORS support, RFC error responses

### 🛡️ **Enterprise Security**
- **Multi-Customer OAuth**: Isolated authentication per Akamai account
- **Scope Management**: `property:read`, `property:write`, `property:activate` scopes
- **Security Monitoring**: Real-time authentication and authorization logging
- **Compliance Testing**: Automated security validation with CI/CD integration

## Core Akamai Capabilities

### 🚀 **Multi-Customer & Partner Support**
- **Seamless Account Switching**: Multiple Akamai accounts for partners and Akamai personnel
- **Account-Specific Configurations**: Isolated `.edgerc` sections with OAuth scopes
- **Automatic Key Detection**: Smart account key application and validation
- **Partner-Ready**: MSP and CSP support with customer isolation

### 🔍 **Intelligent Property Discovery**
- **AI-Powered Search**: Natural language property and configuration lookup
- **Universal Search**: Cross-contract property discovery with advanced filtering
- **Smart Suggestions**: Automatic hostname pattern detection and recommendations
- **Performance Insights**: Property health checks and optimization recommendations

### 📊 **Advanced Property Management**
- **Complete Lifecycle Management**: From creation to production activation
- **Rule Tree Intelligence**: AI-powered configuration optimization and validation
- **Version Control**: Complete change history with rollback capabilities
- **Bulk Operations**: Manage hundreds of properties with batch processing
- **A/B Testing**: Multi-version property deployments and traffic splitting

### 🌍 **Global DNS & Traffic Management**
- **Edge DNS Integration**: PRIMARY, SECONDARY, and ALIAS zones with DNSSEC
- **Traffic Steering**: Geographic, performance-based, and failover routing
- **DNS Migration**: Seamless provider migration with validation and testing
- **ACME Automation**: Certificate validation record management
- **Global Anycast**: Distributed DNS with low-latency responses

### 🔐 **Certificate & Security Management**
- **Enhanced TLS Network**: Modern TLS 1.3 with perfect forward secrecy
- **DV Certificate Automation**: Zero-touch domain validation workflows
- **WAF & Bot Protection**: Application security with threat intelligence
- **Network Security**: IP/Geo blocking, allowlists, and reputation-based filtering
- **Compliance Tools**: SOX, PCI-DSS, and regulatory requirement automation

### 🛠 **Developer & Operations Experience**
- **Docker & Kubernetes**: Production-ready containers with Helm charts
- **CI/CD Integration**: GitOps workflows with automated testing and deployment
- **Monitoring & Alerting**: Real-time performance and security monitoring
- **Template System**: Reusable configurations with intelligent defaults
- **API-First Design**: REST and GraphQL endpoints with OpenAPI documentation

## Installation

### Quick Start (Interactive Mode) 🚀

```bash
# Clone and install
git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai
npm install
npm run build

# Start with interactive mode (recommended)
npm start
```

The interactive mode will guide you through:
- Selecting which services to run (Property, DNS, Certificates, Security, Reporting)
- Configuring your `.edgerc` path
- Choosing the appropriate server configuration

### NPM Package Installation

```bash
npm install alecs-mcp-server-akamai
```

## Configuration

### 1. Set up your `.edgerc` file

Create a `~/.edgerc` file with your Akamai credentials:

```ini
[default]
client_secret = your_client_secret
host = your_host.luna.akamaiapis.net
access_token = your_access_token
client_token = your_client_token

[production]
client_secret = prod_client_secret
host = prod_host.luna.akamaiapis.net
access_token = prod_access_token
client_token = prod_client_token
account_key = 1-ABCDEF
```

### 2. Configure Claude Desktop

ALECS has been completely refactored with a modular architecture for optimal performance and flexibility. The project now features:

- **TypeScript Migration**: 100% TypeScript with full strict mode for enhanced type safety
- **Modular Architecture**: Services split into focused, independent modules
- **Interactive Start**: User-friendly CLI for selecting services
- **Improved Performance**: Up to 80% reduction in memory usage
- **Better Error Handling**: Comprehensive error handling with unknown catch variables

ALECS offers multiple deployment modes:

#### Option A: Modular Servers (Recommended) 🚀

Deploy focused servers for specific use cases. This approach reduces memory usage by up to 80% and improves stability:

```json
{
  "mcpServers": {
    "alecs-property": {
      "command": "node",
      "args": ["/path/to/alecs-mcp-server-akamai/dist/servers/property-server.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "~/.edgerc"
      }
    },
    "alecs-dns": {
      "command": "node",
      "args": ["/path/to/alecs-mcp-server-akamai/dist/servers/dns-server.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "~/.edgerc"
      }
    },
    "alecs-certs": {
      "command": "node",
      "args": ["/path/to/alecs-mcp-server-akamai/dist/servers/certs-server.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "~/.edgerc"
      }
    },
    "alecs-reporting": {
      "command": "node",
      "args": ["/path/to/alecs-mcp-server-akamai/dist/servers/reporting-server.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "~/.edgerc"
      }
    },
    "alecs-security": {
      "command": "node",
      "args": ["/path/to/alecs-mcp-server-akamai/dist/servers/security-server.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "~/.edgerc"
      }
    }
  }
}
```

**Modular Server Benefits:**
- **alecs-property** (32 tools): Property management, activations, and basic certificate support
- **alecs-dns** (24 tools): DNS zones, records, and migrations
- **alecs-certs** (22 tools): Full certificate lifecycle management
- **alecs-reporting** (25 tools): Analytics, metrics, and performance reports
- **alecs-security** (95 tools): WAF, network lists, bot management, and DDoS protection

#### Option B: Monolithic Server (All Features)

For users who need all features in one server:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "npx",
      "args": ["alecs-mcp-server-akamai"],
      "env": {}
    }
  }
}
```

#### Option C: Essential Server (Core Features Only)

A lightweight option with just the most commonly used features:

```json
{
  "mcpServers": {
    "alecs-essential": {
      "command": "node",
      "args": ["/path/to/alecs-mcp-server-akamai/dist/index-essential.js"],
      "env": {}
    }
  }
}
```

### Choosing the Right Configuration

| Configuration | Use Case | Memory Usage | Tool Count |
|--------------|----------|--------------|------------|
| **Modular** | Deploy only what you need | ~80MB per module | 22-95 per module |
| **Monolithic** | Need all features at once | ~512MB | 198 total |
| **Essential** | Basic property & DNS management | ~200MB | ~60 tools |

**Recommendation**: Start with modular servers and add modules as needed. This provides the best performance and stability.

## Usage Examples

### List Properties
```
"List all my Akamai properties"
"Show properties in contract ctr_1-ABCDEF"
```

### Search for Properties
```
"Find property example.com"
"Get details for property prp_12345"
```

### Group Management
```
"List all Akamai groups"
"Search for groups containing 'production'"
"Find group ID for 'Web Properties'"
```

### Multi-Customer Operations
```
"List properties using customer production"
"Switch to staging account and show properties"
```

### DNS Zone Management
```
"List all DNS zones"
"Get details for zone example.com"
"Create a new DNS zone for mydomain.com"
```

### DNS Record Management
```
"List all records in example.com"
"Add an A record for www.example.com pointing to 192.0.2.1"
"Update the CNAME for blog.example.com"
"Delete the old MX record"
```

## Available Tools

### FastPurge - Content Invalidation
- `fastpurge.url.invalidate` - Invalidate content by URL(s)
- `fastpurge.cpcode.invalidate` - Invalidate all content for CP code(s)
- `fastpurge.tag.invalidate` - Invalidate content by cache tag(s)
- `fastpurge.status.check` - Check purge operation status
- `fastpurge.queue.status` - View queue status and pending operations
- `fastpurge.estimate` - Estimate purge completion time

### Property Management - Core Functions
- `list_properties` - List CDN properties with filtering options
- `get_property` - Get detailed property information by name or ID
- `list_groups` - List account groups with search capability
- `list_contracts` - List available contracts
- `create_property` - Create new CDN properties
- `clone_property` - Clone an existing property
- `remove_property` - Delete a property

### Property Management - Version & Rule Management
- `create_property_version` - Create a new property version
- `list_property_versions` - List all versions of a property
- `get_property_version` - Get specific version details
- `get_latest_property_version` - Get the latest version details
- `compare_property_versions` - Compare two property versions
- `get_version_timeline` - Get comprehensive version history
- `rollback_property_version` - Rollback to a previous version
- `update_version_metadata` - Update version notes and tags
- `merge_property_versions` - Merge changes between versions
- `batch_create_versions` - Create versions across multiple properties
- `get_property_rules` - Get property configuration rules
- `update_property_rules` - Update property configuration
- `patch_property_rules` - Apply JSON patch to rules
- `validate_rule_tree` - Comprehensive rule validation
- `create_rule_tree_from_template` - Use predefined rule templates
- `analyze_rule_tree_performance` - Analyze rule performance
- `detect_rule_conflicts` - Find rule conflicts
- `optimize_rule_tree` - Optimize rule configuration

### Property Management - Hostname & Activation
- `create_edge_hostname` - Create edge hostname for content delivery
- `list_edge_hostnames` - List available edge hostnames
- `get_edge_hostname` - Get edge hostname details
- `add_property_hostname` - Add hostname to property
- `remove_property_hostname` - Remove hostname from property
- `list_property_version_hostnames` - List hostnames for a version
- `activate_property` - Activate property to staging/production
- `get_activation_status` - Check activation progress
- `list_property_activations` - List activation history
- `cancel_property_activation` - Cancel pending activation

### Property Management - Search & Analysis
- `search_properties` - Search properties by various criteria
- `search_properties_advanced` - Multi-criteria advanced search
- `compare_properties` - Compare two properties in detail
- `check_property_health` - Comprehensive property health check
- `detect_configuration_drift` - Detect drift from baseline
- `list_all_hostnames` - List all hostnames across properties
- `bulk_search_properties` - Initiate bulk property search
- `get_bulk_search_results` - Get bulk search results
- `get_property_audit_history` - Get property change history

### Property Management - Bulk Operations
- `bulk_clone_properties` - Clone property to multiple targets
- `bulk_activate_properties` - Activate multiple properties
- `bulk_update_property_rules` - Update rules across properties
- `bulk_manage_hostnames` - Add/remove hostnames in bulk
- `bulk_update_properties` - Apply common changes to multiple properties
- `get_bulk_operation_status` - Track bulk operation progress

### Property Management - Products & CP Codes
- `list_products` - List available Akamai products
- `get_product` - Get product details
- `list_use_cases` - List product use cases
- `list_cpcodes` - List CP codes for reporting
- `get_cpcode` - Get CP code details
- `create_cpcode` - Create new CP code
- `search_cpcodes` - Search CP codes

### Certificate Management
- `create_dv_enrollment` - Create Default DV certificate
- `get_dv_validation_challenges` - Get domain validation challenges
- `check_dv_enrollment_status` - Check certificate status
- `list_certificate_enrollments` - List all certificates
- `link_certificate_to_property` - Link certificate to property
- `update_property_with_default_dv` - Add secure edge hostname with DV cert
- `update_property_with_cps_certificate` - Add edge hostname with CPS cert

### Secure Property Onboarding
- `onboard_secure_property` - Complete secure property workflow
- `quick_secure_property_setup` - Quick setup with defaults
- `check_secure_property_status` - Check onboarding status
- `debug_secure_property_onboarding` - Debug onboarding issues

### DNS Management - Core Functions
- `list_zones` - List all DNS zones with filtering
- `get_zone` - Get detailed zone information
- `create_zone` - Create new DNS zones (PRIMARY, SECONDARY, or ALIAS)
- `list_records` - List DNS records in a zone
- `upsert_record` - Create or update DNS records
- `delete_record` - Delete DNS records

### DNS Management - Advanced Functions
- `get_zones_dnssec_status` - Check DNSSEC status for multiple zones
- `get_secondary_zone_transfer_status` - Get transfer status for secondary zones
- `get_zone_contract` - Get contract information for zones
- `get_record_set` - Get a specific DNS record set
- `update_tsig_key_for_zones` - Update TSIG authentication keys
- `submit_bulk_zone_create_request` - Create multiple zones in bulk
- `get_zone_version` - Get specific zone version details
- `get_version_record_sets` - Get records from a specific zone version
- `reactivate_zone_version` - Reactivate a previous zone version
- `get_version_master_zone_file` - Export zone version as master file
- `create_multiple_record_sets` - Create multiple DNS records in bulk

### DNS Migration Tools
- `import_zone_via_axfr` - Import DNS zones via AXFR transfer
- `parse_zone_file` - Parse and validate zone file content
- `bulk_import_records` - Bulk import DNS records from parsed data
- `convert_zone_to_primary` - Convert secondary zones to primary
- `generate_migration_instructions` - Generate provider-specific migration guides

## Development

### Prerequisites
- Node.js 18+ 
- TypeScript 5+
- Akamai account with API credentials

### Setup
```bash
# Clone the repository
git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start with interactive mode (default)
npm start

# Or start specific services directly
node dist/servers/property-server.js
node dist/servers/dns-server.js
node dist/servers/certs-server.js
node dist/servers/security-server.js
node dist/servers/reporting-server.js
```

### TypeScript Configuration

The project now uses full TypeScript strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true
  }
}
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Architecture

### Recent Refactoring (v1.3.0)

The server has undergone a complete architectural refactoring:

#### Key Changes:
1. **Service Separation**: Monolithic server split into 5 focused modules
2. **TypeScript Migration**: All JavaScript files converted to TypeScript
3. **Strict Mode**: Full TypeScript strict mode enabled
4. **Interactive CLI**: New user-friendly startup experience
5. **Performance Optimization**: Reduced memory footprint and improved startup times

#### Modular Structure:

```
src/
├── index.ts                          # Interactive CLI entry point
├── servers/
│   ├── property-server.ts            # Property management module (32 tools)
│   ├── dns-server.ts                 # DNS management module (24 tools)
│   ├── certs-server.ts               # Certificate management module (22 tools)
│   ├── security-server.ts            # Security services module (95 tools)
│   └── reporting-server.ts           # Analytics & reporting module (25 tools)
├── akamai-client.ts                  # EdgeGrid authentication and API client
├── types.ts                          # TypeScript type definitions
├── services/
│   ├── FastPurgeService.ts           # FastPurge v3 API integration
│   ├── PurgeQueueManager.ts          # Intelligent queue management
│   └── PurgeStatusTracker.ts         # Real-time operation tracking
├── monitoring/
│   └── FastPurgeMonitor.ts           # Production monitoring and alerts
├── tools/
│   ├── property-tools.ts             # Core property management
│   ├── property-manager-tools.ts     # Property version & activation management
│   ├── property-manager-advanced-tools.ts  # Advanced property operations
│   ├── property-manager-rules-tools.ts     # Rule management utilities
│   ├── property-version-management.ts      # Enhanced version control
│   ├── rule-tree-management.ts       # Rule optimization and templates
│   ├── bulk-operations-manager.ts    # Multi-property bulk operations
│   ├── property-operations-advanced.ts     # Advanced search and health
│   ├── fastpurge-tools.ts            # FastPurge MCP tools
│   ├── dns-tools.ts                  # Core DNS operations
│   ├── dns-advanced-tools.ts         # Advanced DNS functions
│   ├── dns-migration-tools.ts        # DNS migration utilities
│   ├── cpcode-tools.ts               # CP code management
│   ├── product-tools.ts              # Product catalog operations
│   ├── cps-tools.ts                  # Certificate management
│   └── secure-by-default-onboarding.ts  # Secure property workflows
└── utils/
    ├── progress.ts                   # Progress indicators and formatting
    ├── errors.ts                     # Error handling and translation
    ├── resilience-manager.ts         # Circuit breaker and retry logic
    └── performance-monitor.ts        # Performance tracking
```

## Current Capabilities (v1.3.0)

### 🎯 New in v1.3.0
- **Complete TypeScript Migration**: 100% TypeScript codebase with full strict mode
- **Modular Architecture**: Services split into focused, independent modules
- **Interactive CLI**: User-friendly startup with service selection
- **Enhanced Type Safety**: Comprehensive interfaces and type definitions
- **Improved Error Handling**: Proper handling of unknown errors in catch blocks
- **Performance Optimization**: Reduced memory usage and faster startup times
- **Better Developer Experience**: Full IntelliSense support and type checking

### ✅ Implemented Features
- **Property Manager**: Full CRUD operations, version management, activation workflow
- **Edge DNS**: Zone management, record operations, bulk imports, DNSSEC support
- **Certificate Management**: Default DV certificates with automatic DNS validation
- **Multi-Account Support**: Seamless account switching (Akamai intenral and channel partners only)
- **Product Mapping**: Intelligent product selection and recommendations
- **CP Code Management**: Create and manage CP codes for reporting
- **Secure Property Onboarding**: Automated HTTPS property setup workflow
- **DNS Migration**: AXFR transfers, zone file imports, provider-specific guides
- **Advanced Search**: Property search by name, hostname, edge hostname
- **Progress Tracking**: Real-time feedback for long-running operations
- **FastPurge v3**: Intelligent content invalidation with rate limiting and queue management
- **Version Control**: Comprehensive version comparison, timeline, and rollback
- **Rule Tree Management**: Validation, optimization, templates, and merging
- **Bulk Operations**: Multi-property cloning, activation, and rule updates

### Previous Features (v1.2.0)
- **FastPurge Service**: Enterprise-grade content invalidation with intelligent rate limiting and batching
- **Advanced Version Management**: Version comparison, timeline tracking, rollback capabilities
- **Rule Tree Optimization**: Comprehensive validation, templates, and performance analysis
- **Bulk Operations**: Multi-property management with progress tracking
- **Enhanced Search**: Multi-criteria property search and health checks

### 🚧 Upcoming Features

#### Short term
- **Network Lists**: IP and geographic access control list management
- **Image & Video Manager**: Policy creation and management
- **Simple Edgeworkers**: Edge logic deployment (redirects, forwards, etc.)

#### Medium term
- **Application Security**: WAF rule management and security policies
- **Bot Manager**: Bot detection and mitigation configuration
- **Reporting API**: Traffic analytics and performance metrics
- **Securiy Metrics**: Security trends and metrcis

#### Long term Roadmap
- **API Definitions and Discovery**: API definition and policy management
- **Advanced EdgeWorkers**: JavaScript code deployment at the edge
- **Identity & Access Management**: User and API client management
- **Media Worflows**: Specific feature for Media delivery properties
- **mPulse**: Pull data RUM (Real User Monitoring) API integration
- **Property activation diffing**: Compare versions before activation
- **Terraform Export**: Generate Terraform configurations from existing properties

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- [Documentation](https://github.com/acedergren/alecs-mcp-server-akamai/wiki)
- [Issues](https://github.com/acedergren/alecs-mcp-server-akamai/issues)
- [Discussions](https://github.com/acedergren/alecs-mcp-server-akamai/discussions)

## Acknowledgments

This project uses the Akamai OPEN APIs and follows their guidelines for third-party integrations. Special thanks to the MCP team at Anthropic for creating the Model Context Protocol.
