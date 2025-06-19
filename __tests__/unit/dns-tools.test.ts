import { jest } from '@jest/globals';
import { listZones, getZone, createZone, listRecords, upsertRecord, deleteRecord } from '../../src/tools/dns-tools';
import { AkamaiClient } from '../../src/akamai-client';

// Mock the AkamaiClient
jest.mock('../akamai-client');

describe('DNS Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = {
      request: jest.fn(),
      getConfig: jest.fn(),
    } as any;
  });

  // Helper to get text content from result and strip ANSI codes
  const getTextContent = (result: any): string => {
    const content = result.content[0];
    if (content && 'text' in content) {
      // Strip ANSI escape codes
      return content.text.replace(/\u001b\[[0-9;]*m/g, '');
    }
    return '';
  };

  describe('listZones', () => {
    const mockZonesResponse = {
      zones: [
        {
          zone: 'example.com',
          type: 'primary',
          comment: 'Primary zone for example.com',
          signAndServe: false,
          contractId: 'ctr_1-3CV382',
          activationState: 'ACTIVE',
          lastActivationDate: '2024-01-15T10:00:00Z',
          lastModifiedDate: '2024-01-15T10:00:00Z',
          versionId: '12345',
          aliases: []
        },
        {
          zone: 'test.com',
          type: 'secondary',
          comment: 'Secondary zone for test.com',
          signAndServe: false,
          contractId: 'ctr_1-3CV382',
          activationState: 'PENDING',
          lastActivationDate: '2024-01-14T10:00:00Z',
          lastModifiedDate: '2024-01-14T10:00:00Z',
          versionId: '12346',
          aliases: []
        }
      ]
    };

    it('should list all zones', async () => {
      mockClient.request.mockResolvedValue(mockZonesResponse);

      const result = await listZones(mockClient, {});

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        queryParams: {}
      });

      const text = getTextContent(result);
      expect(text).toContain('Found 2 DNS zones');
      expect(text).toContain('example.com');
      expect(text).toContain('test.com');
      expect(text).toContain('(primary)');
      expect(text).toContain('(secondary)');
    });

    it('should filter zones by search term', async () => {
      mockClient.request.mockResolvedValue({
        zones: [mockZonesResponse.zones[0]]
      });

      const result = await listZones(mockClient, { search: 'example' });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        queryParams: { search: 'example' }
      });

      const text = getTextContent(result);
      expect(text).toContain('Found 1 DNS zones');
      expect(text).toContain('example.com');
      expect(text).not.toContain('test.com');
    });

    it('should handle empty zones list', async () => {
      mockClient.request.mockResolvedValue({ zones: [] });

      const result = await listZones(mockClient, {});

      const text = getTextContent(result);
      expect(text).toContain('No DNS zones found');
    });
  });

  describe('getZone', () => {
    const mockZoneResponse = {
      zone: 'example.com',
      type: 'primary',
      comment: 'Primary zone for example.com',
      signAndServe: false,
      signAndServeAlgorithm: null,
      tsigKey: null,
      target: null,
      masters: [],
      activationState: 'ACTIVE',
      lastActivationDate: '2024-01-15T10:00:00Z',
      lastModifiedDate: '2024-01-15T10:00:00Z',
      lastModifiedBy: 'user@example.com',
      versionId: '12345',
      contractId: 'ctr_1-3CV382',
      aliases: []
    };

    it('should get zone details', async () => {
      mockClient.request.mockResolvedValue(mockZoneResponse);

      const result = await getZone(mockClient, { zone: 'example.com' });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones/example.com',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const text = getTextContent(result);
      expect(text).toContain('DNS Zone: example.com');
      expect(text).toContain('Type: primary');
      expect(text).toContain('DNSSEC: Disabled');
    });

    it('should handle zone not found', async () => {
      mockClient.request.mockRejectedValue(new Error('404: Zone not found'));

      await expect(getZone(mockClient, { zone: 'nonexistent.com' }))
        .rejects
        .toThrow('404: Zone not found');
    });
  });

  describe('createZone', () => {
    it('should create a primary zone', async () => {
      mockClient.request.mockResolvedValue({
        zone: 'newzone.com',
        type: 'primary',
        contractId: 'ctr_1-3CV382',
        activationState: 'NEW'
      });

      const result = await createZone(mockClient, {
        zone: 'newzone.com',
        type: 'PRIMARY',
        comment: 'New zone for testing',
        contractId: 'ctr_1-3CV382',
        groupId: 'grp_12345'
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: {
          zone: 'newzone.com',
          type: 'PRIMARY',
          comment: 'New zone for testing'
        },
        queryParams: {
          contractId: 'ctr_1-3CV382',
          gid: 'grp_12345'
        }
      });

      const text = getTextContent(result);
      expect(text).toContain('Successfully created DNS zone: newzone.com');
      expect(text).toContain('Type: PRIMARY');
    });

    it('should create a secondary zone with masters', async () => {
      mockClient.request.mockResolvedValue({
        zone: 'secondary.com',
        type: 'secondary',
        masters: ['192.0.2.1']
      });

      const result = await createZone(mockClient, {
        zone: 'secondary.com',
        type: 'SECONDARY',
        masters: ['192.0.2.1']
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: {
          zone: 'secondary.com',
          type: 'SECONDARY',
          comment: undefined,
          masters: ['192.0.2.1']
        },
        queryParams: {}
      });

      const text = getTextContent(result);
      expect(text).toContain('Successfully created DNS zone: secondary.com');
      expect(text).toContain('Type: SECONDARY');
    });
  });

  describe('listRecords', () => {
    const mockRecordsResponse = {
      recordsets: [
        {
          name: 'example.com',
          type: 'A',
          ttl: 300,
          rdata: ['192.0.2.1', '192.0.2.2']
        },
        {
          name: 'www.example.com',
          type: 'CNAME',
          ttl: 300,
          rdata: ['example.com']
        },
        {
          name: 'mail.example.com',
          type: 'MX',
          ttl: 300,
          rdata: ['10 mail.example.com']
        }
      ]
    };

    it('should list all records in a zone', async () => {
      mockClient.request.mockResolvedValue(mockRecordsResponse);

      const result = await listRecords(mockClient, { zone: 'example.com' });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones/example.com/recordsets',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        queryParams: {}
      });

      const text = getTextContent(result);
      expect(text).toContain('Found 3 DNS records in zone example.com');
      expect(text).toContain('example.com');
      expect(text).toContain('www.example.com');
      expect(text).toContain('192.0.2.1');
    });

    it('should filter records by type', async () => {
      mockClient.request.mockResolvedValue({
        recordsets: [mockRecordsResponse.recordsets[0]]
      });

      const result = await listRecords(mockClient, {
        zone: 'example.com',
        types: ['A']
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones/example.com/recordsets',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        queryParams: { types: 'A' }
      });

      const text = getTextContent(result);
      expect(text).toContain('Found 1 DNS records in zone example.com');
      expect(text).toContain('A');
    });
  });

  describe('upsertRecord', () => {
    it('should create a new A record', async () => {
      // Mock changelist workflow
      mockClient.request
        .mockRejectedValueOnce(new Error('404')) // No existing changelist
        .mockResolvedValueOnce({}) // Create new changelist
        .mockResolvedValueOnce({}) // Create/update record
        .mockResolvedValueOnce({ requestId: 'req-123', expiryDate: '2024-01-16T10:00:00Z' }); // Submit changelist

      const result = await upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'test.example.com',
        type: 'A',
        ttl: 300,
        rdata: ['192.0.2.100']
      });

      // Check changelist creation
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/changelists',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        queryParams: { zone: 'example.com' }
      });

      // Check record update
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/changelists/example.com/recordsets/test.example.com/A',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: {
          name: 'test.example.com',
          type: 'A',
          ttl: 300,
          rdata: ['192.0.2.100']
        }
      });

      const text = getTextContent(result);
      expect(text).toContain('Successfully updated DNS record');
      expect(text).toContain('test.example.com');
      expect(text).toContain('192.0.2.100');
    });

    it('should update an existing CNAME record', async () => {
      // Mock changelist workflow
      mockClient.request
        .mockRejectedValueOnce(new Error('404')) // No existing changelist
        .mockResolvedValueOnce({}) // Create new changelist
        .mockResolvedValueOnce({}) // Create/update record
        .mockResolvedValueOnce({ requestId: 'req-124', expiryDate: '2024-01-16T10:00:00Z' }); // Submit changelist

      const result = await upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'www.example.com',
        type: 'CNAME',
        ttl: 600,
        rdata: ['example.com.'],
        comment: 'Updated CNAME record'
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/changelists/example.com/recordsets/www.example.com/CNAME',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: {
          name: 'www.example.com',
          type: 'CNAME',
          ttl: 600,
          rdata: ['example.com.']
        }
      });

      const text = getTextContent(result);
      expect(text).toContain('Successfully updated DNS record');
    });
  });

  describe('deleteRecord', () => {
    it('should delete a record', async () => {
      // Mock changelist workflow
      mockClient.request
        .mockRejectedValueOnce(new Error('404')) // No existing changelist
        .mockResolvedValueOnce({}) // Create new changelist
        .mockResolvedValueOnce({}) // Delete record
        .mockResolvedValueOnce({ requestId: 'req-125', expiryDate: '2024-01-16T10:00:00Z' }); // Submit changelist

      const result = await deleteRecord(mockClient, {
        zone: 'example.com',
        name: 'test.example.com',
        type: 'A'
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/changelists/example.com/recordsets/test.example.com/A',
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      const text = getTextContent(result);
      expect(text).toContain('Successfully deleted DNS record');
      expect(text).toContain('test.example.com');
      expect(text).toContain('A');
    });

    it('should handle deletion of non-existent record', async () => {
      mockClient.request.mockRejectedValue(new Error('404: Record not found'));

      await expect(deleteRecord(mockClient, {
        zone: 'example.com',
        name: 'nonexistent.example.com',
        type: 'A'
      }))
        .rejects
        .toThrow('404: Record not found');
    });
  });
});