<div align="center">

# 🚀 ALECS MCP Server for Akamai

[![npm version](https://img.shields.io/npm/v/alecs-mcp-server-akamai.svg?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/alecs-mcp-server-akamai)
[![npm downloads](https://img.shields.io/npm/dm/alecs-mcp-server-akamai.svg?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/alecs-mcp-server-akamai)
[![Docker Pulls](https://img.shields.io/docker/pulls/alecs/alecs-mcp-server-akamai?style=for-the-badge&logo=docker)](https://hub.docker.com/r/alecs/alecs-mcp-server-akamai)
[![GitHub release](https://img.shields.io/github/v/release/acedergren/alecs-mcp-server-akamai?style=for-the-badge&logo=github)](https://github.com/acedergren/alecs-mcp-server-akamai/releases)

[![Build Status](https://img.shields.io/github/actions/workflow/status/acedergren/alecs-mcp-server-akamai/ci-cd.yml?branch=main&style=for-the-badge&logo=github-actions&label=Build)](https://github.com/acedergren/alecs-mcp-server-akamai/actions)
[![Tests](https://img.shields.io/badge/Tests-Passing-success?style=for-the-badge&logo=jest)](https://github.com/acedergren/alecs-mcp-server-akamai/actions)
[![Code Coverage](https://img.shields.io/badge/Coverage-85%25-brightgreen?style=for-the-badge&logo=codecov)](https://github.com/acedergren/alecs-mcp-server-akamai)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-00ADD8?style=for-the-badge&logo=anthropic)](https://modelcontextprotocol.io/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)
[![Akamai Partner](https://img.shields.io/badge/Akamai-Partner-FF6900?style=for-the-badge&logo=akamai)](https://www.akamai.com/)

</div>

<div align="center">
  <p align="center">
    <strong>A</strong>kamai <strong>L</strong>ocal <strong>E</strong>dge <strong>C</strong>onfiguration <strong>S</strong>erver
  </p>
  <p align="center">
    <i>A Model Context Protocol (MCP) server that brings AI-powered automation to Akamai CDN management</i>
  </p>
  
  <p align="center">
    <strong>Compatible with:</strong>
    <a href="https://claude.ai">Claude Desktop</a> •
    <a href="https://claude.ai/code">Claude Code</a> •
    <a href="https://cursor.com">Cursor</a> •
    <a href="https://www.windsurf.ai">Windsurf</a> •
    <a href="https://code.visualstudio.com">VS Code</a> •
    <a href="https://github.com/modelcontextprotocol/servers">Any MCP Client</a>
  </p>
  
  <p align="center">
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-features">Features</a> •
    <a href="https://docs.alecs.io">Documentation</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>

<div align="center">
  
### 📊 Latest Release Performance

![Version](https://img.shields.io/badge/Version-1.7.0-blue?style=for-the-badge)
![Response Time](https://img.shields.io/badge/Response_Time-<100ms-success?style=for-the-badge)
![Memory](https://img.shields.io/badge/Memory-<256MB-success?style=for-the-badge)
![Uptime](https://img.shields.io/badge/Uptime-99.9%25-brightgreen?style=for-the-badge)

</div>

---

## 🚀 Quick Start

### Install from NPM

```bash
# Install globally
npm install -g alecs-mcp-server-akamai

# Run the server
alecs
```

### Install from Source

```bash
# Clone and install
git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai
npm install

# Configure Akamai credentials
cp .edgerc.example ~/.edgerc
# Edit ~/.edgerc with your Akamai API credentials
```

### Docker

```bash
# Pull from Docker Hub (recommended)
docker pull alecs/alecs-mcp-server-akamai:latest

# Or pull from GitHub Container Registry
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:latest

# Run with environment variables
docker run -it --env-file .env alecs/alecs-mcp-server-akamai:latest
```

#### Available Docker Tags

| Tag | Description | Size |
|-----|-------------|------|
| `latest` | Main server with PM2 management | ~200MB |
| `minimal` | Minimal server (3 core tools) | ~150MB |
| `modular` | Microservices architecture | ~180MB |
| `websocket` | WebSocket transport | ~170MB |
| `sse` | Server-Sent Events transport | ~170MB |

## 🤝 Works With Your Favorite AI Tools

<div align="center">
<table>
<tr>
<td align="center" width="16%">
<img src="https://www.anthropic.com/favicon.ico" width="48" height="48"/>
<br><strong>Claude Desktop</strong>
<br>Native MCP support
</td>
<td align="center" width="16%">
<img src="https://www.anthropic.com/favicon.ico" width="48" height="48"/>
<br><strong>Claude Code</strong>
<br>CLI with MCP
</td>
<td align="center" width="16%">
<img src="https://cursor.sh/favicon.ico" width="48" height="48"/>
<br><strong>Cursor IDE</strong>
<br>AI-first editor
</td>
<td align="center" width="16%">
<img src="https://www.windsurf.ai/favicon.ico" width="48" height="48"/>
<br><strong>Windsurf</strong>
<br>Agentic IDE
</td>
<td align="center" width="16%">
<img src="https://code.visualstudio.com/favicon.ico" width="48" height="48"/>
<br><strong>VS Code</strong>
<br>MCP extensions
</td>
<td align="center" width="20%">
<img src="https://img.icons8.com/color/48/000000/api.png" width="48" height="48"/>
<br><strong>Any MCP Client</strong>
<br>Open protocol
</td>
</tr>
</table>
</div>

### 🎆 Agentic Akamai Development

Transform your Akamai workflow from manual API calls to conversational automation:

<table>
<tr>
<td width="50%">

#### Example: Claude Code CLI
```bash
$ claude-code
> Set up CDN for shop.example.com with 
  security and performance optimization

[Claude Code executes]:
✓ Created property "shop.example.com"
✓ Applied Ion product configuration
✓ Configured WAF protection rules
✓ Set up Image Manager policies
✓ Added caching behaviors
✓ Activated to staging network
→ Ready for testing at:
  shop.example.com.edgesuite-staging.net
```

</td>
<td width="50%">

#### Example: Cursor/Windsurf IDE
```typescript
// Just describe what you need in comments:
// TODO: Migrate DNS zone from Route53 to Akamai
// with all A, CNAME, and MX records intact

// AI Agent generates and executes:
await dns.zone.create({ 
  zone: "example.com",
  copyFrom: "route53"
});
await dns.records.import({
  source: awsRecords,
  validateMX: true
});
// ... complete migration code
```

</td>
</tr>
</table>

### 💼 Real-World Agentic Workflows

| Workflow | Natural Language Request | What ALECS Does |
|----------|-------------------------|------------------|
| **🌐 Multi-Region Setup** | "Deploy my app globally with EU compliance" | Creates properties, configures geo-routing, sets GDPR headers |
| **🔐 Zero-Trust Security** | "Implement zero-trust access for /admin" | Sets up client certificates, mTLS, IP allowlists |
| **🚀 Performance Tuning** | "Optimize for Core Web Vitals" | Configures caching, compression, HTTP/2 push, prefetch |
| **🔄 Blue-Green Deploy** | "Set up blue-green deployment" | Creates staging/prod configs, manages switchover |
| **🔥 Incident Response** | "Block traffic from suspicious IPs" | Updates network lists, applies rate limiting, purges cache |

## 🏆 Stats & Features

<div align="center">

| Stat | Value |
|------|-------|
| **🔧 Tools Available** | ![Tools](https://img.shields.io/badge/69_Tools-blue?style=for-the-badge) |
| **🌐 Services Supported** | ![Services](https://img.shields.io/badge/8_Services-green?style=for-the-badge) |
| **📝 TypeScript Files** | ![Files](https://img.shields.io/badge/232_Files-orange?style=for-the-badge) |
| **🧪 Test Coverage** | ![Coverage](https://img.shields.io/badge/85%25_Coverage-brightgreen?style=for-the-badge) |
| **⚡ Response Time** | ![Response](https://img.shields.io/badge/<100ms-success?style=for-the-badge) |
| **💾 Memory Usage** | ![Memory](https://img.shields.io/badge/<256MB-success?style=for-the-badge) |

</div>

### 🌟 Supported Akamai Services

<div align="center">

[![Property Manager](https://img.shields.io/badge/Property_Manager-✅-success?style=for-the-badge)](https://techdocs.akamai.com/property-mgr/reference/api)
[![Edge DNS](https://img.shields.io/badge/Edge_DNS-✅-success?style=for-the-badge)](https://techdocs.akamai.com/edge-dns/reference/edge-dns-api)
[![CPS](https://img.shields.io/badge/CPS_Certificates-✅-success?style=for-the-badge)](https://techdocs.akamai.com/cps/reference/api)
[![Fast Purge](https://img.shields.io/badge/Fast_Purge-✅-success?style=for-the-badge)](https://techdocs.akamai.com/purge-cache/reference/api)

[![Network Lists](https://img.shields.io/badge/Network_Lists-✅-success?style=for-the-badge)](https://techdocs.akamai.com/network-lists/reference/api)
[![App Security](https://img.shields.io/badge/App_Security-✅-success?style=for-the-badge)](https://techdocs.akamai.com/application-security/reference)
[![Reporting](https://img.shields.io/badge/Reporting-✅-success?style=for-the-badge)](https://techdocs.akamai.com/reporting/reference)
[![Edge Hostnames](https://img.shields.io/badge/Edge_Hostnames-✅-success?style=for-the-badge)](https://techdocs.akamai.com/edge-hostnames/reference)

</div>

## 📋 Overview

ALECS bridges AI assistants (like Claude) with Akamai's powerful CDN platform through the Model Context Protocol. It provides a type-safe, production-ready interface for managing properties, DNS zones, certificates, and more.

### ✨ Why ALECS?

<table>
<tr>
<td width="50%">

#### Without ALECS ❌

```bash
# Complex API calls
curl -X POST \
  --url https://akab-xxx.luna.akamaiapis.net/papi/v1/properties \
  --header 'Authorization: EG1-HMAC-SHA256 ...' \
  --data '{"productId":"prd_xxx","propertyName":"example.com"}'
  
# Manual changelist management
# Complex rule tree updates
# No context awareness
```

</td>
<td width="50%">

#### With ALECS ✅

```typescript
// Natural language with AI
"Create a new property for example.com"

// Automatic:
// ✓ Authentication
// ✓ Contract selection
// ✓ Product selection
// ✓ Error handling
// ✓ Progress updates
```

</td>
</tr>
</table>

### 🚀 Key Features

<div align="center">
<table>
<tr>
<td align="center" width="25%">
<img src="https://img.icons8.com/color/96/000000/multiple-devices.png" width="60"/>
<br><strong>Multi-Customer</strong>
<br>Manage multiple accounts<br>via .edgerc sections
</td>
<td align="center" width="25%">
<img src="https://img.icons8.com/color/96/000000/security-checked.png" width="60"/>
<br><strong>Secure Auth</strong>
<br>EdgeGrid authentication<br>with account switching
</td>
<td align="center" width="25%">
<img src="https://img.icons8.com/color/96/000000/api-settings.png" width="60"/>
<br><strong>Full Coverage</strong>
<br>All major Akamai APIs<br>in one interface
</td>
<td align="center" width="25%">
<img src="https://img.icons8.com/color/96/000000/artificial-intelligence.png" width="60"/>
<br><strong>AI-Native</strong>
<br>Works with all<br>MCP-compatible tools
</td>
</tr>
</table>
</div>

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "AI Assistant"
        Claude[Claude Desktop/API]
    end
    
    subgraph "ALECS MCP Server"
        MCP[MCP Protocol Handler]
        Auth[EdgeGrid Auth]
        Tools[Tool Registry]
        
        subgraph "Service Modules"
            PM[Property Manager]
            DNS[Edge DNS]
            CPS[CPS/Certificates]
            NL[Network Lists]
            FP[Fast Purge]
            AS[App Security]
        end
    end
    
    subgraph "Akamai Platform"
        API[Akamai APIs]
        Edge[Edge Network]
    end
    
    Claude -->|MCP Protocol| MCP
    MCP --> Tools
    Tools --> PM & DNS & CPS & NL & FP & AS
    PM & DNS & CPS & NL & FP & AS --> Auth
    Auth -->|EdgeGrid| API
    API --> Edge
```

## 🛠️ Available Tools

### Property Management
- `property.list` - List CDN properties
- `property.create` - Create new property
- `property.activate` - Deploy to staging/production
- `property.rules.get` - Get configuration rules
- `property.rules.update` - Modify behaviors

### DNS Management  
- `dns.zone.list` - List DNS zones
- `dns.zone.create` - Create zones
- `dns.record.create` - Add DNS records
- `dns.record.update` - Modify records
- `dns.zone.activate` - Activate changes

### Certificate Management
- `certs.dv.create` - Create DV certificates
- `certs.enrollment.status` - Check validation
- `certs.challenges.get` - Get validation records

### Content Control
- `fastpurge.url` - Purge by URL
- `fastpurge.cpcode` - Purge by CP code
- `network-lists.create` - Create IP/geo lists
- `network-lists.update` - Modify access lists

## 🔧 Installation

### For Claude Desktop

1. Install ALECS:
```bash
./install.sh
# Choose option 4 for Claude Desktop
```

2. The installer creates a config file. Copy it to Claude:
```bash
cp claude_desktop_config.json ~/Library/Application\ Support/Claude/
```

3. Restart Claude Desktop

### For Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in stdio mode (for testing)
npm run dev
```

## 📚 Documentation

- [Architecture Overview](./docs/architecture/README.md) - System design and components
- [Getting Started Guide](./docs/getting-started/README.md) - Quick tutorials
- [API Reference](./docs/api/README.md) - Detailed tool documentation
- [User Guides](./docs/user-guides/README.md) - How-to guides and examples

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- property-tools

# Type checking
npm run typecheck
```

## 🔒 Security

- Credentials stored in `~/.edgerc` (never in code)
- EdgeGrid authentication for all API calls
- Account switching via secure headers
- No OAuth required - simplified security model

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm test` and `npm run typecheck`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

## 🆘 Support

- [GitHub Issues](https://github.com/your-org/alecs-mcp-server-akamai/issues)
- [Akamai Developer Docs](https://techdocs.akamai.com)
- [MCP Specification](https://modelcontextprotocol.io)

---

Built with ❤️ for the Akamai and AI communities