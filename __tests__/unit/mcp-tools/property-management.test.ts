/**
 * Property Management MCP Tools Test Suite
 * Tests property-related MCP capabilities
 */

import { z } from 'zod';
import {
  listProperties,
  getProperty,
  createProperty,
  listContracts,
  listGroups,
  listProducts,
} from '../../../src/tools/property-tools';
import {
  activateProperty,
  createPropertyVersion,
  getPropertyRules,
  updatePropertyRules,
  listPropertyActivations,
  getActivationStatus,
} from '../../../src/tools/property-manager-tools';
import { AkamaiClient } from '../../../src/akamai-client';

// Mock AkamaiClient
jest.mock('../../../src/akamai-client');

describe('Property Management MCP Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    jest.clearAllMocks();
  });

  describe('listProperties', () => {
    test('should return MCP-formatted property list', async () => {
      const mockProperties = [
        {
          accountId: 'act_1-234',
          contractId: 'ctr_1-5C13O2',
          groupId: 'grp_12345',
          propertyId: 'prp_123456',
          propertyName: 'example.com',
          latestVersion: 5,
          stagingVersion: 4,
          productionVersion: 3,
        },
      ];

      mockClient.request.mockResolvedValue({
        properties: {
          items: mockProperties,
        },
      });

      const result = await listProperties(mockClient, {});

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('example.com');
      expect(result.content[0].text).toContain('prp_123456');
    });

    test('should handle contractId filter', async () => {
      await listProperties(mockClient, { contractId: 'ctr_1-5C13O2' });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/papi/v1/properties',
          params: expect.objectContaining({
            contractId: 'ctr_1-5C13O2',
          }),
        })
      );
    });

    test('should handle groupId filter', async () => {
      await listProperties(mockClient, { groupId: 'grp_12345' });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            groupId: 'grp_12345',
          }),
        })
      );
    });

    test('should handle empty results gracefully', async () => {
      mockClient.request.mockResolvedValue({
        properties: { items: [] },
      });

      const result = await listProperties(mockClient, {});

      expect(result.content[0].text).toContain('No properties found');
    });
  });

  describe('getProperty', () => {
    test('should return detailed property information', async () => {
      const mockProperty = {
        propertyId: 'prp_123456',
        propertyName: 'example.com',
        contractId: 'ctr_1-5C13O2',
        groupId: 'grp_12345',
        latestVersion: 5,
        note: 'Production property',
      };

      mockClient.request.mockResolvedValue({
        properties: {
          items: [mockProperty],
        },
      });

      const result = await getProperty(mockClient, { propertyId: 'prp_123456' });

      expect(result.content[0].text).toContain('Property Details');
      expect(result.content[0].text).toContain('example.com');
      expect(result.content[0].text).toContain('prp_123456');
    });

    test('should handle property not found', async () => {
      mockClient.request.mockResolvedValue({
        properties: { items: [] },
      });

      const result = await getProperty(mockClient, { propertyId: 'prp_invalid' });

      expect(result.content[0].text).toContain('No properties found');
    });
  });

  describe('createProperty', () => {
    test('should create property with required parameters', async () => {
      const mockResponse = {
        propertyLink: '/papi/v1/properties/prp_123456',
        propertyId: 'prp_123456',
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await createProperty(mockClient, {
        propertyName: 'new-example.com',
        productId: 'prd_Web_Accel',
        contractId: 'ctr_1-5C13O2',
        groupId: 'grp_12345',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/papi/v1/properties',
          params: expect.objectContaining({
            contractId: 'ctr_1-5C13O2',
            groupId: 'grp_12345',
          }),
          body: expect.objectContaining({
            propertyName: 'new-example.com',
            productId: 'prd_Web_Accel',
          }),
        })
      );

      expect(result.content[0].text).toContain('Property created successfully');
      expect(result.content[0].text).toContain('prp_123456');
    });

    test('should handle optional ruleFormat', async () => {
      mockClient.request.mockResolvedValue({
        propertyLink: '/papi/v1/properties/prp_123456',
        propertyId: 'prp_123456',
      });

      await createProperty(mockClient, {
        propertyName: 'new-example.com',
        productId: 'prd_Web_Accel',
        contractId: 'ctr_1-5C13O2',
        groupId: 'grp_12345',
        ruleFormat: 'v2024-01-09',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            ruleFormat: 'v2024-01-09',
          }),
        })
      );
    });
  });

  describe('listContracts', () => {
    test('should return formatted contract list', async () => {
      const mockContracts = [
        {
          contractId: 'ctr_1-5C13O2',
          contractTypeName: 'AKAMAI_INTERNAL',
          status: 'Active',
        },
        {
          contractId: 'ctr_V-44KRACO',
          contractTypeName: 'AKAMAI_INTERNAL',
          status: 'Active',
        },
      ];

      mockClient.request.mockResolvedValue({
        contracts: {
          items: mockContracts,
        },
      });

      const result = await listContracts(mockClient, {});

      expect(result.content[0].text).toContain('Akamai Contracts');
      expect(result.content[0].text).toContain('ctr_1-5C13O2');
      expect(result.content[0].text).toContain('ctr_V-44KRACO');
      expect(result.content[0].text).toContain('AKAMAI_INTERNAL');
    });

    test('should handle search term filter', async () => {
      await listContracts(mockClient, { searchTerm: 'INTERNAL' });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/papi/v1/contracts',
        })
      );
    });
  });

  describe('activateProperty', () => {
    test('should activate property version', async () => {
      const mockResponse = {
        activationLink: '/papi/v1/properties/prp_123456/activations/atv_123456',
        activationId: 'atv_123456',
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await activateProperty(mockClient, {
        propertyId: 'prp_123456',
        version: 5,
        network: 'staging',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/papi/v1/properties/prp_123456/activations',
          body: expect.objectContaining({
            propertyVersion: 5,
            network: 'STAGING',
            activationType: 'ACTIVATE',
          }),
        })
      );

      expect(result.content[0].text).toContain('Activation started');
      expect(result.content[0].text).toContain('atv_123456');
    });

    test('should handle production activation with notifications', async () => {
      mockClient.request.mockResolvedValue({
        activationLink: '/papi/v1/properties/prp_123456/activations/atv_123456',
        activationId: 'atv_123456',
      });

      await activateProperty(mockClient, {
        propertyId: 'prp_123456',
        version: 5,
        network: 'production',
        emails: ['admin@example.com'],
        note: 'Production release v1.2.3',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            network: 'PRODUCTION',
            notifyEmails: ['admin@example.com'],
            note: 'Production release v1.2.3',
          }),
        })
      );
    });
  });

  describe('getPropertyRules', () => {
    test('should return property rules', async () => {
      const mockRules = {
        rules: {
          name: 'default',
          children: [
            {
              name: 'Compress Text Content',
              behaviors: [
                {
                  name: 'gzipResponse',
                  options: { behavior: 'ALWAYS' },
                },
              ],
            },
          ],
        },
      };

      mockClient.request.mockResolvedValue(mockRules);

      const result = await getPropertyRules(mockClient, {
        propertyId: 'prp_123456',
        version: 5,
      });

      expect(result.content[0].text).toContain('Property Rules');
      expect(result.content[0].text).toContain('Compress Text Content');
      expect(result.content[0].text).toContain('gzipResponse');
    });

    test('should handle contractId and groupId parameters', async () => {
      mockClient.request.mockResolvedValue({ rules: {} });

      await getPropertyRules(mockClient, {
        propertyId: 'prp_123456',
        version: 5,
        contractId: 'ctr_1-5C13O2',
        groupId: 'grp_12345',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            contractId: 'ctr_1-5C13O2',
            groupId: 'grp_12345',
          }),
        })
      );
    });
  });

  describe('Schema Validation', () => {
    test('should validate listProperties schema', () => {
      const schema = z.object({
        customer: z.string().optional(),
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      });

      expect(() => schema.parse({})).not.toThrow();
      expect(() => schema.parse({ contractId: 'ctr_123' })).not.toThrow();
      expect(() => schema.parse({ invalidParam: 'test' })).toThrow();
    });

    test('should validate createProperty schema', () => {
      const schema = z.object({
        customer: z.string().optional(),
        propertyName: z.string(),
        productId: z.string(),
        contractId: z.string(),
        groupId: z.string(),
        ruleFormat: z.string().optional(),
      });

      expect(() => schema.parse({
        propertyName: 'test.com',
        productId: 'prd_123',
        contractId: 'ctr_123',
        groupId: 'grp_123',
      })).not.toThrow();

      expect(() => schema.parse({
        propertyName: 'test.com',
        // Missing required fields
      })).toThrow();
    });

    test('should validate activateProperty schema', () => {
      const schema = z.object({
        customer: z.string().optional(),
        propertyId: z.string(),
        version: z.number(),
        network: z.enum(['staging', 'production']),
        emails: z.array(z.string()).optional(),
        note: z.string().optional(),
      });

      expect(() => schema.parse({
        propertyId: 'prp_123',
        version: 5,
        network: 'staging',
      })).not.toThrow();

      expect(() => schema.parse({
        propertyId: 'prp_123',
        version: 5,
        network: 'invalid', // Invalid network
      })).toThrow();
    });
  });
});