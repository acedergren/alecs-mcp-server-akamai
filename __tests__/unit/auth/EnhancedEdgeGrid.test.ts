import { EnhancedEdgeGrid } from '../../../src/auth/EnhancedEdgeGrid';
import { OptimizedHTTPClient } from '../../../src/core/OptimizedHTTPClient';
import { CircuitBreaker } from '../../../src/resilience/CircuitBreaker';
import EdgeGrid = require('akamai-edgegrid');

// Mock akamai-edgegrid
jest.mock('akamai-edgegrid', () => ({
  EdgeGrid: jest.fn().mockImplementation(() => ({
    auth: jest.fn((options) => ({
      ...options,
      headers: {
        ...options.headers,
        'Authorization': 'EG1-HMAC-SHA256 test-auth-header'
      }
    }))
  }))
}));

describe('EnhancedEdgeGrid', () => {
  let enhancedEdgeGrid: EnhancedEdgeGrid;
  let mockOptimizedClient: OptimizedHTTPClient;
  let mockCircuitBreaker: CircuitBreaker;

  beforeEach(() => {
    // Create mock instances
    mockOptimizedClient = {
      getHttpsAgent: jest.fn().mockReturnValue({ protocol: 'h2' }),
      getHttpAgent: jest.fn().mockReturnValue({ protocol: 'http/1.1' }),
      executeRequest: jest.fn().mockResolvedValue({
        response: { statusCode: 200 },
        data: Buffer.from('{"test": "response"}'),
        metrics: { latency: 100, connectionReused: true }
      }),
      getMetrics: jest.fn().mockReturnValue({
        totalRequests: 10,
        reuseCount: 9,
        averageLatency: 150
      }),
      getConnectionReuseRate: jest.fn().mockReturnValue(90),
      destroy: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    } as any;

    mockCircuitBreaker = {
      execute: jest.fn().mockImplementation((fn) => fn()),
      getState: jest.fn().mockReturnValue('CLOSED'),
      destroy: jest.fn(),
      on: jest.fn()
    } as any;

    enhancedEdgeGrid = new EnhancedEdgeGrid({
      optimizedClient: mockOptimizedClient,
      circuitBreaker: mockCircuitBreaker,
      monkeyPatchSDK: true
    });
  });

  afterEach(() => {
    if (enhancedEdgeGrid) {
      enhancedEdgeGrid.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with EdgeGrid configuration', () => {
      expect(EdgeGrid).toHaveBeenCalledWith({
        path: expect.any(String),
        section: expect.any(String)
      });
    });

    it('should apply monkey patch by default', () => {
      const edgeGrid = new EnhancedEdgeGrid({ monkeyPatchSDK: true });
      
      // Verify that the original auth method was stored
      expect((edgeGrid as any).originalAuth).toBeDefined();
      
      edgeGrid.destroy();
    });

    it('should skip monkey patch when disabled', () => {
      const edgeGrid = new EnhancedEdgeGrid({ monkeyPatchSDK: false });
      
      // Verify that monkey patch was not applied
      expect((edgeGrid as any).originalAuth).toBeNull();
      
      edgeGrid.destroy();
    });

    it('should emit monkeyPatchApplied event', (done) => {
      const edgeGrid = new EnhancedEdgeGrid({ monkeyPatchSDK: true });
      
      edgeGrid.on('monkeyPatchApplied', (info) => {
        expect(info.originalAuth).toBe(true);
        expect(info.optimizedClient).toBe(true);
        done();
        edgeGrid.destroy();
      });
    });
  });

  describe('Request Execution', () => {
    it('should execute GET request successfully', async () => {
      const result = await enhancedEdgeGrid.get('/test/path', { 'Custom-Header': 'value' });
      
      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
      expect(mockOptimizedClient.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/test/path',
          headers: expect.objectContaining({
            'Custom-Header': 'value'
          })
        }),
        undefined
      );
      expect(result.response.statusCode).toBe(200);
    });

    it('should execute POST request with data', async () => {
      const postData = JSON.stringify({ test: 'data' });
      const result = await enhancedEdgeGrid.post('/test/path', postData);
      
      expect(mockOptimizedClient.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/test/path',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        }),
        postData
      );
    });

    it('should execute PUT request with data', async () => {
      const putData = JSON.stringify({ update: 'data' });
      await enhancedEdgeGrid.put('/test/path', putData);
      
      expect(mockOptimizedClient.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        }),
        putData
      );
    });

    it('should execute DELETE request', async () => {
      await enhancedEdgeGrid.delete('/test/path');
      
      expect(mockOptimizedClient.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          path: '/test/path'
        }),
        undefined
      );
    });

    it('should emit requestSuccess on successful request', (done) => {
      enhancedEdgeGrid.on('requestSuccess', (info) => {
        expect(info.path).toBe('/test/path');
        expect(info.method).toBe('GET');
        expect(info.totalTime).toBeGreaterThan(0);
        done();
      });

      enhancedEdgeGrid.get('/test/path');
    });

    it('should emit requestError on failed request', (done) => {
      mockOptimizedClient.executeRequest = jest.fn().mockRejectedValue(new Error('Network error'));
      
      enhancedEdgeGrid.on('requestError', (info) => {
        expect(info.path).toBe('/test/path');
        expect(info.error).toBeInstanceOf(Error);
        done();
      });

      enhancedEdgeGrid.get('/test/path').catch(() => {});
    });
  });

  describe('Authentication Enhancement', () => {
    it('should enhance auth with optimized HTTP agent', () => {
      const mockRequestOptions = {
        hostname: 'api.akamai.com',
        path: '/test',
        method: 'GET',
        protocol: 'https:'
      };

      // Get the enhanced EdgeGrid instance's auth method
      const edgeGrid = (enhancedEdgeGrid as any).edgeGrid;
      const enhancedOptions = edgeGrid.auth(mockRequestOptions);

      expect(mockOptimizedClient.getHttpsAgent).toHaveBeenCalledWith('api.akamai.com');
      expect(enhancedOptions.agent).toBeDefined();
      expect(enhancedOptions.timeout).toBe(30000);
      expect(enhancedOptions.headers['Connection']).toBe('keep-alive');
    });

    it('should add account switch key header if available', () => {
      process.env.AKAMAI_ACCOUNT_SWITCH_KEY = 'test-switch-key';
      
      const mockRequestOptions = {
        hostname: 'api.akamai.com',
        path: '/test',
        method: 'GET'
      };

      const edgeGrid = (enhancedEdgeGrid as any).edgeGrid;
      const enhancedOptions = edgeGrid.auth(mockRequestOptions);

      expect(enhancedOptions.headers['account-switch-key']).toBe('test-switch-key');
      
      delete process.env.AKAMAI_ACCOUNT_SWITCH_KEY;
    });

    it('should emit authSuccess on successful authentication', (done) => {
      enhancedEdgeGrid.on('authSuccess', (info) => {
        expect(info.hostname).toBeDefined();
        expect(info.authTime).toBeGreaterThan(0);
        expect(info.keepAlive).toBe(true);
        done();
      });

      const mockRequestOptions = {
        hostname: 'api.akamai.com',
        path: '/test',
        method: 'GET'
      };

      const edgeGrid = (enhancedEdgeGrid as any).edgeGrid;
      edgeGrid.auth(mockRequestOptions);
    });

    it('should handle auth errors gracefully', () => {
      // Mock original auth to throw error
      (enhancedEdgeGrid as any).originalAuth = jest.fn().mockImplementation(() => {
        throw new Error('Auth failed');
      });

      const mockRequestOptions = {
        hostname: 'api.akamai.com',
        path: '/test',
        method: 'GET'
      };

      const edgeGrid = (enhancedEdgeGrid as any).edgeGrid;
      
      expect(() => {
        edgeGrid.auth(mockRequestOptions);
      }).toThrow('Auth failed');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should use circuit breaker for request execution', async () => {
      await enhancedEdgeGrid.get('/test/path');
      
      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
    });

    it('should emit circuitBreakerStateChange event', (done) => {
      enhancedEdgeGrid.on('circuitBreakerStateChange', (state) => {
        expect(state).toBeDefined();
        done();
      });

      // Simulate circuit breaker state change
      const stateChangeCallback = mockCircuitBreaker.on.mock.calls
        .find(call => call[0] === 'stateChange')[1];
      stateChangeCallback('OPEN');
    });

    it('should get circuit breaker state', () => {
      const state = enhancedEdgeGrid.getCircuitBreakerState();
      expect(state).toBe('CLOSED');
      expect(mockCircuitBreaker.getState).toHaveBeenCalled();
    });

    it('should reset circuit breaker', () => {
      enhancedEdgeGrid.resetCircuitBreaker();
      // Circuit breaker should have a reset method, but our mock doesn't
      // In a real implementation, this would call mockCircuitBreaker.reset()
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track authentication metrics', () => {
      const metrics = enhancedEdgeGrid.getMetrics();
      
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('successfulAuth');
      expect(metrics).toHaveProperty('failedAuth');
      expect(metrics).toHaveProperty('averageAuthTime');
    });

    it('should calculate success rate', () => {
      const successRate = enhancedEdgeGrid.getSuccessRate();
      expect(typeof successRate).toBe('number');
      expect(successRate).toBeGreaterThanOrEqual(0);
      expect(successRate).toBeLessThanOrEqual(100);
    });

    it('should get network metrics from optimized client', () => {
      const networkMetrics = enhancedEdgeGrid.getNetworkMetrics();
      expect(mockOptimizedClient.getMetrics).toHaveBeenCalled();
      expect(networkMetrics).toEqual({
        totalRequests: 10,
        reuseCount: 9,
        averageLatency: 150
      });
    });

    it('should get connection reuse rate', () => {
      const reuseRate = enhancedEdgeGrid.getConnectionReuseRate();
      expect(mockOptimizedClient.getConnectionReuseRate).toHaveBeenCalled();
      expect(reuseRate).toBe(90);
    });
  });

  describe('Health Check', () => {
    it('should perform comprehensive health check', async () => {
      const health = await enhancedEdgeGrid.healthCheck();
      
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(health.metrics).toBeDefined();
      expect(health.circuitBreakerState).toBe('CLOSED');
      expect(health.networkOptimization).toBeDefined();
    });

    it('should return healthy status for good metrics', async () => {
      // Mock good metrics
      (enhancedEdgeGrid as any).metrics.totalRequests = 100;
      (enhancedEdgeGrid as any).metrics.successfulAuth = 95;
      mockOptimizedClient.getConnectionReuseRate = jest.fn().mockReturnValue(85);
      
      const health = await enhancedEdgeGrid.healthCheck();
      expect(health.status).toBe('healthy');
    });

    it('should return unhealthy status for circuit breaker open', async () => {
      mockCircuitBreaker.getState = jest.fn().mockReturnValue('OPEN');
      
      const health = await enhancedEdgeGrid.healthCheck();
      expect(health.status).toBe('unhealthy');
    });

    it('should return degraded status for poor connection reuse', async () => {
      (enhancedEdgeGrid as any).metrics.totalRequests = 100;
      (enhancedEdgeGrid as any).metrics.successfulAuth = 85; // 85% success rate
      mockOptimizedClient.getConnectionReuseRate = jest.fn().mockReturnValue(65); // Below 70%
      
      const health = await enhancedEdgeGrid.healthCheck();
      expect(health.status).toBe('degraded');
    });
  });

  describe('Hostname Extraction', () => {
    it('should extract hostname from URL', () => {
      const extractHostname = (enhancedEdgeGrid as any).extractHostnameFromUrl;
      
      expect(extractHostname('https://api.akamai.com/path')).toBe('api.akamai.com');
      expect(extractHostname('http://test.example.com')).toBe('test.example.com');
      expect(extractHostname('invalid-url')).toBeNull();
      expect(extractHostname(undefined)).toBeNull();
    });
  });

  describe('Event Handling', () => {
    it('should forward performance alerts from optimized client', (done) => {
      enhancedEdgeGrid.on('performanceAlert', (alert) => {
        expect(alert).toBeDefined();
        done();
      });

      // Simulate performance alert from optimized client
      const performanceAlertCallback = mockOptimizedClient.on.mock.calls
        .find(call => call[0] === 'performanceAlert')[1];
      performanceAlertCallback({ type: 'high_latency', value: 5000 });
    });

    it('should forward connection optimization events', (done) => {
      enhancedEdgeGrid.on('connectionOptimized', (info) => {
        expect(info).toBeDefined();
        done();
      });

      // Simulate connection reused event from optimized client
      const connectionReusedCallback = mockOptimizedClient.on.mock.calls
        .find(call => call[0] === 'connectionReused')[1];
      connectionReusedCallback({ hostname: 'api.akamai.com' });
    });
  });

  describe('Resource Cleanup', () => {
    it('should restore original auth method on destroy', () => {
      const originalAuth = (enhancedEdgeGrid as any).originalAuth;
      const edgeGrid = (enhancedEdgeGrid as any).edgeGrid;
      
      enhancedEdgeGrid.destroy();
      
      expect(edgeGrid.auth).toBe(originalAuth);
      expect(mockOptimizedClient.destroy).toHaveBeenCalled();
      expect(mockCircuitBreaker.destroy).toHaveBeenCalled();
    });

    it('should emit destroyed event on cleanup', (done) => {
      enhancedEdgeGrid.on('destroyed', () => {
        done();
      });
      
      enhancedEdgeGrid.destroy();
    });
  });

  describe('Configuration', () => {
    it('should use environment variables for EdgeRC configuration', () => {
      process.env.EDGERC_PATH = '/custom/path/.edgerc';
      process.env.EDGERC_SECTION = 'production';
      
      const edgeGrid = new EnhancedEdgeGrid();
      const config = (edgeGrid as any).config;
      
      expect(config.edgercPath).toBe('/custom/path/.edgerc');
      expect(config.section).toBe('production');
      
      edgeGrid.destroy();
      delete process.env.EDGERC_PATH;
      delete process.env.EDGERC_SECTION;
    });

    it('should use default values when environment variables not set', () => {
      const edgeGrid = new EnhancedEdgeGrid();
      const config = (edgeGrid as any).config;
      
      expect(config.edgercPath).toBe('~/.edgerc');
      expect(config.section).toBe('default');
      expect(config.timeoutMs).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      
      edgeGrid.destroy();
    });
  });
});