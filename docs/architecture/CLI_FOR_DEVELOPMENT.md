# ALECS Code Generation CLI

The ALECS CLI tool helps developers quickly generate new domains and tools following the established ALECSCore patterns.

## Installation

The CLI is included with the ALECS MCP Server package:

```bash
npm install -g alecs-mcp-server-akamai
```

## Usage

### Generate New Domain

Create a complete domain with boilerplate code:

```bash
alecs generate domain <name>
```

**Options:**
- `--description <desc>` - Custom description for the domain
- `--api <name>` - API base name (e.g., "property" for PAPI)
- `--dry-run` - Preview files without creating them

**Example:**
```bash
alecs generate domain billing --description "Billing and cost analysis tools" --api "BILLING"
```

**Generated Files:**
- `src/tools/billing/index.ts` - Tool definitions
- `src/tools/billing/consolidated-billing-tools.ts` - Implementation class
- `src/tools/billing/README.md` - Documentation
- Updates `src/tools/all-tools-registry.ts` - Registers new tools

### Generate New Tool

Add a new tool to an existing domain:

```bash
alecs generate tool <domain> <name>
```

**Options:**
- `--description <desc>` - Custom description for the tool
- `--method <method>` - HTTP method (GET, POST, PUT, DELETE)
- `--endpoint <path>` - API endpoint path
- `--dry-run` - Preview changes without modifying files

**Example:**
```bash
alecs generate tool billing cost_analysis --description "Analyze bandwidth costs" --method GET --endpoint "/billing/costs"
```

**Updates:**
- `src/tools/billing/index.ts` - Adds tool definition
- `src/tools/billing/consolidated-billing-tools.ts` - Adds handler method

### List Available Templates

Show all available templates:

```bash
alecs generate list
```

## Development Workflow

### 1. Create New Domain

```bash
# Generate domain structure
alecs generate domain billing

# Review generated files
cd src/tools/billing
```

### 2. Implement First Tool

```bash
# Generate a tool
alecs generate tool billing cost_analysis

# Edit the implementation
vim src/tools/billing/consolidated-billing-tools.ts
```

### 3. Add More Tools

```bash
# Generate more tools as needed
alecs generate tool billing usage_report
alecs generate tool billing invoice_details
```

### 4. Test and Build

```bash
# Test the domain
npm test -- --testNamePattern="billing"

# Build the server
npm run build
```

## Generated Code Structure

### Domain Structure
```
src/tools/billing/
├── index.ts                        # Tool definitions
├── consolidated-billing-tools.ts   # Implementation class
└── README.md                      # Documentation
```

### Tool Definition Format
```typescript
export const billingTools = {
  'billing_cost_analysis': {
    description: 'Analyze bandwidth costs',
    inputSchema: z.object({
      startDate: z.string(),
      endDate: z.string(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedBillingTools.costAnalysis(args)
  }
};
```

### Implementation Class Format
```typescript
export class BillingTools extends BaseTool {
  async costAnalysis(args: any): Promise<MCPToolResponse> {
    // Implementation here
  }
}
```

## Best Practices

### Domain Naming
- Use lowercase, descriptive names
- Avoid reserved words (base, core, tool, mcp, server, client, akamai)
- Keep names under 50 characters
- Examples: `billing`, `gtm`, `edgeworkers`

### Tool Naming
- Use snake_case format: `domain_operation`
- Be descriptive: `billing_cost_analysis` not `billing_cost`
- Follow CRUD patterns: `list`, `get`, `create`, `update`, `delete`

### API Integration
- Follow existing patterns in other domains
- Use proper error handling
- Include comprehensive logging
- Validate input parameters with Zod schemas

### Testing
- Write tests for each new tool
- Use existing test patterns as templates
- Test both success and error cases
- Include integration tests for API calls

## Troubleshooting

### Common Issues

**Domain already exists**
```bash
Error: Domain 'billing' already exists
```
Solution: Choose a different name or remove the existing domain.

**Tool already exists**
```bash
Error: Tool 'billing_cost_analysis' already exists
```
Solution: Choose a different tool name or update the existing tool.

**Invalid names**
```bash
Error: Domain name must start with a letter
```
Solution: Use valid naming conventions (letters, numbers, hyphens only).

### Debug Mode

Use `--dry-run` to preview changes:

```bash
alecs generate domain billing --dry-run
```

This shows what files would be created without actually creating them.

## Contributing

### Adding New Templates

1. Create template function in `src/cli/templates/`
2. Add to template manager in `src/cli/generators/template-manager.ts`
3. Update CLI commands if needed

### Improving Code Generation

1. Edit template files in `src/cli/templates/`
2. Test with `--dry-run` flag
3. Ensure generated code follows ALECSCore patterns

## Examples

### Complete Billing Domain Setup

```bash
# Create billing domain
alecs generate domain billing --description "Billing and cost analysis tools"

# Add cost analysis tool
alecs generate tool billing cost_analysis --description "Analyze bandwidth costs"

# Add usage report tool
alecs generate tool billing usage_report --description "Generate usage reports"

# Add invoice details tool
alecs generate tool billing invoice_details --description "Get invoice details"

# Test the domain
npm test -- --testNamePattern="billing"

# Build and run
npm run build
npm start
```

### Adding Tools to Existing Domain

```bash
# Add search capability to property domain
alecs generate tool property search_by_hostname --description "Search properties by hostname"

# Add health check to security domain
alecs generate tool security policy_health_check --description "Check security policy health"
```

This CLI tool significantly reduces development time by automating the boilerplate code generation while ensuring consistency with ALECSCore patterns.