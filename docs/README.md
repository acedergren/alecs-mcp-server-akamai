# ALECS Developer Documentation

**Comprehensive documentation for the ALECS MCP Server development team**

**Version:** 1.7.4  
**Last Updated:** 2025-07-09  
**Total Tools:** 156 across 15 service domains

## 📚 Documentation Index

### 🚀 Quick Start
| Document | Purpose | Audience |
|----------|---------|----------|
| **[Developer Onboarding](./DEVELOPER_ONBOARDING.md)** | Complete team handover guide | New developers |
| **[Getting Started](./getting-started/README.md)** | Installation and basic usage | All users |
| **[Tool Creation Guide](./TOOL_CREATION_GUIDE.md)** | How to add new tools | Developers |

### 🏗️ Architecture
| Document | Purpose | Key Topics |
|----------|---------|------------|
| **[Architecture Deep Dive](./ARCHITECTURE_DEEP_DIVE.md)** | Technical system design | Core framework, domains, performance |
| **[Architecture Overview](./architecture/README.md)** | High-level system design | Components, data flow, patterns |
| **[Request Flows](./architecture/REQUEST_FLOWS.md)** | Request processing details | MCP protocol, tool execution |

### 💻 Development
| Document | Purpose | Key Topics |
|----------|---------|------------|
| **[Development Guide](./DEVELOPMENT_GUIDE.md)** | Coding standards & patterns | TypeScript, testing, Git workflow |
| **[Testing Strategy](./TESTING_STRATEGY.md)** | Comprehensive testing approach | Unit, integration, E2E, performance |
| **[API Reference](./API_REFERENCE.md)** | Complete tool documentation | All 156 tools with examples |

### 🚀 Operations
| Document | Purpose | Key Topics |
|----------|---------|------------|
| **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** | Production deployment | Docker, Kubernetes, cloud providers |
| **[Operations Runbook](./OPERATIONS_RUNBOOK.md)** | Production operations | Monitoring, troubleshooting, incidents |
| **[Troubleshooting](./troubleshooting/README.md)** | Common issues & solutions | Debugging, error resolution |

### 📖 Additional Resources
- **[User Guides](./user-guides/README.md)** - End-user documentation
- **[Roadmap](./roadmap/ROADMAP.md)** - Future development plans
- **[Akamai API Specs](./akamai-api-specs/)** - Official API documentation

## 🔑 Key Features

- **Multi-Customer Support** - Manage multiple Akamai accounts
- **Type Safety** - Full TypeScript with runtime validation
- **Smart Caching** - Intelligent response caching
- **Error Recovery** - Circuit breakers and retry logic
- **Comprehensive Coverage** - All major Akamai APIs

## 🛠️ Service Coverage

| Service | Tools | Description |
|---------|-------|-------------|
| **Property Manager** | 25 | CDN property configuration and management |
| **Security** | 47 | Network lists, WAF, bot management, rate control |
| **Edge DNS** | 12 | DNS zones, records, and DNSSEC management |
| **Certificates** | 8 | SSL/TLS certificate lifecycle management |
| **Fast Purge** | 8 | Content invalidation and cache management |
| **Reporting** | 9 | Traffic analytics and performance metrics |
| **Edge Hostnames** | 10 | Hostname management and configuration |
| **Includes** | 10 | Shared configuration management |
| **Workflows** | 7 | Complex operation orchestration |
| **SIEM** | 4 | Security event integration |

## 📊 System Requirements

- Node.js 18+ (20.x recommended)
- TypeScript 5.0+
- Valid Akamai API credentials
- Claude Desktop or compatible MCP client

## 🔐 Security

ALECS follows Akamai's security best practices:
- EdgeGrid authentication only
- Credentials stored in `.edgerc` file
- No secrets in code or logs
- Secure multi-tenant isolation

## 📞 Support

- [GitHub Issues](https://github.com/acedergren/alecs-mcp-server-akamai/issues)
- [API Documentation](https://techdocs.akamai.com)
- [MCP Protocol Spec](https://modelcontextprotocol.io)

## 🎯 Documentation by Role

### For New Developers
1. Start with **[Developer Onboarding](./DEVELOPER_ONBOARDING.md)**
2. Read **[Architecture Deep Dive](./ARCHITECTURE_DEEP_DIVE.md)**
3. Review **[Development Guide](./DEVELOPMENT_GUIDE.md)**
4. Study **[Testing Strategy](./TESTING_STRATEGY.md)**

### For DevOps/SRE
1. Read **[Deployment Guide](./DEPLOYMENT_GUIDE.md)**
2. Study **[Operations Runbook](./OPERATIONS_RUNBOOK.md)**
3. Review monitoring and alerting configurations

### For API Integration
1. Start with **[API Reference](./API_REFERENCE.md)**
2. Review **[Tool Creation Guide](./TOOL_CREATION_GUIDE.md)**
3. Check authentication patterns in Architecture docs



---

**Built with ❤️ for Akamai by Alexander Cedergren, alex@solutionsedge.io**
