/**
 * Bulk Hostname Operations Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createBulkProvisioningPlan,
  executeBulkProvisioning,
  validateBulkDNS,
  bulkUpdateHostnameProperties
} from '../tools/bulk-hostname-operations.js';
import { AkamaiClient } from '../akamai-client.js';

// Mock dependencies
jest.mock('../akamai-client.js');
jest.mock('../tools/hostname-management-advanced.js', () => ({
  validateHostnamesBulk: jest.fn(),
  analyzeHostnameOwnership: jest.fn(),
  findOptimalPropertyAssignment: jest.fn(),
}));
jest.mock('../tools/edge-hostname-management.js', () => ({
  generateEdgeHostnameRecommendations: jest.fn(),
  createBulkEdgeHostnames: jest.fn(),
}));

describe('Bulk Hostname Operations', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = {
      request: jest.fn(),
    } as any;
    jest.clearAllMocks();
  });

  describe('createBulkProvisioningPlan', () => {
    it('should create a comprehensive provisioning plan', async () => {
      // Mock the imported functions
      const { validateHostnamesBulk, analyzeHostnameOwnership, findOptimalPropertyAssignment } = 
        await import('../tools/hostname-management-advanced.js');
      const { generateEdgeHostnameRecommendations } = 
        await import('../tools/edge-hostname-management.js');

      // Mock validation result
      (validateHostnamesBulk as jest.Mock).mockResolvedValue({
        content: [{
          type: 'text',
          text: `## ✅ Valid Hostnames (3)
- www.example.com
- api.example.com
- static.example.com

## ❌ Invalid Hostnames (1)
- **invalid..hostname**: Invalid hostname format`
        }]
      });

      // Mock ownership analysis
      (analyzeHostnameOwnership as jest.Mock).mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Ownership analysis results'
        }]
      });

      // Mock edge hostname recommendations
      (generateEdgeHostnameRecommendations as jest.Mock).mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Edge hostname recommendations'
        }]
      });

      // Mock property assignment
      (findOptimalPropertyAssignment as jest.Mock).mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Property assignment results'
        }]
      });

      const result = await createBulkProvisioningPlan(mockClient, {
        hostnames: ['www.example.com', 'api.example.com', 'static.example.com', 'invalid..hostname'],
        contractId: 'ctr_1',
        groupId: 'grp_1',
      });

      expect(validateHostnamesBulk).toHaveBeenCalledWith(mockClient, {
        hostnames: expect.arrayContaining(['www.example.com']),
        checkDNS: false,
        checkCertificates: false,
      });

      expect(result.content[0].text).toContain('Bulk Hostname Provisioning Plan');
      expect(result.content[0].text).toContain('Valid Hostnames: 3');
      expect(result.content[0].text).toContain('Invalid Hostnames: 1');
      expect(result.content[0].text).toContain('Provisioning Phases');
    });

    it('should handle all invalid hostnames', async () => {
      const { validateHostnamesBulk } = await import('../tools/hostname-management-advanced.js');

      (validateHostnamesBulk as jest.Mock).mockResolvedValue({
        content: [{
          type: 'text',
          text: `## ✅ Valid Hostnames (0)

## ❌ Invalid Hostnames (2)
- **invalid..hostname**: Invalid hostname format
- **another..bad**: Invalid hostname format`
        }]
      });

      const result = await createBulkProvisioningPlan(mockClient, {
        hostnames: ['invalid..hostname', 'another..bad'],
        contractId: 'ctr_1',
        groupId: 'grp_1',
      });

      expect(result.content[0].text).toContain('No valid hostnames found');
    });
  });

  describe('executeBulkProvisioning', () => {
    it('should execute provisioning in dry run mode', async () => {
      const { validateHostnamesBulk } = await import('../tools/hostname-management-advanced.js');

      (validateHostnamesBulk as jest.Mock).mockResolvedValue({
        content: [{
          type: 'text',
          text: `## ✅ Valid Hostnames (2)
- www.example.com
- api.example.com`
        }]
      });

      const result = await executeBulkProvisioning(mockClient, {
        hostnames: ['www.example.com', 'api.example.com'],
        contractId: 'ctr_1',
        groupId: 'grp_1',
        dryRun: true,
      });

      expect(result.content[0].text).toContain('Dry Run Mode');
      expect(result.content[0].text).toContain('This is a simulation');
      expect(result.content[0].text).toContain('Would create 2 edge hostnames');
    });

    it('should execute actual provisioning', async () => {
      const { validateHostnamesBulk } = await import('../tools/hostname-management-advanced.js');
      const { createBulkEdgeHostnames } = await import('../tools/edge-hostname-management.js');

      (validateHostnamesBulk as jest.Mock).mockResolvedValue({
        content: [{
          type: 'text',
          text: `## ✅ Valid Hostnames (2)
- www.example.com
- api.example.com`
        }]
      });

      (createBulkEdgeHostnames as jest.Mock).mockResolvedValue({
        content: [{
          type: 'text',
          text: `## ✅ Successfully Created (2)
| www.example.com | www.example.com.edgekey.net | ehn_12345 |
| api.example.com | api.example.com.edgekey.net | ehn_12346 |`
        }]
      });

      const result = await executeBulkProvisioning(mockClient, {
        hostnames: ['www.example.com', 'api.example.com'],
        contractId: 'ctr_1',
        groupId: 'grp_1',
        dryRun: false,
      });

      expect(createBulkEdgeHostnames).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Bulk Hostname Provisioning Execution');
      expect(result.content[0].text).toContain('Phase 2: Edge Hostname Creation');
      expect(result.content[0].text).not.toContain('Dry Run Mode');
    });
  });

  describe('validateBulkDNS', () => {
    it('should validate DNS configuration', async () => {
      const result = await validateBulkDNS(mockClient, {
        hostnames: [
          { hostname: 'www.example.com', expectedCNAME: 'www.example.com.edgekey.net' },
          { hostname: 'api.example.com', expectedCNAME: 'api.example.com.edgekey.net' },
        ],
      });

      expect(result.content[0].text).toContain('Bulk DNS Validation Results');
      expect(result.content[0].text).toContain('Total Hostnames: 2');
      // Results will vary due to random simulation
    });

    it('should provide DNS configuration instructions for invalid entries', async () => {
      const result = await validateBulkDNS(mockClient, {
        hostnames: [
          { hostname: 'www.example.com', expectedCNAME: 'www.example.com.edgekey.net' },
        ],
        checkPropagation: true,
      });

      const text = result.content[0].text;
      expect(text).toContain('Check Propagation: Yes');
      if (text.includes('Invalid DNS Configuration')) {
        expect(text).toContain('Required DNS Changes');
        expect(text).toContain('CNAME');
      }
    });
  });

  describe('bulkUpdateHostnameProperties', () => {
    it('should update hostname properties in bulk', async () => {
      const mockPropertyResponse = {
        properties: {
          items: [{
            propertyId: 'prp_12345',
            contractId: 'ctr_1',
            groupId: 'grp_1',
            latestVersion: 1,
          }]
        }
      };

      const mockHostnamesResponse = {
        hostnames: {
          items: []
        }
      };

      mockClient.request
        .mockResolvedValueOnce(mockPropertyResponse)
        .mockResolvedValueOnce(mockHostnamesResponse)
        .mockResolvedValueOnce({}) // PUT response
        .mockResolvedValueOnce(mockPropertyResponse) // Second property
        .mockResolvedValueOnce(mockHostnamesResponse)
        .mockResolvedValueOnce({}); // PUT response

      const result = await bulkUpdateHostnameProperties(mockClient, {
        operations: [
          {
            hostname: 'www.example.com',
            propertyId: 'prp_12345',
            edgeHostname: 'www.example.com.edgekey.net',
            action: 'add',
          },
          {
            hostname: 'api.example.com',
            propertyId: 'prp_12345',
            edgeHostname: 'api.example.com.edgekey.net',
            action: 'add',
          },
        ],
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/papi/v1/properties/prp_12345/versions/1/hostnames',
          method: 'PUT',
        })
      );

      expect(result.content[0].text).toContain('Bulk Hostname Property Update Results');
      expect(result.content[0].text).toContain('Successful: 2');
    });

    it('should create new versions when requested', async () => {
      const mockPropertyResponse = {
        properties: {
          items: [{
            propertyId: 'prp_12345',
            contractId: 'ctr_1',
            groupId: 'grp_1',
            latestVersion: 1,
            latestVersionEtag: 'etag123',
          }]
        }
      };

      const mockVersionResponse = {
        versionLink: '/papi/v1/properties/prp_12345/versions/2',
      };

      mockClient.request
        .mockResolvedValueOnce(mockPropertyResponse)
        .mockResolvedValueOnce(mockVersionResponse) // Create version
        .mockResolvedValueOnce({ hostnames: { items: [] } })
        .mockResolvedValueOnce({}); // PUT response

      await bulkUpdateHostnameProperties(mockClient, {
        operations: [{
          hostname: 'www.example.com',
          propertyId: 'prp_12345',
          edgeHostname: 'www.example.com.edgekey.net',
          action: 'add',
        }],
        createNewVersion: true,
        versionNote: 'Bulk hostname update',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/papi/v1/properties/prp_12345/versions',
          method: 'POST',
          body: {
            createFromVersion: 1,
            createFromVersionEtag: 'etag123',
          },
        })
      );
    });

    it('should handle failures gracefully', async () => {
      mockClient.request.mockRejectedValue(new Error('Property not found'));

      const result = await bulkUpdateHostnameProperties(mockClient, {
        operations: [{
          hostname: 'www.example.com',
          propertyId: 'prp_99999',
          edgeHostname: 'www.example.com.edgekey.net',
          action: 'add',
        }],
      });

      expect(result.content[0].text).toContain('Failed: 1');
      expect(result.content[0].text).toContain('Property not found');
    });
  });
});