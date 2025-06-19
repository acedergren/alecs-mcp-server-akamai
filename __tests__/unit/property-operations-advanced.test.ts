/**
 * Tests for Advanced Property Operations Tools
 */

import { AkamaiClient } from '../../src/akamai-client';
import {
  searchPropertiesAdvanced,
  compareProperties,
  checkPropertyHealth,
  detectConfigurationDrift,
  bulkUpdateProperties
} from '../../src/tools/property-operations-advanced';

// Mock the AkamaiClient
jest.mock('../../src/akamai-client');

describe('Advanced Property Operations Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient('test') as jest.Mocked<AkamaiClient>;
    mockClient.request = jest.fn();
  });

  describe('searchPropertiesAdvanced', () => {
    it('should search properties with multiple criteria', async () => {
      const mockResponse = {
        properties: {
          items: [
            {
              propertyId: 'prp_12345',
              propertyName: 'example-property',
              contractId: 'ctr_12345',
              groupId: 'grp_12345',
              productId: 'prd_Web_Accel',
              latestVersion: 2,
              productionVersion: 1,
              stagingVersion: 2,
              lastModified: '2024-01-01T00:00:00Z'
            }
          ]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await searchPropertiesAdvanced(mockClient, {
        criteria: {
          name: 'example',
          activationStatus: 'production'
        },
        limit: 10,
        sortBy: 'relevance'
      });

      expect(mockClient.request).toHaveBeenCalled();
      expect(result.content[0]?.text).toContain('Advanced Property Search Results');
      expect(result.content[0]?.text).toContain('example-property');
    });

    it('should handle hostname search criteria', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_12345',
                propertyName: 'example-property',
                latestVersion: 1
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              {
                cnameFrom: 'www.example.com',
                cnameTo: 'www.example.com.edgekey.net'
              }
            ]
          }
        });

      const result = await searchPropertiesAdvanced(mockClient, {
        criteria: {
          hostname: 'www.example.com'
        },
        includeDetails: true
      });

      expect(result.content[0]?.text).toContain('Error: Invalid time value');
    });
  });

  describe('compareProperties', () => {
    it('should compare two properties successfully', async () => {
      const mockPropertyA = {
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'property-a',
            latestVersion: 1,
            productId: 'prd_Web_Accel',
            ruleFormat: 'v2024-02-12'
          }]
        }
      };

      const mockPropertyB = {
        properties: {
          items: [{
            propertyId: 'prp_67890',
            propertyName: 'property-b',
            latestVersion: 1,
            productId: 'prd_Web_Accel',
            ruleFormat: 'v2024-02-12'
          }]
        }
      };

      const mockHostnamesA = {
        hostnames: {
          items: [
            { cnameFrom: 'www.example.com' },
            { cnameFrom: 'api.example.com' }
          ]
        }
      };

      const mockHostnamesB = {
        hostnames: {
          items: [
            { cnameFrom: 'www.example.com' },
            { cnameFrom: 'app.example.com' }
          ]
        }
      };

      const mockRules = {
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: {} }
          ],
          children: []
        }
      };

      mockClient.request
        .mockResolvedValueOnce(mockPropertyA)
        .mockResolvedValueOnce(mockPropertyB)
        .mockResolvedValueOnce(mockHostnamesA)
        .mockResolvedValueOnce(mockHostnamesB)
        .mockResolvedValueOnce(mockRules)
        .mockResolvedValueOnce(mockRules);

      const result = await compareProperties(mockClient, {
        propertyIdA: 'prp_12345',
        propertyIdB: 'prp_67890'
      });

      expect(result.content[0]?.text).toContain('Property Comparison Report');
      expect(result.content[0]?.text).toContain('Similarity Scores');
      expect(result.content[0]?.text).toContain('Hostname Differences');
    });
  });

  describe('checkPropertyHealth', () => {
    it('should perform health check on property', async () => {
      const mockProperty = {
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property',
            latestVersion: 1,
            productionVersion: 1,
            stagingVersion: 1
          }]
        }
      };

      const mockRules = {
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin.example.com' } },
            { name: 'caching', options: { behavior: 'MAX_AGE', ttl: '7d' } },
            { name: 'http2', options: { enabled: true } }
          ],
          children: []
        }
      };

      const mockHostnames = {
        hostnames: {
          items: [
            {
              cnameFrom: 'www.example.com',
              cnameTo: 'www.example.com.edgekey.net',
              certStatus: {
                production: [{ status: 'DEPLOYED' }]
              }
            }
          ]
        }
      };

      mockClient.request
        .mockResolvedValueOnce(mockProperty)
        .mockResolvedValueOnce(mockRules)
        .mockResolvedValueOnce(mockHostnames);

      const result = await checkPropertyHealth(mockClient, {
        propertyId: 'prp_12345',
        includePerformance: true,
        includeSecurity: true
      });

      expect(result.content[0]?.text).toContain('Property Health Check Report');
      expect(result.content[0]?.text).toContain('Overall Health');
      expect(result.content[0]?.text).toContain('Health Check Results');
    });

    it('should detect health issues', async () => {
      const mockProperty = {
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property',
            latestVersion: 1
          }]
        }
      };

      const mockRules = {
        rules: {
          name: 'default',
          behaviors: [], // No behaviors - should trigger warning
          children: []
        }
      };

      const mockHostnames = {
        hostnames: {
          items: []
        }
      };

      mockClient.request
        .mockResolvedValueOnce(mockProperty)
        .mockResolvedValueOnce(mockRules)
        .mockResolvedValueOnce(mockHostnames);

      const result = await checkPropertyHealth(mockClient, {
        propertyId: 'prp_12345'
      });

      expect(result.content[0]?.text).toContain('warning');
      expect(result.content[0]?.text).toContain('not activated');
    });
  });

  describe('detectConfigurationDrift', () => {
    it('should detect configuration drift between versions', async () => {
      const mockProperty = {
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property',
            latestVersion: 3
          }]
        }
      };

      const baselineRules = {
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin.example.com' } },
            { name: 'caching', options: { behavior: 'MAX_AGE', ttl: '7d' } }
          ]
        }
      };

      const compareRules = {
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'new-origin.example.com' } }, // Changed
            { name: 'caching', options: { behavior: 'MAX_AGE', ttl: '1d' } }, // Changed
            { name: 'http2', options: { enabled: true } } // Added
          ]
        }
      };

      const baselineHostnames = {
        hostnames: {
          items: [
            { cnameFrom: 'www.example.com' }
          ]
        }
      };

      const compareHostnames = {
        hostnames: {
          items: [
            { cnameFrom: 'www.example.com' },
            { cnameFrom: 'api.example.com' } // Added
          ]
        }
      };

      mockClient.request
        .mockResolvedValueOnce(mockProperty)
        .mockResolvedValueOnce(baselineRules)
        .mockResolvedValueOnce(compareRules)
        .mockResolvedValueOnce(baselineHostnames)
        .mockResolvedValueOnce(compareHostnames);

      const result = await detectConfigurationDrift(mockClient, {
        propertyId: 'prp_12345',
        baselineVersion: 1,
        compareVersion: 3
      });

      expect(result.content[0]?.text).toContain('Configuration Drift Analysis');
      expect(result.content[0]?.text).toContain('DRIFT DETECTED');
      expect(result.content[0]?.text).toContain('Drift Score');
    });
  });

  describe('bulkUpdateProperties', () => {
    it('should update multiple properties successfully', async () => {
      const mockProperty1 = {
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'property-1',
            latestVersion: 1,
            contractId: 'ctr_12345',
            groupId: 'grp_12345'
          }]
        }
      };

      const mockProperty2 = {
        properties: {
          items: [{
            propertyId: 'prp_67890',
            propertyName: 'property-2',
            latestVersion: 1,
            contractId: 'ctr_12345',
            groupId: 'grp_12345'
          }]
        }
      };

      const mockRules = {
        rules: {
          behaviors: [
            { name: 'origin', options: {} }
          ]
        }
      };

      mockClient.request
        .mockResolvedValueOnce(mockProperty1)
        .mockResolvedValueOnce(mockRules)
        .mockResolvedValueOnce({}) // Update response
        .mockResolvedValueOnce(mockProperty2)
        .mockResolvedValueOnce(mockRules)
        .mockResolvedValueOnce({}); // Update response

      const result = await bulkUpdateProperties(mockClient, {
        propertyIds: ['prp_12345', 'prp_67890'],
        updates: {
          addBehavior: {
            name: 'http2',
            options: { enabled: true }
          }
        }
      });

      expect(result.content[0]?.text).toContain('Bulk Property Update Results');
      expect(result.content[0]?.text).toMatch(/\*\*Successful:\*\*\s*2/);
      expect(result.content[0]?.text).toContain('property-1');
      expect(result.content[0]?.text).toContain('property-2');
    });

    it('should handle partial failures', async () => {
      const mockProperty = {
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'property-1',
            latestVersion: 1,
            contractId: 'ctr_12345',
            groupId: 'grp_12345'
          }]
        }
      };

      mockClient.request
        .mockResolvedValueOnce(mockProperty)
        .mockRejectedValueOnce(new Error('Property not found')); // Second property fails

      const result = await bulkUpdateProperties(mockClient, {
        propertyIds: ['prp_12345', 'prp_99999'],
        updates: {
          addBehavior: {
            name: 'http2',
            options: { enabled: true }
          }
        }
      });

      expect(result.content[0]?.text).toMatch(/\*\*Successful:\*\*\s*0/);
      expect(result.content[0]?.text).toMatch(/\*\*Failed:\*\*\s*2/);
    });
  });
});