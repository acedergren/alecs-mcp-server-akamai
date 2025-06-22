# ALECS - Akamai MCP Server

[![MCP 2025-06-18](https://img.shields.io/badge/MCP-2025--06--18-blue)](https://modelcontextprotocol.io)
[![npm version](https://img.shields.io/npm/v/alecs-mcp-server-akamai)](https://www.npmjs.com/package/alecs-mcp-server-akamai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/docker/v/ghcr.io/acedergren/alecs)](https://github.com/acedergren/alecs-mcp-server-akamai/pkgs/container/alecs)

Enterprise-grade Model Context Protocol (MCP) server for Akamai CDN management. Brings 200+ Akamai operations to AI assistants with production-ready security and multi-customer support.

## 🚀 Quick Start

```bash
# Install
npm install -g alecs-mcp-server-akamai

# Configure Akamai credentials
cp .edgerc.example ~/.edgerc
# Edit ~/.edgerc with your credentials

# Run
alecs
```

Or with Docker:
```bash
docker run -v ~/.edgerc:/root/.edgerc:ro ghcr.io/acedergren/alecs:latest
```

## 🎯 Why ALECS?

- **Comprehensive Coverage**: 200+ Akamai operations across Property Manager, DNS, Certificates, FastPurge, and more
- **Enterprise Ready**: Multi-customer support, token authentication, rate limiting, audit logging
- **MCP Compliant**: Full MCP 2025-06-18 protocol implementation
- **Production Tested**: Built for real-world Akamai workflows
- **Type Safe**: 100% TypeScript with strict typing

## 📚 Documentation

Visit our **[GitHub Wiki](https://github.com/acedergren/alecs-mcp-server-akamai/wiki)** for comprehensive documentation:

- [Installation & Setup](https://github.com/acedergren/alecs-mcp-server-akamai/wiki/Installation-&-Setup)
- [API Reference](https://github.com/acedergren/alecs-mcp-server-akamai/wiki/API-Reference)
- [Security & Authentication](https://github.com/acedergren/alecs-mcp-server-akamai/wiki/Security-&-Authentication)
- [Architecture Guide](https://github.com/acedergren/alecs-mcp-server-akamai/wiki/Architecture-&-Design)
- [Troubleshooting](https://github.com/acedergren/alecs-mcp-server-akamai/wiki/Troubleshooting)

## 💡 Example Usage

With Claude or any MCP-compatible AI assistant:

```
"List all properties in production"
"Create DNS A record for www.example.com pointing to 192.0.2.1"
"Invalidate cache for https://example.com/api/*"
"Generate report on bandwidth usage for last 7 days"
"Activate property version 3 to staging"
```

## 🛠️ Key Features

### Property Management
- Create, update, and activate properties
- Manage rules and behaviors
- Hostname configuration
- Version control

### DNS Management
- Zone and record management
- Bulk operations
- Zone transfers
- DNSSEC support

### Certificate Management
- DV enrollment
- Validation automation
- Deployment tracking
- Renewal management

### Performance & Security
- FastPurge cache invalidation
- Real-time analytics
- Network lists
- Security configurations

## 🏗️ Architecture

```
AI Assistant ──MCP──> ALECS Server ──EdgeGrid──> Akamai APIs
                          │
                          ├── Multi-customer support
                          ├── Token authentication
                          ├── Rate limiting
                          └── Audit logging
```

## 🔧 Configuration

### Basic Setup
```bash
# .env file
NODE_ENV=production
EDGERC_SECTION=default
LOG_LEVEL=info
```

### Multi-Customer Setup
```json
{
  "customers": {
    "prod": { "edgercSection": "production" },
    "staging": { "edgercSection": "staging" }
  }
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

### Development
```bash
# Clone and install
git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai
npm install

# Run tests
npm test

# Build
npm run build
```

## 🚦 Status

- **Current Version**: 1.4.0
- **MCP Protocol**: 2025-06-18
- **Node.js**: 18+ required
- **License**: MIT

## 📈 Roadmap

See our [Roadmap](https://github.com/acedergren/alecs-mcp-server-akamai/wiki/Roadmap-&-Future-Plans) for upcoming features:
- WebSocket transport
- Enhanced security features
- Extended API coverage
- Plugin system

## 🆘 Support

- 📖 [Documentation Wiki](https://github.com/acedergren/alecs-mcp-server-akamai/wiki)
- 💬 [GitHub Discussions](https://github.com/acedergren/alecs-mcp-server-akamai/discussions)
- 🐛 [Issue Tracker](https://github.com/acedergren/alecs-mcp-server-akamai/issues)
- 🔐 Security: security@alecs.io

## 📄 License

MIT © 2024 Alex Cedergren

---

Built with ❤️ for the Akamai community