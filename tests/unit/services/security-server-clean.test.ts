/**
 * Security Server Clean Tests
 * Tests for the alecs-security server functionality with proper types
 */

import { jest } from '@jest/globals';
import { AkamaiClient } from '../akamai-client';

// Import the actual functions we fixed
import {
  listNetworkLists,
  getNetworkList,
  createNetworkList,
  updateNetworkList,
  bulkActivateNetworkLists,
  importNetworkListFromCSV,
  validateGeographicCodes,
  getASNInformation,
  generateGeographicBlockingRecommendations,
  generateASNSecurityRecommendations
} from '../tools/security/network-lists-integration';

jest.mock('../akamai-client');

describe('Security Server - Clean Tests', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      request: jest.fn(),
    } as any;
    
    (AkamaiClient as any).mockImplementation(() => mockClient);
  });

  describe('Network List Operations', () => {
    it('should list network lists', async () => {
      mockClient.request.mockResolvedValue({
        networkLists: [
          {
            uniqueId: 'nl_12345',
            name: 'Test List',
            type: 'IP',
            elementCount: 5,
            productionStatus: 'ACTIVE',
            stagingStatus: 'INACTIVE',
            createDate: '2024-01-01T00:00:00Z'
          }
        ]
      });

      const result = await listNetworkLists('testing', {
        type: 'IP',
        includeElements: true
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/network-list/v2/network-lists',
        method: 'GET',
        queryParams: {
          listType: 'IP',
          includeElements: 'true'
        }
      });

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Test List');
      expect(text).toContain('nl_12345');
    });

    it('should get network list details', async () => {
      mockClient.request.mockResolvedValue({
        uniqueId: 'nl_12345',
        name: 'Test List',
        type: 'IP',
        elementCount: 3,
        list: ['192.168.1.1', '192.168.1.2', '192.168.1.3'],
        createDate: '2024-01-01T00:00:00Z',
        updateDate: '2024-01-02T00:00:00Z',
        createdBy: 'user1',
        updatedBy: 'user2'
      });

      const result = await getNetworkList('nl_12345', 'testing', {
        includeElements: true
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/network-list/v2/network-lists/nl_12345',
        method: 'GET',
        queryParams: {
          includeElements: 'true'
        }
      });

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('192.168.1.1');
      expect(text).toContain('Test List');
    });

    it('should create network list', async () => {
      mockClient.request.mockResolvedValue({
        uniqueId: 'nl_67890',
        name: 'New List',
        type: 'GEO',
        elementCount: 2,
        createDate: '2024-01-01T00:00:00Z'
      });

      const result = await createNetworkList(
        'New List',
        'GEO',
        ['US', 'CA'],
        'testing',
        {
          description: 'Test geographic list',
          contractId: 'ctr_123',
          groupId: 'grp_456'
        }
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/network-list/v2/network-lists',
        method: 'POST',
        body: {
          name: 'New List',
          type: 'GEO',
          list: ['US', 'CA'],
          description: 'Test geographic list',
          contractId: 'ctr_123',
          groupId: 'grp_456'
        }
      });

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Created Successfully');
      expect(text).toContain('nl_67890');
    });

    it('should update network list', async () => {
      // First request: get current list
      mockClient.request.mockResolvedValueOnce({
        uniqueId: 'nl_12345',
        type: 'IP',
        list: ['192.168.1.1'],
        createDate: '2024-01-01T00:00:00Z',
        updateDate: '2024-01-01T00:00:00Z'
      });

      // Second request: update list
      mockClient.request.mockResolvedValueOnce({
        uniqueId: 'nl_12345',
        name: 'Updated List',
        elementCount: 2,
        updateDate: '2024-01-02T00:00:00Z'
      });

      const result = await updateNetworkList('nl_12345', 'testing', {
        addElements: ['192.168.1.2'],
        description: 'Updated description'
      });

      expect(mockClient.request).toHaveBeenCalledTimes(2);
      
      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Updated Successfully');
    });

    it('should handle bulk activation', async () => {
      // Mock individual activation responses
      mockClient.request.mockResolvedValueOnce({
        activationId: 'act_1',
        status: 'PENDING',
        uniqueId: 'nl_1',
        network: 'STAGING'
      }).mockResolvedValueOnce({
        activationId: 'act_2',
        status: 'PENDING',
        uniqueId: 'nl_2',
        network: 'STAGING'
      });

      const activations = [
        { uniqueId: 'nl_1', network: 'STAGING' as const },
        { uniqueId: 'nl_2', network: 'STAGING' as const }
      ];

      const result = await bulkActivateNetworkLists(
        activations,
        'testing',
        { comments: 'Bulk activation test' }
      );

      // Verify individual activation requests were made
      expect(mockClient.request).toHaveBeenCalledTimes(2);
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/network-list/v2/network-lists/activations',
        method: 'POST',
        body: {
          networkList: {
            uniqueId: 'nl_1'
          },
          network: 'STAGING',
          comments: 'Bulk activation test'
        }
      });
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/network-list/v2/network-lists/activations',
        method: 'POST',
        body: {
          networkList: {
            uniqueId: 'nl_2'
          },
          network: 'STAGING',
          comments: 'Bulk activation test'
        }
      });

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Bulk Network List Activation');
      expect(text).toContain('✅ nl_1 → STAGING');
      expect(text).toContain('✅ nl_2 → STAGING');
    });
  });

  describe('Geographic and ASN Validation', () => {
    it('should validate geographic codes', async () => {
      const result = await validateGeographicCodes(
        ['US', 'CA', 'US-CA', 'INVALID'],
        'testing'
      );

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('US: United States');
      expect(text).toContain('CA: Canada');
      expect(text).toContain('US-CA: California, United States');
      expect(text).toContain('Invalid Codes');
      expect(text).toContain('INVALID');
    });

    it('should get ASN information', async () => {
      const result = await getASNInformation(
        ['16509', 'AS15169', '13335'],
        'testing'
      );

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('AS16509: Amazon.com, Inc.');
      expect(text).toContain('AS15169: Google LLC');
      expect(text).toContain('AS13335: Cloudflare, Inc.');
    });

    it('should generate geographic recommendations', async () => {
      const result = await generateGeographicBlockingRecommendations('testing', {
        purpose: 'security',
        allowedRegions: ['US', 'CA'],
        blockedRegions: ['CN', 'RU']
      });

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Security-focused Blocking');
      expect(text).toContain('US: United States');
      expect(text).toContain('CN: China');
      expect(text).toContain('Best Practices');
    });

    it('should generate ASN recommendations', async () => {
      const result = await generateASNSecurityRecommendations('testing', {
        includeCloudProviders: true,
        includeVPNProviders: true,
        purpose: 'bot-protection'
      });

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Bot Protection Strategy');
      expect(text).toContain('Amazon Web Services');
      expect(text).toContain('VPN/Proxy Provider ASNs');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      mockClient.request.mockRejectedValue({
        title: 'Network List Not Found',
        detail: 'The specified network list does not exist',
        status: 404
      });

      const result = await getNetworkList('nl_invalid', 'testing');

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Error retrieving network list');
      expect(text).toContain('Network List Not Found');
    });

    it('should validate IP addresses', async () => {
      const result = await createNetworkList(
        'IP Test',
        'IP',
        ['192.168.1.1', 'invalid-ip', '10.0.0.0/24'],
        'testing'
      );

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Invalid elements');
      expect(text).toContain('invalid-ip');
    });

    it('should validate geographic codes', async () => {
      const result = await createNetworkList(
        'Geo Test',
        'GEO',
        ['US', 'XX', 'US-CA', 'US-INVALID'],
        'testing'
      );

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Invalid elements');
      expect(text).toContain('US-INVALID');
    });
  });

  describe('Parameter Order Verification', () => {
    it('should use correct parameter order', async () => {
      // Mock all responses
      mockClient.request.mockResolvedValue({ networkLists: [] });

      // Test parameter order for key functions
      await listNetworkLists('customer1', { type: 'IP' });
      expect(AkamaiClient).toHaveBeenCalledWith('customer1');

      await getNetworkList('nl_123', 'customer2', { includeElements: true });
      expect(AkamaiClient).toHaveBeenCalledWith('customer2');

      await createNetworkList('Test', 'IP', ['192.168.1.1'], 'customer3', {});
      expect(AkamaiClient).toHaveBeenCalledWith('customer3');

      await updateNetworkList('nl_456', 'customer4', { addElements: ['10.0.0.1'] });
      expect(AkamaiClient).toHaveBeenCalledWith('customer4');

      // Verify all were called with correct customer parameter
      expect(AkamaiClient).toHaveBeenCalledTimes(4);
    });
  });

  describe('CSV Import Flow', () => {
    it('should handle CSV import correctly', async () => {
      // Mock GET request to retrieve current list
      mockClient.request.mockResolvedValueOnce({
        uniqueId: 'nl_99999',
        name: 'Test List',
        type: 'IP',
        elementCount: 0,
        list: []
      });
      
      // Mock PUT request to update the list
      mockClient.request.mockResolvedValueOnce({
        uniqueId: 'nl_99999',
        name: 'Test List', 
        type: 'IP',
        elementCount: 3,
        updateDate: new Date().toISOString()
      });

      const csvContent = '192.168.1.1\n192.168.1.2\n192.168.1.3';
      
      const result = await importNetworkListFromCSV(
        'nl_99999',
        csvContent,
        'testing',
        { operation: 'replace' }
      );

      // Verify GET request to retrieve current list
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/network-list/v2/network-lists/nl_99999',
        method: 'GET',
        queryParams: { includeElements: 'true' }
      });

      // Verify PUT request to update the list
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/network-list/v2/network-lists/nl_99999',
        method: 'PUT',
        body: {
          list: ['192.168.1.1', '192.168.1.2', '192.168.1.3']
        }
      });

      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Import Completed Successfully');
      expect(text).toContain('**New Size:** 3');
    });
  });
});