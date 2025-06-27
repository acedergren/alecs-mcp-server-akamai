# ALECS - MCP Server for Akamai

MCP (Model Context Protocol) server that enables AI assistants to manage Akamai's edge platform through natural language.

> **Note**: This is an unofficial community project and comes without any support or warranty from Akamai Technologies.

## Update regading ALECS

**Stability over sprawl**. I have made the hard decision to remove alot of tools for now. ALECS 1.6 now focuses on ~25 core tools that actually work and is well tested with Akamai APIs. 

The plan is to slowy bring things back as we go and can make them stable, focusing on new worklows made possible with Elicitation in the new MCP spec from June 18, 2025.

## Quick Start

```bash
# Clone and install
git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai
npm install

# Configure credentials
cp .edgerc.example ~/.edgerc
# Edit ~/.edgerc with your Akamai credentials

# Run
npm start
```

## Core Features

- **Property Management** - Full CRUD operations on CDN properties
- **DNS** - Zone and record management with change-list workflow
- **Certificates** - DV certificate enrollment and management
- **FastPurge** - Content invalidation and cache management
- **Network Lists** - IP/Geo blocking and security lists
- **Account switching** - Account switching for with switch-key for those who need it ;)

## Configuration

### Akamai Credentials (.edgerc)

Create `~/.edgerc` with your Akamai API credentials:

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

### Claude Desktop Integration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

## Usage Examples

### Property Management
```
"List all my Akamai properties"
"Create property example.com using Ion Standard"
"Activate property to staging"
```

### DNS Management
```
"List DNS zones"
"Add A record for www.example.com pointing to 192.0.2.1"
"Migrate DNS from Cloudflare"
```

### FastPurge
```
"Purge https://example.com/images/*"
"Invalidate cache tag product-123"
```

### Reporting
```
"Get performance metrics for my properties"
"Show traffic analysis for last 24 hours"
"Generate usage report by CP code"
```

## Development

```bash
npm run build        # Build TypeScript
npm test            # Run tests
npm run dev         # Development mode
npm run lint        # Lint code
npm run typecheck   # Type checking
```

### Available Servers

- `npm run start:property` - Property management (31 tools)
- `npm run start:dns` - DNS management (24 tools)
- `npm run start:certs` - Certificate management (22 tools)
- `npm run start:security` - Security configuration (95 tools)
- `npm run start:reporting` - Analytics & metrics (19 tools)

## Docker

```bash
# Build
docker build -t alecs-mcp-server .

# Run
docker run -v ~/.edgerc:/home/node/.edgerc alecs-mcp-server
```

## Well-Tested Features

ALECS includes comprehensive test coverage for core functionality:

### Test Coverage Matrix

| Feature | Unit Tests | Integration | E2E | Status |
|---------|------------|-------------|-----|---------|
| **Property Management** | ✅ | ✅ | ✅ | Production Ready |
| **DNS Operations** | ✅ | ✅ | ✅ | Production Ready |
| **FastPurge** | ✅ | ✅ | ✅ | Production Ready |
| **Certificate Management** | ✅ | ⚠️ | ❌ | Beta |
| **Reporting** | ✅ | ⚠️ | ❌ | Beta |
| **Security Tools** | ✅ | ❌ | ❌ | Alpha |

### Current Test Results

- **346+ tests** across core functionality 
- **99%+ pass rate** with comprehensive validation
- **Code Kai methodology** with type safety and error handling
- **MCP protocol compliance** testing
- **Multi-customer isolation** verification

### Run Tests

```bash
npm test              # Run all tests
npm test:coverage     # Generate coverage report
npm test:watch        # Watch mode for development
```

## Architecture

ALECS uses a modular architecture with focused servers:

- **Property Server** - CDN property management (31 tools)
- **DNS Server** - DNS operations (24 tools)
- **Certificate Server** - SSL/TLS management (22 tools)
- **Security Server** - WAF, DDoS, Bot management (95 tools)
- **Reporting Server** - Analytics & metrics (19 tools)

## Remote MCP Hosting & Multi-Customer Architecture

ALECS is architected for **enterprise-grade hosted remote MCP server deployment**, supporting multiple customers through a single server instance with complete tenant isolation.

### 🏗️ **Multi-Customer Deployment Scenarios**

| Scenario | Description | Use Case |
|----------|-------------|----------|
| **🏢 SaaS MCP Provider** | Multiple organizations using shared MCP infrastructure | Cloud-hosted MCP service for multiple companies |
| **🔧 Enterprise MSP** | Service providers managing multiple client accounts | MSPs managing Akamai for multiple customers |
| **👨‍💼 Consulting Platform** | Consultants accessing multiple customer environments | Consultants with access to multiple client accounts |
| **☁️ Development Cloud** | Teams managing staging/production across customers | Dev teams with multi-environment access |

### 🎯 **Remote MCP Hosting Readiness Assessment**

| Component | Readiness Level | Hosted MCP Capability |
|-----------|----------------|----------------------|
| **🔐 Authentication & Sessions** | 🟢 **Production Ready** | OAuth + customer context switching |
| **🛡️ Customer Isolation** | 🟢 **Production Ready** | Complete tenant separation |
| **🏢 Property Management** | 🟢 **Production Ready** | Multi-customer property operations |
| **🔒 Security Management** | 🟢 **Production Ready** | Customer-isolated security policies |
| **📊 Reporting & Analytics** | 🟢 **Production Ready** | Cross-customer insights for MSPs |
| **🚀 Dynamic Deployment** | 🟡 **Enhancement Ready** | Configurable tool loading |
| **🌐 Transport Protocols** | 🟡 **Enhancement Ready** | HTTP/WebSocket for remote hosting |

### 🔐 **Enterprise Multi-Tenant Features**

#### **Customer Context Management**
- **OAuth-Based Authentication**: Token authentication for remote MCP clients
- **Session Management**: Multi-customer context switching without re-authentication
- **Role-Based Authorization**: Granular permissions per customer context
- **Secure Credential Storage**: Encrypted Akamai credentials with rotation
- **Complete Audit Trails**: Compliance-ready logging per customer

#### **Security Isolation**
- **Customer-Isolated Network Lists**: Separate IP controls per tenant
- **Multi-Customer Geo-Blocking**: Geographic controls per customer
- **Property Ownership Validation**: Prevents cross-customer access
- **Cross-Customer Threat Intelligence**: Shared insights (anonymized)

#### **Performance & Scaling**
- **Connection Pooling**: Optimized performance for multiple tenants
- **Per-Customer Monitoring**: Individual metrics and circuit breakers
- **Horizontal Scaling**: Multiple server instances for load distribution
- **Dynamic Tool Loading**: Customer-specific tool sets on demand

### 🔄 **Multi-Customer Configuration**

#### **.edgerc Multi-Customer Structure**
```ini
[default]                    # Default/primary customer
client_secret = default_secret
host = default.luna.akamaiapis.net
access_token = default_token
client_token = default_client

[client-acme]               # Service provider client 1
client_secret = acme_secret
host = acme.luna.akamaiapis.net
access_token = acme_token
client_token = acme_client
account_switch_key = B-M-ACME123

[client-beta]               # Service provider client 2
client_secret = beta_secret
host = beta.luna.akamaiapis.net
access_token = beta_token
client_token = beta_client

[division-media]            # Enterprise division 1
client_secret = media_secret
host = media.luna.akamaiapis.net
access_token = media_token
client_token = media_client

[testing]                   # Test environment (dedicated section)
client_secret = test_secret
host = test.luna.akamaiapis.net
access_token = test_token
client_token = test_client
```

#### **Customer Parameter Usage**
All tools support the `customer` parameter for multi-account operations:

```bash
# Examples with different customers
"List properties for customer client-acme"
"Get traffic summary for customer division-media" 
"Create property for customer client-beta"
"Switch to customer testing environment"
```

### 🚀 **Deployment Architecture Progression**

**Phase 1**: Local .edgerc multi-customer → **Phase 2**: OAuth sessions → **Phase 3**: Distributed credential service → **Phase 4**: Enterprise SaaS

The architecture supports everything from basic multi-customer setups to **full enterprise SaaS deployment** with OAuth authentication, role-based access control, and complete customer isolation.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT