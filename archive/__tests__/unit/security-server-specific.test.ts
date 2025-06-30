/**
 * Security Server Specific Tests
 * Tests for the alecs-security server functionality
 */

import { jest } from '@jest/globals';
import { AkamaiClient } from '../../src/akamai-client';

// Import the actual functions we fixed
import {
  listNetworkLists,
  getNetworkList,
  createNetworkList,
  updateNetworkList,
  importNetworkListFromCSV,
  bulkActivateNetworkLists,
  validateGeographicCodes,
  getASNInformation,
  generateGeographicBlockingRecommendations,
  generateASNSecurityRecommendations
} from '../../src/tools/security/network-lists-integration';

jest.mock('../../src/akamai-client');

describe('Security Server - Network Lists', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      request: jest.fn(),
    } as any;
    
    (AkamaiClient as any).mockImplementation(() => mockClient);
  });

  describe('Network List Operations', () => {
    it('should list network lists with correct parameters', async () => {
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

      expect(result.content?.[0]?.text).toContain('Test List');
      expect(result.content?.[0]?.text).toContain('nl_12345');
    });

    it('should get network list with correct uniqueId parameter order', async () => {
      mockClient.request.mockResolvedValue({
        uniqueId: 'nl_12345',
        name: 'Test List',
        type: 'IP',
        elementCount: 3,
        list: ['192.168.1.1', '192.168.1.2', '192.168.1.3']
      });

      // The fixed parameter order: uniqueId, customer, options
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

      expect(result.content[0].text).toContain('192.168.1.1');
    });

    it('should create network list with correct parameter order', async () => {
      mockClient.request.mockResolvedValue({
        uniqueId: 'nl_67890',
        name: 'New List',
        type: 'GEO',
        elementCount: 2
      });

      // The fixed parameter order: name, type, elements, customer, options
      const result = await createNetworkList(
        'New List',
        'GEO',
        ['US', 'CA'],
        'testing',
        {
          description: 'Test geographic list',
          contractIds: ['ctr_123',
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
          contractIds: ['ctr_123',
          groupId: 'grp_456'
        }
      });

      expect(result.content[0].text).toContain('New List');
      expect(result.content[0].text).toContain('nl_67890');
    });

    it('should update network list with simplified parameters', async () => {
      mockClient.request.mockResolvedValueOnce({
        uniqueId: 'nl_12345',
        type: 'IP',
        list: ['192.168.1.1']
      });

      mockClient.request.mockResolvedValueOnce({
        uniqueId: 'nl_12345',
        name: 'Updated List',
        elementCount: 2
      });

      // The fixed parameter order: uniqueId, customer, options
      const result = await updateNetworkList('nl_12345', 'testing', {
        addElements: ['192.168.1.2'],
        description: 'Updated description'
      });

      expect(mockClient.request).toHaveBeenCalledTimes(2);
      expect(result.content[0].text).toContain('Updated Successfully');
    });

    it('should handle bulk activation with correct structure', async () => {
      mockClient.request.mockResolvedValue({
        activationId: '12345',
        status: 'PENDING'
      });

      // The bulkActivateNetworkLists processes each activation individually
      const result = await bulkActivateNetworkLists(
        [
          { uniqueId: 'nl_1', network: 'STAGING' },
          { uniqueId: 'nl_2', network: 'STAGING' }
        ],
        'testing',
        { comments: 'Bulk activation test' }
      );

      // Should make 2 separate activation calls
      expect(mockClient.request).toHaveBeenCalledTimes(2);
      
      // First activation
      expect(mockClient.request).toHaveBeenNthCalledWith(1, {
        path: '/network-list/v2/network-lists/activations',
        method: 'POST',
        body: {
          networkList: { uniqueId: 'nl_1' },
          network: 'STAGING',
          comments: 'Bulk activation test'
        }
      });
      
      // Second activation
      expect(mockClient.request).toHaveBeenNthCalledWith(2, {
        path: '/network-list/v2/network-lists/activations',
        method: 'POST',
        body: {
          networkList: { uniqueId: 'nl_2' },
          network: 'STAGING',
          comments: 'Bulk activation test'
        }
      });
    });

    it('should import from CSV with list creation', async () => {
      // First mock: create list
      mockClient.request.mockResolvedValueOnce({
        uniqueId: 'nl_99999',
        name: 'CSV Import List',
        type: 'IP'
      });

      // Second mock: import CSV (would be called by the function)
      mockClient.request.mockResolvedValueOnce({
        uniqueId: 'nl_99999',
        elementCount: 3
      });

      const csvContent = '192.168.1.1\n192.168.1.2\n192.168.1.3';
      
      const result = await importNetworkListFromCSV(
        'nl_99999',
        csvContent,
        'testing',
        { operation: 'replace' }
      );

      // Should only make the import call since list already exists
      expect(mockClient.request).toHaveBeenCalledTimes(2); // Create list and import calls
    });
  });

  describe('Geographic and ASN Validation', () => {
    it('should validate geographic codes', async () => {
      const result = await validateGeographicCodes(
        ['US', 'CA', 'US-CA', 'INVALID'],
        'testing'
      );

      const text = result.content[0].text;
      expect(text).toContain('US: United States');
      expect(text).toContain('CA: Canada');
      expect(text).toContain('US-CA: California, United States');
      expect(text).toContain('INVALID');
      expect(text).toContain('Invalid Codes');
    });

    it('should get ASN information', async () => {
      const result = await getASNInformation(
        ['16509', 'AS15169', '13335'],
        'testing'
      );

      const text = result.content[0].text;
      expect(text).toContain('AS16509: Amazon.com, Inc.');
      expect(text).toContain('AS15169: Google LLC');
      expect(text).toContain('AS13335: Cloudflare, Inc.');
    });

    it('should generate geographic blocking recommendations', async () => {
      const result = await generateGeographicBlockingRecommendations('testing', {
        purpose: 'security',
        allowedRegions: ['US', 'CA'],
        blockedRegions: ['CN', 'RU']
      });

      const text = result.content[0].text;
      expect(text).toContain('Security-focused Blocking');
      expect(text).toContain('US: United States');
      expect(text).toContain('CN: China');
      expect(text).toContain('Best Practices');
    });

    it('should generate ASN security recommendations', async () => {
      const result = await generateASNSecurityRecommendations('testing', {
        includeCloudProviders: true,
        includeVPNProviders: true,
        purpose: 'bot-protection'
      });

      const text = result.content[0].text;
      expect(text).toContain('Bot Protection Strategy');
      expect(text).toContain('Amazon Web Services');
      expect(text).toContain('VPN/Proxy Provider ASNs');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockClient.request.mockRejectedValue({
        title: 'Network List Not Found',
        detail: 'The specified network list does not exist',
        status: 404
      });

      const result = await getNetworkList('nl_invalid', 'testing');

      expect(result.content[0].text).toContain('Error retrieving network list');
      expect(result.content[0].text).toContain('Network List Not Found');
    });

    it('should validate IP addresses correctly', async () => {
      mockClient.request.mockResolvedValue({
        uniqueId: 'nl_new',
        name: 'IP Test',
        type: 'IP'
      });

      const result = await createNetworkList(
        'IP Test',
        'IP',
        ['192.168.1.1', 'invalid-ip', '10.0.0.0/24'],
        'testing'
      );

      // Should reject invalid IPs
      expect(result.content[0].text).toContain('Invalid elements');
      expect(result.content[0].text).toContain('invalid-ip');
    });

    it('should validate geographic codes format', async () => {
      mockClient.request.mockResolvedValue({
        uniqueId: 'nl_geo',
        name: 'Geo Test',
        type: 'GEO'
      });

      const result = await createNetworkList(
        'Geo Test',
        'GEO',
        ['US', 'XX', 'US-CA', 'US-INVALID'],
        'testing'
      );

      // Should catch invalid geo codes
      expect(result.content[0].text).toContain('Invalid elements');
      expect(result.content[0].text).toContain('US-INVALID');
    });
  });

  describe('Security Server Parameter Order', () => {
    it('should call functions with correct parameter order', async () => {
      // These tests verify the fixes we made to parameter ordering
      
      // listNetworkLists: customer, options
      await listNetworkLists('customer1', { type: 'IP' });
      
      // getNetworkList: uniqueId, customer, options
      await getNetworkList('nl_123', 'customer2', { includeElements: true });
      
      // createNetworkList: name, type, elements, customer, options
      await createNetworkList('Test', 'IP', ['192.168.1.1'], 'customer3', {});
      
      // updateNetworkList: uniqueId, customer, options
      await updateNetworkList('nl_456', 'customer4', { addElements: ['10.0.0.1'] });
      
      // All should have been called with AkamaiClient
      expect(AkamaiClient).toHaveBeenCalledTimes(4);
      expect(AkamaiClient).toHaveBeenCalledWith('customer1');
      expect(AkamaiClient).toHaveBeenCalledWith('customer2');
      expect(AkamaiClient).toHaveBeenCalledWith('customer3');
      expect(AkamaiClient).toHaveBeenCalledWith('customer4');
    });
  });
});