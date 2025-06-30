# Welcome to ALECS - Akamai's Enterprise MCP Server

ALECS (Akamai Leverage for Enterprise Control Systems) is a production-ready Model Context Protocol (MCP) server that brings the power of Akamai's CDN management to AI assistants.

## 🚀 Quick Start

```bash
# Install ALECS
npm install -g alecs-mcp-server-akamai

# Configure your Akamai credentials
cp .edgerc.example ~/.edgerc
# Edit ~/.edgerc with your credentials

# Run ALECS
alecs

# Or run with Docker
docker run -v ~/.edgerc:/root/.edgerc:ro ghcr.io/acedergren/alecs-mcp-server-akamai:latest
```

## 🎯 Why ALECS?

- **Enterprise-Ready**: Production-grade MCP server with multi-customer support
- **Comprehensive Coverage**: 200+ Akamai operations across all major APIs
- **Security First**: Token-based authentication, rate limiting, audit logging
- **Developer Friendly**: TypeScript, full type safety, extensive documentation
- **MCP 2025-06-18 Compliant**: Latest protocol version support

## 📚 Documentation

### Getting Started
- [[Installation & Setup]] - Complete setup guide
- [[Quick Start Guide]] - Get running in 5 minutes
- [[Configuration]] - All configuration options

### Core Features
- [[Property Manager Tools]] - CDN configuration management
- [[Edge DNS Tools]] - DNS zone and record management
- [[Certificate Management]] - SSL/TLS certificate operations
- [[FastPurge Tools]] - Cache invalidation
- [[Reporting Tools]] - Analytics and insights

### Advanced Topics
- [[Multi-Customer Setup]] - Managing multiple Akamai accounts
- [[Security & Authentication]] - Token management and security
- [[Architecture & Design]] - Technical deep dive
- [[API Reference]] - Complete tool documentation

### Operations
- [[Troubleshooting]] - Common issues and solutions
- [[Performance Tuning]] - Optimization guide
- [[Monitoring & Logging]] - Observability setup

### Development
- [[Contributing Guide]] - How to contribute
- [[Plugin Development]] - Extend ALECS
- [[Testing Guide]] - Testing strategies

## 🔧 Available MCP Tools

ALECS provides 200+ tools across these categories:

### Property Management (50+ tools)
- Create, update, activate properties
- Manage rules and behaviors
- Hostname configuration
- Version control

### DNS Management (30+ tools)
- Zone creation and management
- Record operations (A, AAAA, CNAME, etc.)
- Bulk record management
- Zone transfers

### Certificate Management (20+ tools)
- DV enrollment and validation
- Certificate deployment
- Renewal automation
- Validation status tracking

### Performance & Analytics (40+ tools)
- Real-time metrics
- Traffic analysis
- Cache performance
- Geographic insights

### Security (30+ tools)
- Network lists
- AppSec configurations
- WAF policies
- Rate limiting

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   AI Assistant  │────▶│   ALECS Server  │
│  (Claude, etc)  │ MCP │                 │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Akamai APIs    │
                        │  - PAPI         │
                        │  - DNS          │
                        │  - CPS          │
                        │  - Reporting    │
                        └─────────────────┘
```

## 🚦 Current Status

- **Version**: 1.4.0
- **MCP Protocol**: 2025-06-18
- **Coverage**: 200+ Akamai operations
- **Status**: Production Ready

## 🤝 Community

- [GitHub Issues](https://github.com/acedergren/alecs-mcp-server-akamai/issues) - Report bugs or request features
- [Discussions](https://github.com/acedergren/alecs-mcp-server-akamai/discussions) - Ask questions
- [Security](mailto:security@alecs.io) - Report vulnerabilities

## 📈 Roadmap

See our [[Roadmap & Future Plans]] for upcoming features:
- WebSocket transport support
- Extended API coverage
- Performance optimizations
- Plugin ecosystem

## 🙏 Acknowledgments

Built with ❤️ for the Akamai community by Alex Cedergren.

---

[Get Started](Installation-&-Setup) | [View Tools](API-Reference) | [Report Issue](https://github.com/acedergren/alecs-mcp-server-akamai/issues)