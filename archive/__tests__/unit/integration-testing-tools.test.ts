/**
 * Tests for Integration Testing Tools
 */

import { AkamaiClient } from '../../src/akamai-client';
import {
  runIntegrationTestSuite,
  checkAPIHealth,
  generateTestData,
  validateToolResponses,
  runLoadTest
} from '../../src/tools/integration-testing-tools';

// Mock the AkamaiClient
jest.mock('../../src/akamai-client');

describe('Integration Testing Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient('test') as jest.Mocked<AkamaiClient>;
    mockClient.request = jest.fn();
  });

  describe('runIntegrationTestSuite', () => {
    it('should run integration test suite by name', async () => {
      const result = await runIntegrationTestSuite(mockClient, {
        suiteName: 'property-manager',
        generateReport: true
      });

      expect(result.content[0]?.text).toContain('Integration Test Execution');
      expect(result.content[0]?.text).toContain('**Suite:** property-manager');
      expect(result.content[0]?.text).toContain('Test Summary');
    });

    it('should run tests by category', async () => {
      const result = await runIntegrationTestSuite(mockClient, {
        category: 'property',
        priority: 'high'
      });

      expect(result.content[0]?.text).toContain('**Category:** property');
      expect(result.content[0]?.text).toContain('**Priority:** high');
      expect(result.content[0]?.text).toContain('Test Scenarios');
    });

    it('should handle invalid suite name', async () => {
      const result = await runIntegrationTestSuite(mockClient, {
        suiteName: 'invalid-suite'
      });

      expect(result.content[0]?.text).toContain('Error: Test suite \'invalid-suite\' not found');
    });

    it('should include recommendations based on results', async () => {
      const result = await runIntegrationTestSuite(mockClient, {
        category: 'dns'
      });

      expect(result.content[0]?.text).toContain('Recommendations');
    });
  });

  describe('checkAPIHealth', () => {
    it('should check default endpoints health', async () => {
      // Mock successful API calls
      mockClient.request.mockResolvedValue({ success: true });

      const result = await checkAPIHealth(mockClient, {});

      expect(result.content[0]?.text).toContain('API Health Check');
      expect(result.content[0]?.text).toContain('Health Summary');
      expect(result.content[0]?.text).toContain('Endpoint Details');
      expect(result.content[0]?.text).toContain('Recommendations');
    });

    it('should check custom endpoints', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      const result = await checkAPIHealth(mockClient, {
        endpoints: ['/custom/endpoint1', '/custom/endpoint2'],
        customer: 'test-customer'
      });

      expect(result.content[0]?.text).toContain('**Customer:** test-customer');
      expect(result.content[0]?.text).toContain('**Endpoints Tested:** 2');
      expect(result.content[0]?.text).toContain('/custom/endpoint1');
      expect(result.content[0]?.text).toContain('/custom/endpoint2');
    });

    it('should handle API failures gracefully', async () => {
      mockClient.request.mockRejectedValue(new Error('API Error'));

      const result = await checkAPIHealth(mockClient, {
        endpoints: ['/failing/endpoint']
      });

      expect(result.content[0]?.text).toContain('API Health Check');
      expect(result.content[0]?.text).toContain('DEGRADED');
      expect(result.content[0]?.text).toContain('API Error');
    });

    it('should include load test when requested', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      const result = await checkAPIHealth(mockClient, {
        includeLoadTest: true
      });

      expect(result.content[0]?.text).toContain('Load Test Results');
    }, 15000); // Increase timeout to 15 seconds
  });

  describe('generateTestData', () => {
    it('should generate property test data', async () => {
      const result = await generateTestData(mockClient, {
        dataType: 'property',
        count: 3,
        prefix: 'test'
      });

      expect(result.content[0]?.text).toContain('Test Data Generation');
      expect(result.content[0]?.text).toContain('**Data Type:** property');
      expect(result.content[0]?.text).toContain('**Count:** 3');
      expect(result.content[0]?.text).toContain('PROPERTY');
      expect(result.content[0]?.text).toContain('Usage Examples');
      expect(result.content[0]?.text).toContain('JSON Export');
    });

    it('should generate DNS zone test data', async () => {
      const result = await generateTestData(mockClient, {
        dataType: 'zone',
        count: 2
      });

      expect(result.content[0]?.text).toContain('**Data Type:** zone');
      expect(result.content[0]?.text).toContain('DNS-ZONE');
      expect(result.content[0]?.text).toContain('createZone');
    });

    it('should generate hostname test data', async () => {
      const result = await generateTestData(mockClient, {
        dataType: 'hostname',
        count: 4
      });

      expect(result.content[0]?.text).toContain('**Data Type:** hostname');
      expect(result.content[0]?.text).toContain('HOSTNAME');
      expect(result.content[0]?.text).toContain('addPropertyHostname');
    });

    it('should generate contact test data', async () => {
      const result = await generateTestData(mockClient, {
        dataType: 'contact',
        count: 2
      });

      expect(result.content[0]?.text).toContain('**Data Type:** contact');
      expect(result.content[0]?.text).toContain('CONTACT');
      expect(result.content[0]?.text).toContain('Test User');
      expect(result.content[0]?.text).toContain('test@example.com');
    });

    it('should generate all types of test data', async () => {
      const result = await generateTestData(mockClient, {
        dataType: 'all',
        count: 8
      });

      expect(result.content[0]?.text).toContain('**Data Type:** all');
      expect(result.content[0]?.text).toContain('property');
      expect(result.content[0]?.text).toContain('dns-zone');
      expect(result.content[0]?.text).toContain('hostname');
      expect(result.content[0]?.text).toContain('contact');
    });
  });

  describe('validateToolResponses', () => {
    it('should validate tool responses structure', async () => {
      const result = await validateToolResponses(mockClient, {
        toolName: 'listProperties',
        includePerformance: true
      });

      expect(result.content[0]?.text).toContain('MCP Tool Response Validation');
      expect(result.content[0]?.text).toContain('**Tool:** listProperties');
      expect(result.content[0]?.text).toContain('Validation Results');
      expect(result.content[0]?.text).toContain('Response Structure Validation');
      expect(result.content[0]?.text).toContain('Error Handling Validation');
      expect(result.content[0]?.text).toContain('Data Format Validation');
    });

    it('should validate by category', async () => {
      const result = await validateToolResponses(mockClient, {
        category: 'property',
        sampleSize: 5
      });

      expect(result.content[0]?.text).toContain('**Category:** property');
      expect(result.content[0]?.text).toContain('**Sample Size:** 5');
    });

    it('should provide validation recommendations', async () => {
      const result = await validateToolResponses(mockClient, {});

      expect(result.content[0]?.text).toContain('Recommendations');
    });
  });

  describe('runLoadTest', () => {
    it('should run basic load test', async () => {
      // Mock successful API calls
      mockClient.request.mockResolvedValue({ success: true });

      const result = await runLoadTest(mockClient, {
        endpoint: '/test/endpoint',
        concurrency: 2,
        duration: 1000,  // Reduced to 1 second for testing
        includeAnalysis: true
      });

      expect(result.content[0]?.text).toContain('Load Test Execution');
      expect(result.content[0]?.text).toContain('**Endpoint:** /test/endpoint');
      expect(result.content[0]?.text).toContain('**Concurrency:** 2 workers');
      expect(result.content[0]?.text).toContain('Results');
      expect(result.content[0]?.text).toContain('Performance Metrics');
      expect(result.content[0]?.text).toContain('Performance Analysis');
      expect(result.content[0]?.text).toContain('Recommendations');
    }, 10000); // Increase timeout to 10 seconds

    it('should use default parameters', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      const result = await runLoadTest(mockClient, {
        duration: 1000,  // Override default for test speed
        concurrency: 2   // Override default for test speed
      });

      expect(result.content[0]?.text).toContain('**Endpoint:** /papi/v1/properties');
      expect(result.content[0]?.text).toContain('**Concurrency:** 2 workers');
      expect(result.content[0]?.text).toContain('**Duration:** 1 seconds');
    }, 10000); // Increase timeout to 10 seconds

    it('should handle API failures during load test', async () => {
      mockClient.request.mockRejectedValue(new Error('Load test error'));

      const result = await runLoadTest(mockClient, {
        duration: 2000,
        concurrency: 2
      });

      expect(result.content[0]?.text).toContain('Failed Requests');
      expect(result.content[0]?.text).toContain('Error Analysis');
    });

    it('should provide performance analysis', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      const result = await runLoadTest(mockClient, {
        includeAnalysis: true,
        duration: 1000,  // Reduced for test speed
        concurrency: 2
      });

      expect(result.content[0]?.text).toContain('Performance Analysis');
      expect(result.content[0]?.text).toContain('reliability');
      expect(result.content[0]?.text).toContain('performance');
      expect(result.content[0]?.text).toContain('throughput');
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('error handling', () => {
    it('should handle errors gracefully in test suite execution', async () => {
      // Mock framework error
      const result = await runIntegrationTestSuite(mockClient, {
        suiteName: 'property-manager'
      });

      // Should not throw, should return error in response
      expect(result.content[0]?.text).toBeDefined();
    });

    it('should handle errors gracefully in API health check', async () => {
      mockClient.request.mockRejectedValue(new Error('Network error'));

      const result = await checkAPIHealth(mockClient, {});

      expect(result.content[0]?.text).toContain('API Health Check');
    });

    it('should handle errors gracefully in test data generation', async () => {
      const result = await generateTestData(mockClient, {
        dataType: 'property'
      });

      expect(result.content[0]?.text).toContain('Test Data Generation');
    });
  });

  describe('comprehensive testing scenarios', () => {
    it('should handle end-to-end testing workflow', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      // Generate test data
      const testData = await generateTestData(mockClient, {
        dataType: 'all',
        count: 4
      });

      // Check API health
      const healthCheck = await checkAPIHealth(mockClient, {
        includeLoadTest: false
      });

      // Run integration tests
      const testResults = await runIntegrationTestSuite(mockClient, {
        category: 'property',
        generateReport: true
      });

      // Validate responses
      const validation = await validateToolResponses(mockClient, {
        category: 'property'
      });

      expect(testData.content[0]?.text).toContain('Test Data Generation');
      expect(healthCheck.content[0]?.text).toContain('API Health Check');
      expect(testResults.content[0]?.text).toContain('Integration Test Execution');
      expect(validation.content[0]?.text).toContain('MCP Tool Response Validation');
    });

    it('should provide comprehensive testing recommendations', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      const result = await runIntegrationTestSuite(mockClient, {
        category: 'performance',
        priority: 'high',
        generateReport: true
      });

      expect(result.content[0]?.text).toContain('Recommendations');
      expect(result.content[0]?.text).toContain('Test Summary');
    });
  });
});