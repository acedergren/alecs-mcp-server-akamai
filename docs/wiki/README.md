# ALECS MCP Server Wiki

Welcome to the ALECS (Akamai Learning & Enablement Claude Server) documentation wiki. This comprehensive documentation is designed for GitHub Wiki deployment.

## Documentation Structure

```
wiki/
├── Home.md                          # Wiki homepage
├── README.md                        # This file
├── DEPRECATED-DOCS.md              # Migration tracking
│
├── user-guide/                      # End-user documentation
│   ├── Installation-Guide.md        # Getting started
│   ├── Quick-Start-Tutorial.md      # First CDN deployment
│   ├── Configuration-Guide.md       # Advanced configuration
│   ├── CDN-Management.md           # CDN operations
│   ├── DNS-Operations.md           # DNS management
│   ├── Certificate-Management.md    # SSL/TLS certificates
│   └── Migration-Guides.md         # Platform migration
│
├── technical-reference/             # Technical documentation
│   ├── Architecture-Overview.md     # System design
│   ├── Authentication.md           # EdgeGrid auth
│   ├── Error-Handling.md           # Error reference
│   ├── Multi-Customer.md           # Multi-tenant setup
│   ├── Templates.md                # Property templates
│   └── Observability.md            # Monitoring
│
├── contributor-guide/               # Developer documentation
│   ├── Development-Setup.md        # Dev environment
│   ├── Code-Structure.md           # Project organization
│   ├── Adding-New-Tools.md         # Extending ALECS
│   ├── Testing-Guide.md            # Testing practices
│   └── Contribution-Guidelines.md  # Contributing
│
├── modules/                         # Module-specific docs
│   ├── Property-Manager.md         # CDN properties
│   ├── Edge-DNS.md                 # DNS services
│   ├── CPS-Certificates.md         # Certificates
│   ├── Fast-Purge.md               # Content purging
│   ├── Network-Lists.md            # Access control
│   └── Application-Security.md     # WAF/Security
│
└── api-reference/                   # API documentation
    ├── README.md                    # API overview
    ├── property-tools.md            # Property APIs
    ├── property-manager-tools.md    # Advanced property APIs
    ├── dns-tools.md                 # DNS APIs
    ├── cps-tools.md                 # Certificate APIs
    └── dns-migration-tools.md       # Migration APIs
```

## Using This Documentation

### For GitHub Wiki

1. Copy all files from `docs/wiki/` to your GitHub Wiki repository
2. The `Home.md` file will become the wiki homepage
3. GitHub will automatically create navigation from the folder structure

### Local Viewing

You can view these docs locally with any Markdown viewer:

```bash
# Using VS Code
code docs/wiki/

# Using grip (GitHub-flavored markdown preview)
pip install grip
grip docs/wiki/Home.md

# Using mdbook
mdbook serve docs/wiki/
```

## Documentation Guidelines

### Writing Style

- Use clear, concise language
- Include practical examples
- Provide context and explanations
- Link to related documentation

### Formatting Standards

- Use ATX-style headers (`#`, `##`, etc.)
- Code blocks with language hints
- Tables for parameter documentation
- Descriptive link text

### Content Requirements

Each guide should include:
- Table of contents
- Overview/introduction
- Step-by-step instructions
- Code examples
- Troubleshooting section
- Related links

## Maintenance

### Adding New Documentation

1. Create file in appropriate directory
2. Update this README
3. Add to relevant index pages
4. Cross-link from related docs

### Updating Existing Docs

1. Keep examples current
2. Update for new features
3. Fix broken links
4. Maintain consistency

### Deprecating Content

1. Move to archive folder
2. Update DEPRECATED-DOCS.md
3. Add redirect notes
4. Update all links

## Contributing

See [Contribution Guidelines](./contributor-guide/Contribution-Guidelines.md) for details on contributing to documentation.

### Quick Tips

- Test all code examples
- Verify links work
- Check spelling/grammar
- Follow existing patterns

## Documentation Status

| Section | Status | Last Updated |
|---------|--------|--------------|
| User Guide | ✅ Complete | Jan 2025 |
| Technical Reference | 🚧 In Progress | Jan 2025 |
| Contributor Guide | ✅ Complete | Jan 2025 |
| Module Docs | 🚧 In Progress | Jan 2025 |
| API Reference | 📝 Planned | Jan 2025 |

## Migration Progress

See [DEPRECATED-DOCS.md](./DEPRECATED-DOCS.md) for documentation migration status.

## Resources

- [Akamai TechDocs](https://techdocs.akamai.com)
- [MCP Specification](https://modelcontextprotocol.org)
- [Project Repository](https://github.com/your-org/alecs-mcp-server-akamai)

---

*This wiki is actively maintained. For issues or suggestions, please open a GitHub issue.*

*Last Updated: January 2025*