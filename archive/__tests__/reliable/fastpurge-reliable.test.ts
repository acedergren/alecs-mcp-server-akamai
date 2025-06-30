/**
 * Reliable FastPurge Tests
 * Example of 100% reliable testing without external dependencies
 */

import { UnitTestBase } from '../../src/testing/base/reliable-test-base';
import { AkamaiResponseFactory } from '../../src/testing/factories/response-factory';

describe('FastPurge - Reliable Tests', () => {
  let testBase: UnitTestBase;

  beforeEach(async () => {
    testBase = new UnitTestBase();
    await testBase.setupTest();
  });

  afterEach(async () => {
    await testBase.teardownTest();
  });

  describe('CP Code Purge', () => {
    it('should require confirmation for high-impact purge', async () => {
      // Setup scenario
      testBase.setupSuccessScenario();
      testBase.mockApiEndpoint(
        '/ccu/v2/queues/default',
        AkamaiResponseFactory.fastPurgeResponse('confirmation_required')
      );

      // Import and test (after mocks are set up)
      const { fastpurgeCpcodeInvalidate } = require('../../src/tools/fastpurge-tools');
      
      const response = await fastpurgeCpcodeInvalidate.handler({
        customer: 'testing',
        network: 'staging',
        cpCodes: ['12345'],
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.content[0].text).toContain('WARNING: High-Impact CP Code Purge Operation');
      expect(response.content[0].text).toContain('Add "confirmed": true');
    });

    it('should proceed with confirmed high-impact purge', async () => {
      // Setup scenario
      testBase.setupSuccessScenario();
      testBase.mockApiEndpoint(
        '/ccu/v2/queues/default',
        AkamaiResponseFactory.fastPurgeResponse('success')
      );

      const { fastpurgeCpcodeInvalidate } = require('../../src/tools/fastpurge-tools');
      
      const response = await fastpurgeCpcodeInvalidate.handler({
        customer: 'testing',
        network: 'staging',
        cpCodes: ['12345'],
        confirmed: true,
      });

      expect(response).toBeDefined();
      expect(response.content[0].text).toContain('Purge request submitted successfully');
      
      // Verify API was called
      expect(testBase.verifyApiCall('/ccu/v2/queues/default', 'POST')).toBe(true);
    });

    it('should handle authentication errors gracefully', async () => {
      // Setup auth error scenario
      testBase.setupAuthErrorScenario();

      const { fastpurgeCpcodeInvalidate } = require('../../src/tools/fastpurge-tools');
      
      await expect(
        fastpurgeCpcodeInvalidate.handler({
          customer: 'testing',
          network: 'staging',
          cpCodes: ['12345'],
        })
      ).rejects.toThrow('Authentication failed');
    });

    it('should handle rate limiting', async () => {
      // Setup rate limit scenario
      testBase.setupRateLimitScenario();

      const { fastpurgeCpcodeInvalidate } = require('../../src/tools/fastpurge-tools');
      
      await expect(
        fastpurgeCpcodeInvalidate.handler({
          customer: 'testing',
          network: 'staging',
          cpCodes: ['12345'],
        })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('URL Purge', () => {
    it('should successfully purge URLs', async () => {
      // Setup scenario
      testBase.setupSuccessScenario();
      testBase.mockApiEndpoint(
        '/ccu/v2/queues/default',
        AkamaiResponseFactory.fastPurgeResponse('success')
      );

      const { fastpurgeUrlInvalidate } = require('../../src/tools/fastpurge-tools');
      
      const response = await fastpurgeUrlInvalidate.handler({
        customer: 'testing',
        network: 'staging',
        urls: ['https://example.com/test.html'],
      });

      expect(response).toBeDefined();
      expect(response.content[0].text).toContain('Purge request submitted successfully');
      
      // Verify correct endpoint was called
      expect(testBase.verifyApiCall('/ccu/v2/queues/default', 'POST')).toBe(true);
      expect(testBase.getApiCallCount('/ccu/v2/queues/default')).toBe(1);
    });

    it('should validate URL format', async () => {
      testBase.setupSuccessScenario();

      const { fastpurgeUrlInvalidate } = require('../../src/tools/fastpurge-tools');
      
      await expect(
        fastpurgeUrlInvalidate.handler({
          customer: 'testing',
          network: 'staging',
          urls: ['invalid-url'],
        })
      ).rejects.toThrow();
    });
  });

  describe('Purge Status', () => {
    it('should check purge status', async () => {
      // Setup scenario
      testBase.setupSuccessScenario();
      testBase.mockApiEndpoint(
        '/ccu/v2/purges/12345',
        AkamaiResponseFactory.fastPurgeStatusResponse('DONE')
      );

      const { fastpurgeStatus } = require('../../src/tools/fastpurge-tools');
      
      const response = await fastpurgeStatus.handler({
        customer: 'testing',
        purgeId: '12345',
      });

      expect(response).toBeDefined();
      expect(response.content[0].text).toContain('Purge Status: DONE');
      expect(response.content[0].text).toContain('Progress: 100%');
    });
  });
});