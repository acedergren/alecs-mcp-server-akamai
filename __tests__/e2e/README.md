# E2E Testing for ALECS MCP Server

## Overview

This directory contains comprehensive end-to-end tests for the ALECS MCP server, including tests for Maya Chen's domain assistants, workflow orchestration, and tool chaining.

## Test Structure

```
__tests__/e2e/
├── domain-assistants-e2e.test.ts    # Tests for all 4 domain assistants
├── workflow-orchestration-e2e.test.ts # Tests for complex workflows
├── mcp-server-e2e.test.ts          # Core MCP protocol tests
├── basic-domain-assistant.test.ts   # Quick verification test
├── test-helpers.ts                  # Shared utilities and mock data
├── setup.ts                         # Global test setup
├── jest-e2e.config.js              # Jest configuration for E2E
└── README.md                        # This file
```

## Running Tests

### Quick Start
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suites
npm run test:e2e:domain      # Domain assistant tests only
npm run test:e2e:workflow    # Workflow tests only
npm run test:e2e:mcp         # MCP protocol tests only

# Run with comprehensive reporting
npm run test:e2e:full

# Run with verbose output
npm run test:e2e:verbose
```

### Environment Setup

Required environment variables:
```bash
export AKAMAI_CLIENT_SECRET="your-secret"
export AKAMAI_HOST="your-host.purge.akamaiapis.net"
export AKAMAI_ACCESS_TOKEN="your-access-token"
export AKAMAI_CLIENT_TOKEN="your-client-token"
```

For testing, you can use test credentials or set `NODE_ENV=test` to use mocked responses.

## Test Coverage

### Domain Assistants
- **Property & Infrastructure**: E-commerce, SaaS, API, Media, Marketing scenarios
- **DNS & Domain**: Migration, email setup, troubleshooting
- **Security & Compliance**: PCI, GDPR, threat response, ROI analysis
- **Performance & Analytics**: Optimization, real-time monitoring, ROI calculations

### Workflows
- Property creation workflow
- DNS migration workflow
- Security incident response
- Performance optimization
- Cross-domain workflows

### Tool Chaining
- Sequential tool execution
- Parallel tool execution
- Conditional branching
- Error recovery and retries

## Test Patterns

### Basic Assistant Test
```typescript
test('should respond to property assistant', async () => {
  const response = await client.callTool('property', {
    intent: 'Help me launch a website'
  });
  
  expect(response).toBeValidMCPResponse();
  expect(response.content[0].text).toContainBusinessTerms([
    'infrastructure', 'launch', 'website'
  ]);
});
```

### Workflow Test
```typescript
test('should orchestrate DNS migration', async () => {
  // Step 1: Analyze
  const analysis = await client.callTool('dns', {
    intent: 'Analyze current DNS'
  });
  
  // Step 2: Plan
  const plan = await client.callTool('dns', {
    intent: 'Create migration plan',
    context: { current_provider: 'cloudflare' }
  });
  
  // Step 3: Validate
  expect(plan.content[0].text).toContain('rollback');
});
```

### Performance Test
```typescript
test('should respond within 3 seconds', async () => {
  const start = Date.now();
  
  await client.callTool('performance', {
    intent: 'Analyze performance'
  });
  
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(3000);
});
```

## Mock Data

The `test-helpers.ts` file provides comprehensive mock data:

```typescript
mockData.properties     // Valid/invalid property configurations
mockData.dns           // Domains and DNS providers
mockData.security      // Threat scenarios and compliance
mockData.performance   // Metrics and benchmarks
mockData.workflows     // Workflow steps and requirements
```

## Custom Matchers

### toBeValidMCPResponse()
Validates MCP response structure:
```typescript
expect(response).toBeValidMCPResponse();
```

### toContainBusinessTerms()
Checks for business-oriented language:
```typescript
expect(text).toContainBusinessTerms(['security', 'compliance', 'protect']);
```

## Test Reports

After running the full test suite, reports are generated in:
```
test-results/e2e/
├── e2e-test-report.json    # Comprehensive test results
├── junit-e2e.xml           # JUnit format for CI
└── coverage/               # Code coverage reports
```

## Debugging

### Verbose Output
```bash
VERBOSE_TESTS=true npm run test:e2e
```

### Capture Server Logs
```bash
CAPTURE_LOGS=true npm run test:e2e
```

### Run Single Test
```bash
npx jest __tests__/e2e/domain-assistants-e2e.test.ts -t "should handle e-commerce"
```

## CI Integration

The E2E tests are designed to run in CI environments:

```yaml
# GitHub Actions example
- name: Run E2E Tests
  run: |
    npm run build
    npm run test:e2e:full
  env:
    NODE_ENV: test
    AKAMAI_CLIENT_SECRET: ${{ secrets.AKAMAI_CLIENT_SECRET }}
    # ... other secrets
```

## Performance Benchmarks

Expected response times:
- Simple tool calls: < 500ms
- Domain assistants: < 1000ms
- Complex workflows: < 5000ms
- Parallel operations: < 3000ms

## Troubleshooting

### Server Won't Start
- Check Node.js version (>= 18)
- Verify TypeScript is installed
- Check for port conflicts

### Tests Timeout
- Increase timeout in jest-e2e.config.js
- Check server startup logs
- Verify environment variables

### Flaky Tests
- Use retry mechanism in test-helpers
- Ensure proper cleanup in afterAll
- Check for race conditions

## Contributing

When adding new E2E tests:

1. Use descriptive test names
2. Include both happy path and error cases
3. Test real user scenarios
4. Maintain test independence
5. Clean up resources properly
6. Document any special requirements

## Maya's Vision

These E2E tests validate Maya Chen's UX transformation:
- Business language works correctly
- Intent is properly understood
- Workflows execute as designed
- Safety mechanisms function properly
- Performance meets user expectations

"Testing isn't just about code working - it's about users succeeding!" - Maya Chen