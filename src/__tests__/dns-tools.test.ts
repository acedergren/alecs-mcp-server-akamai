import { jest } from '@jest/globals';
import { listZones, getZone, createZone, listRecords, upsertRecord, deleteRecord } from '../tools/dns-tools';
import { AkamaiClient } from '../akamai-client';

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

  // Helper to get text content from result
  const getTextContent = (result: any): string => {
    const content = result.content[0];
    if (content && 'text' in content) {
      return content.text;
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
        queryParams: undefined
      });

      const text = getTextContent(result);
      expect(text).toContain('2 zones found');
      expect(text).toContain('example.com');
      expect(text).toContain('test.com');
      expect(text).toContain('Primary zone');
      expect(text).toContain('Secondary zone');
    });

    it('should filter zones by search term', async () => {
      mockClient.request.mockResolvedValue({
        zones: [mockZonesResponse.zones[0]]
      });

      const result = await listZones(mockClient, { search: 'example' });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones',
        method: 'GET',
        queryParams: { search: 'example' }
      });

      const text = getTextContent(result);
      expect(text).toContain('1 zones found');
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
        method: 'GET'
      });

      const text = getTextContent(result);
      expect(text).toContain('Zone Details: example.com');
      expect(text).toContain('Type: PRIMARY');
      expect(text).toContain('Status: 🟢 ACTIVE');
      expect(text).toContain('Contract: ctr_1-3CV382');
    });

    it('should handle zone not found', async () => {
      mockClient.request.mockRejectedValue(new Error('404: Zone not found'));

      const result = await getZone(mockClient, { zone: 'nonexistent.com' });

      const text = getTextContent(result);
      expect(text).toContain('Failed to get zone');
      expect(text).toContain('404: Zone not found');
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
        body: {
          zone: 'newzone.com',
          type: 'primary',
          comment: 'New zone for testing',
          contractId: 'ctr_1-3CV382',
          groupId: 'grp_12345',
          signAndServe: false
        }
      });

      const text = getTextContent(result);
      expect(text).toContain('Created DNS zone successfully');
      expect(text).toContain('Zone: newzone.com');
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
        body: {
          zone: 'secondary.com',
          type: 'secondary',
          masters: ['192.0.2.1'],
          signAndServe: false
        }
      });

      const text = getTextContent(result);
      expect(text).toContain('Created DNS zone successfully');
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
        queryParams: undefined
      });

      const text = getTextContent(result);
      expect(text).toContain('3 records found');
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
        queryParams: { types: 'A' }
      });

      const text = getTextContent(result);
      expect(text).toContain('1 records found');
      expect(text).toContain('Type: A');
    });
  });

  describe('upsertRecord', () => {
    it('should create a new A record', async () => {
      mockClient.request.mockResolvedValue({});

      const result = await upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'test.example.com',
        type: 'A',
        ttl: 300,
        rdata: ['192.0.2.100']
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones/example.com/recordsets/A/test.example.com',
        method: 'PUT',
        body: {
          name: 'test.example.com',
          type: 'A',
          ttl: 300,
          rdata: ['192.0.2.100']
        }
      });

      const text = getTextContent(result);
      expect(text).toContain('Successfully created/updated DNS record');
      expect(text).toContain('test.example.com');
      expect(text).toContain('Type: A');
    });

    it('should update an existing CNAME record', async () => {
      mockClient.request.mockResolvedValue({});

      const result = await upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'www.example.com',
        type: 'CNAME',
        ttl: 600,
        rdata: ['example.com.'],
        comment: 'Updated CNAME record'
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones/example.com/recordsets/CNAME/www.example.com',
        method: 'PUT',
        body: {
          name: 'www.example.com',
          type: 'CNAME',
          ttl: 600,
          rdata: ['example.com.']
        }
      });

      const text = getTextContent(result);
      expect(text).toContain('Successfully created/updated DNS record');
    });
  });

  describe('deleteRecord', () => {
    it('should delete a record', async () => {
      mockClient.request.mockResolvedValue({});

      const result = await deleteRecord(mockClient, {
        zone: 'example.com',
        name: 'test.example.com',
        type: 'A'
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/config-dns/v2/zones/example.com/recordsets/A/test.example.com',
        method: 'DELETE'
      });

      const text = getTextContent(result);
      expect(text).toContain('Successfully deleted DNS record');
      expect(text).toContain('test.example.com');
      expect(text).toContain('Type: A');
    });

    it('should handle deletion of non-existent record', async () => {
      mockClient.request.mockRejectedValue(new Error('404: Record not found'));

      const result = await deleteRecord(mockClient, {
        zone: 'example.com',
        name: 'nonexistent.example.com',
        type: 'A'
      });

      const text = getTextContent(result);
      expect(text).toContain('Failed to delete record');
      expect(text).toContain('404: Record not found');
    });
  });
});