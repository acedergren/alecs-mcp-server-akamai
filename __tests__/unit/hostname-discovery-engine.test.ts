/**
 * Tests for Intelligent Hostname Discovery Engine
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AkamaiClient } from '../../src/akamai-client';
import {
  discoverHostnamesIntelligent,
  analyzeHostnameConflicts,
  analyzeWildcardCoverage,
  identifyOwnershipPatterns
} from '../../src/tools/hostname-discovery-engine';

// Mock the AkamaiClient
jest.mock('../akamai-client');

describe('Hostname Discovery Engine', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    jest.clearAllMocks();
  });

  describe('discoverHostnamesIntelligent', () => {
    it('should perform comprehensive hostname discovery analysis', async () => {
      // Mock properties response
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'example-property',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              },
              {
                propertyId: 'prp_456',
                propertyName: 'api-property',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 2
              }
            ]
          }
        })
        // Mock hostnames responses
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'www.example.com', cnameTo: 'www.example.com.edgesuite.net' },
              { cnameFrom: 'app.example.com', cnameTo: 'app.example.com.edgesuite.net' }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'api.example.com', cnameTo: 'api.example.com.edgesuite.net' },
              { cnameFrom: '*.dev.example.com', cnameTo: 'dev.example.com.edgesuite.net' }
            ]
          }
        });

      const result = await discoverHostnamesIntelligent(mockClient, {
        analysisScope: 'all',
        detectConflicts: true,
        analyzeWildcards: true,
        findOptimizations: true
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]!.type).toBe('text');
      expect(result.content[0]!.text).toContain('Intelligent Hostname Discovery Analysis');
      expect(result.content[0]!.text).toContain('Discovery Summary');
      
      // Verify API calls
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties?',
        method: 'GET'
      });
    });

    it('should handle scoped analysis for specific contract/group', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: { items: [] }
        });

      const result = await discoverHostnamesIntelligent(mockClient, {
        analysisScope: 'contract',
        contractId: 'ctr_123',
        groupId: 'grp_123'
      });

      expect(result.content[0]!.text).toContain('**Analysis Scope:** contract');
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties?contractId=ctr_123&groupId=grp_123',
        method: 'GET'
      });
    });

    it('should handle API errors gracefully', async () => {
      mockClient.request.mockRejectedValueOnce(new Error('API Error'));

      const result = await discoverHostnamesIntelligent(mockClient, {
        analysisScope: 'all'
      });

      expect(result.content[0]!.text).toContain('Error:');
    });
  });

  describe('analyzeHostnameConflicts', () => {
    it('should detect exact hostname conflicts', async () => {
      // Mock properties response
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'existing-property',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              }
            ]
          }
        })
        // Mock hostnames response
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'www.example.com', cnameTo: 'www.example.com.edgesuite.net' }
            ]
          }
        });

      const result = await analyzeHostnameConflicts(mockClient, {
        targetHostnames: ['www.example.com', 'new.example.com'],
        includeWildcardAnalysis: true,
        includeCertificateAnalysis: true
      });

      expect(result.content[0]!.text).toContain('Hostname Conflict Analysis');
      expect(result.content[0]!.text).toContain('**Target Hostnames:** 2');
      expect(result.content[0]!.text).toContain('**Existing Hostnames:** 1');
    });

    it('should handle no conflicts scenario', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'existing-property',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'different.example.com', cnameTo: 'different.example.com.edgesuite.net' }
            ]
          }
        });

      const result = await analyzeHostnameConflicts(mockClient, {
        targetHostnames: ['new.example.com', 'another.example.com']
      });

      expect(result.content[0]!.text).toContain('No Conflicts Detected');
      expect(result.content[0]!.text).toContain('All target hostnames are available');
    });

    it('should handle wildcard conflict analysis', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'wildcard-property',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: '*.example.com', cnameTo: 'example.com.edgesuite.net' }
            ]
          }
        });

      const result = await analyzeHostnameConflicts(mockClient, {
        targetHostnames: ['sub.example.com'],
        includeWildcardAnalysis: true
      });

      expect(result.content[0]!.text).toContain('Hostname Conflict Analysis');
    });
  });

  describe('analyzeWildcardCoverage', () => {
    it('should analyze wildcard hostname efficiency', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'wildcard-property',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              },
              {
                propertyId: 'prp_456',
                propertyName: 'specific-property',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: '*.example.com', cnameTo: 'example.com.edgesuite.net' }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'app.example.com', cnameTo: 'app.example.com.edgesuite.net' },
              { cnameFrom: 'api.example.com', cnameTo: 'api.example.com.edgesuite.net' }
            ]
          }
        });

      const result = await analyzeWildcardCoverage(mockClient, {
        includeOptimizationSuggestions: true
      });

      expect(result.content[0]!.text).toContain('Wildcard Coverage Analysis');
      expect(result.content[0]!.text).toContain('**Total Properties:** 2');
      expect(result.content[0]!.text).toContain('Wildcard Configurations:');
    });

    it('should provide optimization suggestions when no wildcards exist', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'specific-property',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'www.example.com', cnameTo: 'www.example.com.edgesuite.net' },
              { cnameFrom: 'app.example.com', cnameTo: 'app.example.com.edgesuite.net' }
            ]
          }
        });

      const result = await analyzeWildcardCoverage(mockClient, {
        includeOptimizationSuggestions: true
      });

      expect(result.content[0]!.text).toContain('No Wildcard Configurations Found');
      expect(result.content[0]!.text).toContain('Consider implementing wildcard hostnames');
    });

    it('should handle scoped analysis', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: { items: [] }
        });

      await analyzeWildcardCoverage(mockClient, {
        contractId: 'ctr_123',
        groupId: 'grp_123'
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties?contractId=ctr_123&groupId=grp_123',
        method: 'GET'
      });
    });
  });

  describe('identifyOwnershipPatterns', () => {
    it('should identify domain-based ownership patterns', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'example-www',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              },
              {
                propertyId: 'prp_456',
                propertyName: 'example-api',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              },
              {
                propertyId: 'prp_789',
                propertyName: 'example-app',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'www.example.com', cnameTo: 'www.example.com.edgesuite.net' }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'api.example.com', cnameTo: 'api.example.com.edgesuite.net' }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'app.example.com', cnameTo: 'app.example.com.edgesuite.net' }
            ]
          }
        });

      const result = await identifyOwnershipPatterns(mockClient, {
        minPropertiesForPattern: 3,
        includeConsolidationPlan: true
      });

      expect(result.content[0]!.text).toContain('Property Ownership Pattern Analysis');
      expect(result.content[0]!.text).toContain('**Total Properties Analyzed:** 3');
    });

    it('should handle no clear patterns found', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'diverse-property-1',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'unique.domain.com', cnameTo: 'unique.domain.com.edgesuite.net' }
            ]
          }
        });

      const result = await identifyOwnershipPatterns(mockClient, {
        minPropertiesForPattern: 3
      });

      expect(result.content[0]!.text).toContain('No Clear Ownership Patterns Found');
      expect(result.content[0]!.text).toContain('Well-organized property structure');
    });

    it('should provide consolidation recommendations', async () => {
      // Mock multiple properties with similar domains
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: Array.from({ length: 4 }, (_, i) => ({
              propertyId: `prp_${i + 1}`,
              propertyName: `example-service-${i + 1}`,
              contractId: 'ctr_123',
              groupId: 'grp_123',
              latestVersion: 1
            }))
          }
        });

      // Mock hostname responses for each property
      for (let i = 0; i < 4; i++) {
        mockClient.request.mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: `service${i + 1}.example.com`, cnameTo: `service${i + 1}.example.com.edgesuite.net` }
            ]
          }
        });
      }

      const result = await identifyOwnershipPatterns(mockClient, {
        minPropertiesForPattern: 3,
        includeConsolidationPlan: true
      });

      expect(result.content[0]!.text).toContain('Consolidation Recommendations');
    });

    it('should respect minimum properties threshold', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'small-property-1',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              },
              {
                propertyId: 'prp_456',
                propertyName: 'small-property-2',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'service1.example.com', cnameTo: 'service1.example.com.edgesuite.net' }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: 'service2.example.com', cnameTo: 'service2.example.com.edgesuite.net' }
            ]
          }
        });

      const result = await identifyOwnershipPatterns(mockClient, {
        minPropertiesForPattern: 5  // Higher than actual properties
      });

      expect(result.content[0]!.text).toContain('No Clear Ownership Patterns Found');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockClient.request.mockRejectedValueOnce(new Error('Network error'));

      const result = await discoverHostnamesIntelligent(mockClient, {});

      expect(result.content[0]!.text).toContain('Error:');
      expect(result.content[0]!.text).toContain('Network error');
    });

    it('should handle API authentication errors', async () => {
      const authError = new Error('Authentication failed');
      (authError as any).statusCode = 401;
      mockClient.request.mockRejectedValueOnce(authError);

      const result = await analyzeHostnameConflicts(mockClient, {
        targetHostnames: ['test.example.com']
      });

      expect(result.content[0]!.text).toContain('Error:');
    });

    it('should handle malformed API responses', async () => {
      mockClient.request.mockResolvedValueOnce(null);

      const result = await analyzeWildcardCoverage(mockClient, {});

      expect(result.content[0]!.text).toContain('Error:');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty hostname lists', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'empty-property',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: { items: [] }
        });

      const result = await discoverHostnamesIntelligent(mockClient, {});

      expect(result.content[0]!.text).toContain('Discovery Summary');
    });

    it('should handle properties without hostname data', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'no-hostnames-property',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              }
            ]
          }
        })
        .mockRejectedValueOnce(new Error('Hostnames not found'));

      const result = await discoverHostnamesIntelligent(mockClient, {});

      expect(result.content[0]!.text).toContain('Discovery Summary');
    });

    it('should handle invalid wildcard patterns', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [
              {
                propertyId: 'prp_123',
                propertyName: 'invalid-wildcard',
                contractId: 'ctr_123',
                groupId: 'grp_123',
                latestVersion: 1
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              { cnameFrom: '*.', cnameTo: 'invalid.edgesuite.net' }
            ]
          }
        });

      const result = await analyzeWildcardCoverage(mockClient, {});

      expect(result.content[0]!.text).toContain('Wildcard Coverage Analysis');
    });
  });
});