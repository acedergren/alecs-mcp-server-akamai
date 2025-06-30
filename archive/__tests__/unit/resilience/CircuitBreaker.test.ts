import { CircuitBreaker, CircuitBreakerState } from '../../../src/resilience/CircuitBreaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      recoveryTimeout: 1000,
      monitorTimeout: 100 // Faster for testing
    });
  });

  afterEach(() => {
    if (circuitBreaker) {
      circuitBreaker.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should emit initialized event', (done) => {
      const cb = new CircuitBreaker({ failureThreshold: 5 });
      
      cb.on('initialized', (info) => {
        expect(info.state).toBe('CLOSED');
        expect(info.config.failureThreshold).toBe(5);
        done();
        cb.destroy();
      });
    });

    it('should use default configuration values', () => {
      const cb = new CircuitBreaker({});
      const config = (cb as any).config;
      
      expect(config.failureThreshold).toBe(5);
      expect(config.successThreshold).toBe(2);
      expect(config.recoveryTimeout).toBe(60000);
      expect(config.monitorTimeout).toBe(10000);
      
      cb.destroy();
    });
  });

  describe('State Transitions - CLOSED to OPEN', () => {
    it('should move to OPEN after reaching failure threshold', async () => {
      let stateChanges: any[] = [];
      
      circuitBreaker.on('stateChange', (change) => {
        stateChanges.push(change);
      });

      // Execute 3 failures to reach threshold
      const failingFn = jest.fn().mockRejectedValue(new Error('Test failure'));
      
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(stateChanges).toHaveLength(1);
      expect(stateChanges[0].from).toBe('CLOSED');
      expect(stateChanges[0].to).toBe('OPEN');
      expect(stateChanges[0].reason).toBe('Failure threshold exceeded');
    });

    it('should track failure metrics correctly', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('Test failure'));
      
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (error) {
          // Expected to fail
        }
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.failedRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.lastFailureTime).toBeGreaterThan(0);
    });

    it('should emit requestFailure events', (done) => {
      let failureCount = 0;
      
      circuitBreaker.on('requestFailure', (info) => {
        failureCount++;
        expect(info.error).toBeInstanceOf(Error);
        expect(info.failures).toBe(failureCount);
        expect(info.state).toBe('CLOSED');
        
        if (failureCount === 1) {
          done();
        }
      });

      const failingFn = jest.fn().mockRejectedValue(new Error('Test failure'));
      circuitBreaker.execute(failingFn).catch(() => {});
    });
  });

  describe('State Transitions - OPEN to HALF_OPEN', () => {
    beforeEach(async () => {
      // Move to OPEN state
      const failingFn = jest.fn().mockRejectedValue(new Error('Test failure'));
      
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should reject requests immediately when OPEN', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      
      try {
        await circuitBreaker.execute(successFn);
        fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toBe('Circuit breaker is OPEN');
        expect(successFn).not.toHaveBeenCalled();
      }
    });

    it('should move to HALF_OPEN after recovery timeout', async () => {
      let stateChanges: any[] = [];
      
      circuitBreaker.on('stateChange', (change) => {
        if (change.to === 'HALF_OPEN') {
          stateChanges.push(change);
        }
      });

      // Wait for recovery timeout (1000ms) plus buffer
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Try to execute a function to trigger HALF_OPEN
      const successFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);
      
      expect(stateChanges).toHaveLength(1);
      expect(stateChanges[0].reason).toBe('Recovery timeout elapsed');
    });

    it('should emit requestRejected events when OPEN', (done) => {
      circuitBreaker.on('requestRejected', (info) => {
        expect(info.state).toBe('OPEN');
        expect(info.nextAttempt).toBeGreaterThan(Date.now());
        expect(info.timeUntilRetry).toBeGreaterThan(0);
        done();
      });

      const successFn = jest.fn().mockResolvedValue('success');
      circuitBreaker.execute(successFn).catch(() => {});
    });
  });

  describe('State Transitions - HALF_OPEN to CLOSED', () => {
    beforeEach(async () => {
      // Move to OPEN state first
      const failingFn = jest.fn().mockRejectedValue(new Error('Test failure'));
      
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Wait for recovery timeout and move to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Execute one request to trigger HALF_OPEN
      const successFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);
      
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });

    it('should move to CLOSED after success threshold', async () => {
      let stateChanges: any[] = [];
      
      circuitBreaker.on('stateChange', (change) => {
        if (change.to === 'CLOSED') {
          stateChanges.push(change);
        }
      });

      // Execute one more success to reach threshold (2)
      const successFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);
      
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(stateChanges).toHaveLength(1);
      expect(stateChanges[0].reason).toBe('Success threshold reached');
    });

    it('should emit halfOpenSuccess events', (done) => {
      circuitBreaker.on('halfOpenSuccess', (info) => {
        expect(info.successes).toBeGreaterThan(0);
        expect(info.threshold).toBe(2);
        done();
      });

      const successFn = jest.fn().mockResolvedValue('success');
      circuitBreaker.execute(successFn);
    });

    it('should return to OPEN if failure occurs in HALF_OPEN', async () => {
      // First, ensure we're in HALF_OPEN state properly
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      
      const failingFn = jest.fn().mockRejectedValue(new Error('Half-open failure'));
      
      try {
        await circuitBreaker.execute(failingFn);
      } catch (error) {
        // Expected to fail
      }
      
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('Success Execution', () => {
    it('should execute successful requests in CLOSED state', async () => {
      const successFn = jest.fn().mockResolvedValue('test result');
      
      const result = await circuitBreaker.execute(successFn);
      
      expect(result).toBe('test result');
      expect(successFn).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should track success metrics', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);
      
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.lastSuccessTime).toBeGreaterThan(0);
    });

    it('should emit requestSuccess events', (done) => {
      circuitBreaker.on('requestSuccess', (info) => {
        expect(info.responseTime).toBeGreaterThan(0);
        expect(info.state).toBe('CLOSED');
        expect(info.totalRequests).toBe(1);
        done();
      });

      const successFn = jest.fn().mockResolvedValue('success');
      circuitBreaker.execute(successFn);
    });
  });

  describe('Expected Errors', () => {
    class ExpectedError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ExpectedError';
      }
    }

    it('should not count expected errors towards failure threshold', async () => {
      const cbWithExpectedErrors = new CircuitBreaker({
        failureThreshold: 2,
        expectedErrors: [ExpectedError]
      });

      const expectedErrorFn = jest.fn().mockRejectedValue(new ExpectedError('Expected'));
      
      // Execute 3 expected errors (more than threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await cbWithExpectedErrors.execute(expectedErrorFn);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Should still be CLOSED
      expect(cbWithExpectedErrors.getState()).toBe('CLOSED');
      
      cbWithExpectedErrors.destroy();
    });

    it('should emit expectedError events', (done) => {
      const cbWithExpectedErrors = new CircuitBreaker({
        expectedErrors: [ExpectedError]
      });

      cbWithExpectedErrors.on('expectedError', (info) => {
        expect(info.error).toBeInstanceOf(ExpectedError);
        expect(info.responseTime).toBeGreaterThan(0);
        done();
        cbWithExpectedErrors.destroy();
      });

      const expectedErrorFn = jest.fn().mockRejectedValue(new ExpectedError('Expected'));
      cbWithExpectedErrors.execute(expectedErrorFn).catch(() => {});
    });
  });

  describe('Metrics and Statistics', () => {
    it('should calculate failure rate correctly', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const failingFn = jest.fn().mockRejectedValue(new Error('failure'));
      
      // 2 successes, 1 failure = 33.33% failure rate
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);
      
      try {
        await circuitBreaker.execute(failingFn);
      } catch (error) {
        // Expected to fail
      }
      
      const stats = circuitBreaker.getStats();
      expect(stats.failureRate).toBeCloseTo(33.33, 1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
    });

    it('should track average response time', async () => {
      const slowFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow'), 100))
      );
      
      await circuitBreaker.execute(slowFn);
      
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThan(50); // Should be around 100ms
    });

    it('should calculate request rate', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);
      
      const stats = circuitBreaker.getStats();
      expect(stats.requestRate).toBeGreaterThan(0);
      expect(stats.uptime).toBeGreaterThan(0);
    });
  });

  describe('Health Monitoring', () => {
    it('should perform periodic health checks', (done) => {
      let healthCheckCount = 0;
      
      circuitBreaker.on('healthCheck', (info) => {
        healthCheckCount++;
        expect(info.state).toBeDefined();
        expect(info.stats).toBeDefined();
        expect(info.metrics).toBeDefined();
        expect(info.timestamp).toBeGreaterThan(0);
        
        if (healthCheckCount >= 1) {
          done();
        }
      });

      // Health check should fire within monitorTimeout (100ms for testing)
    });

    it('should emit high failure rate alerts', (done) => {
      circuitBreaker.on('highFailureRate', (info) => {
        expect(info.failureRate).toBeGreaterThan(50);
        expect(info.threshold).toBe(50);
        expect(info.state).toBe('CLOSED');
        done();
      });

      // Simulate high failure rate by manipulating metrics
      (circuitBreaker as any).metrics.totalRequests = 10;
      (circuitBreaker as any).metrics.failedRequests = 6; // 60% failure rate
      (circuitBreaker as any).performHealthCheck();
    });

    it('should emit high response time alerts', (done) => {
      circuitBreaker.on('highResponseTime', (info) => {
        expect(info.averageResponseTime).toBeGreaterThan(10000);
        expect(info.threshold).toBe(10000);
        done();
      });

      // Simulate high response time
      (circuitBreaker as any).metrics.averageResponseTime = 15000;
      (circuitBreaker as any).performHealthCheck();
    });

    it('should check if circuit breaker is healthy', () => {
      expect(circuitBreaker.isHealthy()).toBe(true);
      
      // Force to OPEN state
      circuitBreaker.forceState('OPEN');
      expect(circuitBreaker.isHealthy()).toBe(false);
    });
  });

  describe('Manual Control', () => {
    it('should allow forcing state', () => {
      let stateChanges: any[] = [];
      
      circuitBreaker.on('stateForced', (change) => {
        stateChanges.push(change);
      });

      circuitBreaker.forceState('OPEN');
      
      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(stateChanges).toHaveLength(1);
      expect(stateChanges[0].from).toBe('CLOSED');
      expect(stateChanges[0].to).toBe('OPEN');
    });

    it('should allow manual reset', () => {
      // Move to OPEN state first
      circuitBreaker.forceState('OPEN');
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      circuitBreaker.reset();
      
      expect(circuitBreaker.getState()).toBe('CLOSED');
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
    });

    it('should emit reset event', (done) => {
      circuitBreaker.on('reset', (info) => {
        expect(info.previousState).toBe('OPEN');
        expect(info.timestamp).toBeGreaterThan(0);
        done();
      });

      circuitBreaker.forceState('OPEN');
      circuitBreaker.reset();
    });
  });

  describe('Request Allowance', () => {
    it('should allow requests in CLOSED state', () => {
      expect(circuitBreaker.allowsRequests()).toBe(true);
    });

    it('should allow requests in HALF_OPEN state', () => {
      circuitBreaker.forceState('HALF_OPEN');
      expect(circuitBreaker.allowsRequests()).toBe(true);
    });

    it('should not allow requests in OPEN state before recovery timeout', () => {
      circuitBreaker.forceState('OPEN');
      expect(circuitBreaker.allowsRequests()).toBe(false);
    });

    it('should calculate time until retry correctly', () => {
      circuitBreaker.forceState('OPEN');
      
      const timeUntilRetry = circuitBreaker.getTimeUntilRetry();
      expect(timeUntilRetry).toBeGreaterThan(0);
      expect(timeUntilRetry).toBeLessThanOrEqual(1000); // Recovery timeout
    });
  });

  describe('Resource Cleanup', () => {
    it('should destroy and cleanup resources', (done) => {
      // Add a small delay to ensure uptime > 0
      setTimeout(() => {
        circuitBreaker.on('destroyed', (info) => {
          expect(info.finalState).toBeDefined();
          expect(info.totalRequests).toBeDefined();
          expect(info.uptime).toBeGreaterThanOrEqual(0);
          done();
        });

        circuitBreaker.destroy();
      }, 10);
    });

    it('should stop monitoring after destroy', () => {
      const monitorTimer = (circuitBreaker as any).monitorTimer;
      expect(monitorTimer).toBeDefined();
      
      circuitBreaker.destroy();
      
      const destroyedTimer = (circuitBreaker as any).monitorTimer;
      expect(destroyedTimer).toBeNull();
    });
  });

  describe('Timeout Tracking', () => {
    it('should track timeout errors separately', async () => {
      const timeoutFn = jest.fn().mockRejectedValue(new Error('Request timeout'));
      
      try {
        await circuitBreaker.execute(timeoutFn);
      } catch (error) {
        // Expected to fail
      }
      
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.timeouts).toBe(1);
    });
  });
});