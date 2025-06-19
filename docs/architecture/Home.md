# ALECS MCP Server for Akamai - Wiki Home

Welcome to the ALECS (Akamai Learning & Enablement Claude Server) documentation. This Model Context Protocol (MCP) server enables AI assistants to interact with Akamai's CDN and edge services APIs.

## Quick Navigation

### 🚀 Getting Started
- [Installation Guide](./user-guide/Installation-Guide.md) - Set up ALECS in your environment
- [Quick Start Tutorial](./user-guide/Quick-Start-Tutorial.md) - Your first CDN deployment
- [Configuration Guide](./user-guide/Configuration-Guide.md) - Configure credentials and settings

### 📖 User Guides
- [CDN Management](./user-guide/CDN-Management.md) - Property and rule configuration
- [DNS Operations](./user-guide/DNS-Operations.md) - Zone and record management
- [Certificate Management](./user-guide/Certificate-Management.md) - SSL/TLS certificate provisioning
- [Migration Guides](./user-guide/Migration-Guides.md) - Migrate from other platforms

### 🔧 Technical Reference
- [Architecture Overview](./technical-reference/Architecture-Overview.md) - System design and components
- [API Reference](./api-reference/README.md) - Complete tool documentation
- [Authentication](./technical-reference/Authentication.md) - EdgeGrid and multi-customer setup
- [Error Handling](./technical-reference/Error-Handling.md) - Common errors and solutions

### 👥 Contributor Guide
- [Development Setup](./contributor-guide/Development-Setup.md) - Set up your development environment
- [Code Structure](./contributor-guide/Code-Structure.md) - Project organization
- [Adding New Tools](./contributor-guide/Adding-New-Tools.md) - Extend ALECS functionality
- [Testing Guide](./contributor-guide/Testing-Guide.md) - Write and run tests
- [Contribution Guidelines](./contributor-guide/Contribution-Guidelines.md) - How to contribute

### 📦 Module Documentation
- [Property Manager](./modules/Property-Manager.md) - CDN property management
- [Edge DNS](./modules/Edge-DNS.md) - DNS zone and record management
- [CPS (Certificates)](./modules/CPS-Certificates.md) - Certificate provisioning
- [Fast Purge](./modules/Fast-Purge.md) - Content invalidation
- [Network Lists](./modules/Network-Lists.md) - Access control lists
- [Application Security](./modules/Application-Security.md) - WAF and security

## Features Overview

ALECS provides comprehensive access to Akamai's edge platform:

### Core Capabilities
- **CDN Management**: Create and manage content delivery properties
- **DNS Services**: Full DNS zone and record management
- **Certificate Provisioning**: Automated SSL/TLS certificate deployment
- **Multi-Customer Support**: Manage multiple Akamai accounts
- **Template System**: Pre-configured property templates
- **Migration Tools**: Import from other platforms (Cloudflare, zone files)

### Key Benefits
- **AI-Native Interface**: Designed for LLM interaction
- **Automation First**: Complex workflows simplified
- **Progress Tracking**: Real-time operation monitoring
- **Type Safety**: Full TypeScript implementation
- **Extensible**: Easy to add new capabilities

## Prerequisites

- Node.js 18+ or Docker
- Akamai account with API credentials
- Claude Desktop or compatible MCP client

## Quick Examples

### Deploy a CDN Property
```
"Create a CDN property for example.com with HTTPS"
```

### Migrate DNS from Cloudflare
```
"Import DNS zone example.com from Cloudflare"
```

### Provision SSL Certificate
```
"Create a DV certificate for www.example.com"
```

## Support & Resources

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Akamai Docs**: [Akamai TechDocs](https://techdocs.akamai.com)

## License

This project is licensed under the MIT License. See [LICENSE](../../LICENSE) for details.

---

*Last Updated: January 2025*