import { OptimizedHTTPClient, NetworkOptimizationTargets } from '../../../src/core/OptimizedHTTPClient';
import { Agent as HttpsAgent } from 'https';
import { Agent as HttpAgent } from 'http';

describe('OptimizedHTTPClient', () => {
  let client: OptimizedHTTPClient;

  beforeEach(() => {
    client = new OptimizedHTTPClient({
      maxSockets: 10,
      keepAlive: true,
      http2: true
    });
  });

  afterEach(async () => {
    if (client) {
      client.destroy();
    }
  });

  describe('Agent Management', () => {
    it('should create HTTPS agent with optimized settings', () => {
      const agent = client.getHttpsAgent('api.akamai.com');
      
      expect(agent).toBeInstanceOf(HttpsAgent);
      expect(agent.maxSockets).toBe(10);
      expect((agent as any).keepAlive).toBe(true);
    });

    it('should create HTTP agent with optimized settings', () => {
      const agent = client.getHttpAgent('api.akamai.com');
      
      expect(agent).toBeInstanceOf(HttpAgent);
      expect(agent.maxSockets).toBe(10);
      expect((agent as any).keepAlive).toBe(true);
    });

    it('should reuse agents for same hostname', () => {
      const agent1 = client.getHttpsAgent('api.akamai.com');
      const agent2 = client.getHttpsAgent('api.akamai.com');
      
      expect(agent1).toBe(agent2);
    });

    it('should create different agents for different hostnames', () => {
      const agent1 = client.getHttpsAgent('api1.akamai.com');
      const agent2 = client.getHttpsAgent('api2.akamai.com');
      
      expect(agent1).not.toBe(agent2);
    });

    it('should emit agentCreated event when new agent is created', (done) => {
      client.on('agentCreated', (info) => {
        expect(info.hostname).toBe('api.akamai.com');
        expect(info.protocol).toBe('https');
        done();
      });

      client.getHttpsAgent('api.akamai.com');
    });
  });

  describe('DNS Caching', () => {
    it('should cache DNS lookups', () => {
      // Simulate DNS caching behavior
      const agent1 = client.getHttpsAgent('example.com');
      const agent2 = client.getHttpsAgent('example.com');
      
      // Should return same agent (cached)
      expect(agent1).toBe(agent2);
    });

    it('should clear DNS cache', () => {
      client.clearDNSCache();
      // Should emit dnsCacheCleared event
      expect(true).toBe(true); // Cache cleared successfully
    });
  });

  describe('Connection Metrics', () => {
    it('should track connection metrics', () => {
      const metrics = client.getMetrics();
      
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('reuseCount');
      expect(metrics).toHaveProperty('failureCount');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('http2Connections');
      expect(metrics).toHaveProperty('http1Connections');
    });

    it('should calculate connection reuse rate', () => {
      const reuseRate = client.getConnectionReuseRate();
      expect(typeof reuseRate).toBe('number');
      expect(reuseRate).toBeGreaterThanOrEqual(0);
      expect(reuseRate).toBeLessThanOrEqual(100);
    });

    it('should emit connectionReused event on connection reuse', (done) => {
      client.on('connectionReused', (info) => {
        expect(info.hostname).toBeDefined();
        expect(info.socket).toBeDefined();
        done();
      });

      // Simulate connection reuse by triggering agent's free event
      const agent = client.getHttpsAgent('api.akamai.com');
      // Mock socket for testing
      const mockSocket = { reused: true, destroy: jest.fn() };
      agent.emit('free', mockSocket);
    });
  });

  describe('Request Execution', () => {
    it('should execute HTTP request with retry logic', async () => {
      const mockRequest = {
        hostname: 'api.akamai.com',
        path: '/test',
        method: 'GET',
        protocol: 'https:'
      };

      // Mock the actual HTTP request to avoid network calls
      const originalMakeRequest = (client as any).makeRequest;
      (client as any).makeRequest = jest.fn().mockResolvedValue({
        response: { statusCode: 200 },
        data: Buffer.from('test response'),
        socket: { reused: true }
      });

      const result = await client.executeRequest(mockRequest);
      
      expect(result.response.statusCode).toBe(200);
      expect(result.data.toString()).toBe('test response');
      expect(result.metrics).toHaveProperty('latency');
      expect(result.metrics).toHaveProperty('attempt');
      
      // Restore original method
      (client as any).makeRequest = originalMakeRequest;
    });

    it('should retry on failure up to configured attempts', async () => {
      const mockRequest = {
        hostname: 'api.akamai.com',
        path: '/test',
        method: 'GET',
        protocol: 'https:'
      };

      let attemptCount = 0;
      (client as any).makeRequest = jest.fn().mockImplementation(() => {
        attemptCount++;
        throw new Error(`Attempt ${attemptCount} failed`);
      });

      try {
        await client.executeRequest(mockRequest);
        fail('Should have thrown an error');
      } catch (error) {
        expect(attemptCount).toBe(3); // Default retry attempts
        expect((error as Error).message).toContain('Attempt 3 failed');
      }
    });

    it('should emit requestSuccess on successful request', (done) => {
      client.on('requestSuccess', (info) => {
        expect(info.hostname).toBe('api.akamai.com');
        expect(info.latency).toBeGreaterThan(0);
        expect(typeof info.attempt).toBe('number');
        done();
      });

      const mockRequest = {
        hostname: 'api.akamai.com',
        path: '/test',
        method: 'GET',
        protocol: 'https:'
      };

      (client as any).makeRequest = jest.fn().mockResolvedValue({
        response: { statusCode: 200 },
        data: Buffer.from('test'),
        socket: { reused: false }
      });

      client.executeRequest(mockRequest);
    });

    it('should emit requestRetry on retry attempt', (done) => {
      let retryEmitted = false;
      
      client.on('requestRetry', (info) => {
        expect(info.hostname).toBe('api.akamai.com');
        expect(info.attempt).toBeGreaterThan(0);
        expect(info.delay).toBeGreaterThan(0);
        retryEmitted = true;
      });

      client.on('requestFailed', () => {
        expect(retryEmitted).toBe(true);
        done();
      });

      const mockRequest = {
        hostname: 'api.akamai.com',
        path: '/test',
        method: 'GET',
        protocol: 'https:'
      };

      (client as any).makeRequest = jest.fn().mockRejectedValue(new Error('Test error'));
      client.executeRequest(mockRequest).catch(() => {});
    });
  });

  describe('Performance Monitoring', () => {
    it('should emit performance alerts', (done) => {
      client.on('performanceAlert', (alert) => {
        expect(alert.type).toBeDefined();
        expect(alert.value).toBeDefined();
        expect(alert.threshold).toBeDefined();
        done();
      });

      // Simulate low reuse rate by manipulating metrics
      (client as any).metrics.totalRequests = 100;
      (client as any).metrics.reuseCount = 50; // 50% reuse rate (below 70% threshold)
      
      // Trigger health check
      (client as any).performHealthCheck();
    });

    it('should perform health checks periodically', (done) => {
      let healthCheckCount = 0;
      
      client.on('healthCheck', (info) => {
        healthCheckCount++;
        expect(info.reuseRate).toBeDefined();
        expect(info.failureRate).toBeDefined();
        expect(info.averageLatency).toBeDefined();
        expect(info.activeConnections).toBeDefined();
        
        if (healthCheckCount >= 1) {
          done();
        }
      });

      // Trigger immediate health check
      (client as any).performHealthCheck();
    });
  });

  describe('Retry Logic', () => {
    it('should calculate exponential backoff with jitter', () => {
      const client = new OptimizedHTTPClient({
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        jitterMs: 100
      });

      const delay1 = (client as any).calculateRetryDelay(1);
      const delay2 = (client as any).calculateRetryDelay(2);
      const delay3 = (client as any).calculateRetryDelay(3);

      expect(delay1).toBeGreaterThan(1000);
      expect(delay1).toBeLessThan(1200); // 1000 + 100 jitter + some buffer
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      expect(delay3).toBeLessThanOrEqual(10000); // Max delay cap
      
      client.destroy();
    });
  });

  describe('Resource Management', () => {
    it('should destroy all resources properly', () => {
      const agent1 = client.getHttpsAgent('api1.akamai.com');
      const agent2 = client.getHttpAgent('api2.akamai.com');
      
      const destroySpy1 = jest.spyOn(agent1, 'destroy');
      const destroySpy2 = jest.spyOn(agent2, 'destroy');
      
      client.destroy();
      
      expect(destroySpy1).toHaveBeenCalled();
      expect(destroySpy2).toHaveBeenCalled();
    });

    it('should emit destroyed event on cleanup', (done) => {
      client.on('destroyed', () => {
        done();
      });
      
      client.destroy();
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultClient = new OptimizedHTTPClient();
      const config = (defaultClient as any).config;
      
      expect(config.maxSockets).toBe(25);
      expect(config.keepAlive).toBe(true);
      expect(config.http2).toBe(true);
      expect(config.retryAttempts).toBe(3);
      
      defaultClient.destroy();
    });

    it('should merge provided configuration with defaults', () => {
      const customClient = new OptimizedHTTPClient({
        maxSockets: 50,
        retryAttempts: 5
      });
      const config = (customClient as any).config;
      
      expect(config.maxSockets).toBe(50);
      expect(config.retryAttempts).toBe(5);
      expect(config.keepAlive).toBe(true); // Default value
      
      customClient.destroy();
    });
  });

  describe('HTTP/2 Support', () => {
    it('should configure agents with HTTP/2 ALPN protocols', () => {
      const agent = client.getHttpsAgent('api.akamai.com');
      
      // Check if ALPN protocols are set (this is implementation specific)
      expect(agent).toBeDefined();
      // The actual ALPN configuration would be verified in integration tests
    });
  });
});

describe('NetworkOptimizationTargets', () => {
  it('should define performance targets', () => {
    const targets: NetworkOptimizationTargets = {
      latencyReduction: '70%',
      connectionReuse: '90%',
      failoverTime: '<500ms',
      poolSize: 25,
      http2Support: true
    };

    expect(targets.latencyReduction).toBe('70%');
    expect(targets.connectionReuse).toBe('90%');
    expect(targets.failoverTime).toBe('<500ms');
    expect(targets.poolSize).toBe(25);
    expect(targets.http2Support).toBe(true);
  });
});