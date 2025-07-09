# ALECS Testing Strategy

**Comprehensive testing approach for production-grade reliability**

## 🎯 Testing Philosophy

ALECS implements **production-grade testing** with real API integration:

- **No Mocking**: Tests use actual Akamai test environment
- **Real Data**: Validates actual API responses and behaviors
- **Customer Context**: Uses dedicated 'testing' customer configuration
- **Error Scenarios**: Comprehensive error condition testing
- **Performance**: Load and stress testing included

## 🏗️ Test Architecture

### Test Pyramid Structure

```
    🔺 E2E Tests (10%)
   🔺🔺 Integration Tests (30%)
  🔺🔺🔺 Unit Tests (60%)
```

### Test Categories

| Test Type | Purpose | Coverage | Environment |
|-----------|---------|----------|-------------|
| **Unit** | Individual functions | 60% | Local/Mock |
| **Integration** | Component interaction | 30% | Test API |
| **E2E** | Complete workflows | 10% | Test API |
| **Performance** | Load/stress testing | Continuous | Test API |
| **Security** | Vulnerability testing | Continuous | Test API |

### Test Environment Setup

```bash
# Test customer configuration in .edgerc
[testing]
client_secret = test_client_secret
host = test-host.luna.akamaiapis.net
access_token = test_access_token
client_token = test_client_token

# Environment variables for testing
export NODE_ENV=test
export LOG_LEVEL=error
export CACHE_ENABLED=false
export TEST_CUSTOMER=testing
```

## 🧪 Unit Testing

### Test Framework: Jest + TypeScript

**Configuration** (`jest.config.js`):
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts']
};
```

### Unit Test Patterns

```typescript
// Property tool unit tests
describe('ConsolidatedPropertyTools', () => {
  let tools: ConsolidatedPropertyTools;
  let mockClient: jest.MockedClass<typeof AkamaiClient>;
  
  beforeEach(() => {
    tools = new ConsolidatedPropertyTools();
    mockClient = createMockClient();
    jest.clearAllMocks();
  });
  
  describe('listProperties', () => {
    it('should return formatted property list', async () => {
      // Arrange
      const mockResponse = {
        properties: {
          items: [
            {
              propertyId: 'prp_123456',
              propertyName: 'test-property',
              contractId: 'ctr_123',
              groupId: 'grp_123'
            }
          ]
        }
      };
      
      mockClient.request.mockResolvedValue(mockResponse);
      
      // Act
      const result = await tools.listProperties({
        customer: 'testing'
      });
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.content.properties).toHaveLength(1);
      expect(result.content.properties[0].id).toBe('prp_123456');
      
      // Verify API call
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties',
        method: 'GET',
        queryParams: expect.any(Object)
      });
    });
    
    it('should handle API errors gracefully', async () => {
      // Arrange
      mockClient.request.mockRejectedValue(
        new Error('API Error: Rate limit exceeded')
      );
      
      // Act & Assert
      await expect(tools.listProperties({ customer: 'testing' }))
        .rejects.toThrow(PropertyError);
    });
    
    it('should validate input parameters', async () => {
      // Act & Assert
      await expect(tools.listProperties({ customer: '' }))
        .rejects.toThrow(ValidationError);
    });
  });
});

// Utility test helper
function createMockClient(): jest.MockedClass<typeof AkamaiClient> {
  return {
    request: jest.fn(),
    validateConnection: jest.fn(),
    getCustomer: jest.fn().mockReturnValue('testing')
  } as any;
}
```

## 🔗 Integration Testing

### Real API Integration Tests

```typescript
// Integration test with real Akamai APIs
describe('Property Integration Tests', () => {
  let client: AkamaiClient;
  let testPropertyId: string;
  
  beforeAll(async () => {
    client = new AkamaiClient('testing');
    await client.validateConnection();
  });
  
  afterEach(async () => {
    // Cleanup any created test resources
    if (testPropertyId) {
      await cleanupProperty(testPropertyId);
      testPropertyId = '';
    }
  });
  
  it('should complete property creation workflow', async () => {
    const propertyName = `test-prop-${Date.now()}`;
    
    // Step 1: Create property
    const createResult = await property.create({
      propertyName,
      customer: 'testing',
      productId: 'prd_Web_App_Accel'
    });
    
    testPropertyId = createResult.id;
    expect(createResult.id).toMatch(/^prp_/);
    expect(createResult.name).toBe(propertyName);
    
    // Step 2: Verify property exists
    const getResult = await property.get({
      propertyId: testPropertyId,
      customer: 'testing'
    });
    
    expect(getResult.name).toBe(propertyName);
    expect(getResult.id).toBe(testPropertyId);
    
    // Step 3: List properties includes new property
    const listResult = await property.list({
      customer: 'testing'
    });
    
    const foundProperty = listResult.properties.find(
      p => p.id === testPropertyId
    );
    expect(foundProperty).toBeDefined();
  });
  
  it('should handle property version workflow', async () => {
    // Create base property
    testPropertyId = await createTestProperty();
    
    // Create new version
    const versionResult = await property.version.create({
      propertyId: testPropertyId,
      customer: 'testing',
      createFromVersion: 1
    });
    
    expect(versionResult.version).toBe(2);
    
    // Update rules in new version
    const updateResult = await property.rules.update({
      propertyId: testPropertyId,
      version: 2,
      customer: 'testing',
      rules: getTestRules()
    });
    
    expect(updateResult.success).toBe(true);
  });
});

// Test utilities
async function createTestProperty(): Promise<string> {
  const result = await property.create({
    propertyName: `test-${Date.now()}`,
    customer: 'testing',
    productId: 'prd_Web_App_Accel'
  });
  return result.id;
}

async function cleanupProperty(propertyId: string): Promise<void> {
  try {
    await property.delete({
      propertyId,
      customer: 'testing'
    });
  } catch (error) {
    console.warn(`Failed to cleanup property ${propertyId}:`, error);
  }
}
```

### Cross-Domain Integration Tests

```typescript
// Test workflows across multiple domains
describe('Cross-Domain Workflows', () => {
  it('should complete secure property onboarding', async () => {
    const domainName = `test-${Date.now()}.example.com`;
    
    // 1. Create property
    const property = await createProperty({
      propertyName: domainName.replace('.', '-'),
      customer: 'testing'
    });
    
    // 2. Create certificate
    const certificate = await createCertificate({
      domains: [domainName],
      customer: 'testing'
    });
    
    // 3. Create DNS zone
    const zone = await createDNSZone({
      zone: domainName,
      customer: 'testing'
    });
    
    // 4. Add hostname to property
    const hostname = await addHostname({
      propertyId: property.id,
      hostname: domainName,
      certificateId: certificate.id,
      customer: 'testing'
    });
    
    // Verify complete setup
    expect(property.id).toMatch(/^prp_/);
    expect(certificate.id).toMatch(/^cert_/);
    expect(zone.name).toBe(domainName);
    expect(hostname.success).toBe(true);
  });
});
```

## 🚀 End-to-End Testing

### Workflow Testing

```typescript
// Complete user workflows
describe('E2E Workflow Tests', () => {
  it('should complete new website onboarding workflow', async () => {
    const siteName = `test-site-${Date.now()}`;
    const domain = `${siteName}.example.com`;
    
    // Simulate Claude Desktop interaction
    const conversation = new TestConversation();
    
    // Step 1: User requests property creation
    let response = await conversation.send(
      `Create a new property called ${siteName} for web delivery`
    );
    expect(response).toContain('property created');
    
    // Step 2: User adds hostname
    response = await conversation.send(
      `Add hostname ${domain} to ${siteName}`
    );
    expect(response).toContain('hostname added');
    
    // Step 3: User requests SSL certificate
    response = await conversation.send(
      `Create SSL certificate for ${domain}`
    );
    expect(response).toContain('certificate requested');
    
    // Step 4: User activates to staging
    response = await conversation.send(
      `Activate ${siteName} to staging`
    );
    expect(response).toContain('activation started');
    
    // Verify final state
    const property = await getProperty(siteName);
    expect(property.hostnames).toContain(domain);
    expect(property.stagingVersion).toBeGreaterThan(0);
  });
});

class TestConversation {
  private context: ConversationContext = {};
  
  async send(message: string): Promise<string> {
    // Parse natural language and execute appropriate tools
    const intent = await parseIntent(message);
    const result = await executeIntent(intent, this.context);
    
    // Update conversation context
    this.context = { ...this.context, ...result.context };
    
    return result.response;
  }
}
```

## ⚡ Performance Testing

### Load Testing with Artillery

**Configuration** (`artillery.yml`):
```yaml
config:
  target: 'http://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: "Property operations"
    weight: 60
    flow:
      - post:
          url: "/tools/call"
          json:
            method: "tools/call"
            params:
              name: "property_list"
              arguments:
                customer: "testing"
      - think: 2
      - post:
          url: "/tools/call"
          json:
            method: "tools/call"
            params:
              name: "property_get"
              arguments:
                propertyId: "prp_123456"
                customer: "testing"
  
  - name: "DNS operations"
    weight: 30
    flow:
      - post:
          url: "/tools/call"
          json:
            method: "tools/call"
            params:
              name: "dns_zone_list"
              arguments:
                customer: "testing"
  
  - name: "Cache operations"
    weight: 10
    flow:
      - post:
          url: "/tools/call"
          json:
            method: "tools/call"
            params:
              name: "fastpurge_url"
              arguments:
                urls: ["https://example.com/test.html"]
                customer: "testing"
```

**Run Performance Tests**:
```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run artillery.yml

# Generate HTML report
artillery run artillery.yml --output report.json
artillery report report.json --output report.html
```

### Benchmark Testing

```typescript
// Performance benchmark tests
describe('Performance Benchmarks', () => {
  it('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 50;
    const startTime = Date.now();
    
    // Execute concurrent requests
    const promises = Array.from({ length: concurrentRequests }, () =>
      property.list({ customer: 'testing' })
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Assertions
    expect(results).toHaveLength(concurrentRequests);
    expect(results.every(r => r.success)).toBe(true);
    expect(duration).toBeLessThan(5000); // 5 seconds max
    
    // Performance metrics
    const avgResponseTime = duration / concurrentRequests;
    expect(avgResponseTime).toBeLessThan(100); // 100ms avg
  });
  
  it('should maintain cache hit rate under load', async () => {
    const iterations = 100;
    let cacheHits = 0;
    
    // First request to populate cache
    await property.list({ customer: 'testing' });
    
    // Multiple identical requests
    for (let i = 0; i < iterations; i++) {
      const result = await property.list({ customer: 'testing' });
      if (result.cached) cacheHits++;
    }
    
    const hitRate = cacheHits / iterations;
    expect(hitRate).toBeGreaterThan(0.8); // 80% hit rate
  });
});
```

## 🔒 Security Testing

### Input Validation Testing

```typescript
describe('Security - Input Validation', () => {
  it('should prevent SQL injection attempts', async () => {
    const maliciousInputs = [
      "'; DROP TABLE properties; --",
      "1' OR '1'='1",
      "<script>alert('xss')</script>",
      "../../../etc/passwd",
      "{{7*7}}", // Template injection
    ];
    
    for (const input of maliciousInputs) {
      await expect(property.list({
        customer: input
      })).rejects.toThrow(ValidationError);
    }
  });
  
  it('should validate customer access permissions', async () => {
    // Try to access unauthorized customer
    await expect(property.list({
      customer: 'unauthorized-customer'
    })).rejects.toThrow(CustomerNotFoundError);
  });
  
  it('should sanitize output data', async () => {
    const result = await property.list({ customer: 'testing' });
    
    // Ensure no sensitive data in response
    const responseText = JSON.stringify(result);
    expect(responseText).not.toContain('client_secret');
    expect(responseText).not.toContain('access_token');
    expect(responseText).not.toContain('client_token');
  });
});
```

### Authentication Testing

```typescript
describe('Security - Authentication', () => {
  it('should handle invalid credentials gracefully', async () => {
    const invalidClient = new AkamaiClient('invalid-customer');
    
    await expect(invalidClient.request({
      path: '/papi/v1/properties',
      method: 'GET'
    })).rejects.toThrow(AuthenticationError);
  });
  
  it('should rotate expired tokens', async () => {
    // Mock token expiration
    mockTokenExpiration();
    
    const client = new AkamaiClient('testing');
    const result = await client.request({
      path: '/papi/v1/properties',
      method: 'GET'
    });
    
    // Verify automatic token refresh
    expect(result).toBeDefined();
    expect(mockTokenRefresh).toHaveBeenCalled();
  });
});
```

## 📊 Test Automation and CI/CD

### GitHub Actions Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Setup test credentials
      env:
        TEST_EDGERC: ${{ secrets.TEST_EDGERC }}
      run: echo "$TEST_EDGERC" > ~/.edgerc
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        TEST_CUSTOMER: testing

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Build application
      run: npm run build
    
    - name: Start server
      run: npm start &
      env:
        MCP_TRANSPORT: streamable-http
    
    - name: Wait for server
      run: npx wait-on http://localhost:8080/health
    
    - name: Run E2E tests
      run: npm run test:e2e
```

### Test Data Management

```typescript
// Test data factory
export class TestDataFactory {
  static createPropertyData(overrides: Partial<PropertyData> = {}): PropertyData {
    return {
      propertyName: `test-prop-${Date.now()}`,
      productId: 'prd_Web_App_Accel',
      customer: 'testing',
      ...overrides
    };
  }
  
  static createDNSZoneData(overrides: Partial<DNSZoneData> = {}): DNSZoneData {
    return {
      zone: `test-${Date.now()}.example.com`,
      type: 'primary',
      customer: 'testing',
      ...overrides
    };
  }
  
  static createCertificateData(overrides: Partial<CertificateData> = {}): CertificateData {
    return {
      commonName: `test-${Date.now()}.example.com`,
      certificateType: 'DV',
      customer: 'testing',
      ...overrides
    };
  }
}

// Test cleanup utilities
export class TestCleanup {
  private static createdResources: CreatedResource[] = [];
  
  static trackResource(type: string, id: string, customer: string): void {
    this.createdResources.push({ type, id, customer });
  }
  
  static async cleanupAll(): Promise<void> {
    for (const resource of this.createdResources.reverse()) {
      try {
        await this.deleteResource(resource);
      } catch (error) {
        console.warn(`Failed to cleanup ${resource.type}:${resource.id}`, error);
      }
    }
    this.createdResources = [];
  }
}
```

## 📈 Test Metrics and Reporting

### Coverage Requirements

```javascript
// Jest coverage configuration
coverageThreshold: {
  global: {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85
  },
  './src/tools/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90
  }
}
```

### Test Report Generation

```bash
# Generate comprehensive test report
npm run test:all -- --coverage --reporters=default --reporters=jest-junit

# Performance test report
artillery run artillery.yml --output perf-report.json
artillery report perf-report.json --output perf-report.html

# Security test report
npm audit --audit-level moderate --json > security-report.json
```

---

This testing strategy ensures ALECS maintains production-grade reliability through comprehensive test coverage, real API integration, and continuous quality assurance.