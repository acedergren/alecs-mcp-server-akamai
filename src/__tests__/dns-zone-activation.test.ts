/**
 * Comprehensive tests for enhanced DNS zone activation workflow
 */

import { AkamaiClient } from '../akamai-client';
import {
  submitChangeList,
  waitForZoneActivation,
  activateZoneChanges,
  getChangeList,
  discardChangeList,
  processMultipleZones,
  ZoneActivationStatus
} from '../tools/dns-tools';

// Mock the AkamaiClient
jest.mock('../akamai-client');

// Mock progress utilities
jest.mock('../utils/progress', () => ({
  Spinner: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    update: jest.fn()
  })),
  format: {
    cyan: (s: string) => s,
    green: (s: string) => s,
    dim: (s: string) => s,
    bold: (s: string) => s,
    yellow: (s: string) => s
  },
  icons: {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    dns: '🌐',
    list: '📋',
    question: '❓'
  }
}));

describe('DNS Zone Activation Tests', () => {
  let mockClient: jest.Mocked<AkamaiClient>;
  
  beforeEach(() => {
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    jest.clearAllMocks();
    
    // Reset environment
    delete process.env.DNS_OPERATION_LOG;
  });

  describe('submitChangeList', () => {
    const mockChangelist = {
      zone: 'example.com',
      lastModifiedDate: '2024-01-15T10:00:00Z',
      lastModifiedBy: 'test-user',
      recordSets: [
        { name: 'www', type: 'A', ttl: 300, rdata: ['192.0.2.1'] },
        { name: 'mail', type: 'MX', ttl: 600, rdata: ['10 mail.example.com'] }
      ]
    };

    const mockSubmitResponse = {
      requestId: 'req-12345',
      expiryDate: '2024-01-15T11:00:00Z'
    };

    it('should successfully submit a changelist', async () => {
      mockClient.request
        .mockResolvedValueOnce(mockChangelist) // getChangeList
        .mockResolvedValueOnce(mockSubmitResponse); // submit

      const response = await submitChangeList(mockClient, 'example.com', 'Test submission');

      expect(response).toEqual(mockSubmitResponse);
      expect(mockClient.request).toHaveBeenCalledTimes(2);
      expect(mockClient.request).toHaveBeenNthCalledWith(2, {
        path: '/config-dns/v2/changelists/example.com/submit',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: {
          comment: 'Test submission',
          validateOnly: false
        }
      });
    });

    it('should handle validation-only submission', async () => {
      mockClient.request
        .mockResolvedValueOnce(mockChangelist)
        .mockResolvedValueOnce({
          ...mockSubmitResponse,
          validationResult: {
            errors: [],
            warnings: [
              { field: 'ttl', message: 'TTL is below recommended value' }
            ]
          }
        });

      const response = await submitChangeList(mockClient, 'example.com', 'Validation test', {
        validateOnly: true
      });

      expect(response.validationResult).toBeDefined();
      expect(mockClient.request).toHaveBeenNthCalledWith(2, expect.objectContaining({
        body: expect.objectContaining({
          validateOnly: true
        })
      }));
    });

    it('should throw error for empty changelist', async () => {
      mockClient.request.mockResolvedValueOnce({
        ...mockChangelist,
        recordSets: []
      });

      await expect(
        submitChangeList(mockClient, 'example.com')
      ).rejects.toThrow('The changelist for zone example.com is empty');
    });

    it('should throw error when no changelist exists', async () => {
      mockClient.request.mockResolvedValueOnce(null);

      await expect(
        submitChangeList(mockClient, 'example.com')
      ).rejects.toThrow('No pending changelist exists for zone example.com');
    });

    it('should retry on rate limit errors', async () => {
      const rateLimitError = new Error('Too many requests');
      (rateLimitError as any).statusCode = 429;

      mockClient.request
        .mockResolvedValueOnce(mockChangelist)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(mockSubmitResponse);

      const response = await submitChangeList(mockClient, 'example.com', 'Retry test', {
        retryConfig: {
          maxRetries: 2,
          initialDelay: 10,
          maxDelay: 100
        }
      });

      expect(response).toEqual(mockSubmitResponse);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
    });

    it('should handle transient network errors with retry', async () => {
      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNRESET';

      mockClient.request
        .mockResolvedValueOnce(mockChangelist)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockSubmitResponse);

      const response = await submitChangeList(mockClient, 'example.com', 'Network retry test', {
        retryConfig: {
          maxRetries: 2,
          initialDelay: 10
        }
      });

      expect(response).toEqual(mockSubmitResponse);
    });

    it('should fail validation with errors', async () => {
      mockClient.request
        .mockResolvedValueOnce(mockChangelist)
        .mockResolvedValueOnce({
          ...mockSubmitResponse,
          validationResult: {
            errors: [
              { field: 'rdata', message: 'Invalid IP address format' }
            ],
            warnings: []
          }
        });

      await expect(
        submitChangeList(mockClient, 'example.com', 'Validation fail test', {
          validateOnly: true
        })
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('waitForZoneActivation', () => {
    it('should wait for successful activation', async () => {
      const pendingStatus: ZoneActivationStatus = {
        zone: 'example.com',
        activationState: 'PENDING',
        propagationStatus: {
          percentage: 50,
          serversUpdated: 100,
          totalServers: 200
        }
      };

      const activeStatus: ZoneActivationStatus = {
        zone: 'example.com',
        activationState: 'ACTIVE',
        lastActivationTime: '2024-01-15T10:05:00Z',
        propagationStatus: {
          percentage: 100,
          serversUpdated: 200,
          totalServers: 200
        }
      };

      mockClient.request
        .mockResolvedValueOnce(pendingStatus)
        .mockResolvedValueOnce(pendingStatus)
        .mockResolvedValueOnce(activeStatus);

      const result = await waitForZoneActivation(mockClient, 'example.com', {
        pollInterval: 10,
        timeout: 1000
      });

      expect(result).toEqual(activeStatus);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones/example.com/status',
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
    });

    it('should throw error on failed activation', async () => {
      const failedStatus: ZoneActivationStatus = {
        zone: 'example.com',
        activationState: 'FAILED'
      };

      mockClient.request.mockResolvedValueOnce(failedStatus);

      await expect(
        waitForZoneActivation(mockClient, 'example.com')
      ).rejects.toThrow('Zone activation failed for example.com');
    });

    it('should handle rate limiting with backoff', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).statusCode = 429;

      const activeStatus: ZoneActivationStatus = {
        zone: 'example.com',
        activationState: 'ACTIVE'
      };

      mockClient.request
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(activeStatus);

      const result = await waitForZoneActivation(mockClient, 'example.com', {
        pollInterval: 10
      });

      expect(result).toEqual(activeStatus);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
    });

    it('should timeout after specified duration', async () => {
      const pendingStatus: ZoneActivationStatus = {
        zone: 'example.com',
        activationState: 'PENDING'
      };

      mockClient.request.mockResolvedValue(pendingStatus);

      await expect(
        waitForZoneActivation(mockClient, 'example.com', {
          timeout: 100,
          pollInterval: 30
        })
      ).rejects.toThrow('Timeout waiting for zone example.com activation after 100ms');
    });
  });

  describe('activateZoneChanges', () => {
    const mockChangelist = {
      zone: 'example.com',
      lastModifiedDate: '2024-01-15T10:00:00Z',
      lastModifiedBy: 'test-user',
      recordSets: [
        { name: 'www', type: 'A', ttl: 300, rdata: ['192.0.2.1'] }
      ]
    };

    it('should activate zone changes successfully', async () => {
      mockClient.request
        .mockResolvedValueOnce(mockChangelist) // getChangeList
        .mockResolvedValueOnce(mockChangelist) // getChangeList in submit
        .mockResolvedValueOnce({ requestId: 'req-12345', expiryDate: '2024-01-15T11:00:00Z' }); // submit

      const result = await activateZoneChanges(mockClient, {
        zone: 'example.com',
        comment: 'Test activation'
      });

      expect(result.content[0].text).toContain('Successfully activated 1 changes');
      expect(result.content[0].text).toContain('req-12345');
    });

    it('should handle no pending changes', async () => {
      mockClient.request.mockResolvedValueOnce(null);

      const result = await activateZoneChanges(mockClient, {
        zone: 'example.com'
      });

      expect(result.content[0].text).toContain('No pending changes found');
    });

    it('should perform validation only when requested', async () => {
      mockClient.request
        .mockResolvedValueOnce(mockChangelist)
        .mockResolvedValueOnce(mockChangelist)
        .mockResolvedValueOnce({
          requestId: 'req-12345',
          expiryDate: '2024-01-15T11:00:00Z',
          validationResult: { errors: [], warnings: [] }
        });

      const result = await activateZoneChanges(mockClient, {
        zone: 'example.com',
        validateOnly: true
      });

      expect(result.content[0].text).toContain('Validation completed successfully');
    });
  });

  describe('discardChangeList', () => {
    it('should discard changelist with retry on transient error', async () => {
      const transientError = new Error('Service unavailable');
      (transientError as any).statusCode = 503;

      mockClient.request
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce(undefined);

      await discardChangeList(mockClient, 'example.com');

      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 404 errors', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).statusCode = 404;

      mockClient.request.mockRejectedValueOnce(notFoundError);

      // Should not throw - 404 is considered success
      await expect(discardChangeList(mockClient, 'example.com')).resolves.toBeUndefined();
      expect(mockClient.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('processMultipleZones', () => {
    it('should process multiple zones sequentially', async () => {
      const zones = ['zone1.com', 'zone2.com', 'zone3.com'];
      const operation = jest.fn().mockResolvedValue(true);

      const result = await processMultipleZones(mockClient, zones, operation, {
        delayBetweenZones: 10
      });

      expect(result.successful).toEqual(zones);
      expect(result.failed).toEqual([]);
      expect(operation).toHaveBeenCalledTimes(3);
      expect(operation).toHaveBeenCalledWith('zone1.com');
      expect(operation).toHaveBeenCalledWith('zone2.com');
      expect(operation).toHaveBeenCalledWith('zone3.com');
    });

    it('should continue on error when specified', async () => {
      const zones = ['zone1.com', 'zone2.com', 'zone3.com'];
      const operation = jest.fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Zone 2 failed'))
        .mockResolvedValueOnce(true);

      const result = await processMultipleZones(mockClient, zones, operation, {
        continueOnError: true,
        delayBetweenZones: 0
      });

      expect(result.successful).toEqual(['zone1.com', 'zone3.com']);
      expect(result.failed).toEqual([
        { zone: 'zone2.com', error: 'Zone 2 failed' }
      ]);
    });

    it('should stop on error when continueOnError is false', async () => {
      const zones = ['zone1.com', 'zone2.com', 'zone3.com'];
      const operation = jest.fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Zone 2 failed'));

      await expect(
        processMultipleZones(mockClient, zones, operation, {
          continueOnError: false
        })
      ).rejects.toThrow('Failed processing zone zone2.com');

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Operational Logging', () => {
    it('should log operations when DNS_OPERATION_LOG is enabled', async () => {
      process.env.DNS_OPERATION_LOG = 'true';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockChangelist = {
        zone: 'example.com',
        lastModifiedDate: '2024-01-15T10:00:00Z',
        lastModifiedBy: 'test-user',
        recordSets: [{ name: 'www', type: 'A', ttl: 300, rdata: ['192.0.2.1'] }]
      };

      mockClient.request
        .mockResolvedValueOnce(mockChangelist)
        .mockResolvedValueOnce({ requestId: 'req-12345', expiryDate: '2024-01-15T11:00:00Z' });

      await submitChangeList(mockClient, 'example.com', 'Test with logging');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DNS-OPS]'),
        expect.stringContaining('CHANGELIST_SUBMITTED'),
        expect.any(String)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});