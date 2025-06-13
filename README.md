# ALECS - MCP Server for Akamai

**ALECS - A LaunchGrid for Edge & Cloud Services**

An MCP (Model Context Protocol) server that enables AI assistants to interact with Akamai's CDN and edge services APIs. ALECS provides comprehensive tools for managing Akamai properties, configurations, and services through natural language interactions.

> **Disclaimer**: This is an independent, solo project and is not affiliated with, endorsed by, or sponsored by Akamai Technologies, Inc. All product names, logos, and brands are property of their respective owners.

## Current Scope & Features

### Core Capabilities

#### 🌐 CDN & Property Management
- **Property Creation & Management**: Create, list, and manage CDN properties
- **Template-Based Provisioning**: Pre-built templates for Static Websites, Dynamic Web Apps, and API Acceleration
- **Rule Tree Configuration**: Advanced CDN behavior customization
- **Edge Hostname Management**: Automatic edge hostname creation and mapping
- **Activation Workflow**: Deploy to staging/production with progress tracking

#### 🔐 SSL/TLS Certificate Management (CPS)
- **Default DV Certificates**: Automated domain validation certificates
- **Enhanced TLS Network**: Modern TLS 1.3 support
- **ACME DNS Automation**: Automatic DNS validation record creation
- **Certificate Lifecycle**: Creation, renewal, and deployment tracking

#### 🌍 DNS Management (Edge DNS)
- **Zone Management**: Create and manage PRIMARY, SECONDARY, and ALIAS zones
- **Record Operations**: Full CRUD for A, AAAA, CNAME, MX, TXT, and more
- **Bulk Operations**: Import/export via zone files
- **Hidden Changelist Workflow**: Transparent change management
- **Cloudflare-Style Migration**: Direct import from Cloudflare API

#### 🔄 DNS Migration Tools
- **Zone Transfer (AXFR)**: Import from any DNS provider supporting zone transfers
- **API Import**: Direct integration with Cloudflare and other providers
- **Zone File Import**: Parse and import standard BIND zone files
- **Bulk Record Import**: Efficient migration of large zones
- **Nameserver Migration Guide**: Step-by-step migration instructions

#### 🚀 Multi-Customer Support
- **Account Switching**: Seamless switching between multiple Akamai accounts
- **Customer Profiles**: Separate `.edgerc` sections for different environments
- **Automatic Authentication**: EdgeGrid protocol with account key support

#### 🛠 Developer Experience
- **Docker Support**: Production-ready containers with compose configurations
- **Makefile Automation**: Comprehensive build, test, and deployment commands
- **Template Engine**: Extensible property template system
- **Progress Tracking**: Real-time feedback for long-running operations
- **LLM Optimized**: Designed for AI assistant interactions

## Installation

### Quick Start
```bash
# Clone the repository
git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai

# Setup (installs dependencies and builds)
make setup

# Run development server
make dev
```

### NPM Installation (coming soon)
```bash
npm install alecs-mcp-server-akamai
```

### Docker Installation
```bash
# Build and run with Docker
docker build -t alecs-mcp-server-akamai .
docker run -it --rm -v ~/.edgerc:/home/alecs/.edgerc:ro alecs-mcp-server-akamai
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

## Available MCP Tools

### Property Management
- `property.list` - List CDN properties with filtering options
- `property.get` - Get detailed property information
- `property.create` - Create new CDN properties
- `property.update_rules` - Update property rule tree
- `property.activate` - Deploy to staging/production
- `property.create_from_template` - Use pre-built templates

### Edge Hostname Management
- `edgehostname.create` - Create edge hostnames
- `edgehostname.list` - List edge hostnames
- `edgehostname.link` - Link to properties

### Certificate Management (CPS)
- `cps.create_enrollment` - Create DV certificate
- `cps.get_enrollment` - Get certificate status
- `cps.list_enrollments` - List all certificates
- `cps.check_validation` - Check domain validation
- `cps.create_acme_records` - Auto-create DNS validation

### DNS Zone Management
- `dns.zone.list` - List all DNS zones
- `dns.zone.get` - Get zone details
- `dns.zone.create` - Create new zones
- `dns.zone.import_cloudflare` - Import from Cloudflare
- `dns.zone.import_axfr` - Import via zone transfer
- `dns.zone.import_file` - Import from zone file

### DNS Record Management
- `dns.record.list` - List records in zone
- `dns.record.upsert` - Create/update records
- `dns.record.delete` - Delete records
- `dns.record.bulk_import` - Import multiple records

### Group & Contract Management
- `group.list` - List account groups
- `contract.list` - List contracts

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

## Documentation

- [Features Overview](./docs/features-overview.md) - Complete feature list and capabilities
- [CDN Provisioning Guide](./docs/cdn-provisioning-guide.md) - Step-by-step CDN + HTTPS setup
- [DNS Migration Guide](./docs/dns-migration-guide.md) - Complete DNS migration workflows
- [Docker Guide](./docs/docker-guide.md) - Container deployment and configuration
- [LLM Compatibility](./docs/llm-compatibility-guide.md) - AI assistant integration guide
- [Quick Start](./quick-start.md) - Get started quickly
- [Multi-Customer Setup](./docs/multi-customer-architecture.md) - Configure multiple accounts

## Architecture

The server follows a modular architecture:

```
src/
├── index.ts                      # MCP server setup and request handling
├── akamai-client.ts              # EdgeGrid authentication and API client
├── types.ts                      # TypeScript type definitions
├── tools/
│   ├── property-tools.ts         # Basic property management
│   ├── property-manager-tools.ts # Advanced property operations
│   ├── dns-tools.ts              # DNS zone and record management
│   ├── cps-tools.ts              # Certificate provisioning
│   ├── cps-dns-integration.ts    # ACME DNS automation
│   ├── dns-migration-tools.ts    # DNS migration utilities
│   ├── enhanced-dns-migration.ts # Cloudflare import
│   ├── edge-hostname-tools.ts    # Edge hostname management
│   └── network-list-tools.ts     # Access control lists
├── templates/
│   ├── property-templates.ts     # Pre-built CDN templates
│   └── template-engine.ts        # Template processing
├── agents/                       # Automation agents
└── utils/                        # Utility functions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Project Status

This project is actively maintained as a solo effort. It aims to provide comprehensive Akamai CDN management capabilities through the MCP protocol, enabling AI assistants to effectively manage edge infrastructure.

### Roadmap
- [ ] Fast Purge implementation
- [ ] Application Security (WAF) tools
- [ ] Reporting and analytics
- [ ] Image & Video Manager support
- [ ] EdgeWorkers integration

## License

MIT License - see LICENSE file for details

## Support

- [Documentation](https://github.com/acedergren/alecs-mcp-server-akamai/wiki)
- [Issues](https://github.com/acedergren/alecs-mcp-server-akamai/issues)
- [Discussions](https://github.com/acedergren/alecs-mcp-server-akamai/discussions)

## Acknowledgments

This project uses the Akamai OPEN APIs and follows their guidelines for third-party integrations. Special thanks to the MCP team at Anthropic for creating the Model Context Protocol.