import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AkamaiClient } from '../../src/akamai-client';
import {
  createPropertyVersion,
  getPropertyRules,
  createEdgeHostname,
  addPropertyHostname,
  activateProperty,
  getActivationStatus,
  listPropertyActivations
} from '../../src/tools/property-manager-tools';

// Mock the AkamaiClient
jest.mock('../../src/akamai-client');

describe('Property Manager Extended Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      request: jest.fn(),
    } as any;
  });

  // Helper to get text content from result
  const getTextContent = (result: any): string => {
    const content = result.content?.[0];
    if (content && 'text' in content) {
      return content.text;
    }
    return '';
  };

  describe('createPropertyVersion', () => {
    it('should create a new property version', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          versionLink: '/papi/v1/properties/prp_12345/versions/4',
        });

      const result = await createPropertyVersion(mockClient, {
        propertyId: 'prp_12345',
        note: 'Test version',
      });

      expect(mockClient.request).toHaveBeenCalledTimes(3);
      const text = getTextContent(result);
      expect(text).toContain('Created new property version 4');
    });

    it('should handle errors gracefully', async () => {
      mockClient.request.mockRejectedValue(new Error('API error'));

      const result = await createPropertyVersion(mockClient, {
        propertyId: 'prp_12345',
      });

      const text = getTextContent(result);
      expect(text).toContain('Failed to create property version');
    });
  });

  describe('getPropertyRules', () => {
    it('should retrieve property rules', async () => {
      const mockRules = {
        ruleFormat: 'v2023-10-30',
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'example.com' } },
            { name: 'caching', options: { behavior: 'MAX_AGE' } },
          ],
          children: [],
        },
      };

      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce(mockRules);

      const result = await getPropertyRules(mockClient, {
        propertyId: 'prp_12345',
      });

      const text = getTextContent(result);
      expect(text).toContain('Property Rules - prp_12345');
      expect(text).toContain('origin: example.com');
    });
  });

  describe('createEdgeHostname', () => {
    it('should create an edge hostname', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              contractId: 'ctr_C-123456',
              groupId: 'grp_12345',
              productId: 'prd_Web_Accel',
            }],
          },
        })
        .mockResolvedValueOnce({
          edgeHostnameLink: '/papi/v1/edgehostnames/ehn_123456',
        });

      const result = await createEdgeHostname(mockClient, {
        propertyId: 'prp_12345',
        domainPrefix: 'www.example.com',
        secure: true,
      });

      const text = getTextContent(result);
      expect(text).toContain('Created edge hostname: www.example.com.edgekey.net');
      expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          domainPrefix: 'www.example.com',
          secure: true,
        }),
      }));
    });
  });

  describe('activateProperty', () => {
    it('should activate a property to staging', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'example.com',
              latestVersion: 3,
              stagingVersion: 2,
            }],
          },
        })
        .mockResolvedValueOnce({
          activationLink: '/papi/v1/properties/prp_12345/activations/atv_123456',
        });

      const result = await activateProperty(mockClient, {
        propertyId: 'prp_12345',
        network: 'STAGING',
      });

      const text = getTextContent(result);
      expect(text).toContain('Started activation');
      expect(text).toContain('STAGING');
      expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          network: 'STAGING',
          propertyVersion: 3,
        }),
      }));
    });

    it('should skip activation if already active', async () => {
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId: 'prp_12345',
            latestVersion: 3,
            stagingVersion: 3,
          }],
        },
      });

      const result = await activateProperty(mockClient, {
        propertyId: 'prp_12345',
        network: 'STAGING',
      });

      const text = getTextContent(result);
      expect(text).toContain('already active in STAGING');
      expect(mockClient.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActivationStatus', () => {
    it('should get activation status', async () => {
      mockClient.request.mockResolvedValueOnce({
        activations: {
          items: [{
            activationId: 'atv_123456',
            propertyName: 'example.com',
            propertyId: 'prp_12345',
            propertyVersion: 3,
            network: 'STAGING',
            status: 'ACTIVE',
            activationType: 'ACTIVATE',
            submitDate: '2024-01-01T10:00:00Z',
            updateDate: '2024-01-01T10:15:00Z',
          }],
        },
      });

      const result = await getActivationStatus(mockClient, {
        propertyId: 'prp_12345',
        activationId: 'atv_123456',
      });

      const text = getTextContent(result);
      expect(text).toContain('✅ ACTIVE');
      expect(text).toContain('Activation Complete!');
    });
  });

  describe('addPropertyHostname', () => {
    it('should add hostname to property', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [{
              cnameFrom: 'existing.example.com',
              cnameTo: 'existing.example.com.edgesuite.net',
            }],
          },
        })
        .mockResolvedValueOnce({});

      const result = await addPropertyHostname(mockClient, {
        propertyId: 'prp_12345',
        hostname: 'www.example.com',
        edgeHostname: 'www.example.com.edgesuite.net',
      });

      const text = getTextContent(result);
      expect(text).toContain('Added hostname www.example.com');
      expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'PUT',
        body: expect.objectContaining({
          hostnames: expect.arrayContaining([
            expect.objectContaining({
              cnameFrom: 'www.example.com',
              cnameTo: 'www.example.com.edgesuite.net',
            }),
          ]),
        }),
      }));
    });
  });

  describe('listPropertyActivations', () => {
    it('should list property activations', async () => {
      mockClient.request.mockResolvedValueOnce({
        activations: {
          items: [
            {
              activationId: 'atv_123456',
              propertyVersion: 3,
              network: 'PRODUCTION',
              status: 'ACTIVE',
              activationType: 'ACTIVATE',
              updateDate: '2024-01-01T10:00:00Z',
            },
            {
              activationId: 'atv_123455',
              propertyVersion: 2,
              network: 'STAGING',
              status: 'ACTIVE',
              activationType: 'ACTIVATE',
              updateDate: '2024-01-01T09:00:00Z',
            },
          ],
        },
      });

      const result = await listPropertyActivations(mockClient, {
        propertyId: 'prp_12345',
      });

      const text = getTextContent(result);
      expect(text).toContain('Property Activations (2 found)');
      expect(text).toContain('PRODUCTION');
      expect(text).toContain('STAGING');
    });
  });
});