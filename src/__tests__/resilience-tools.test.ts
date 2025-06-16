/**
 * Tests for Resilience and Error Recovery Tools
 */

import { AkamaiClient } from '../akamai-client';
import {
  getSystemHealth,
  resetCircuitBreaker,
  getOperationMetrics,
  testOperationResilience,
  getErrorRecoverySuggestions
} from '../tools/resilience-tools';
import { globalResilienceManager, OperationType } from '../utils/resilience-manager';

// Mock the AkamaiClient
jest.mock('../akamai-client');

describe('Resilience Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient('test') as jest.Mocked<AkamaiClient>;
    mockClient.request = jest.fn();
    
    // Reset circuit breakers between tests
    Object.values(OperationType).forEach(opType => {
      globalResilienceManager.resetCircuitBreaker(opType as OperationType);
    });
  });

  describe('getSystemHealth', () => {
    it('should return overall system health status', async () => {
      const result = await getSystemHealth(mockClient, {});

      expect(result.content[0]?.text).toContain('System Health Report');
      expect(result.content[0]?.text).toContain('Overall Status:');
      expect(result.content[0]?.text).toContain('Operation Status');
    });

    it('should include metrics when requested', async () => {
      const result = await getSystemHealth(mockClient, {
        includeMetrics: true
      });

      expect(result.content[0]?.text).toContain('Metrics:');
      expect(result.content[0]?.text).toContain('Total Calls:');
      expect(result.content[0]?.text).toContain('Success Rate:');
    });

    it('should filter by operation type', async () => {
      const result = await getSystemHealth(mockClient, {
        operationType: OperationType.PROPERTY_READ
      });

      expect(result.content[0]?.text).toContain('PROPERTY_READ');
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should reset circuit breaker for operation type', async () => {
      const result = await resetCircuitBreaker(mockClient, {
        operationType: OperationType.PROPERTY_READ,
        force: true
      });

      expect(result.content[0]?.text).toContain('Circuit Breaker Reset');
      expect(result.content[0]?.text).toContain('**Operation Type:** PROPERTY_READ');
      expect(result.content[0]?.text).toContain('**New State:** CLOSED');
    });

    it('should handle force reset', async () => {
      const result = await resetCircuitBreaker(mockClient, {
        operationType: OperationType.PROPERTY_READ,
        force: true
      });

      expect(result.content[0]?.text).toContain('Circuit Breaker Reset');
    });

    it('should handle invalid operation type', async () => {
      const result = await resetCircuitBreaker(mockClient, {
        operationType: 'INVALID_TYPE' as any
      });

      expect(result.content[0]?.text).toContain('No circuit breaker found');
    });
  });

  describe('getOperationMetrics', () => {
    it('should return all operation metrics', async () => {
      const result = await getOperationMetrics(mockClient, {});

      expect(result.content[0]?.text).toContain('Operation Metrics Report');
      expect(result.content[0]?.text).toContain('All Operations Summary');
      expect(result.content[0]?.text).toContain('Individual Operation Metrics');
    });

    it('should return specific operation metrics', async () => {
      const result = await getOperationMetrics(mockClient, {
        operationType: OperationType.PROPERTY_READ
      });

      expect(result.content[0]?.text).toContain('PROPERTY_READ');
    });

    it('should handle invalid operation type', async () => {
      const result = await getOperationMetrics(mockClient, {
        operationType: 'INVALID_TYPE' as any
      });

      expect(result.content[0]?.text).toContain('No metrics found');
    });
  });

  describe('testOperationResilience', () => {
    it('should perform basic resilience test', async () => {
      // Mock successful API calls
      mockClient.request.mockResolvedValue({ success: true });

      const result = await testOperationResilience(mockClient, {
        operationType: OperationType.PROPERTY_READ,
        testType: 'basic',
        iterations: 3
      });

      expect(result.content[0]?.text).toContain('Resilience Test Report');
      expect(result.content[0]?.text).toContain('**Operation Type:** PROPERTY_READ');
      expect(result.content[0]?.text).toContain('**Test Type:** basic');
      expect(result.content[0]?.text).toContain('**Iterations:** 3');
    });

    it('should handle test failures gracefully', async () => {
      // Mock API failures
      mockClient.request.mockRejectedValue(new Error('API Error'));

      const result = await testOperationResilience(mockClient, {
        operationType: OperationType.PROPERTY_READ,
        testType: 'basic',
        iterations: 2
      });

      expect(result.content[0]?.text).toContain('Failed Operations');
      expect(result.content[0]?.text).toContain('API Error');
    });

    it('should test circuit breaker behavior', async () => {
      const result = await testOperationResilience(mockClient, {
        operationType: OperationType.PROPERTY_READ,
        testType: 'circuit_breaker',
        iterations: 5
      });

      expect(result.content[0]?.text).toContain('Circuit Breaker State');
    });
  });

  describe('getErrorRecoverySuggestions', () => {
    it('should provide general recovery suggestions', async () => {
      const result = await getErrorRecoverySuggestions(mockClient, {});

      expect(result.content[0]?.text).toContain('Error Recovery Suggestions');
      expect(result.content[0]?.text).toContain('Immediate Recovery Actions');
      expect(result.content[0]?.text).toContain('Circuit Breaker Management');
    });

    it('should provide error-specific guidance', async () => {
      const result = await getErrorRecoverySuggestions(mockClient, {
        errorType: 'rate_limit'
      });

      expect(result.content[0]?.text).toContain('Rate Limit Errors');
      expect(result.content[0]?.text).toContain('Wait 60 seconds');
    });

    it('should provide operation-specific guidance', async () => {
      const result = await getErrorRecoverySuggestions(mockClient, {
        operationType: OperationType.PROPERTY_WRITE
      });

      expect(result.content[0]?.text).toContain('Property Write Operations');
    });

    it('should include preventive measures when requested', async () => {
      const result = await getErrorRecoverySuggestions(mockClient, {
        includePreventiveMeasures: true
      });

      expect(result.content[0]?.text).toContain('Preventive Measures');
      expect(result.content[0]?.text).toContain('Monitoring');
      expect(result.content[0]?.text).toContain('Rate Limiting');
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // Test error handling by calling a function that might throw
      const result = await getSystemHealth(mockClient, {
        operationType: 'INVALID_TYPE' as any
      });
      
      // The function should still return health data, not error
      expect(result.content[0]?.text).toContain('System Health Report');
    });
  });
});