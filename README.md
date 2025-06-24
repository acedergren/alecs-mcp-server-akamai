# ALECS - MCP Server for Akamai

**ALECS - A LaunchGrid for Edge & Cloud Services v2.0**

A consolidated MCP (Model Context Protocol) server that provides streamlined, business-focused tools
for managing Akamai's edge platform through natural language. ALECS v2.0 features enhanced UX with
25 consolidated tools (down from 180+) organized by business function and complexity level.

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

- **Certificate Lifecycle Management**: DV certificates, Enhanced TLS, and ACME automation
- **WAF & Bot Protection**: Application security with 95+ security tools
- **Network Lists**: IP/Geo blocking, allowlists, and threat intelligence integration
- **Compliance Ready**: SOX, PCI-DSS, and regulatory requirement support

### 🌍 **DNS & Traffic Management**

- **Global DNS Management**: PRIMARY, SECONDARY, and ALIAS zones with DNSSEC
- **DNS Migration Tools**: Seamless migration from any DNS provider
- **Traffic Steering**: Geolocation, failover, and load balancing
- **ACME Integration**: Automatic certificate validation record management


## 🤖 Intelligent Workflow Assistants

**Transform complex infrastructure tasks into simple conversations.** ALECS includes four AI-powered workflow assistants that understand your business needs and orchestrate multi-step processes automatically:

### 🏗️ **Infrastructure Workflow Assistant**
- **Natural Language**: "Launch my e-commerce site globally with PCI compliance"
- **What It Does**: Orchestrates property creation, SSL setup, security configuration, and activation
- **Business Focus**: ROI calculations, time-to-market estimates, scaling recommendations
- **Smart Defaults**: Selects optimal Akamai products based on your business type

### 🌐 **DNS Workflow Assistant**
- **Natural Language**: "Migrate my domain from Cloudflare without downtime"
- **What It Does**: Plans migration, validates records, handles cutover, provides rollback
- **Safety First**: Pre-flight checks, validation steps, and automated rollback plans
- **Zero Downtime**: Intelligent TTL management and progressive migration

### 🔒 **Security Workflow Assistant**
- **Natural Language**: "We're under DDoS attack right now!"
- **What It Does**: Analyzes threats, applies mitigations, monitors effectiveness
- **Compliance**: PCI, HIPAA, GDPR compliance workflows with audit trails
- **Adaptive**: Learns from your security posture and threat landscape

### 📊 **Performance Workflow Assistant**
- **Natural Language**: "Our mobile checkout is too slow"
- **What It Does**: Analyzes bottlenecks, optimizes configuration, monitors improvements
- **Business Metrics**: Conversion impact, revenue calculations, user experience scores
- **Continuous**: Ongoing optimization based on real-time data

### 💡 **Why Workflow Assistants?**
- **No Akamai Expertise Required**: Speak in business terms, get technical excellence
- **Multi-Step Automation**: Complex workflows executed flawlessly
- **Progressive Disclosure**: Start simple, dive deep when needed
- **Cross-Functional**: Assistants work together for comprehensive solutions
- **Risk Mitigation**: Built-in safety checks and rollback capabilities

## Core Akamai Capabilities

### 🚀 **Multi-Customer & Partner Support**

- **Seamless Account Switching**: Multiple Akamai accounts for partners and Akamai personnel
- **Account-Specific Configurations**: Isolated `.edgerc` sections per customer
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

## 🚀 Quick Start

Get ALECS running in under 5 minutes!

### Prerequisites
- Node.js 18+ installed ([download here](https://nodejs.org/))
- Akamai credentials (get them from [Akamai Control Center](https://control.akamai.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai

# Run the automated installer
./install.sh
```

The installer will:
✅ Check prerequisites  
✅ Install dependencies  
✅ Set up credential templates  
✅ Build the project  
✅ Help you choose how to run ALECS  

### Running ALECS v2.0

#### Server Modes

ALECS v2.0 provides two simple modes:

**Local Mode (Default - STDIO)**:
```bash
# For local Claude Desktop integration
npm start                   # Local mode (default)
npm run start:local         # Explicit local mode
node dist/index.js --local  # Direct execution
```

**Remote Mode (WebSocket + SSE)**:
```bash
# For remote access - starts both WebSocket (8082) and SSE (8083)
npm run start:remote        # Remote mode
node dist/index.js --remote # Direct execution
ALECS_MODE=remote npm start # Environment variable
```

**Development Server**:
```bash
# Full server with all 180+ individual tools (for development/migration)
npm run start:dev
node dist/index-dev.js
```

#### 🔑 Automatic API Token Generation

When starting in **remote mode**, ALECS automatically:
- Generates a secure API token
- Displays connection URLs with embedded tokens  
- Shows both WebSocket and SSE endpoints
- Provides ready-to-use connection examples

Example output:
```
🔑 API Token Generated
═══════════════════════════════════════════════════════

Token ID: tok_a1b2c3d4
Token:    alecs_xyz123...
Created:  6/23/2025, 10:30:00 AM

📋 Usage Examples:

• WebSocket connection:
  ws://localhost:8082/mcp?token=alecs_xyz123...

• SSE connection:
  http://localhost:8083/mcp?token=alecs_xyz123...

⚠️  IMPORTANT: Save this token securely!
   It will not be displayed again.
```

#### Docker Support

```bash
# Remote mode (WebSocket + SSE) - Default
docker-compose up -d

# Local mode (for testing)
docker-compose --profile local up

# Development server (all 180+ tools)  
docker-compose --profile dev up

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

#### Option 3: Remote Access Servers

Enable remote access to ALECS via WebSocket or SSE/HTTP:

**WebSocket Server** (Recommended for real-time bidirectional communication):
```bash
# Start the WebSocket server
npm run start:websocket

# Or with PM2 for production
npm run deploy:websocket
```

**SSE/HTTP Server** (MCP Streamable HTTP transport):
```bash
# Start the SSE server
npm run start:sse

# Or with PM2 for production
npm run deploy:sse
```

Both servers support:
- Secure token-based authentication
- Multiple concurrent clients
- Full MCP protocol implementation
- SSL/TLS support (configure via environment variables)

Generate an API token for either server:
```bash
npm run generate-token
```

#### Option 4: Claude Desktop Integration

For local Claude Desktop integration with v2.0:

```bash
# Option A: Main consolidated server (recommended)
cp claude_desktop_config.json ~/Library/Application\ Support/Claude/  # macOS
cp claude_desktop_config.json %APPDATA%\Claude\  # Windows
cp claude_desktop_config.json ~/.config/claude/  # Linux

# Option B: Development server (all 180+ tools)
# Edit claude_desktop_config.json to use index-dev.js instead

# Option C: WebSocket connection (local or remote)
# See the WebSocket Integration section below
```

### First Steps

1. **Update credentials**: Edit `~/.edgerc` with your Akamai credentials
2. **Test connection**: Run a simple command to verify setup
3. **Explore tools**: Use `npm start` to see available tools interactively

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

ALECS v2.0 features a completely redesigned architecture with consolidated tools for better UX:

- **Consolidated Tools**: 25 business-focused tools (down from 180+)
- **Enhanced Discovery**: Tools organized by category and complexity level
- **Better Performance**: Streamlined architecture with faster startup
- **Improved UX**: Business-context driven interactions with guided workflows

#### Option A: Main Server (Recommended) 🚀

Use the consolidated server with 25 business-focused tools:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["/path/to/alecs-mcp-server-akamai/dist/index.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "~/.edgerc"
      }
    }
  }
}
```

#### Option B: Development Server

Use the full server with all 180+ tools (for development/migration):

```json
{
  "mcpServers": {
    "alecs-dev": {
      "command": "node",
      "args": ["/path/to/alecs-mcp-server-akamai/dist/index-dev.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "~/.edgerc"
      }
    }
  }
}
```

#### Option C: Modular Servers (Legacy)

Specialized servers for specific use cases:

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
    }
  }
}
```

### Tool Categories in v2.0

| Category | Tools | Description |
|----------|--------|-------------|
| **Getting Started** | 2 | Website onboarding, DNS management |
| **Property Management** | 8 | Property lifecycle, configuration, activation |
| **Certificate Management** | 3 | SSL enrollment, monitoring, deployment |
| **Security** | 3 | Network lists, security policies |
| **Analytics** | 4 | Traffic, performance, advanced analytics |
| **Cost Management** | 2 | Cost analysis and optimization |
| **Troubleshooting** | 2 | Incident response, diagnostics |
| **Workflows** | 4 | AI-powered assistants for complex tasks |

**Recommendation**: Start with the main consolidated server (Option A) for the best user experience.

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

## Available Tools in v2.0

### Consolidated Business-Focused Tools

ALECS v2.0 consolidates 180+ technical tools into 25 business-focused tools organized by category:

#### Getting Started
- `website-onboarding` - Complete guided setup for new websites with security best practices
- `dns-management` - User-friendly DNS record management with guided workflows

#### Property Management
- `property-discovery` - Find, search, and analyze Akamai properties
- `property-creation` - Create new properties with guided configuration
- `property-configuration` - Configure property settings, rules, and hostnames
- `property-activation` - Activate properties with safety checks
- `property-versions` - Manage versions, compare changes, track history
- `hostname-assignment` - Assign and manage hostnames across properties
- `edge-hostname-management` - Create edge hostnames with certificate integration

#### Certificate Management
- `certificate-enrollment` - Enroll SSL certificates with guided domain validation
- `certificate-monitoring` - Monitor certificate status and expiration
- `certificate-deployment` - Deploy certificates to properties and edge networks

#### Security
- `network-lists-core` - Create and manage network lists for security policies
- `network-lists-activation` - Activate and deploy network list changes
- `network-lists-bulk` - Bulk operations for network lists

#### Analytics & Performance
- `traffic-analytics` - Analyze traffic patterns and trends
- `performance-analytics` - Monitor website performance and optimization
- `advanced-analytics` - Deep dive analytics for bandwidth and errors
- `hostname-analysis` - Analyze hostname conflicts and optimization

#### Cost Management
- `cost-analysis` - Analyze costs, usage patterns, and billing insights
- `cost-optimization` - Identify and implement cost optimization opportunities

#### Troubleshooting
- `incident-response` - Guided incident response for outages
- `troubleshooting` - Diagnostic tools for common issues

#### Workflow Assistants
- `infrastructure-assistant` - AI assistant for property and infrastructure decisions
- `dns-assistant` - AI assistant for DNS configuration and domain management
- `security-assistant` - AI assistant for security and compliance management
- `performance-assistant` - AI assistant for performance optimization

### Legacy Tools (alecs-dev server)

All 180+ individual tools remain available in the development server for migration and advanced use cases:

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

## What's New in v2.0

### 🎯 Major Features in v2.0

- **Tool Consolidation**: Reduced from 180+ tools to 25 focused, business-oriented tools
- **Enhanced Tool Discovery**: Tools categorized by business function and complexity level
- **Improved User Experience**: Business-context driven interactions with guided workflows
- **Streamlined Architecture**: Main server (alecs) vs development server (alecs-dev)
- **Better Performance**: Faster tool discovery and execution with consolidated interfaces
- **Progressive Disclosure**: Start simple, dive deep when needed with complexity levels
- **Business Focus**: Tools designed around business outcomes, not technical operations

### ✅ Consolidated Tool Categories

- **Getting Started**: Website onboarding with security best practices, user-friendly DNS management
- **Property Management**: Discovery, creation, configuration, activation, and version management
- **Certificate Management**: SSL enrollment, monitoring, and deployment workflows
- **Hostname Management**: Assignment, edge hostname management, and conflict analysis
- **Security**: Network lists, activation management, and bulk operations
- **Analytics & Performance**: Traffic analysis, performance monitoring, and advanced insights
- **Cost Management**: Cost analysis and optimization recommendations
- **Troubleshooting**: Incident response and diagnostic tools
- **Workflow Assistants**: AI-powered assistants for complex multi-step processes
- **All Legacy Tools**: Available in alecs-dev server for development and migration

### Previous Features (v1.2.0)

- **FastPurge Service**: Enterprise-grade content invalidation with intelligent rate limiting and
  batching
- **Advanced Version Management**: Version comparison, timeline tracking, rollback capabilities
- **Rule Tree Optimization**: Comprehensive validation, templates, and performance analysis
- **Bulk Operations**: Multi-property management with progress tracking
- **Enhanced Search**: Multi-criteria property search and health checks

### 🚧 Roadmap for v2.x

#### v2.1 - Enhanced Business Intelligence

- **Smart Recommendations**: AI-powered optimization suggestions based on usage patterns
- **Business Impact Analysis**: ROI calculations and business outcome predictions
- **Compliance Workflows**: Automated compliance checking and reporting

#### v2.2 - Advanced Integrations

- **Terraform Export**: Generate Infrastructure as Code from ALECS configurations
- **GitOps Integration**: Version control and CI/CD workflows
- **Multi-Provider Support**: Hybrid cloud and multi-CDN management

#### v2.3 - Enterprise Features

- **Advanced Security**: WAF, Bot Manager, and threat intelligence integration
- **Media Workflows**: Specialized tools for media delivery optimization
- **Edge Computing**: EdgeWorkers and edge logic deployment
- **Real User Monitoring**: mPulse integration for performance insights

## 🌐 Remote Access Integration

ALECS supports multiple transport protocols for remote access, allowing you to run the server on one machine and connect from Claude Desktop on another.

### Transport Options

1. **WebSocket** - Best for real-time, bidirectional communication
2. **SSE/HTTP** - MCP standard Streamable HTTP transport (compatible with more clients)

### Setting Up WebSocket Server

1. **Start the WebSocket Server**:
   ```bash
   # Development mode
   npm run start:websocket
   
   # Production mode with PM2
   npm run deploy:websocket
   ```

2. **Generate Authentication Token**:
   ```bash
   # Generate a new API token
   npm run generate-token
   # Save the token - it won't be shown again!
   ```

3. **Configure Environment** (optional):
   ```bash
   # Create .env file
   cat > .env << EOF
   ALECS_WS_PORT=8082
   ALECS_WS_HOST=0.0.0.0
   ALECS_WS_PATH=/mcp
   TOKEN_MASTER_KEY=your-secret-master-key
   EOF
   ```

### Connecting Claude Desktop via WebSocket

#### Method 1: WebSocket Client Bridge (Recommended)

1. **Install the WebSocket client**:
   ```bash
   # On the machine running Claude Desktop
   git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
   cd alecs-mcp-server-akamai
   npm install ws
   ```

2. **Configure Claude Desktop**:
   ```json
   {
     "mcpServers": {
       "alecs-akamai": {
         "command": "node",
         "args": ["/path/to/alecs-mcp-server-akamai/websocket-client.js"],
         "env": {
           "ALECS_WS_URL": "ws://your-server:8082/mcp",
           "ALECS_TOKEN": "your-generated-token"
         }
       }
     }
   }
   ```

#### Method 2: Direct WebSocket (if supported by Claude Desktop)

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "transport": "websocket",
      "url": "ws://your-server:8082/mcp",
      "headers": {
        "Authorization": "Bearer your-generated-token"
      }
    }
  }
}
```

#### Method 3: Docker Client

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "--env", "ALECS_WS_URL=ws://your-server:8082/mcp",
        "--env", "ALECS_TOKEN=your-generated-token",
        "alecs-mcp-client"
      ]
    }
  }
}
```

### Secure WebSocket (WSS) with HTTPS

For production environments, use secure WebSocket connections:

1. **Configure SSL in environment**:
   ```bash
   ALECS_SSL_CERT=/path/to/cert.pem
   ALECS_SSL_KEY=/path/to/key.pem
   ```

2. **Or use reverse proxy** (nginx example):
   ```nginx
   location /mcp {
       proxy_pass http://localhost:8082;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Authorization $http_authorization;
   }
   ```

3. **Update Claude Desktop config**:
   ```json
   {
     "env": {
       "ALECS_WS_URL": "wss://your-domain.com/mcp",
       "ALECS_TOKEN": "your-generated-token"
     }
   }
   ```

### Managing API Tokens

```bash
# List all tokens
echo '{"tool": "list-api-tokens"}' | npm run tool

# Revoke a token
echo '{"tool": "revoke-api-token", "args": {"tokenId": "tok_xxx"}}' | npm run tool

# Validate a token
echo '{"tool": "validate-api-token", "args": {"token": "your-token"}}' | npm run tool
```

### WebSocket Troubleshooting

1. **Connection refused**:
   - Check firewall: `sudo ufw allow 8082` (Ubuntu/Debian)
   - Verify server is running: `pm2 status`
   - Check logs: `pm2 logs mcp-akamai-websocket`

2. **Authentication failed**:
   - Verify token is correct
   - Check token hasn't expired
   - Ensure Authorization header is being sent

3. **Connection drops**:
   - Check network stability
   - Increase timeout in environment variables
   - Enable keepalive in WebSocket client

4. **SSL/TLS issues**:
   - Verify certificate paths
   - Check certificate validity
   - Ensure intermediate certificates are included

## 🔧 Troubleshooting

### Common Issues

#### Build Errors
```bash
# If you see TypeScript errors during build
npm run build:dev  # Builds without strict type checking

# Clean rebuild
npm run clean
npm run build
```

#### Authentication Issues
- **"Invalid credentials"**: Check your `.edgerc` file format and credentials
- **"Permission denied"**: Ensure your API credentials have the required permissions
- **"Account not found"**: Verify the account switch key format

#### WebSocket Connection Issues
- **Port already in use**: Kill existing process or use a different port
  ```bash
  lsof -i :8082  # Find process using port
  kill <PID>     # Kill the process
  ```
- **Connection refused**: Check firewall settings and ensure server is running

#### Docker Issues
- **"Cannot connect to Docker daemon"**: Ensure Docker Desktop is running
- **Volume mount errors**: Check file permissions and paths in docker-compose.yml

### Debug Mode

Enable debug logging for more information:
```bash
ALECS_LOG_LEVEL=debug npm start
```

### Getting Help

1. Check the [Wiki](https://github.com/acedergren/alecs-mcp-server-akamai/wiki) for detailed guides
2. Search [existing issues](https://github.com/acedergren/alecs-mcp-server-akamai/issues)
3. Join our [Discussions](https://github.com/acedergren/alecs-mcp-server-akamai/discussions)
4. Open a new issue with:
   - Your environment (OS, Node version)
   - Steps to reproduce
   - Error messages/logs
   - Expected vs actual behavior

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

This project uses the Akamai OPEN APIs and follows their guidelines for third-party integrations.
Special thanks to the MCP team at Anthropic for creating the Model Context Protocol.
