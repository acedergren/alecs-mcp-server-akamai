# Akamai MCP Server Tests

This directory contains integration tests for the Akamai MCP server implementation.

## Test Suites

### 1. DNS Functions Test (`test-dns-functions.ts`)
Tests the advanced EdgeDNS functions including:
- DNSSEC status checking
- Zone contract information
- Single record retrieval
- Bulk operations
- Zone versioning

### 2. PAPI Workflow Test (`test-papi-workflow.ts`)
Tests the complete Property Manager API workflow:
- Property creation
- Version management
- Rule configuration
- Hostname management
- Activation process

## Running Tests

### Prerequisites
```bash
# Ensure you have credentials configured
cat ~/.edgerc

# Install dependencies
npm install
```

### Run Individual Tests
```bash
# Test DNS functions
npx tsx tests/test-dns-functions.ts

# Test PAPI workflow
npx tsx tests/test-papi-workflow.ts
```

### Run All Tests
```bash
npx tsx tests/run-all-tests.ts
```

## Test Configuration

Before running tests, ensure you have:

1. Valid Akamai credentials in `~/.edgerc`
2. Appropriate permissions for the APIs being tested
3. Updated the test configuration in each test file:
   - Contract ID
   - Group ID
   - Test zones/domains

## Writing New Tests

When adding new tests:

1. Create a new test file following the naming pattern: `test-[feature].ts`
2. Use the test helper functions from existing tests
3. Add the test to `run-all-tests.ts`
4. Document any special requirements or setup

## Safety Notes

- Most destructive operations are skipped by default
- Tests create resources with timestamps to avoid conflicts
- Manual cleanup may be required for some created resources
- Always run tests in a non-production environment first