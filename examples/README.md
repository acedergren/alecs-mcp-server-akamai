# Akamai MCP Server Examples

This directory contains comprehensive examples demonstrating how to use the Akamai MCP Server for various CDN, DNS, security, and content delivery operations.

## Directory Structure

```
examples/
├── README.md                    # This file
├── PROMPTS_EXAMPLES.md         # Comprehensive prompt examples with explanations
├── scripts/                    # Executable shell scripts
│   ├── property-management-examples.sh
│   ├── dns-operations-examples.sh
│   ├── content-purge-examples.sh
│   ├── security-configuration-examples.sh
│   ├── onboarding-workflow-examples.sh
│   └── reporting-analytics-examples.sh
├── demos/                      # Interactive demonstrations
└── agent-demo.ts              # Agent-based workflow example
```

## Quick Start

### Using Natural Language Prompts

The MCP server accepts natural language prompts. See `PROMPTS_EXAMPLES.md` for comprehensive examples like:

```
List all my properties
Create a DNS zone for example.com
Purge https://www.example.com/image.png
Onboard a new property for www.example.com
```

### Using Script Examples

The scripts in the `scripts/` directory demonstrate programmatic usage:

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run property management examples
./scripts/property-management-examples.sh

# Run DNS operations examples
./scripts/dns-operations-examples.sh
```

## Example Categories

### 1. Property Management
- List, search, and filter properties
- Create and manage property versions
- Configure caching rules and behaviors
- Activate properties to staging/production

### 2. DNS Operations
- Create and manage DNS zones
- Add/update/delete DNS records (A, CNAME, MX, TXT, etc.)
- Bulk DNS operations
- Zone activation and validation

### 3. Content Purging
- Purge by URL (single or multiple)
- Purge by CP Code
- Purge by cache tag
- Invalidate vs delete operations
- Check purge status

### 4. Security Configuration
- Create and manage network lists
- Configure IP whitelists/blacklists
- Set up geographic restrictions
- Configure rate limiting
- Web Application Firewall (WAF) rules

### 5. Onboarding Workflows
- Simple property onboarding
- Multi-domain setup
- API endpoint configuration
- Complete site migration
- SSL certificate management

### 6. Reporting & Analytics
- Traffic and bandwidth reports
- Cache performance metrics
- Error rate analysis
- Geographic distribution
- Real-time statistics

## Usage Patterns

### Interactive Mode

For exploratory usage and one-off operations:

```bash
# Start the MCP server in interactive mode
npx tsx src/interactive-launcher.ts

# Then use natural language:
> Show me all properties
> Create a DNS A record for www.example.com pointing to 192.0.2.1
> Purge all images from the cache
```

### Programmatic Mode

For automation and scripting:

```bash
# Direct JSON-RPC calls
echo '{"method": "mcp__alecs-full__list-properties", "params": {}}' | npx tsx src/index.ts

# Using the provided scripts
./scripts/property-management-examples.sh
```

### Integration Mode

For integration with other tools:

```javascript
// Using the MCP client SDK
import { MCPClient } from '@modelcontextprotocol/sdk';

const client = new MCPClient();
await client.connect();

const result = await client.call('mcp__alecs-full__list-properties', {
  contractId: 'ctr_123456'
});
```

## Common Patterns

### 1. Search and Filter
```javascript
// Search for specific properties
{
  "method": "mcp__alecs-full__search-properties",
  "params": {
    "propertyName": "example.com",
    "contractId": "ctr_123456"
  }
}
```

### 2. Batch Operations
```javascript
// Purge multiple URLs at once
{
  "method": "mcp__alecs-full__purge-by-url",
  "params": {
    "urls": [
      "https://www.example.com/page1.html",
      "https://www.example.com/page2.html"
    ]
  }
}
```

### 3. Conditional Workflows
```javascript
// Activate to production only after staging validation
{
  "method": "mcp__alecs-full__activate-to-production",
  "params": {
    "propertyId": "prp_123456",
    "preChecks": {
      "validateOrigin": true,
      "checkSsl": true
    }
  }
}
```

## Best Practices

1. **Use Specific IDs**: Always use full Akamai IDs (e.g., `prp_123456`, not just `123456`)
2. **Specify Networks**: Be explicit about `staging` vs `production`
3. **Include Notifications**: Add email addresses for activation notifications
4. **Add Comments**: Include descriptive comments for audit trails
5. **Batch When Possible**: Group similar operations for efficiency

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure `.edgerc` file is properly configured
   - Check credentials have necessary permissions

2. **Not Found Errors**
   - Verify IDs are correct and include prefixes
   - Check the resource exists in the specified account

3. **Validation Errors**
   - Review required parameters
   - Ensure values match expected formats

### Debug Mode

Enable debug logging for detailed information:

```bash
DEBUG=* npx tsx src/index.ts
```

## Additional Resources

- [Akamai API Documentation](https://techdocs.akamai.com/home)
- [MCP Protocol Specification](https://modelcontextprotocol.io/docs)
- [Main Project README](../README.md)

## Contributing

To add new examples:

1. Add natural language examples to `PROMPTS_EXAMPLES.md`
2. Create executable scripts in `scripts/`
3. Update this README with new categories
4. Test all examples before committing

## License

See the main project LICENSE file.