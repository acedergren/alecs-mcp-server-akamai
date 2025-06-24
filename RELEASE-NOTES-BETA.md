# ALECS v2.0.0-beta.1 Release Notes

## 🎉 Beta Release - December 2024

We're excited to announce the public beta of ALECS v2.0 - A LaunchGrid for Edge & Cloud Services!

This major release represents a complete architectural overhaul focused on developer experience,
consolidating 180+ individual tools into 25 powerful, business-focused tools organized by function
and complexity.

## 🚀 Major Features

### Consolidated Tool Architecture

- **From 180+ to 25 Tools**: Dramatically simplified API surface while maintaining full
  functionality
- **Business-Focused Organization**: Tools organized by what you want to achieve, not technical
  implementation
- **Progressive Complexity**: Essential tools for common tasks, advanced tools for power users

### Enhanced User Experience

- **Automatic API Token Generation**: No more manual token management for remote connections
- **Unified Server Modes**: Single command to start local (STDIO) or remote (WebSocket/SSE) servers
- **Docker-First Deployment**: Production-ready containers with health checks and monitoring

### Intelligent Workflow Assistants

- **Infrastructure Assistant**: Natural language property and certificate management
- **DNS Assistant**: Zero-downtime migrations with automated validation
- **Security Assistant**: Real-time threat response and compliance automation
- **Performance Assistant**: Business-metric driven optimization

### Multi-Customer Support

- **Seamless Account Switching**: Manage multiple Akamai accounts effortlessly
- **Automatic Key Detection**: Smart credential management per customer
- **Partner-Ready**: Built for MSPs and CSPs with customer isolation

## 🔄 Migration from v1.x

If you're upgrading from v1.x:

1. **Tool Names Have Changed**: Most tools have been consolidated. See the migration guide for
   mappings
2. **New Configuration Format**: Simplified configuration with automatic defaults
3. **Backward Compatibility**: Legacy tool support available via `npm run start:dev`

## 📦 Installation

```bash
# Install from npm
npm install -g alecs-mcp-server-akamai@beta

# Or clone and build
git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai
npm install
npm run build
```

## 🚦 Getting Started

```bash
# Local mode (Claude Desktop)
npm start

# Remote mode (WebSocket + SSE)
npm run start:remote

# Docker deployment
docker-compose up -d
```

## 🐛 Known Issues

- Some advanced property rule tree configurations may require the legacy server
  (`npm run start:dev`)
- Performance monitoring tools are still being optimized for the new architecture
- Documentation for all workflow assistants is still being completed

## 📣 Feedback

This is a beta release and we need your feedback! Please:

- Report bugs via [GitHub Issues](https://github.com/acedergren/alecs-mcp-server-akamai/issues)
- Share feature requests and suggestions
- Join our community discussions

## 🙏 Acknowledgments

Thank you to all our early testers and contributors who helped shape v2.0!

---

**Note**: This is a beta release. While we've tested extensively, please validate in non-production
environments first.
