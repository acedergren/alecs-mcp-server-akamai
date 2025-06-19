import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AkamaiClient } from '../../src/akamai-client';
import {
  importZoneViaAXFR,
  parseZoneFile,
  bulkImportRecords,
  convertZoneToPrimary,
  generateMigrationInstructions
} from '../../src/tools/dns-migration-tools';

// Mock the AkamaiClient
jest.mock('../../src/akamai-client');

// Mock the dns-tools module
jest.mock('../../src/tools/dns-tools', () => ({
  createZone: jest.fn(() => Promise.resolve({
    content: [{ type: 'text', text: 'Zone created' }],
  })),
  upsertRecord: jest.fn(() => Promise.resolve({
    content: [{ type: 'text', text: 'Record created' }],
  })),
  ensureCleanChangeList: jest.fn(() => Promise.resolve()),
}));

describe('DNS Migration Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      request: jest.fn(),
    } as any;
  });

  // Helper to get text content from result and strip ANSI codes
  const getTextContent = (result: any): string => {
    const content = result.content?.[0];
    if (content && 'text' in content) {
      // Strip ANSI escape codes
      return content.text.replace(/\u001b\[[0-9;]*m/g, '');
    }
    return '';
  };

  describe('importZoneViaAXFR', () => {
    it('should import zone via AXFR', async () => {
      // Mock the zone transfer request
      mockClient.request.mockResolvedValueOnce({});

      const result = await importZoneViaAXFR(mockClient, {
        zone: 'example.com',
        masterServer: '192.0.2.1',
        contractId: 'ctr_C-123456',
        groupId: 'grp_12345',
      });

      const text = getTextContent(result);
      expect(text).toContain('Started AXFR import for zone example.com');
      expect(text).toContain('**Master Server:** 192.0.2.1');
      
      // Verify createZone was called (it's mocked)
      const { createZone } = require('../../src/tools/dns-tools');
      expect(createZone).toHaveBeenCalledWith(mockClient, expect.objectContaining({
        zone: 'example.com',
        type: 'SECONDARY',
        masters: ['192.0.2.1'],
      }));
      
      // Verify zone transfer was initiated
      expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
        path: '/config-dns/v2/zones/example.com/zone-transfer',
        method: 'POST',
      }));
    });

    it('should handle TSIG authentication', async () => {
      mockClient.request
        .mockResolvedValueOnce({}) // update zone
        .mockResolvedValueOnce({}); // zone transfer

      const result = await importZoneViaAXFR(mockClient, {
        zone: 'example.com',
        masterServer: '192.0.2.1',
        tsigKey: {
          name: 'transfer-key',
          algorithm: 'hmac-sha256',
          secret: 'base64secret==',
        },
      });

      const text = getTextContent(result);
      expect(text).toContain('**TSIG:** Configured');
      
      // Verify TSIG update
      expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
        path: '/config-dns/v2/zones/example.com',
        method: 'PUT',
        body: expect.objectContaining({
          tsigKey: expect.objectContaining({
            name: 'transfer-key',
          }),
        }),
      }));
    });
  });

  describe('parseZoneFile', () => {
    it('should parse BIND zone file', async () => {
      const zoneFileContent = `
$TTL 3600
@       IN      SOA     ns1.example.com. admin.example.com. (
                        2024010101 ; Serial
                        7200       ; Refresh
                        3600       ; Retry
                        1209600    ; Expire
                        3600 )     ; Minimum TTL

@       IN      NS      ns1.example.com.
@       IN      NS      ns2.example.com.
@       IN      A       192.0.2.1
www     IN      A       192.0.2.2
api     IN      CNAME   www.example.com.
@       IN      MX      10 mail.example.com.
@       IN      TXT     "v=spf1 include:_spf.example.com ~all"
      `;

      const result = await parseZoneFile(mockClient, {
        zone: 'example.com',
        zoneFileContent,
        validateRecords: true,
      });

      const text = getTextContent(result);
      expect(text).toContain('Zone File Migration Plan');
      expect(text).toContain('Total Records:');
      expect(text).toContain('Migrateable:');
      expect(text).toContain('example.com 3600 A 192.0.2.1');
      expect(text).toContain('www.example.com 3600 A 192.0.2.2');
    });

    it('should identify unsupported record types', async () => {
      const zoneFileContent = `
$TTL 3600
@       IN      A       192.0.2.1
_sip._tcp IN    SRV     10 60 5060 sip.example.com.
@       IN      DNSKEY  256 3 8 AwEAAa...
      `;

      const result = await parseZoneFile(mockClient, {
        zone: 'example.com',
        zoneFileContent,
      });

      const text = getTextContent(result);
      expect(text).toContain('Issues Requiring Attention');
    });
  });

  describe('bulkImportRecords', () => {
    it('should bulk import DNS records', async () => {
      mockClient.request
        .mockResolvedValueOnce({}) // add record 1
        .mockResolvedValueOnce({}) // add record 2
        .mockResolvedValueOnce({ // submit changelist
          requestId: 'req_123456',
        });

      const records = [
        {
          name: 'example.com',
          type: 'A',
          ttl: 3600,
          rdata: ['192.0.2.1'],
        },
        {
          name: 'www.example.com',
          type: 'A',
          ttl: 3600,
          rdata: ['192.0.2.2'],
        },
      ];

      const result = await bulkImportRecords(mockClient, {
        zone: 'example.com',
        records,
        comment: 'Initial import',
        skipValidation: true,
      });

      const text = getTextContent(result);
      expect(text).toContain('Bulk Import Results');
      expect(text).toContain('**Successfully Imported:** 2');
      expect(text).toMatch(/\*\*Request ID:\*\* (req_123456|N\/A)/);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
    });

    it('should handle import errors', async () => {
      mockClient.request
        .mockRejectedValueOnce(new Error('Invalid record')) // add record 1 fails
        .mockResolvedValueOnce({}) // add record 2 succeeds
        .mockResolvedValueOnce({ // submit changelist
          requestId: 'req_123456',
        });

      const records = [
        {
          name: 'example.com',
          type: 'INVALID',
          ttl: 3600,
          rdata: ['invalid'],
        },
        {
          name: 'www.example.com',
          type: 'A',
          ttl: 3600,
          rdata: ['192.0.2.2'],
        },
      ];

      const result = await bulkImportRecords(mockClient, {
        zone: 'example.com',
        records,
        skipValidation: true,
      });

      const text = getTextContent(result);
      expect(text).toContain('**Successfully Imported:** 1');
      expect(text).toContain('**Failed:** 1');
      expect(text).toContain('**example.com INVALID:** Invalid record');
    });
  });

  describe('convertZoneToPrimary', () => {
    it('should convert secondary zone to primary', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          zone: 'example.com',
          type: 'SECONDARY',
        })
        .mockResolvedValueOnce({});

      const result = await convertZoneToPrimary(mockClient, {
        zone: 'example.com',
        comment: 'Converting to primary',
      });

      const text = getTextContent(result);
      expect(text).toContain('Successfully converted example.com to PRIMARY zone');
      expect(text).toContain('**Before:** Secondary zone');
      expect(text).toContain('**After:** Primary zone');
      expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'PUT',
        body: expect.objectContaining({
          type: 'PRIMARY',
        }),
      }));
    });

    it('should skip if already primary', async () => {
      mockClient.request.mockResolvedValueOnce({
        zone: 'example.com',
        type: 'PRIMARY',
      });

      const result = await convertZoneToPrimary(mockClient, {
        zone: 'example.com',
      });

      const text = getTextContent(result);
      expect(text).toContain('already a PRIMARY zone');
      expect(mockClient.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateMigrationInstructions', () => {
    it('should generate migration instructions', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          zone: 'example.com',
          type: 'PRIMARY',
        })
        .mockResolvedValueOnce({
          recordsets: [
            { name: 'example.com', type: 'A', ttl: 3600, rdata: ['192.0.2.1'] },
            { name: 'www.example.com', type: 'A', ttl: 3600, rdata: ['192.0.2.2'] },
            { name: 'example.com', type: 'MX', ttl: 3600, rdata: ['10 mail.example.com'] },
          ],
        });

      const result = await generateMigrationInstructions(mockClient, {
        zone: 'example.com',
        currentNameservers: ['ns1.current.com', 'ns2.current.com'],
        estimateDowntime: true,
      });

      const text = getTextContent(result);
      expect(text).toContain('# DNS Migration Instructions');
      expect(text).toContain('## Pre-Migration Checklist');
      expect(text).toContain('3 records found');
      expect(text).toContain('**Current Nameservers:**');
      expect(text).toContain('ns1.current.com');
      expect(text).toContain('**Akamai Nameservers:**');
      expect(text).toContain('use.akadns.net');
      expect(text).toContain('**Expected Downtime:** ZERO');
      expect(text).toContain('## Emergency Rollback');
    });

    it('should work without current nameservers', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          zone: 'example.com',
          type: 'PRIMARY',
        })
        .mockResolvedValueOnce({
          recordsets: [],
        });

      const result = await generateMigrationInstructions(mockClient, {
        zone: 'example.com',
      });

      const text = getTextContent(result);
      expect(text).toContain('DNS Migration Instructions');
      expect(text).not.toContain('Current Nameservers:');
      expect(text).not.toContain('Expected Downtime:');
    });
  });
});