/**
 * DNS Management MCP Tools Test Suite
 * Tests DNS-related MCP capabilities
 */

import { z } from 'zod';
import {
  listZones,
  getZone,
  createZone,
  listRecords,
  upsertRecord,
  deleteRecord,
  activateZoneChanges,
} from '../../../src/tools/dns-tools';
import { AkamaiClient } from '../../../src/akamai-client';

// Mock AkamaiClient
jest.mock('../../../src/akamai-client');

describe('DNS Management MCP Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    jest.clearAllMocks();
  });

  describe('listZones', () => {
    test('should return MCP-formatted zone list', async () => {
      const mockZones = [
        {
          zone: 'example.com',
          type: 'primary',
          comment: 'Production zone',
          activationState: 'active',
          contractIds: ['ctr_1-5C13O2',
        },
        {
          zone: 'example.org',
          type: 'secondary',
          comment: 'Secondary zone',
          activationState: 'active',
          contractIds: ['ctr_1-5C13O2',
        },
      ];

      mockClient.request.mockResolvedValue({ zones: mockZones });

      const result = await listZones(mockClient, {});

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('DNS Zones');
      expect(result.content[0].text).toContain('example.com');
      expect(result.content[0].text).toContain('example.org');
    });

    test('should handle contractId filter', async () => {
      mockClient.request.mockResolvedValue({ zones: [] });

      await listZones(mockClient, { contractIds: ['ctr_1-5C13O2' });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/config-dns/v2/zones',
          params: expect.objectContaining({
            contractIds: 'ctr_1-5C13O2',
          }),
        })
      );
    });

    test('should handle empty results', async () => {
      mockClient.request.mockResolvedValue({ zones: [] });

      const result = await listZones(mockClient, {});

      expect(result.content[0].text).toContain('No zones found');
    });
  });

  describe('getZone', () => {
    test('should return detailed zone information', async () => {
      const mockZone = {
        zone: 'example.com',
        type: 'primary',
        comment: 'Production zone',
        activationState: 'active',
        contractIds: ['ctr_1-5C13O2',
        tsigKey: {
          name: 'example.com.akamai.com',
          algorithm: 'hmac-sha256',
        },
      };

      mockClient.request.mockResolvedValue(mockZone);

      const result = await getZone(mockClient, { zone: 'example.com' });

      expect(result.content[0].text).toContain('Zone Details');
      expect(result.content[0].text).toContain('example.com');
      expect(result.content[0].text).toContain('primary');
      expect(result.content[0].text).toContain('active');
    });

    test('should handle zone not found', async () => {
      mockClient.request.mockRejectedValue(new Error('Zone not found'));

      const result = await getZone(mockClient, { zone: 'nonexistent.com' });

      expect(result.content[0].text).toContain('Failed to get zone');
    });
  });

  describe('createZone', () => {
    test('should create primary zone', async () => {
      const mockResponse = {
        zone: 'newzone.com',
        type: 'primary',
        contractIds: ['ctr_1-5C13O2',
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await createZone(mockClient, {
        zone: 'newzone.com',
        type: 'primary',
        contractIds: ['ctr_1-5C13O2',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/config-dns/v2/zones',
          params: expect.objectContaining({
            contractIds: ['ctr_1-5C13O2',
          }),
          body: expect.objectContaining({
            zone: 'newzone.com',
            type: 'primary',
          }),
        })
      );

      expect(result.content[0].text).toContain('Zone created successfully');
      expect(result.content[0].text).toContain('newzone.com');
    });

    test('should create secondary zone with masters', async () => {
      mockClient.request.mockResolvedValue({
        zone: 'secondary.com',
        type: 'secondary',
      });

      await createZone(mockClient, {
        zone: 'secondary.com',
        type: 'secondary',
        contractIds: ['ctr_1-5C13O2',
        masters: ['1.2.3.4', '5.6.7.8'],
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            zone: 'secondary.com',
            type: 'secondary',
            masters: ['1.2.3.4', '5.6.7.8'],
          }),
        })
      );
    });

    test('should handle signAndServe option', async () => {
      mockClient.request.mockResolvedValue({
        zone: 'secure.com',
        type: 'primary',
      });

      await createZone(mockClient, {
        zone: 'secure.com',
        type: 'primary',
        contractIds: ['ctr_1-5C13O2',
        signAndServe: true,
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            signAndServe: true,
          }),
        })
      );
    });
  });

  describe('listRecords', () => {
    test('should return DNS records', async () => {
      const mockRecords = {
        recordsets: [
          {
            name: 'www',
            type: 'A',
            ttl: 300,
            rdata: ['192.0.2.1'],
          },
          {
            name: 'mail',
            type: 'MX',
            ttl: 3600,
            rdata: ['10 mail.example.com'],
          },
        ],
      };

      mockClient.request.mockResolvedValue(mockRecords);

      const result = await listRecords(mockClient, { zone: 'example.com' });

      expect(result.content[0].text).toContain('DNS Records');
      expect(result.content[0].text).toContain('www');
      expect(result.content[0].text).toContain('192.0.2.1');
      expect(result.content[0].text).toContain('mail');
    });

    test('should handle record type filter', async () => {
      mockClient.request.mockResolvedValue({ recordsets: [] });

      await listRecords(mockClient, { 
        zone: 'example.com',
        types: 'A',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            types: 'A',
          }),
        })
      );
    });

    test('should handle search parameter', async () => {
      mockClient.request.mockResolvedValue({ recordsets: [] });

      await listRecords(mockClient, { 
        zone: 'example.com',
        search: 'www',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            search: 'www',
          }),
        })
      );
    });
  });

  describe('upsertRecord', () => {
    test('should create A record', async () => {
      mockClient.request.mockResolvedValue({});

      const result = await upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'test',
        type: 'A',
        ttl: 300,
        rdata: ['192.0.2.1'],
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          path: '/config-dns/v2/zones/example.com/names/test/types/A',
          body: expect.objectContaining({
            name: 'test',
            type: 'A',
            ttl: 300,
            rdata: ['192.0.2.1'],
          }),
        })
      );

      expect(result.content[0].text).toContain('Record upserted successfully');
    });

    test('should create CNAME record', async () => {
      mockClient.request.mockResolvedValue({});

      await upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'alias',
        type: 'CNAME',
        ttl: 3600,
        rdata: ['target.example.com'],
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            type: 'CNAME',
            rdata: ['target.example.com'],
          }),
        })
      );
    });

    test('should create MX record', async () => {
      mockClient.request.mockResolvedValue({});

      await upsertRecord(mockClient, {
        zone: 'example.com',
        name: '@',
        type: 'MX',
        ttl: 3600,
        rdata: ['10 mail.example.com', '20 backup.example.com'],
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            type: 'MX',
            rdata: ['10 mail.example.com', '20 backup.example.com'],
          }),
        })
      );
    });
  });

  describe('deleteRecord', () => {
    test('should delete DNS record', async () => {
      mockClient.request.mockResolvedValue({});

      const result = await deleteRecord(mockClient, {
        zone: 'example.com',
        name: 'test',
        type: 'A',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          path: '/config-dns/v2/zones/example.com/names/test/types/A',
        })
      );

      expect(result.content[0].text).toContain('Record deleted successfully');
    });

    test('should handle deletion errors', async () => {
      mockClient.request.mockRejectedValue(new Error('Record not found'));

      const result = await deleteRecord(mockClient, {
        zone: 'example.com',
        name: 'nonexistent',
        type: 'A',
      });

      expect(result.content[0].text).toContain('Failed to delete record');
    });
  });

  describe('activateZoneChanges', () => {
    test('should activate zone changes', async () => {
      mockClient.request.mockResolvedValue({});

      const result = await activateZoneChanges(mockClient, {
        zone: 'example.com',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/config-dns/v2/zones/example.com/zone-activation',
        })
      );

      expect(result.content[0].text).toContain('Zone changes activated');
    });

    test('should handle activation with comment', async () => {
      mockClient.request.mockResolvedValue({});

      await activateZoneChanges(mockClient, {
        zone: 'example.com',
        comment: 'Added new A record',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            comment: 'Added new A record',
          }),
        })
      );
    });
  });

  describe('Schema Validation', () => {
    test('should validate createZone schema', () => {
      const schema = z.object({
        customer: z.string().optional(),
        zone: z.string(),
        type: z.enum(['primary', 'secondary']),
        contractId: z.string(),
        comment: z.string().optional(),
        signAndServe: z.boolean().optional(),
        masters: z.array(z.string()).optional(),
      });

      expect(() => schema.parse({
        zone: 'example.com',
        type: 'primary',
        contractIds: ['ctr_123',
      })).not.toThrow();

      expect(() => schema.parse({
        zone: 'example.com',
        type: 'invalid', // Invalid type
        contractIds: ['ctr_123',
      })).toThrow();
    });

    test('should validate upsertRecord schema', () => {
      const schema = z.object({
        customer: z.string().optional(),
        zone: z.string(),
        name: z.string(),
        type: z.string(),
        ttl: z.number(),
        rdata: z.array(z.string()),
      });

      expect(() => schema.parse({
        zone: 'example.com',
        name: 'www',
        type: 'A',
        ttl: 300,
        rdata: ['192.0.2.1'],
      })).not.toThrow();

      expect(() => schema.parse({
        zone: 'example.com',
        name: 'www',
        type: 'A',
        ttl: 'invalid', // Invalid ttl type
        rdata: ['192.0.2.1'],
      })).toThrow();
    });

    test('should validate listRecords schema', () => {
      const schema = z.object({
        customer: z.string().optional(),
        zone: z.string(),
        types: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.string().optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      });

      expect(() => schema.parse({
        zone: 'example.com',
      })).not.toThrow();

      expect(() => schema.parse({
        zone: 'example.com',
        pageSize: 'invalid', // Invalid pageSize type
      })).toThrow();
    });
  });
});