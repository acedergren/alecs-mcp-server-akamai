/**
 * Domain Template
 * 
 * Generates README.md for new domains
 */

export interface DomainTemplateVars {
  domainName: string;
  domainNamePascal: string;
  domainNameSnake: string;
  description: string;
  apiName: string;
  timestamp: string;
}

export function getDomainTemplate(vars: DomainTemplateVars): string {
  return `# ${vars.domainNamePascal} Domain

${vars.description}

## Overview

This domain provides tools for managing ${vars.domainNamePascal} operations through the Akamai ${vars.apiName} API.

## Tools

### Core Operations
- \`${vars.domainNameSnake}_list\` - List all ${vars.domainName} resources
- \`${vars.domainNameSnake}_get\` - Get specific ${vars.domainName} resource
- \`${vars.domainNameSnake}_create\` - Create new ${vars.domainName} resource
- \`${vars.domainNameSnake}_update\` - Update existing ${vars.domainName} resource
- \`${vars.domainNameSnake}_delete\` - Delete ${vars.domainName} resource

### Advanced Operations
- \`${vars.domainNameSnake}_search\` - Search ${vars.domainName} resources
- \`${vars.domainNameSnake}_bulk_operation\` - Bulk operations

## API Integration

This domain integrates with the Akamai ${vars.apiName} API:
- Base URL: \`https://akzz-XXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXX.luna.akamaiapis.net\`
- Authentication: EdgeGrid authentication
- API Documentation: [Akamai Developer Portal](https://developer.akamai.com/)

## Usage Examples

### List Resources
\`\`\`typescript
const tools = await client.callTool('${vars.domainNameSnake}_list', {
  customer: 'default',
  limit: 10
});
\`\`\`

### Get Specific Resource
\`\`\`typescript
const resource = await client.callTool('${vars.domainNameSnake}_get', {
  customer: 'default',
  id: 'resource-id'
});
\`\`\`

### Create New Resource
\`\`\`typescript
const newResource = await client.callTool('${vars.domainNameSnake}_create', {
  customer: 'default',
  name: 'New Resource',
  // ... other required fields
});
\`\`\`

## Development

### Adding New Tools
Use the CLI to add new tools to this domain:

\`\`\`bash
alecs generate tool ${vars.domainName} <tool-name>
\`\`\`

### Implementation Notes
- All tools follow the domain tools pattern
- Error handling is standardized across all operations
- Response formats comply with MCP protocol
- Customer context is validated before each operation

## Testing

\`\`\`bash
# Run domain-specific tests
npm test -- --testNamePattern="${vars.domainNamePascal}"

# Run specific tool tests
npm test -- --testNamePattern="${vars.domainNameSnake}"
\`\`\`

## Generated

This domain was generated on ${vars.timestamp} using ALECSCore CLI.
`;
}