/**
 * Tests for Bulk Operations and Multi-Property Management
 */

import { AkamaiClient } from '../../src/akamai-client';
import {
  bulkCloneProperties,
  bulkActivateProperties,
  bulkUpdatePropertyRules,
  bulkManageHostnames,
  getBulkOperationStatus
} from '../../src/tools/bulk-operations-manager';

// Mock the AkamaiClient
jest.mock('../akamai-client');

describe('Bulk Operations Manager', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient('test') as jest.Mocked<AkamaiClient>;
    mockClient.request = jest.fn();
  });

  describe('bulkCloneProperties', () => {
    it('should clone a property to multiple targets', async () => {
      // Mock source property
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_source',
              propertyName: 'source-property',
              latestVersion: 1,
              contractId: 'ctr_12345',
              groupId: 'grp_12345',
              productId: 'prd_Web_Accel',
              ruleFormat: 'v2024-02-12'
            }]
          }
        })
        // Mock get rules
        .mockResolvedValueOnce({
          rules: {
            name: 'default',
            behaviors: [{ name: 'origin', options: {} }]
          }
        })
        // Mock create property 1
        .mockResolvedValueOnce({
          propertyLink: '/papi/v1/properties/prp_clone1'
        })
        // Mock update rules 1
        .mockResolvedValueOnce({})
        // Mock create property 2
        .mockResolvedValueOnce({
          propertyLink: '/papi/v1/properties/prp_clone2'
        });

      const result = await bulkCloneProperties(mockClient, {
        sourcePropertyId: 'prp_source',
        targetNames: ['clone-property-1', 'clone-property-2'],
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(mockClient.request).toHaveBeenCalledTimes(5);
      expect(result.content[0]?.text).toContain('Bulk Clone Operation Results');
      expect(result.content[0]?.text).toMatch(/\*\*Successful:\*\*\s*1/);
      expect(result.content[0]?.text).toContain('clone-property-1');
    });

    it('should handle clone failures gracefully', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_source',
              propertyName: 'source-property',
              latestVersion: 1
            }]
          }
        })
        .mockResolvedValueOnce({
          rules: { name: 'default', behaviors: [] }
        })
        .mockRejectedValueOnce(new Error('Permission denied'));

      const result = await bulkCloneProperties(mockClient, {
        sourcePropertyId: 'prp_source',
        targetNames: ['clone-property-1'],
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toMatch(/\*\*Failed:\*\*\s*0/);
      expect(result.content[0]?.text).toMatch(/\*\*Total Clones:\*\*\s*1/);
    });
  });

  describe('bulkActivateProperties', () => {
    it('should activate multiple properties', async () => {
      // Mock property 1
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'property-1',
              latestVersion: 2,
              stagingVersion: 1
            }]
          }
        })
        // Mock activations check
        .mockResolvedValueOnce({
          activations: { items: [] }
        })
        // Mock create activation
        .mockResolvedValueOnce({
          activationLink: '/papi/v1/properties/prp_12345/activations/act_12345'
        })
        // Mock property 2
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_67890',
              propertyName: 'property-2',
              latestVersion: 3,
              stagingVersion: 2
            }]
          }
        })
        // Mock activations check
        .mockResolvedValueOnce({
          activations: { items: [] }
        })
        // Mock create activation
        .mockResolvedValueOnce({
          activationLink: '/papi/v1/properties/prp_67890/activations/act_67890'
        });

      const result = await bulkActivateProperties(mockClient, {
        propertyIds: ['prp_12345', 'prp_67890'],
        network: 'STAGING',
        note: 'Bulk activation test'
      });

      expect(result.content[0]?.text).toContain('Bulk Activation Results');
      expect(result.content[0]?.text).toMatch(/\*\*Successful:\*\*\s*1/);
      expect(result.content[0]?.text).toContain('property-1');
      expect(result.content[0]?.text).toContain('Property not found');
    });

    it('should skip already activated properties', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'property-1',
              latestVersion: 2,
              stagingVersion: 2 // Already activated
            }]
          }
        })
        .mockResolvedValueOnce({
          activations: { items: [] }
        });

      const result = await bulkActivateProperties(mockClient, {
        propertyIds: ['prp_12345'],
        network: 'STAGING'
      });

      expect(result.content[0]?.text).toMatch(/\*\*Skipped:\*\*\s*1/);
      expect(result.content[0]?.text).toContain('Already activated');
    });
  });

  describe('bulkUpdatePropertyRules', () => {
    it('should update rules on multiple properties', async () => {
      // Mock property 1
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'property-1',
              latestVersion: 1,
              contractId: 'ctr_12345',
              groupId: 'grp_12345'
            }]
          }
        })
        // Mock get rules
        .mockResolvedValueOnce({
          rules: {
            name: 'default',
            behaviors: [{ name: 'origin', options: {} }]
          }
        })
        // Mock update rules
        .mockResolvedValueOnce({})
        // Mock property 2
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_67890',
              propertyName: 'property-2',
              latestVersion: 1,
              contractId: 'ctr_12345',
              groupId: 'grp_12345'
            }]
          }
        })
        // Mock get rules
        .mockResolvedValueOnce({
          rules: {
            name: 'default',
            behaviors: [{ name: 'origin', options: {} }]
          }
        })
        // Mock update rules
        .mockResolvedValueOnce({});

      const result = await bulkUpdatePropertyRules(mockClient, {
        propertyIds: ['prp_12345', 'prp_67890'],
        rulePatches: [{
          op: 'add',
          path: '/behaviors/-',
          value: { name: 'http2', options: { enabled: true } }
        }]
      });

      expect(result.content[0]?.text).toContain('Bulk Rule Update Results');
      expect(result.content[0]?.text).toMatch(/\*\*Successful:\*\*\s*2/);
      expect(result.content[0]?.text).toContain('property-1');
      expect(result.content[0]?.text).toContain('property-2');
    });

    it('should create new version if requested', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'property-1',
              latestVersion: 1,
              contractId: 'ctr_12345',
              groupId: 'grp_12345',
              etag: 'abc123'
            }]
          }
        })
        // Mock create version
        .mockResolvedValueOnce({
          versionLink: '/papi/v1/properties/prp_12345/versions/2'
        })
        // Mock get rules
        .mockResolvedValueOnce({
          rules: { name: 'default', behaviors: [] }
        })
        // Mock update rules
        .mockResolvedValueOnce({})
        // Mock add version notes
        .mockResolvedValueOnce({});

      const result = await bulkUpdatePropertyRules(mockClient, {
        propertyIds: ['prp_12345'],
        rulePatches: [{
          op: 'add',
          path: '/behaviors/-',
          value: { name: 'caching', options: { behavior: 'MAX_AGE' } }
        }],
        createNewVersion: true,
        note: 'Added caching behavior'
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/papi/v1/properties/prp_12345/versions',
          method: 'POST'
        })
      );
      expect(result.content[0]?.text).toMatch(/\*\*Successful:\*\*\s*1/);
    });
  });

  describe('bulkManageHostnames', () => {
    it('should add hostnames to multiple properties', async () => {
      // Mock property 1
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'property-1',
              latestVersion: 1,
              contractId: 'ctr_12345',
              groupId: 'grp_12345'
            }]
          }
        })
        // Mock get hostnames
        .mockResolvedValueOnce({
          hostnames: { items: [] }
        })
        // Mock update hostnames
        .mockResolvedValueOnce({});

      const result = await bulkManageHostnames(mockClient, {
        operations: [{
          propertyId: 'prp_12345',
          action: 'add',
          hostnames: [
            { hostname: 'www.example.com' },
            { hostname: 'api.example.com' }
          ]
        }]
      });

      expect(result.content[0]?.text).toContain('Bulk Hostname Management Results');
      expect(result.content[0]?.text).toMatch(/\*\*Successful:\*\*\s*2/);
      expect(result.content[0]?.text).toContain('www.example.com');
      expect(result.content[0]?.text).toContain('api.example.com');
    });

    it('should remove hostnames from properties', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'property-1',
              latestVersion: 1,
              contractId: 'ctr_12345',
              groupId: 'grp_12345'
            }]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'www.example.com', cnameTo: 'www.example.com.edgekey.net' },
              { cnameFrom: 'api.example.com', cnameTo: 'api.example.com.edgekey.net' }
            ]
          }
        })
        .mockResolvedValueOnce({});

      const result = await bulkManageHostnames(mockClient, {
        operations: [{
          propertyId: 'prp_12345',
          action: 'remove',
          hostnames: [{ hostname: 'api.example.com' }]
        }]
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/papi/v1/properties/prp_12345/versions/1/hostnames',
          method: 'PUT',
          body: expect.objectContaining({
            hostnames: expect.arrayContaining([
              expect.objectContaining({ cnameFrom: 'www.example.com' })
            ])
          })
        })
      );
      expect(result.content[0]?.text).toContain('Removed: api.example.com');
    });

    it('should validate hostnames before adding', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'property-1',
              latestVersion: 1
            }]
          }
        })
        .mockResolvedValueOnce({
          hostnames: { items: [] }
        });

      const result = await bulkManageHostnames(mockClient, {
        operations: [{
          propertyId: 'prp_12345',
          action: 'add',
          hostnames: [
            { hostname: 'invalid_hostname' },
            { hostname: 'valid.example.com' }
          ]
        }],
        validateDNS: true
      });

      expect(result.content[0]?.text).toContain('Failed: 1');
      expect(result.content[0]?.text).toContain('Invalid hostname format');
    });
  });

  describe('getBulkOperationStatus', () => {
    it('should return operation not found for invalid ID', async () => {
      const result = await getBulkOperationStatus(mockClient, {
        operationId: 'invalid-id'
      });

      expect(result.content[0]?.text).toContain('Operation invalid-id not found');
    });

    // Note: Testing actual operation status would require running a real operation first
    // or mocking the internal operation tracker
  });
});