/**
 * Consolidated Property Domain Tests
 * 
 * Validates that the new consolidated property API:
 * 1. Works correctly with all operations
 * 2. Maintains backwards compatibility
 * 3. Provides performance benefits
 * 4. Has proper error handling
 */

import { property } from '../../../domains/property';
import { AkamaiClient } from '../../../akamai-client';
import { deprecationWarning } from '../../../core/compatibility';
import * as compatibilityModule from '../../../domains/property/compatibility';

// Mock the core modules
jest.mock('../../../akamai-client');
jest.mock('../../../core/compatibility');
jest.mock('../../../core/performance', () => ({
  performanceOptimized: jest.fn((fn) => fn),
  PerformanceProfiles: {
    LIST: {},
    READ: {},
    WRITE: {},
    STATUS: {},
  },
  CacheInvalidation: {
    invalidate: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Consolidated Property Domain', () => {
  let mockClient: jest.Mocked<AkamaiClient>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock client
    mockClient = {
      request: jest.fn(),
      section: 'default',
    } as any;
  });
  
  describe('Core Operations', () => {
    describe('property.list', () => {
      it('should list properties with proper API call', async () => {
        const mockResponse = {
          properties: {
            items: [
              { propertyId: 'prp_123', propertyName: 'Test Property' },
            ],
          },
        };
        
        mockClient.request.mockResolvedValue(mockResponse);
        
        const result = await property.list(mockClient, {
          contractId: 'ctr_ABC',
          customer: 'test-customer',
        });
        
        expect(mockClient.request).toHaveBeenCalledWith({
          path: '/papi/v1/properties',
          method: 'GET',
          queryParams: {
            contractId: 'ctr_ABC',
          },
        });
        
        expect(result).toEqual(mockResponse);
      });
      
      it('should normalize contract IDs without prefix', async () => {
        mockClient.request.mockResolvedValue({ properties: { items: [] } });
        
        await property.list(mockClient, {
          contractId: 'ABC', // No prefix
        });
        
        expect(mockClient.request).toHaveBeenCalledWith({
          path: '/papi/v1/properties',
          method: 'GET',
          queryParams: {
            contractId: 'ctr_ABC', // Prefix added
          },
        });
      });
    });
    
    describe('property.get', () => {
      it('should get property details', async () => {
        const mockProperty = {
          propertyId: 'prp_456',
          propertyName: 'Test Property',
          latestVersion: 5,
        };
        
        mockClient.request.mockResolvedValue({
          properties: { items: [mockProperty] },
        });
        
        const result = await property.get(mockClient, {
          propertyId: 'prp_456',
        });
        
        expect(result).toEqual(mockProperty);
      });
      
      it('should handle property not found', async () => {
        mockClient.request.mockResolvedValue({
          properties: { items: [] },
        });
        
        await expect(
          property.get(mockClient, { propertyId: 'prp_999' })
        ).rejects.toThrow('Property prp_999 not found');
      });
    });
    
    describe('property.create', () => {
      it('should create a new property', async () => {
        mockClient.request.mockResolvedValue({
          propertyLink: '/papi/v1/properties/prp_789',
        });
        
        const result = await property.create(mockClient, {
          propertyName: 'New Property',
          productId: 'prd_SPM',
          contractId: 'ctr_XYZ',
          groupId: 'grp_123',
        });
        
        expect(result).toEqual({
          propertyLink: '/papi/v1/properties/prp_789',
          propertyId: 'prp_789',
        });
      });
    });
    
    describe('property.version.create', () => {
      it('should create a new version', async () => {
        // Mock getting current property for version info
        mockClient.request
          .mockResolvedValueOnce({
            properties: { items: [{ latestVersion: 3 }] },
          })
          .mockResolvedValueOnce({
            versions: { items: [{ etag: '"abc123"' }] },
          })
          .mockResolvedValueOnce({
            versionLink: '/papi/v1/properties/prp_123/versions/4',
          });
        
        const result = await property.version.create(mockClient, {
          propertyId: 'prp_123',
        });
        
        expect(result).toEqual({
          versionLink: '/papi/v1/properties/prp_123/versions/4',
          propertyVersion: 4,
        });
      });
    });
    
    describe('property.activation.create', () => {
      it('should activate a property version', async () => {
        mockClient.request.mockResolvedValue({
          activationLink: '/papi/v1/properties/prp_123/activations/atv_456',
        });
        
        const result = await property.activation.create(mockClient, {
          propertyId: 'prp_123',
          version: 5,
          network: 'staging',
        });
        
        expect(mockClient.request).toHaveBeenCalledWith(
          expect.objectContaining({
            path: '/papi/v1/properties/prp_123/activations',
            method: 'POST',
            body: expect.objectContaining({
              propertyVersion: 5,
              network: 'STAGING', // Normalized to uppercase
              activationType: 'ACTIVATE',
            }),
          })
        );
        
        expect(result).toEqual({
          activationLink: '/papi/v1/properties/prp_123/activations/atv_456',
          activationId: 'atv_456',
        });
      });
    });
  });
  
  describe('Backwards Compatibility', () => {
    it('should support legacy listProperties function', async () => {
      mockClient.request.mockResolvedValue({
        properties: { items: [] },
      });
      
      const result = await compatibilityModule.listProperties(
        mockClient,
        'ctr_ABC',
        'grp_123',
        'test-customer'
      );
      
      expect(deprecationWarning).toHaveBeenCalledWith(
        'listProperties',
        'property.list',
        expect.any(String)
      );
      
      expect(result).toEqual({ items: [] });
    });
    
    it('should support legacy createPropertyVersion function', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: { items: [{ latestVersion: 2 }] },
        })
        .mockResolvedValueOnce({
          versions: { items: [{ etag: '"xyz789"' }] },
        })
        .mockResolvedValueOnce({
          versionLink: '/papi/v1/properties/prp_123/versions/3',
        });
      
      const result = await compatibilityModule.createPropertyVersion(
        mockClient,
        'prp_123',
        undefined,
        undefined,
        'test-customer'
      );
      
      expect(deprecationWarning).toHaveBeenCalledWith(
        'createPropertyVersion',
        'property.version.create',
        expect.any(String)
      );
      
      expect(result).toEqual({
        versionLink: '/papi/v1/properties/prp_123/versions/3',
        propertyVersion: 3,
      });
    });
  });
  
  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      (apiError as any).response = {
        status: 403,
        data: {
          detail: 'Forbidden',
        },
      };
      
      mockClient.request.mockRejectedValue(apiError);
      
      await expect(
        property.list(mockClient, {})
      ).rejects.toThrow();
    });
    
    it('should validate property IDs', async () => {
      await expect(
        property.get(mockClient, { propertyId: 'invalid-id' })
      ).rejects.toThrow('Property prp_invalid-id not found');
    });
  });
  
  describe('Performance Features', () => {
    it('should invalidate cache on mutations', async () => {
      const { CacheInvalidation } = require('../../../core/performance');
      
      mockClient.request.mockResolvedValue({
        propertyLink: '/papi/v1/properties/prp_999',
      });
      
      await property.create(mockClient, {
        propertyName: 'Cache Test',
        productId: 'prd_SPM',
        contractId: 'ctr_ABC',
        groupId: 'grp_123',
        customer: 'test-customer',
      });
      
      expect(CacheInvalidation.invalidate).toHaveBeenCalledWith(
        'test-customer:property.list:*'
      );
    });
  });
});