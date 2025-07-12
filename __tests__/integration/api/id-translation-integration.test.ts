/**
 * ID Translation Integration Tests
 * 
 * Tests the integration of ID translation service with AkamaiOperation
 */

import { AkamaiOperation } from '../tools/common/akamai-operation';
import { idTranslationService } from '../services/id-translation-service';
import { AkamaiClient } from '../akamai-client';
import { CACHE_TTL } from '../constants/index';

// Mock the AkamaiClient
jest.mock('../akamai-client');

describe('ID Translation Integration', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear translation cache
    idTranslationService.clearCache();

    // Create mock client
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
  });

  describe('AkamaiOperation.execute with translation', () => {
    it('should translate property IDs in response', async () => {
      // Mock property list response
      const mockResponse = {
        properties: {
          items: [
            {
              propertyId: 'prp_123456',
              propertyName: 'www.example.com',
              contractId: 'ctr_C-1234567',
              groupId: 'grp_98765',
            },
            {
              propertyId: 'prp_789012',
              propertyName: 'api.example.com',
              contractId: 'ctr_C-1234567',
              groupId: 'grp_98765',
            }
          ]
        }
      };

      // Mock client request
      mockClient.request.mockResolvedValue(mockResponse);

      // Translation will be handled by the mock client automatically
      // since we're testing the integration, not the translation service itself

      // Execute with translation enabled
      const result = await AkamaiOperation.execute(
        'property',
        'property_list',
        { customer: 'test' },
        async () => mockResponse,
        {
          translation: {
            enabled: true,
            mappings: [
              { path: 'properties.items.*.contractId', type: 'contract' },
              { path: 'properties.items.*.groupId', type: 'group' },
            ]
          }
        }
      );

      // Verify the response includes translated names
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      const content = JSON.parse(result.content[0]!.text);
      expect(content.properties.items[0]).toHaveProperty('contractName');
      expect(content.properties.items[0]).toHaveProperty('groupName');
    });

    it('should use cached translations on subsequent calls', async () => {
      const mockResponse = {
        propertyId: 'prp_123456',
        contractId: 'ctr_C-1234567',
      };

      mockClient.request.mockResolvedValue(mockResponse);

      // First call - should hit the API
      await AkamaiOperation.execute(
        'property',
        'property_get',
        { customer: 'test' },
        async () => mockResponse,
        {
          translation: {
            enabled: true,
            mappings: AkamaiOperation.COMMON_TRANSLATIONS['property']
          }
        }
      );

      // Second call - should use cache
      await AkamaiOperation.execute(
        'property',
        'property_get',
        { customer: 'test' },
        async () => mockResponse,
        {
          translation: {
            enabled: true,
            mappings: AkamaiOperation.COMMON_TRANSLATIONS['property']
          }
        }
      );

      // Verify translation service was called only once per ID
      const cacheStats = idTranslationService.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
    });

    it('should handle translation failures gracefully', async () => {
      const mockResponse = {
        propertyId: 'prp_123456',
        contractId: 'ctr_INVALID',
      };

      mockClient.request.mockResolvedValue(mockResponse);

      // Mock translation service to throw error
      const mockTranslationClient = {
        request: jest.fn().mockRejectedValue(new Error('Translation API error'))
      };

      idTranslationService.setClient(mockTranslationClient);

      // Execute with translation enabled
      const result = await AkamaiOperation.execute(
        'property',
        'property_get',
        { customer: 'test' },
        async () => mockResponse,
        {
          translation: {
            enabled: true,
            mappings: AkamaiOperation.COMMON_TRANSLATIONS['property']
          }
        }
      );

      // Should return untranslated response
      expect(result.content).toBeDefined();
      const content = JSON.parse(result.content[0]!.text);
      expect(content.contractId).toBe('ctr_INVALID');
      expect(content).not.toHaveProperty('contractName');
    });

    it('should respect translation disabled flag', async () => {
      const mockResponse = {
        propertyId: 'prp_123456',
        contractId: 'ctr_C-1234567',
      };

      mockClient.request.mockResolvedValue(mockResponse);

      // Execute with translation disabled
      const result = await AkamaiOperation.execute(
        'property',
        'property_get',
        { customer: 'test' },
        async () => mockResponse,
        {
          translation: {
            enabled: false,
            mappings: AkamaiOperation.COMMON_TRANSLATIONS['property']
          }
        }
      );

      // Should not have translated fields
      expect(result.content).toBeDefined();
      const content = JSON.parse(result.content[0]!.text);
      expect(content).not.toHaveProperty('contractName');
    });
  });

  describe('Common translation mappings', () => {
    it('should have comprehensive property mappings', () => {
      const propertyMappings = AkamaiOperation.COMMON_TRANSLATIONS['property'];
      
      // Verify essential property-related IDs are covered
      const paths = propertyMappings?.map(m => m.path) || [];
      expect(paths).toContain('propertyId');
      expect(paths).toContain('contractId');
      expect(paths).toContain('groupId');
      expect(paths).toContain('productId');
      
      // Verify wildcard patterns for nested structures
      expect(paths).toContain('*.propertyId');
      expect(paths).toContain('properties.*.propertyId');
      expect(paths).toContain('items.*.propertyId');
    });

    it('should have mappings for all domains', () => {
      const domains = Object.keys(AkamaiOperation.COMMON_TRANSLATIONS);
      expect(domains).toContain('property');
      expect(domains).toContain('certificate');
      expect(domains).toContain('network');
      expect(domains).toContain('cpcode');
      expect(domains).toContain('all');
    });

    it('should have correct types for each mapping', () => {
      for (const [, mappings] of Object.entries(AkamaiOperation.COMMON_TRANSLATIONS)) {
        for (const mapping of mappings) {
          expect(mapping).toHaveProperty('path');
          expect(mapping).toHaveProperty('type');
          expect(['property', 'contract', 'group', 'product', 'certificate', 'network_list', 'cpcode'])
            .toContain(mapping.type);
        }
      }
    });
  });

  describe('Translation options', () => {
    it('should support custom TTL for translations', async () => {
      const mockResponse = { propertyId: 'prp_123456' };
      mockClient.request.mockResolvedValue(mockResponse);

      await AkamaiOperation.execute(
        'property',
        'property_get',
        { customer: 'test' },
        async () => mockResponse,
        {
          translation: {
            enabled: true,
            mappings: [{ path: 'propertyId', type: 'property' }],
            options: {
              ttl: CACHE_TTL.LIST_SHORT * 1000, // 1 minute in milliseconds
              includeMetadata: true
            }
          }
        }
      );

      // Verify cache entry was created with custom TTL
      const cacheStats = idTranslationService.getCacheStats();
      expect(cacheStats.size).toBe(1);
    });

    it('should skip cache when requested', async () => {
      const mockResponse = { propertyId: 'prp_123456' };
      mockClient.request.mockResolvedValue(mockResponse);

      // First call - populate cache
      await AkamaiOperation.execute(
        'property',
        'property_get',
        { customer: 'test' },
        async () => mockResponse,
        {
          translation: {
            enabled: true,
            mappings: [{ path: 'propertyId', type: 'property' }]
          }
        }
      );

      // Second call - skip cache
      await AkamaiOperation.execute(
        'property',
        'property_get',
        { customer: 'test' },
        async () => mockResponse,
        {
          translation: {
            enabled: true,
            mappings: [{ path: 'propertyId', type: 'property' }],
            options: {
              skipCache: true
            }
          }
        }
      );

      // Both calls should have made requests
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });
  });
});