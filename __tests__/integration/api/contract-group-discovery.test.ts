/**
 * Contract/Group Auto-Discovery Service Tests
 * 
 * Tests the discovery service functionality including:
 * - Contract and group discovery
 * - Validation with suggestions
 * - Error enhancement
 * - Cache management
 */

import { contractGroupDiscovery } from '../services/contract-group-discovery-service';
import { AkamaiClient } from '../akamai-client';

// Mock the AkamaiClient
jest.mock('../akamai-client');
const MockedAkamaiClient = AkamaiClient as jest.MockedClass<typeof AkamaiClient>;

// Mock the cache service
jest.mock('../core/server/performance/smart-cache', () => ({
  getGlobalCache: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    invalidatePattern: jest.fn()
  }))
}));

describe('ContractGroupDiscoveryService', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new MockedAkamaiClient() as jest.Mocked<AkamaiClient>;
    MockedAkamaiClient.mockImplementation(() => mockClient);
  });

  afterEach(() => {
    // Clear any in-progress discoveries
    contractGroupDiscovery.clearAllCaches();
  });

  describe('Discovery', () => {
    it('should discover contracts and groups successfully', async () => {
      // Mock API responses
      mockClient.request
        .mockResolvedValueOnce({
          // Contracts response
          contracts: {
            items: [
              { contractId: 'ctr_V-123456', contractTypeName: 'Akamai' },
              { contractId: 'ctr_V-789012', contractTypeName: 'Partner' }
            ]
          }
        })
        .mockResolvedValueOnce({
          // Groups response
          groups: {
            items: [
              { groupId: 'grp_123456', groupName: 'Default Group', contractIds: ['ctr_V-123456'] },
              { groupId: 'grp_789012', groupName: 'Test Group', contractIds: ['ctr_V-789012'] }
            ]
          }
        });

      const result = await contractGroupDiscovery.discover('test-customer');

      expect(result).toEqual({
        contracts: [
          { contractId: 'ctr_V-123456', contractTypeName: 'Akamai' },
          { contractId: 'ctr_V-789012', contractTypeName: 'Partner' }
        ],
        groups: [
          { groupId: 'grp_123456', groupName: 'Default Group', contractIds: ['ctr_V-123456'] },
          { groupId: 'grp_789012', groupName: 'Test Group', contractIds: ['ctr_V-789012'] }
        ],
        lastUpdated: expect.any(Date),
        customer: 'test-customer'
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/contracts',
        method: 'GET'
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/groups',
        method: 'GET'
      });
    });

    it('should handle API errors gracefully', async () => {
      mockClient.request.mockRejectedValue(new Error('API Error'));

      await expect(contractGroupDiscovery.discover('test-customer')).rejects.toThrow('API Error');
    });
  });

  describe('Contract Validation', () => {
    beforeEach(async () => {
      // Setup discovery data
      mockClient.request
        .mockResolvedValueOnce({
          contracts: {
            items: [
              { contractId: 'ctr_V-123456', contractTypeName: 'Akamai' },
              { contractId: 'ctr_V-789012', contractTypeName: 'Partner' }
            ]
          }
        })
        .mockResolvedValueOnce({
          groups: {
            items: [
              { groupId: 'grp_123456', groupName: 'Default Group' }
            ]
          }
        });
    });

    it('should validate valid contract ID', async () => {
      const result = await contractGroupDiscovery.validateContract('ctr_V-123456', 'test-customer');

      expect(result).toEqual({
        isValid: true
      });
    });

    it('should provide suggestions for invalid contract ID', async () => {
      const result = await contractGroupDiscovery.validateContract('ctr_V-999999', 'test-customer');

      expect(result.isValid).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.contracts).toBeDefined();
      expect(result.suggestions?.message).toContain('Contract \'ctr_V-999999\' not found');
      expect(result.suggestions?.message).toContain('property_contract_list');
    });

    it('should find similar contracts', async () => {
      const result = await contractGroupDiscovery.validateContract('ctr_V-123999', 'test-customer');

      expect(result.isValid).toBe(false);
      expect(result.suggestions?.contracts).toContain(
        expect.objectContaining({ contractId: 'ctr_V-123456' })
      );
    });
  });

  describe('Group Validation', () => {
    beforeEach(async () => {
      // Setup discovery data
      mockClient.request
        .mockResolvedValueOnce({
          contracts: {
            items: [
              { contractId: 'ctr_V-123456', contractTypeName: 'Akamai' }
            ]
          }
        })
        .mockResolvedValueOnce({
          groups: {
            items: [
              { groupId: 'grp_123456', groupName: 'Default Group', contractIds: ['ctr_V-123456'] },
              { groupId: 'grp_789012', groupName: 'Test Group', contractIds: ['ctr_V-123456'] }
            ]
          }
        });
    });

    it('should validate valid group ID', async () => {
      const result = await contractGroupDiscovery.validateGroup('grp_123456', 'test-customer');

      expect(result).toEqual({
        isValid: true
      });
    });

    it('should provide suggestions for invalid group ID', async () => {
      const result = await contractGroupDiscovery.validateGroup('grp_999999', 'test-customer');

      expect(result.isValid).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.groups).toBeDefined();
      expect(result.suggestions?.message).toContain('Group \'grp_999999\' not found');
      expect(result.suggestions?.message).toContain('property_group_list');
    });

    it('should filter groups by contract', async () => {
      const result = await contractGroupDiscovery.validateGroup(
        'grp_999999', 
        'test-customer', 
        'ctr_V-123456'
      );

      expect(result.isValid).toBe(false);
      expect(result.suggestions?.message).toContain('for contract \'ctr_V-123456\'');
    });
  });

  describe('Account Switching Detection', () => {
    it('should detect account switching issues', async () => {
      const error = { status: 403 };
      
      // Mock discovery to also fail with 403
      mockClient.request.mockRejectedValue({ status: 403 });

      const hint = await contractGroupDiscovery.checkAccountSwitching('test-customer', error);

      expect(hint).toContain('account-switch-key');
      expect(hint).toContain('test-customer');
    });

    it('should not suggest account switching for non-403 errors', async () => {
      const error = { status: 404 };

      const hint = await contractGroupDiscovery.checkAccountSwitching('test-customer', error);

      expect(hint).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      // Setup discovery data
      mockClient.request
        .mockResolvedValueOnce({
          contracts: {
            items: [
              { contractId: 'ctr_V-123456', contractTypeName: 'Akamai' }
            ]
          }
        })
        .mockResolvedValueOnce({
          groups: {
            items: [
              { groupId: 'grp_123456', groupName: 'Default Group', contractIds: ['ctr_V-123456'] },
              { groupId: 'grp_789012', groupName: 'Test Group', contractIds: ['ctr_V-123456'] }
            ]
          }
        });
    });

    it('should get groups for contract', async () => {
      const groups = await contractGroupDiscovery.getGroupsForContract('ctr_V-123456', 'test-customer');

      expect(groups).toHaveLength(2);
      expect(groups.every(g => g.contractIds?.includes('ctr_V-123456'))).toBe(true);
    });

    it('should get discovery for error enhancement', async () => {
      const discovery = await contractGroupDiscovery.getDiscoveryForError('test-customer');

      expect(discovery).toEqual({
        contracts: ['ctr_V-123456 (Akamai)'],
        groups: ['grp_123456 - Default Group', 'grp_789012 - Test Group']
      });
    });
  });

  describe('Cache Management', () => {
    it('should use cached results when available', async () => {
      // Mock cache hit
      const cachedResult = {
        contracts: [{ contractId: 'cached-contract' }],
        groups: [{ groupId: 'cached-group' }],
        lastUpdated: new Date(),
        customer: 'test-customer'
      };

      const { getGlobalCache } = require('../core/server/performance/smart-cache');
      const mockCacheService = getGlobalCache();
      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await contractGroupDiscovery.discover('test-customer');

      expect(result).toEqual(cachedResult);
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it('should force refresh when requested', async () => {
      // Setup API responses
      mockClient.request
        .mockResolvedValueOnce({
          contracts: { items: [{ contractId: 'fresh-contract' }] }
        })
        .mockResolvedValueOnce({
          groups: { items: [{ groupId: 'fresh-group' }] }
        });

      const result = await contractGroupDiscovery.discover('test-customer', { forceRefresh: true });

      expect(result.contracts[0].contractId).toBe('fresh-contract');
      expect(mockClient.request).toHaveBeenCalled();
    });
  });
});