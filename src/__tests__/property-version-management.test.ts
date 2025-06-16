/**
 * Tests for Enhanced Property Version Management Tools
 */

import { 
  comparePropertyVersions,
  batchCreateVersions,
  getVersionTimeline,
  rollbackPropertyVersion,
  updateVersionMetadata,
  mergePropertyVersions
} from '../tools/property-version-management.js';
import { AkamaiClient } from '../akamai-client.js';

// Mock AkamaiClient
jest.mock('../akamai-client');

describe('Property Version Management Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient('default') as jest.Mocked<AkamaiClient>;
    jest.clearAllMocks();
  });

  describe('comparePropertyVersions', () => {
    it('should successfully compare two property versions', async () => {
      // Mock property response
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property'
          }]
        }
      });

      // Mock rules for version 1
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin1.example.com' } }
          ]
        }
      });

      // Mock rules for version 2
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin2.example.com' } },
            { name: 'caching', options: { defaultTtl: '1d' } }
          ]
        }
      });

      // Mock hostnames for version 1
      mockClient.request.mockResolvedValueOnce({
        hostnames: {
          items: [
            { cnameFrom: 'www.example.com', cnameTo: 'www.example.com.edgesuite.net' }
          ]
        }
      });

      // Mock hostnames for version 2
      mockClient.request.mockResolvedValueOnce({
        hostnames: {
          items: [
            { cnameFrom: 'www.example.com', cnameTo: 'www.example.com.edgesuite.net' },
            { cnameFrom: 'api.example.com', cnameTo: 'api.example.com.edgesuite.net' }
          ]
        }
      });

      const result = await comparePropertyVersions(mockClient, {
        propertyId: 'prp_12345',
        version1: 1,
        version2: 2
      });

      expect(result.content[0]?.text).toContain('Property Version Comparison');
      expect(result.content[0]?.text).toContain('Version 1 → Version 2');
      expect(result.content[0]?.text).toContain('origin1.example.com');
      expect(result.content[0]?.text).toContain('origin2.example.com');
      expect(mockClient.request).toHaveBeenCalledTimes(5);
    });

    it('should handle property not found error', async () => {
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [] }
      });

      const result = await comparePropertyVersions(mockClient, {
        propertyId: 'prp_invalid',
        version1: 1,
        version2: 2
      });

      expect(result.content[0]?.text).toContain('Failed to compare property versions');
      expect(result.content[0]?.text).toContain('Property not found');
    });
  });

  describe('batchCreateVersions', () => {
    it('should create versions for multiple properties', async () => {
      // Mock responses for each property
      const properties = ['prp_1', 'prp_2', 'prp_3'];
      
      properties.forEach((propertyId, index) => {
        // Mock property details
        mockClient.request.mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId,
              propertyName: `test-property-${index + 1}`,
              latestVersion: index + 1
            }]
          }
        });

        // Mock version creation
        mockClient.request.mockResolvedValueOnce({
          versionLink: `/papi/v1/properties/${propertyId}/versions/${index + 2}`
        });
      });

      const result = await batchCreateVersions(mockClient, {
        properties: [
          { propertyId: 'prp_1' },
          { propertyId: 'prp_2', baseVersion: 1 },
          { propertyId: 'prp_3', note: 'Custom note' }
        ]
      });

      expect(result.content[0]?.text).toContain('Batch Version Creation Complete');
      expect(result.content[0]?.text).toContain('3 version(s) created successfully');
      expect(mockClient.request).toHaveBeenCalledTimes(6); // 3 properties × 2 requests each
    });

    it('should handle parallel batch strategy', async () => {
      // Mock responses
      mockClient.request.mockResolvedValue({
        properties: {
          items: [{
            propertyId: 'prp_1',
            propertyName: 'test-property',
            latestVersion: 1
          }]
        }
      });

      const result = await batchCreateVersions(mockClient, {
        properties: [{ propertyId: 'prp_1' }]
      });

      expect(result.content[0]?.text).toContain('Batch Version Creation');
    });
  });

  describe('getVersionTimeline', () => {
    it('should generate comprehensive version timeline', async () => {
      // Mock property details
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property'
          }]
        }
      });

      // Mock versions
      mockClient.request.mockResolvedValueOnce({
        versions: {
          items: [
            {
              propertyVersion: 3,
              updatedDate: '2024-01-15T10:00:00Z',
              updatedByUser: 'user@example.com',
              note: 'Added caching rules'
            },
            {
              propertyVersion: 2,
              updatedDate: '2024-01-10T10:00:00Z',
              updatedByUser: 'user@example.com',
              note: 'Updated origin'
            },
            {
              propertyVersion: 1,
              updatedDate: '2024-01-05T10:00:00Z',
              updatedByUser: 'user@example.com',
              note: 'Initial version'
            }
          ]
        }
      });

      // Mock activations
      mockClient.request.mockResolvedValueOnce({
        activations: {
          items: [
            {
              activationId: 'atv_123',
              propertyVersion: 2,
              network: 'STAGING',
              status: 'ACTIVE',
              submitDate: '2024-01-11T10:00:00Z',
              activatedBy: 'user@example.com'
            },
            {
              activationId: 'atv_124',
              propertyVersion: 2,
              network: 'PRODUCTION',
              status: 'ACTIVE',
              submitDate: '2024-01-12T10:00:00Z',
              activatedBy: 'user@example.com'
            }
          ]
        }
      });

      const result = await getVersionTimeline(mockClient, {
        propertyId: 'prp_12345'
      });

      expect(result.content[0]?.text).toContain('Property Version Timeline');
      expect(result.content[0]?.text).toContain('test-property');
      expect(result.content[0]?.text).toContain('v3');
      expect(result.content[0]?.text).toContain('Added caching rules');
      expect(result.content[0]?.text).toContain('STAGING');
      expect(result.content[0]?.text).toContain('PRODUCTION');
    });
  });

  describe('rollbackPropertyVersion', () => {
    it('should rollback to previous version with validation', async () => {
      // Mock property details
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property',
            productionVersion: 3,
            stagingVersion: 3,
            latestVersion: 3
          }]
        }
      });

      // Mock target version details
      mockClient.request.mockResolvedValueOnce({
        versions: {
          items: [{
            propertyVersion: 2,
            updatedDate: '2024-01-10T10:00:00Z'
          }]
        }
      });

      // Mock new version creation
      mockClient.request.mockResolvedValueOnce({
        versionLink: '/papi/v1/properties/prp_12345/versions/4'
      });

      // Mock rules fetch
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: []
        }
      });

      // Mock rules update
      mockClient.request.mockResolvedValueOnce({});

      // Mock hostnames
      mockClient.request.mockResolvedValueOnce({
        hostnames: {
          items: [
            { cnameFrom: 'www.example.com', cnameTo: 'www.example.com.edgesuite.net' }
          ]
        }
      });

      // Mock hostname update
      mockClient.request.mockResolvedValueOnce({});

      const result = await rollbackPropertyVersion(mockClient, {
        propertyId: 'prp_12345',
        targetVersion: 2
      });

      expect(result.content[0]?.text).toContain('Property Rollback Complete');
      expect(result.content[0]?.text).toContain('Created version 4 from version 2');
      expect(mockClient.request).toHaveBeenCalledTimes(7);
    });

    it('should validate rollback before proceeding', async () => {
      // Mock property with validation
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property',
            productionVersion: 2,
            stagingVersion: 2,
            latestVersion: 3
          }]
        }
      });

      const result = await rollbackPropertyVersion(mockClient, {
        propertyId: 'prp_12345',
        targetVersion: 4
      });

      expect(result.content[0]?.text).toContain('Failed to rollback property version');
      expect(result.content[0]?.text).toContain('Target version 4 does not exist');
    });
  });

  describe('updateVersionMetadata', () => {
    it('should update version metadata', async () => {
      const result = await updateVersionMetadata(mockClient, {
        propertyId: 'prp_12345',
        version: 2,
        metadata: {
          note: 'Updated metadata',
          tags: ['production', 'stable'],
          labels: {
            environment: 'production',
            team: 'platform'
          }
        }
      });

      expect(result.content[0]?.text).toContain('Version Metadata Updated');
      expect(result.content[0]?.text).toContain('Updated metadata');
      expect(result.content[0]?.text).toContain('production, stable');
      expect(result.content[0]?.text).toContain('environment: production');
    });
  });

  describe('mergePropertyVersions', () => {
    it('should merge changes between versions', async () => {
      // Mock property details
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property',
            latestVersion: 3
          }]
        }
      });

      // Mock source rules
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'new-origin.example.com' } },
            { name: 'caching', options: { defaultTtl: '2d' } }
          ],
          children: []
        }
      });

      // Mock target rules
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'old-origin.example.com' } }
          ],
          children: []
        }
      });

      // Mock new version creation
      mockClient.request.mockResolvedValueOnce({
        versionLink: '/papi/v1/properties/prp_12345/versions/4'
      });

      // Mock rules update
      mockClient.request.mockResolvedValueOnce({});

      const result = await mergePropertyVersions(mockClient, {
        propertyId: 'prp_12345',
        sourceVersion: 2,
        targetVersion: 3,
        mergeStrategy: 'merge'
      });

      expect(result.content[0]?.text).toContain('Version Merge Complete');
      expect(result.content[0]?.text).toContain('Merged version 2 → version 3');
      expect(result.content[0]?.text).toContain('Created new version: 4');
      expect(mockClient.request).toHaveBeenCalledTimes(5);
    });

    it('should handle cherry-pick strategy', async () => {
      // Mock property details
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property',
            latestVersion: 3
          }]
        }
      });

      // Mock source rules
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin.example.com' } },
            { name: 'caching', options: { defaultTtl: '1d' } }
          ],
          children: [
            {
              name: 'API Rules',
              criteria: [{ name: 'path', options: { values: ['/api/*'] } }],
              behaviors: [{ name: 'caching', options: { defaultTtl: '5m' } }]
            }
          ]
        }
      });

      // Mock target rules
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin.example.com' } }
          ],
          children: []
        }
      });

      // Mock new version creation
      mockClient.request.mockResolvedValueOnce({
        versionLink: '/papi/v1/properties/prp_12345/versions/4'
      });

      // Mock rules update
      mockClient.request.mockResolvedValueOnce({});

      const result = await mergePropertyVersions(mockClient, {
        propertyId: 'prp_12345',
        sourceVersion: 2,
        targetVersion: 3,
        mergeStrategy: 'cherry-pick',
        includePaths: ['/rules/children/0']
      });

      expect(result.content[0]?.text).toContain('Version Merge Complete');
      expect(result.content[0]?.text).toContain('Cherry-picked from version 2 → version 3');
      expect(result.content[0]?.text).toContain('1 path(s)');
    });
  });
});