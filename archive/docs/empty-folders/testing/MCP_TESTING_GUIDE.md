# MCP Testing Guide for ALECS Full Server

## Overview

This guide explains how to test the capabilities of the ALECS Full MCP server, which provides 180+ tools for managing Akamai CDN services through the Model Context Protocol (MCP).

## Test Structure

```
__tests__/
├── unit/
│   └── mcp-tools/
│       ├── property-management.test.ts  # Property tools tests
│       └── dns-management.test.ts       # DNS tools tests
├── integration/
│   └── mcp-capabilities.test.ts        # Full MCP protocol tests
├── e2e/
│   └── basic-mcp-integration.test.ts   # End-to-end tests
├── helpers/
│   └── mcp-test-utils.ts              # Test utilities and helpers
└── run-mcp-tests.ts                    # Test runner script
```

## Running Tests

### Quick Start

```bash
# Run all MCP tests
npm test

# Run specific test suite
npm test -- __tests__/unit/mcp-tools/property-management.test.ts

# Run integration tests only
npm test -- __tests__/integration/

# Run with coverage
npm test -- --coverage
```

### Using the Test Runner

```bash
# Run comprehensive test suite
npx ts-node __tests__/run-mcp-tests.ts
```

## Test Categories

### 1. Unit Tests

Test individual MCP tools in isolation with mocked dependencies.

**Property Management Tests** (`property-management.test.ts`):
- `list-properties` - List all CDN properties
- `get-property` - Get property details
- `create-property` - Create new property
- `list-contracts` - List Akamai contracts
- `activate-property` - Activate property version

**DNS Management Tests** (`dns-management.test.ts`):
- `list-zones` - List DNS zones
- `get-zone` - Get zone details
- `create-zone` - Create new zone
- `list-records` - List DNS records
- `create-record` - Create/update records
- `delete-record` - Delete records

### 2. Integration Tests

Test the full MCP server with real protocol communication.

**MCP Capabilities Tests** (`mcp-capabilities.test.ts`):
- Server information and version
- Tool discovery (180+ tools)
- Tool schema validation
- Workflow assistant tools
- Error handling
- MCP 2025 compliance
- Concurrent operations

### 3. End-to-End Tests

Test complete workflows through the MCP interface.

## Key Test Scenarios

### Testing Tool Discovery

```typescript
test('should list all available tools', async () => {
  const tools = await client.listTools();
  
  expect(tools.tools.length).toBeGreaterThan(150);
  expect(tools.tools).toContainTool('list-properties');
  expect(tools.tools).toContainTool('domain-assistant');
});
```

### Testing Tool Execution

```typescript
test('should execute property listing', async () => {
  const result = await client.callTool('list-properties', {
    contractId: 'ctr_1-5C13O2'
  });
  
  expect(result).toBeValidMCPResponse();
  expect(result.content[0].text).toContain('Properties');
});
```

### Testing Error Handling

```typescript
test('should handle invalid parameters', async () => {
  await expect(
    client.callTool('create-property', {
      // Missing required parameters
    })
  ).rejects.toThrow('Invalid parameters');
});
```

### Testing Workflow Assistants

```typescript
test('should handle domain assistant', async () => {
  const result = await client.callTool('domain-assistant', {
    intent: 'onboard example.com',
    domain: 'example.com'
  });
  
  expect(result.content[0].text).toContain('example.com');
});
```

## Test Utilities

### MCPTestClient

Helper class for managing MCP client connections:

```typescript
const testClient = new MCPTestClient({
  serverPath: './dist/index-full.js',
  timeout: 5000
});

const client = await testClient.connect();
// Run tests...
await testClient.disconnect();
```

### Mock Data Generators

```typescript
const mockProperty = MockData.property({
  propertyName: 'test.example.com'
});

const mockZone = MockData.zone({
  zone: 'example.org',
  type: 'secondary'
});
```

### Test Helpers

```typescript
// Call tool and get text response
const text = await MCPTestHelpers.callToolAndGetText(
  client, 
  'list-properties', 
  {}
);

// Check if tool exists
const exists = await MCPTestHelpers.toolExists(
  client, 
  'create-zone'
);

// Validate response format
const isValid = MCPTestHelpers.validateMCPResponse(result);
```

## Writing New Tests

### 1. Unit Test Template

```typescript
describe('New Tool Category', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
  });

  test('should handle tool operation', async () => {
    // Mock API response
    mockClient.request.mockResolvedValue({
      // Mock data
    });

    // Execute tool
    const result = await toolFunction(mockClient, params);

    // Validate MCP response
    expect(result).toHaveProperty('content');
    expect(result.content[0].text).toContain('expected text');
  });
});
```

### 2. Integration Test Template

```typescript
describe('New Integration Test', () => {
  let client: Client;
  let testClient: MCPTestClient;

  beforeAll(async () => {
    testClient = new MCPTestClient();
    client = await testClient.connect();
  });

  afterAll(async () => {
    await testClient.disconnect();
  });

  test('should perform integration scenario', async () => {
    const result = await client.callTool('tool-name', {
      // Parameters
    });

    expect(result).toBeValidMCPResponse();
  });
});
```

## Test Coverage Areas

### Core Functionality (✅ Covered)
- Property management tools
- DNS zone and record management
- Contract and group listing
- Basic error handling
- Parameter validation

### Advanced Features (🚧 Partial Coverage)
- Certificate management
- Security configurations
- Performance optimization
- Bulk operations
- Workflow assistants

### Areas for Expansion
1. **Security Tools**: AppSec, WAF, Network Lists
2. **Performance Tools**: Cache optimization, metrics
3. **Reporting Tools**: Traffic analysis, cost insights
4. **Token Management**: API token operations
5. **Advanced Workflows**: Complex multi-step operations

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Use mocked AkamaiClient for unit tests
3. **Validate MCP Protocol**: Ensure responses follow MCP format
4. **Test Error Scenarios**: Include negative test cases
5. **Use Test Utilities**: Leverage provided helpers and utilities
6. **Document Test Purpose**: Clear test descriptions
7. **Maintain Test Data**: Keep mock data realistic

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   ```
   Error: Connection timeout
   ```
   Solution: Increase timeout in test configuration

2. **Server Not Found**
   ```
   Error: ENOENT: no such file or directory
   ```
   Solution: Build the project first with `npm run build`

3. **Port Already in Use**
   ```
   Error: Address already in use
   ```
   Solution: Kill existing MCP server processes

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm test
```

View detailed MCP communication:
```bash
MCP_DEBUG=true npm test
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: MCP Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npx ts-node __tests__/run-mcp-tests.ts
```

## Contributing

When adding new MCP tools:
1. Add unit tests in `__tests__/unit/mcp-tools/`
2. Update integration tests to include new tools
3. Add test scenarios to this guide
4. Ensure 80%+ code coverage
5. Run full test suite before submitting PR