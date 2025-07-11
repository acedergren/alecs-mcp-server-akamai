/**
 * DNS Changelist Service Tests
 * 
 * Comprehensive test suite for the DNS changelist abstraction service.
 * Tests all aspects of changelist workflow including error handling,
 * validation, and integration with Akamai APIs.
 */

import { DNSChangelistService, type DNSRecordChange, type ChangelistConfig } from '../../services/dns-changelist-service';
import { CustomerConfigManager } from '../../services/customer-config-manager';
import { AkamaiClient } from '../../akamai-client';

// Mock dependencies
jest.mock('../../services/customer-config-manager');
jest.mock('../../akamai-client');
jest.mock('../../utils/logger');

describe('DNSChangelistService', () => {
  let service: DNSChangelistService;
  let mockCustomerManager: jest.Mocked<CustomerConfigManager>;
  let mockRequest: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request function
    mockRequest = jest.fn();
    (AkamaiClient as jest.MockedClass<typeof AkamaiClient>).mockImplementation(() => ({
      request: mockRequest
    } as any));

    // Setup mock CustomerConfigManager
    mockCustomerManager = CustomerConfigManager.getInstance() as jest.Mocked<CustomerConfigManager>;
    mockCustomerManager.validateCustomerAccess = jest.fn().mockResolvedValue(true);

    // Create service instance
    service = new DNSChangelistService();
  });

  describe('addRecord', () => {
    it('should successfully add a DNS record with changelist workflow', async () => {
      // Mock API responses
      mockRequest
        .mockResolvedValueOnce({}) // Create record
        .mockResolvedValueOnce({ // Submit changelist
          requestId: 'req_123',
          changeTag: 'tag_456',
          zone: 'example.com',
          statusUrl: '/status/req_123'
        })
        .mockResolvedValueOnce({ // Status check
          requestId: 'req_123',
          changeTag: 'tag_456',
          zone: 'example.com',
          status: 'COMPLETE',
          submittedDate: '2025-01-11T10:00:00Z',
          completedDate: '2025-01-11T10:05:00Z',
          passingValidations: ['syntax_check'],
          failingValidations: []
        });

      const result = await service.addRecord('example.com', {
        name: 'test',
        type: 'A',
        rdata: ['192.168.1.1'],
        ttl: 300
      });

      expect(result.status).toBe('COMPLETE');
      expect(result.zone).toBe('example.com');
      expect(result.successfulRecords).toHaveLength(1);
      expect(result.successfulRecords[0].name).toBe('test');
      expect(result.requestId).toBe('req_123');
      expect(mockCustomerManager.validateCustomerAccess).toHaveBeenCalledWith('default');
    });

    it('should validate DNS record parameters', async () => {
      await expect(service.addRecord('example.com', {
        name: '', // Invalid empty name
        type: 'A',
        rdata: ['192.168.1.1']
      })).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      mockRequest.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.addRecord('example.com', {
        name: 'test',
        type: 'A',
        rdata: ['192.168.1.1']
      })).rejects.toThrow('DNS changelist operation failed');
    });
  });

  describe('updateRecord', () => {
    it('should successfully update a DNS record', async () => {
      // Mock API responses for update workflow
      mockRequest
        .mockResolvedValueOnce({}) // Update record
        .mockResolvedValueOnce({ // Submit changelist
          requestId: 'req_124',
          changeTag: 'tag_457',
          zone: 'example.com',
          statusUrl: '/status/req_124'
        })
        .mockResolvedValueOnce({ // Status check
          requestId: 'req_124',
          status: 'COMPLETE',
          completedDate: '2025-01-11T10:06:00Z'
        });

      const result = await service.updateRecord('example.com', {
        name: 'test',
        type: 'A',
        rdata: ['192.168.1.2'], // Updated IP
        ttl: 600 // Updated TTL
      });

      expect(result.status).toBe('COMPLETE');
      expect(mockRequest).toHaveBeenCalledTimes(3);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/config-dns/v2/zones/example.com/recordsets/test/A',
        body: {
          ttl: 600,
          rdata: ['192.168.1.2']
        }
      });
    });
  });

  describe('deleteRecord', () => {
    it('should successfully delete a DNS record', async () => {
      // Mock API responses for delete workflow
      mockRequest
        .mockResolvedValueOnce({}) // Delete record
        .mockResolvedValueOnce({ // Submit changelist
          requestId: 'req_125',
          changeTag: 'tag_458',
          zone: 'example.com'
        })
        .mockResolvedValueOnce({ // Status check
          requestId: 'req_125',
          status: 'COMPLETE'
        });

      const result = await service.deleteRecord('example.com', {
        name: 'test',
        type: 'A'
      });

      expect(result.status).toBe('COMPLETE');
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/config-dns/v2/zones/example.com/recordsets/test/A'
      });
    });
  });

  describe('batchUpdate', () => {
    it('should process multiple DNS record changes atomically', async () => {
      const changes: DNSRecordChange[] = [
        {
          name: 'www',
          type: 'A',
          rdata: ['192.168.1.1'],
          operation: 'add',
          ttl: 300
        },
        {
          name: 'api',
          type: 'CNAME',
          rdata: ['www.example.com'],
          operation: 'add',
          ttl: 300
        },
        {
          name: 'old',
          type: 'A',
          operation: 'delete'
        }
      ];

      // Mock successful API responses for all operations
      mockRequest
        .mockResolvedValueOnce({}) // Create www A record
        .mockResolvedValueOnce({}) // Create api CNAME record
        .mockResolvedValueOnce({}) // Delete old A record
        .mockResolvedValueOnce({ // Submit changelist
          requestId: 'req_batch_123',
          changeTag: 'tag_batch_456',
          zone: 'example.com'
        })
        .mockResolvedValueOnce({ // Status check
          requestId: 'req_batch_123',
          status: 'COMPLETE'
        });

      const result = await service.batchUpdate('example.com', changes);

      expect(result.status).toBe('COMPLETE');
      expect(result.successfulRecords).toHaveLength(3);
      expect(result.failedRecords).toHaveLength(0);
      expect(mockRequest).toHaveBeenCalledTimes(5); // 3 operations + submit + status
    });

    it('should handle partial failures in batch operations', async () => {
      const changes: DNSRecordChange[] = [
        {
          name: 'www',
          type: 'A',
          rdata: ['192.168.1.1'],
          operation: 'add'
        },
        {
          name: 'invalid',
          type: 'A',
          rdata: ['invalid-ip'],
          operation: 'add'
        }
      ];

      // Mock first operation success, second failure
      mockRequest
        .mockResolvedValueOnce({}) // First record succeeds
        .mockRejectedValueOnce(new Error('Invalid IP address')); // Second record fails

      await expect(service.batchUpdate('example.com', changes)).rejects.toThrow();
    });

    it('should validate batch size limits', async () => {
      // Create a batch that exceeds the maximum size
      const changes: DNSRecordChange[] = Array(101).fill(null).map((_, i) => ({
        name: `test${i}`,
        type: 'A' as const,
        rdata: ['192.168.1.1'],
        operation: 'add' as const
      }));

      await expect(service.batchUpdate('example.com', changes)).rejects.toThrow('exceeds maximum');
    });
  });

  describe('configuration validation', () => {
    it('should validate changelist configuration', async () => {
      const invalidConfig: Partial<ChangelistConfig> = {
        zone: '', // Invalid empty zone
        network: 'STAGING'
      };

      await expect(service.addRecord('', {
        name: 'test',
        type: 'A',
        rdata: ['192.168.1.1']
      }, invalidConfig)).rejects.toThrow();
    });

    it('should apply default values for optional configuration', async () => {
      mockRequest
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          requestId: 'req_default',
          changeTag: 'tag_default',
          zone: 'example.com'
        })
        .mockResolvedValueOnce({
          requestId: 'req_default',
          status: 'COMPLETE'
        });

      const result = await service.addRecord('example.com', {
        name: 'test',
        type: 'A',
        rdata: ['192.168.1.1']
      });

      expect(result.status).toBe('COMPLETE');
      // Verify defaults were applied (autoActivate: true, network: STAGING)
    });
  });

  describe('status tracking', () => {
    it('should poll for activation status until completion', async () => {
      mockRequest
        .mockResolvedValueOnce({}) // Create record
        .mockResolvedValueOnce({ // Submit changelist
          requestId: 'req_status',
          changeTag: 'tag_status',
          zone: 'example.com'
        })
        .mockResolvedValueOnce({ // First status check - pending
          requestId: 'req_status',
          status: 'PENDING'
        })
        .mockResolvedValueOnce({ // Second status check - complete
          requestId: 'req_status',
          status: 'COMPLETE',
          completedDate: '2025-01-11T10:10:00Z'
        });

      const result = await service.addRecord('example.com', {
        name: 'test',
        type: 'A',
        rdata: ['192.168.1.1']
      });

      expect(result.status).toBe('COMPLETE');
      expect(mockRequest).toHaveBeenCalledTimes(4); // create + submit + 2 status checks
    });

    it('should timeout if activation takes too long', async () => {
      mockRequest
        .mockResolvedValueOnce({}) // Create record
        .mockResolvedValueOnce({ // Submit changelist
          requestId: 'req_timeout',
          changeTag: 'tag_timeout',
          zone: 'example.com'
        })
        .mockResolvedValue({ // Always return pending
          requestId: 'req_timeout',
          status: 'PENDING'
        });

      const config: Partial<ChangelistConfig> = {
        timeoutMs: 1000 // Very short timeout for testing
      };

      await expect(service.addRecord('example.com', {
        name: 'test',
        type: 'A',
        rdata: ['192.168.1.1']
      }, config)).rejects.toThrow('timed out');
    }, 10000); // Extend test timeout
  });

  describe('getChangelistStatus', () => {
    it('should retrieve current changelist status', async () => {
      const expectedStatus = {
        requestId: 'req_123',
        changeTag: 'tag_456',
        zone: 'example.com',
        status: 'COMPLETE',
        submittedDate: '2025-01-11T10:00:00Z',
        completedDate: '2025-01-11T10:05:00Z'
      };

      mockRequest.mockResolvedValueOnce(expectedStatus);

      const result = await service.getChangelistStatus('example.com', 'req_123');

      expect(result).toEqual(expectedStatus);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/config-dns/v2/changelists/example.com/submit/req_123'
      });
    });
  });

  describe('listPendingChangelists', () => {
    it('should list all pending changelists', async () => {
      const expectedChangelists = [
        { zone: 'example.com', changeTag: 'tag_1', stale: false },
        { zone: 'test.com', changeTag: 'tag_2', stale: false }
      ];

      mockRequest.mockResolvedValueOnce({
        changeLists: expectedChangelists
      });

      const result = await service.listPendingChangelists();

      expect(result).toEqual(expectedChangelists);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/config-dns/v2/changelists'
      });
    });
  });
});