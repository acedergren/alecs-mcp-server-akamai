/**
 * Tests for JSON format parameter backward compatibility
 * Ensures both 'json' and 'text' formats work correctly
 */

import { AkamaiClient } from '../../src/akamai-client';
import {
  createPropertyVersion,
  activateProperty,
  listPropertyActivations,
} from '../../src/tools/property-manager-tools';

// Mock the AkamaiClient
jest.mock('../../src/akamai-client');

describe('JSON Format Backward Compatibility', () => {
  let mockClient: AkamaiClient;

  beforeEach(() => {
    mockClient = {
      request: jest.fn(),
    } as unknown as AkamaiClient;
  });

  describe('createPropertyVersion', () => {
    const mockPropertyResponse = {
      properties: {
        items: [{
          propertyId: 'prp_12345',
          propertyName: 'test-property',
          latestVersion: 1,
          productionVersion: 1,
        }],
      },
    };

    const mockVersionResponse = {
      versionLink: '/papi/v1/properties/prp_12345/versions/2',
      propertyVersion: 2,
    };

    beforeEach(() => {
      (mockClient.request as any)
        .mockResolvedValueOnce(mockPropertyResponse)
        .mockResolvedValueOnce(mockVersionResponse);
    });

    it('should return text format by default (backward compatibility)', async () => {
      const result = await createPropertyVersion(mockClient, {
        propertyId: 'prp_12345',
        note: 'Test version',
      });

      expect(result.content?.[0]?.type).toBe('text');
      const text = result.content?.[0]?.text || '';
      expect(text).toContain('[DONE] Created property version 2');
      expect(text).toContain('test-property');
      expect(text).not.toContain('"data"'); // Should not be JSON structured
    });

    it('should return text format when explicitly requested', async () => {
      const result = await createPropertyVersion(mockClient, {
        propertyId: 'prp_12345',
        note: 'Test version',
        format: 'text',
      });

      expect(result.content?.[0]?.type).toBe('text');
      const text = result.content?.[0]?.text || '';
      expect(text).toContain('[DONE] Created property version 2');
      expect(text).toContain('test-property');
      expect(text).not.toContain('"data"'); // Should not be JSON structured
    });

    it('should return JSON format when requested', async () => {
      const result = await createPropertyVersion(mockClient, {
        propertyId: 'prp_12345',
        note: 'Test version',
        format: 'json',
      });

      expect(result.content?.[0]?.type).toBe('text');
      const jsonResponse = JSON.parse(result.content?.[0]?.text || '{}');
      
      // Verify JSON structure
      expect(jsonResponse).toHaveProperty('data');
      expect(jsonResponse).toHaveProperty('metadata');
      expect(jsonResponse).toHaveProperty('parameters');
      
      // Verify data content
      expect(jsonResponse.data.propertyId).toBe('prp_12345');
      expect(jsonResponse.data.propertyName).toBe('test-property');
      expect(jsonResponse.data.newVersion).toBe(2);
      expect(jsonResponse.data.baseVersion).toBe(1);
      
      // Verify metadata
      expect(jsonResponse.metadata.total).toBe(1);
      expect(jsonResponse.metadata.shown).toBe(1);
      expect(jsonResponse.metadata.hasMore).toBe(false);
      expect(jsonResponse.metadata.executionTime).toBeGreaterThan(0);
    });
  });

  describe('activateProperty', () => {
    const mockPropertyResponse = {
      properties: {
        items: [{
          propertyId: 'prp_12345',
          propertyName: 'test-property',
          latestVersion: 2,
          productionVersion: 1,
          stagingVersion: 1,
        }],
      },
    };

    const mockActivationResponse = {
      activationLink: '/papi/v1/properties/prp_12345/activations/atv_67890',
    };

    beforeEach(() => {
      (mockClient.request as any)
        .mockResolvedValueOnce(mockPropertyResponse)
        .mockResolvedValueOnce(mockActivationResponse);
    });

    it('should return text format by default', async () => {
      const result = await activateProperty(mockClient, {
        propertyId: 'prp_12345',
        network: 'STAGING',
      });

      expect(result.content?.[0]?.type).toBe('text');
      const text = result.content?.[0]?.text || '';
      expect(text).toContain('[ACTIVATION STARTED]');
      expect(text).toContain('Property: test-property');
      expect(text).not.toContain('"data"');
    });

    it('should return JSON format when requested', async () => {
      const result = await activateProperty(mockClient, {
        propertyId: 'prp_12345',
        network: 'STAGING',
        format: 'json',
      });

      expect(result.content?.[0]?.type).toBe('text');
      const jsonResponse = JSON.parse(result.content?.[0]?.text || '{}');
      
      expect(jsonResponse).toHaveProperty('data');
      expect(jsonResponse.data.propertyId).toBe('prp_12345');
      expect(jsonResponse.data.propertyName).toBe('test-property');
      expect(jsonResponse.data.version).toBe(2);
      expect(jsonResponse.data.network).toBe('STAGING');
      expect(jsonResponse.data.activationId).toBe('atv_67890');
    });
  });

  describe('listPropertyActivations', () => {
    const mockActivationsResponse = {
      activations: {
        items: [
          {
            activationId: 'atv_12345',
            propertyName: 'test-property',
            propertyId: 'prp_12345',
            propertyVersion: 2,
            network: 'STAGING',
            activationType: 'ACTIVATE',
            status: 'ACTIVE',
            submitDate: '2024-01-01T00:00:00Z',
            updateDate: '2024-01-01T00:10:00Z',
            note: 'Test activation',
            notifyEmails: ['test@example.com'],
          },
          {
            activationId: 'atv_67890',
            propertyName: 'test-property',
            propertyId: 'prp_12345',
            propertyVersion: 1,
            network: 'PRODUCTION',
            activationType: 'ACTIVATE',
            status: 'ACTIVE',
            submitDate: '2023-12-01T00:00:00Z',
            updateDate: '2023-12-01T00:15:00Z',
            note: 'Initial activation',
            notifyEmails: ['test@example.com'],
          },
        ],
      },
    };

    beforeEach(() => {
      (mockClient.request as any).mockResolvedValueOnce(mockActivationsResponse);
    });

    it('should return text format by default with JSON data', async () => {
      const result = await listPropertyActivations(mockClient, {
        propertyId: 'prp_12345',
      });

      expect(result.content?.[0]?.type).toBe('text');
      const data = JSON.parse(result.content?.[0]?.text || '{}');
      
      // Even in text format, the data is structured
      expect(data).toHaveProperty('activations');
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('metadata');
      expect(data.activations).toHaveLength(2);
    });

    it('should return enhanced JSON format when requested', async () => {
      const result = await listPropertyActivations(mockClient, {
        propertyId: 'prp_12345',
        format: 'json',
      });

      expect(result.content?.[0]?.type).toBe('text');
      const jsonResponse = JSON.parse(result.content?.[0]?.text || '{}');
      
      // Verify enhanced JSON structure with JsonResponseBuilder
      expect(jsonResponse).toHaveProperty('data');
      expect(jsonResponse).toHaveProperty('metadata');
      expect(jsonResponse).toHaveProperty('parameters');
      
      // Verify data content
      expect(jsonResponse.data.activations).toHaveLength(2);
      expect(jsonResponse.data.summary).toHaveProperty('byNetwork');
      expect(jsonResponse.data.summary.byNetwork).toHaveProperty('STAGING');
      expect(jsonResponse.data.summary.byNetwork).toHaveProperty('PRODUCTION');
      
      // Verify metadata
      expect(jsonResponse.metadata.total).toBe(2);
      expect(jsonResponse.metadata.shown).toBe(2);
      expect(jsonResponse.metadata.hasMore).toBe(false);
      expect(jsonResponse.metadata.warnings).toEqual([]);
    });

    it('should handle empty results correctly in both formats', async () => {
      (mockClient.request as any).mockReset();
      (mockClient.request as any).mockResolvedValueOnce({
        activations: { items: [] },
      });

      // Test text format
      const textResult = await listPropertyActivations(mockClient, {
        propertyId: 'prp_12345',
        format: 'text',
      });
      
      const textData = JSON.parse(textResult.content?.[0]?.text || '{}');
      expect(textData.activations).toEqual([]);
      expect(textData.metadata.total).toBe(0);

      // Test JSON format
      (mockClient.request as any).mockResolvedValueOnce({
        activations: { items: [] },
      });
      
      const jsonResult = await listPropertyActivations(mockClient, {
        propertyId: 'prp_12345',
        format: 'json',
      });
      
      const jsonData = JSON.parse(jsonResult.content?.[0]?.text || '{}');
      expect(jsonData.data.activations).toEqual([]);
      expect(jsonData.metadata.total).toBe(0);
    });
  });

  describe('Format parameter validation', () => {
    it('should handle invalid format parameter gracefully', async () => {
      // Mock responses
      (mockClient.request as any)
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'test-property',
              latestVersion: 1,
            }],
          },
        })
        .mockResolvedValueOnce({
          versionLink: '/papi/v1/properties/prp_12345/versions/2',
          propertyVersion: 2,
        });

      // Test with invalid format - should default to 'text'
      const result = await createPropertyVersion(mockClient, {
        propertyId: 'prp_12345',
        format: 'invalid' as any,
      });

      expect(result.content?.[0]?.type).toBe('text');
      const text = result.content?.[0]?.text || '';
      expect(text).toContain('[DONE] Created property version 2');
    });
  });
});