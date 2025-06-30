# ALECS MCP Server Documentation

Welcome to the ALECS MCP Server documentation. This guide provides comprehensive information for integrating with Akamai's CDN platform through the Model Context Protocol.

**Version:** 1.6.2  
**Last Updated:** 2025-06-30  
**Total Tools:** 113+ across 5 service modules

## 📚 Documentation Structure

### 🚀 [Getting Started](./getting-started/)
- **Quick Start** - Get up and running in 5 minutes
- **Installation** - Detailed setup instructions
- **Configuration** - Configure for your Akamai account
- **First Steps** - Your first API calls

### 🏗️ [Architecture](./architecture/)
- **System Design** - Overall architecture and design principles
- **Component Details** - Deep dive into each component
- **Data Flow** - How data moves through the system
- **Security Model** - Authentication and authorization

### 🔧 [API Reference](./api/)
- **Complete API Reference** - All 113+ available tools
- **Property Manager APIs** - CDN configuration management
- **Edge DNS APIs** - DNS zone and record management
- **Certificate APIs** - SSL/TLS certificate lifecycle
- **Security APIs** - Network lists and WAF policies
- **Reporting APIs** - Analytics and performance metrics

### 📖 [User Guides](./user-guides/)
- **Common Workflows** - Step-by-step tutorials
- **Best Practices** - Recommended patterns
- **Troubleshooting** - Common issues and solutions
- **Examples** - Real-world use cases

### 🚀 [Deployment](./deployment/)
- **Claude Desktop Setup** - Recommended for development
- **Docker Deployment** - Container-based deployment
- **Production Guide** - Best practices for production
- **Monitoring** - Health checks and metrics

## 🔑 Key Features

- **Multi-Customer Support** - Manage multiple Akamai accounts
- **Type Safety** - Full TypeScript with runtime validation
- **Smart Caching** - Intelligent response caching
- **Error Recovery** - Circuit breakers and retry logic
- **Comprehensive Coverage** - All major Akamai APIs

## 🛠️ Service Modules

- **alecs-property** - CDN property configuration and management
- **alecs-dns** - DNS zones, records, and DNSSEC management
- **alecs-security** - Network lists, WAF, and security policies
- **alecs-certs** - SSL/TLS certificate lifecycle management
- **alecs-reporting** - Traffic analytics and performance metrics

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

- [GitHub Issues](https://github.com/your-org/alecs-mcp-server-akamai/issues)
- [API Documentation](https://techdocs.akamai.com)
- [MCP Protocol Spec](https://modelcontextprotocol.io)