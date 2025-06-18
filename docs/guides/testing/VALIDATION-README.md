# MCP Comprehensive Workflow Validator

This test suite provides thorough validation of the Akamai MCP server, ensuring reliability and performance across all customer touchpoints.

## Overview

The validation suite consists of four main test categories:

### 1. MCP Health Diagnostics (`diagnostics/mcp-health-check.js`)
Tests fundamental MCP server functionality:
- Server startup and initialization
- Tool registration and discovery
- STDIO communication integrity
- Parameter validation
- Error handling
- Response formatting
- Graceful shutdown

### 2. Customer Journey Simulation (`workflows/customer-journey.js`)
Simulates real-world customer workflows:
- New customer onboarding (property + DNS + certificate)
- Property modifications and updates
- Certificate renewal workflows
- DNS migration scenarios
- Emergency response procedures
- Multi-property management

### 3. Edge Cases & Error Scenarios (`edge-cases/error-scenarios.js`)
Tests error handling and resilience:
- Invalid credentials handling
- Malformed API responses
- Network timeouts and retries
- Rate limit compliance
- Partial API failures
- Concurrent operation conflicts
- Resource cleanup

### 4. Performance & Load Testing (`performance/load-testing.js`)
Measures performance under various conditions:
- Concurrent customer operations
- Large-scale DNS imports (100-5000 records)
- Bulk certificate provisioning
- Memory usage profiling
- API rate limit compliance
- Response time measurements

## Running the Tests

### Full Validation Suite
```bash
npm run test:validate
```

This runs all test suites in sequence with proper orchestration and generates comprehensive reports.

### Individual Test Suites
```bash
# MCP server health check
npm run test:health

# Customer journey simulation
npm run test:journey

# Error scenario testing
npm run test:errors

# Performance testing (with memory profiling)
npm run test:performance
```

## Test Reports

After running the validation suite, you'll find several reports:

1. **Master Report** (`tests/master-validation-report.json`)
   - Overall test execution summary
   - Suite-level pass/fail status
   - Timing information

2. **HTML Report** (`tests/comprehensive-validation-report.html`)
   - Visual dashboard with charts
   - Detailed results by category
   - Performance insights
   - Recommendations

3. **Individual Suite Reports**
   - `diagnostics/mcp-health-report.json`
   - `workflows/customer-journey-report.json`
   - `edge-cases/error-scenarios-report.json`
   - `performance/performance-metrics.json`

4. **Log Files**
   - Detailed execution logs for each suite
   - Located in respective test directories

## Performance Insights

The performance tests generate additional data files:
- `performance/graph-data.json` - Data for visualization
- Memory usage profiles
- Throughput measurements
- Response time distributions

## Test Configuration

Tests use the `testing` customer configured in `.edgerc`:
```ini
[testing]
host = ...
client_token = ...
client_secret = ...
access_token = ...
account-key = ... (if applicable)
```

## Interpreting Results

### Success Criteria
- **Health Diagnostics**: All tools registered, communication working
- **Customer Journeys**: Core workflows complete without errors
- **Error Scenarios**: Proper error handling for all edge cases
- **Performance**: Meets throughput and response time targets

### Common Issues
1. **Authentication Failures**: Check `.edgerc` configuration
2. **Timeouts**: May indicate API rate limiting or network issues
3. **Memory Growth**: Look for leaks in sustained load tests
4. **Concurrent Conflicts**: Review operation isolation

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
```yaml
# Example GitHub Actions workflow
- name: Run MCP Validation
  run: |
    npm run build
    npm run test:validate
  env:
    NODE_ENV: test
```

## Customization

### Adding New Test Scenarios

1. Add to existing test files or create new ones
2. Follow the established patterns for logging and reporting
3. Update `TEST_SUITES` in `run-comprehensive-validation.js`

### Adjusting Performance Targets

Edit configuration in `performance/load-testing.js`:
```javascript
const TEST_CONFIG = {
  concurrency: { low: 5, medium: 10, high: 20 },
  dnsBulkSizes: { small: 100, medium: 500, large: 1000 }
};
```

## Troubleshooting

### Test Failures
1. Check individual log files for detailed error messages
2. Review the HTML report for patterns
3. Run failing tests individually with increased logging

### Performance Issues
1. Use `--expose-gc` flag for memory profiling
2. Check system resources during test execution
3. Review rate limit compliance in performance tests

### Timeout Issues
Adjust timeouts in `TEST_SUITES` configuration:
```javascript
{
  name: 'Test Suite',
  timeout: 600000 // 10 minutes
}
```

## Best Practices

1. **Run regularly**: Include in CI/CD and before releases
2. **Monitor trends**: Track performance metrics over time
3. **Update scenarios**: Add new customer workflows as needed
4. **Clean environment**: Ensure clean test data between runs
5. **Resource limits**: Be aware of API rate limits during testing

## Contributing

When adding new tests:
1. Follow existing patterns for consistency
2. Include proper error handling
3. Generate structured reports
4. Document new test scenarios
5. Update this README

## Support

For issues or questions:
1. Check test logs for detailed error information
2. Review individual test suite documentation
3. Consult the main project README
4. Open an issue with test reports attached