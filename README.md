# ALECS - MCP Server for Akamai

**ALECS - A LaunchGrid for Edge & Cloud Services**

An MCP (Model Context Protocol) server that enables AI assistants to interact with Akamai's CDN and edge services APIs. ALECS provides comprehensive tools for managing Akamai properties, configurations, and services through natural language interactions.

## Features

### 🚀 Multi-Customer Support
- Seamless switching between multiple Akamai accounts
- Account-specific configurations via `.edgerc` sections
- Automatic account key detection and application

### 🔍 Intelligent Search
- Property lookup by name or ID
- Group search with filtering capabilities
- Automatic contract selection when not specified

### 📊 Comprehensive Property Management
- List and search properties across contracts
- Detailed property information including versions and activation status
- Property configuration and rule management

### 🔐 SSL/TLS Certificate Management (CPS)
- **Default DV Certificates**: Automated domain validation certificates
- **Enhanced TLS Network**: Modern TLS 1.3 support
- **ACME DNS Automation**: Automatic DNS validation record creation
- **Certificate Lifecycle**: Creation, renewal, and deployment tracking

### 🌍 DNS Management (Edge DNS)
- **Zone Management**: Create and manage PRIMARY, SECONDARY, and ALIAS zones
- **Record Operations**: Full CRUD for A, AAAA, CNAME, MX, TXT, and more
- **Bulk Operations**: Import/export via zone files
- **Hidden Changelist Workflow**: Transparent change management
- **Advanced DNS Functions**: DNSSEC status, zone transfers, versioning

### 🔄 DNS Migration Tools
- **Zone Transfer (AXFR)**: Import from any DNS provider supporting zone transfers
- **Zone File Import**: Parse and import standard BIND zone files
- **Bulk Record Import**: Efficient migration of large zones
- **Nameserver Migration Guide**: Step-by-step migration instructions

### 🔐 Secure Authentication
- EdgeGrid authentication protocol support
- Secure credential management via `.edgerc`
- Account switching via `account_key` field

### 🛠 Developer Experience
- **Docker Support**: Production-ready containers with compose configurations
- **Makefile Automation**: Comprehensive build, test, and deployment commands
- **Template Engine**: Extensible property template system
- **Progress Tracking**: Real-time feedback for long-running operations
- **LLM Optimized**: Designed for AI assistant interactions

## Installation

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

Add to your Claude Desktop configuration:

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
- `get_property_rules` - Get property configuration rules
- `update_property_rules` - Update property configuration
- `patch_property_rules` - Apply JSON patch to rules

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
- `list_all_hostnames` - List all hostnames across properties
- `bulk_search_properties` - Initiate bulk property search
- `get_bulk_search_results` - Get bulk search results
- `get_property_audit_history` - Get property change history

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

# Start development server
npm run dev
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

The server follows a modular architecture:

```
src/
├── index.ts                          # MCP server setup and request handling
├── akamai-client.ts                  # EdgeGrid authentication and API client
├── types.ts                          # TypeScript type definitions
├── tools/
│   ├── property-tools.ts             # Core property management
│   ├── property-manager-tools.ts     # Property version & activation management
│   ├── property-manager-advanced-tools.ts  # Advanced property operations
│   ├── property-manager-rules-tools.ts     # Rule management utilities
│   ├── dns-tools.ts                  # Core DNS operations
│   ├── dns-advanced-tools.ts         # Advanced DNS functions
│   ├── dns-migration-tools.ts        # DNS migration utilities
│   ├── cpcode-tools.ts               # CP code management
│   ├── product-tools.ts              # Product catalog operations
│   ├── cps-tools.ts                  # Certificate management
│   └── secure-by-default-onboarding.ts  # Secure property workflows
└── utils/
    └── progress.ts                   # Progress indicators and formatting
```

## Current Capabilities (v1.1.0)

### ✅ Implemented Features
- **Property Manager**: Full CRUD operations, version management, activation workflow
- **Edge DNS**: Zone management, record operations, bulk imports, DNSSEC support
- **Certificate Management**: Default DV certificates with automatic DNS validation
- **Multi-Customer Support**: Seamless account switching
- **Product Mapping**: Intelligent product selection and recommendations
- **CP Code Management**: Create and manage CP codes for reporting
- **Secure Property Onboarding**: Automated HTTPS property setup workflow
- **DNS Migration**: AXFR transfers, zone file imports, provider-specific guides
- **Advanced Search**: Property search by name, hostname, edge hostname
- **Progress Tracking**: Real-time feedback for long-running operations

### 🚧 Upcoming Features

#### Q3 2024
- **Network Lists**: IP and geographic access control list management
- **Fast Purge**: Content invalidation and cache clearing
- **Image & Video Manager**: Policy creation and management
- **Cloudlets**: Edge logic deployment (redirects, forwards, etc.)

#### Q4 2024
- **Application Security**: WAF rule management and security policies
- **Bot Manager**: Bot detection and mitigation configuration
- **Reporting API**: Traffic analytics and performance metrics
- **DataStream**: Real-time log streaming configuration

#### Future Roadmap
- **API Gateway**: API definition and policy management
- **EdgeWorkers**: JavaScript code deployment at the edge
- **Identity & Access Management**: User and API client management
- **China CDN**: Separate tools for China delivery properties
- **mPulse**: RUM (Real User Monitoring) integration
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
