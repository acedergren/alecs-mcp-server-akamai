/**
 * Error Recovery Service Tests
 */

import { errorRecoveryService, RecoveryContext, RecoveryStrategy } from '../error-recovery-service';
import { AkamaiError } from '../../core/errors/error-handler';

describe('ErrorRecoveryService', () => {
  describe('analyzeError', () => {
    it('should suggest retry with backoff for rate limit errors', async () => {
      const context: RecoveryContext = {
        error: new AkamaiError({
          type: '/errors/rate-limit',
          title: 'Rate Limit Exceeded',
          status: 429,
          detail: 'Too many requests'
        }),
        tool: 'property_list',
        operation: 'list',
        customer: 'test'
      };

      const suggestions = await errorRecoveryService.analyzeError(context);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].strategy).toBe(RecoveryStrategy.RETRY_WITH_BACKOFF);
      expect(suggestions[0].confidence).toBeGreaterThan(0.9);
      expect(suggestions[0].automatic).toBe(true);
    });

    it('should suggest account switching for permission errors', async () => {
      const context: RecoveryContext = {
        error: new AkamaiError({
          type: '/errors/forbidden',
          title: 'Permission Denied',
          status: 403,
          detail: 'Access forbidden'
        }),
        tool: 'property_create',
        operation: 'create',
        customer: 'test'
      };

      const suggestions = await errorRecoveryService.analyzeError(context);
      
      const accountSwitchSuggestion = suggestions.find(
        s => s.strategy === RecoveryStrategy.ACCOUNT_SWITCH
      );
      
      expect(accountSwitchSuggestion).toBeDefined();
      expect(accountSwitchSuggestion?.confidence).toBeGreaterThan(0.7);
    });

    it('should suggest timeout increase for timeout errors', async () => {
      const context: RecoveryContext = {
        error: new Error('Request timeout'),
        tool: 'property_activate',
        operation: 'activate',
        customer: 'test'
      };

      // Mock status code
      (context.error as any).status = 408;

      const suggestions = await errorRecoveryService.analyzeError(context);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].strategy).toBe(RecoveryStrategy.INCREASE_TIMEOUT);
      expect(suggestions[0].parameters?.timeout).toBe(120000); // 2 minutes
    });

    it('should learn from successful recoveries', async () => {
      const context: RecoveryContext = {
        error: new Error('Custom error'),
        tool: 'test_tool',
        operation: 'test',
        customer: 'test'
      };

      // Mock error pattern
      (context.error as any).status = 500;

      // Execute a successful recovery
      const action = {
        strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
        description: 'Test recovery',
        confidence: 1.0,
        automatic: true
      };

      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      await errorRecoveryService.executeRecovery(action, context, mockExecutor);

      // Analyze the same error again
      const newSuggestions = await errorRecoveryService.analyzeError(context);
      
      // Should now have learned pattern
      const retryStrategy = newSuggestions.find(
        s => s.strategy === RecoveryStrategy.RETRY_WITH_BACKOFF
      );
      
      expect(retryStrategy).toBeDefined();
      expect(retryStrategy?.confidence).toBe(0.9); // High confidence from learning
    });
  });

  describe('executeRecovery', () => {
    it('should execute retry with exponential backoff', async () => {
      const context: RecoveryContext = {
        error: new Error('Temporary failure'),
        tool: 'test_tool',
        operation: 'test',
        customer: 'test'
      };

      const action = {
        strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
        description: 'Retry with backoff',
        confidence: 1.0,
        automatic: true,
        parameters: {
          maxAttempts: 2,
          baseDelay: 100
        }
      };

      let attempts = 0;
      const mockExecutor = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new Error('Still failing'));
        }
        return Promise.resolve({ success: true });
      });

      const result = await errorRecoveryService.executeRecovery(
        action,
        context,
        mockExecutor
      );

      expect(result.success).toBe(true);
      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(result.strategy).toBe(RecoveryStrategy.RETRY_WITH_BACKOFF);
    });

    it('should track failed recovery attempts', async () => {
      const context: RecoveryContext = {
        error: new Error('Permanent failure'),
        tool: 'test_tool',
        operation: 'test',
        customer: 'test'
      };

      const action = {
        strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
        description: 'Retry with backoff',
        confidence: 1.0,
        automatic: true,
        parameters: {
          maxAttempts: 1,
          baseDelay: 10
        }
      };

      const mockExecutor = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        errorRecoveryService.executeRecovery(action, context, mockExecutor)
      ).rejects.toThrow('Always fails');

      // Check analytics
      const analytics = errorRecoveryService.getAnalytics();
      const stats = analytics.strategySuccessRates.get(RecoveryStrategy.RETRY_WITH_BACKOFF);
      
      expect(stats).toBeDefined();
      expect(stats!.failures).toBeGreaterThan(0);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics summary', () => {
      const analytics = errorRecoveryService.getAnalytics();
      
      expect(analytics).toHaveProperty('strategySuccessRates');
      expect(analytics).toHaveProperty('errorPatterns');
      expect(analytics).toHaveProperty('averageRecoveryTimes');
      
      // Should be a Map
      expect(analytics.strategySuccessRates).toBeInstanceOf(Map);
      expect(analytics.errorPatterns).toBeInstanceOf(Map);
      expect(analytics.averageRecoveryTimes).toBeInstanceOf(Map);
    });
  });

  describe('circuit breaker integration', () => {
    it('should get circuit breaker for operation', () => {
      const cb1 = errorRecoveryService.getCircuitBreaker('property', 'list');
      const cb2 = errorRecoveryService.getCircuitBreaker('property', 'list');
      
      // Should return same instance
      expect(cb1).toBe(cb2);
      
      // Should have valid state
      const state = cb1.getState();
      expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(state);
    });
  });
});