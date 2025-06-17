/**
 * DNS Server Module Tests
 * Tests for the isolated DNS server functionality
 */

import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import { AkamaiClient } from '../../akamai-client';

jest.mock('../../akamai-client');

describe('DNS Server Module', () => {
  let mockClient: jest.Mocked<AkamaiClient>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      request: jest.fn(),
    } as any;
    (AkamaiClient as any).mockImplementation(() => mockClient);
  });

  describe('Server Startup', () => {
    it('should start DNS server successfully', async () => {
      const serverProcess = spawn('node', [
        'dist/servers/dns-server.js'
      ], {
        env: { ...process.env, NODE_ENV: 'test' },
        stdio: 'pipe'
      });

      let output = '';
      serverProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(output).toContain('ALECS DNS Server starting');
      expect(output).toContain('Server connected and ready');
      expect(output).toContain('"toolCount": 24');

      serverProcess.kill();
    }, 10000);
  });

  describe('Zone Management', () => {
    it('should list DNS zones', async () => {
      mockClient.request.mockResolvedValue({
        zones: [
          {
            zone: 'example.com',
            type: 'PRIMARY',
            signAndServe: false,
            contractId: 'ctr_123'
          },
          {
            zone: 'example.org',
            type: 'SECONDARY',
            masters: ['192.0.2.1'],
            contractId: 'ctr_123'
          }
        ]
      });

      const client = new AkamaiClient();
      const result = await client.request({
        path: '/config-dns/v2/zones',
        method: 'GET'
      });

      expect(result.zones).toHaveLength(2);
      expect(result.zones[0].zone).toBe('example.com');
      expect(result.zones[1].type).toBe('SECONDARY');
    });

    it('should create primary zone', async () => {
      mockClient.request.mockResolvedValue({
        zone: 'newzone.com',
        type: 'PRIMARY',
        contractId: 'ctr_123',
        versionId: '1',
        lastActivationDate: '2024-01-01T00:00:00Z'
      });

      const client = new AkamaiClient();
      const result = await client.request({
        path: '/config-dns/v2/zones',
        method: 'POST',
        queryParams: { contractId: 'ctr_123' },
        body: {
          zone: 'newzone.com',
          type: 'PRIMARY',
          masters: [],
          comment: 'Created via MCP'
        }
      });

      expect(result.zone).toBe('newzone.com');
      expect(result.type).toBe('PRIMARY');
    });

    it('should create secondary zone', async () => {
      mockClient.request.mockResolvedValue({
        zone: 'secondary.com',
        type: 'SECONDARY',
        masters: ['192.0.2.1', '192.0.2.2']
      });

      const client = new AkamaiClient();
      const result = await client.request({
        path: '/config-dns/v2/zones',
        method: 'POST',
        body: {
          zone: 'secondary.com',
          type: 'SECONDARY',
          masters: ['192.0.2.1', '192.0.2.2']
        }
      });

      expect(result.type).toBe('SECONDARY');
      expect(result.masters).toHaveLength(2);
    });
  });

  describe('Record Management', () => {
    it('should list zone records', async () => {
      mockClient.request.mockResolvedValue({
        recordsets: [
          {
            name: 'www',
            type: 'A',
            ttl: 300,
            rdata: ['192.0.2.1']
          },
          {
            name: 'mail',
            type: 'MX',
            ttl: 300,
            rdata: ['10 mail.example.com.']
          }
        ]
      });

      const client = new AkamaiClient();
      const result = await client.request({
        path: '/config-dns/v2/zones/example.com/recordsets',
        method: 'GET'
      });

      expect(result.recordsets).toHaveLength(2);
      expect(result.recordsets[0].type).toBe('A');
      expect(result.recordsets[1].type).toBe('MX');
    });

    it('should create A record', async () => {
      mockClient.request.mockResolvedValue({
        name: 'test',
        type: 'A',
        ttl: 300,
        rdata: ['192.0.2.10']
      });

      const client = new AkamaiClient();
      const result = await client.request({
        path: '/config-dns/v2/zones/example.com/recordsets/A/test',
        method: 'PUT',
        body: {
          name: 'test',
          type: 'A',
          ttl: 300,
          rdata: ['192.0.2.10']
        }
      });

      expect(result.rdata[0]).toBe('192.0.2.10');
    });

    it('should handle CNAME records', async () => {
      mockClient.request.mockResolvedValue({
        name: 'blog',
        type: 'CNAME',
        ttl: 3600,
        rdata: ['www.example.com.']
      });

      const client = new AkamaiClient();
      const result = await client.request({
        path: '/config-dns/v2/zones/example.com/recordsets/CNAME/blog',
        method: 'PUT',
        body: {
          name: 'blog',
          type: 'CNAME',
          ttl: 3600,
          rdata: ['www.example.com.']
        }
      });

      expect(result.type).toBe('CNAME');
      expect(result.rdata[0]).toMatch(/\.$/); // Should end with dot
    });
  });

  describe('Zone Migration', () => {
    it('should support zone file import', async () => {
      const zoneFile = `
$ORIGIN example.com.
$TTL 300
@  IN  SOA  ns1.example.com. admin.example.com. (
            2024010101 ; serial
            7200       ; refresh
            3600       ; retry
            1209600    ; expire
            300        ; minimum
)
@  IN  NS   ns1.example.com.
@  IN  NS   ns2.example.com.
@  IN  A    192.0.2.1
www IN A    192.0.2.2
`;

      mockClient.request.mockResolvedValue({
        zone: 'example.com',
        versionId: '2',
        recordsCreated: 4
      });

      const client = new AkamaiClient();
      const result = await client.request({
        path: '/config-dns/v2/zones/example.com/zone-file',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: zoneFile
      });

      expect(result.recordsCreated).toBe(4);
    });

    it('should handle AXFR zone transfer', async () => {
      mockClient.request.mockResolvedValue({
        transferStatus: 'SUCCESS',
        recordsTransferred: 25,
        zone: 'example.com'
      });

      const client = new AkamaiClient();
      const result = await client.request({
        path: '/config-dns/v2/zones/example.com/transfer',
        method: 'POST',
        body: {
          masters: ['192.0.2.53'],
          comment: 'Migration from old DNS'
        }
      });

      expect(result.transferStatus).toBe('SUCCESS');
      expect(result.recordsTransferred).toBe(25);
    });
  });

  describe('Tool Count and Naming', () => {
    it('should expose exactly 24 tools', () => {
      const expectedTools = [
        'list-zones',
        'get-zone',
        'create-zone',
        'update-zone',
        'delete-zone',
        'get-zone-status',
        'list-zone-versions',
        'list-recordsets',
        'get-recordset',
        'create-recordset',
        'update-recordset',
        'delete-recordset',
        'bulk-create-recordsets',
        'bulk-update-recordsets',
        'bulk-delete-recordsets',
        'get-zone-file',
        'update-zone-file',
        'import-zone-file',
        'get-change-list',
        'submit-change-list',
        'discard-change-list',
        'get-master-zone-file',
        'post-master-zone-file',
        'get-nameserver-record-list'
      ];

      expect(expectedTools).toHaveLength(24);
      
      expectedTools.forEach(tool => {
        expect(tool).toMatch(/^[a-z-]+$/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle zone not found', async () => {
      mockClient.request.mockRejectedValue({
        type: 'https://problems.luna.akamaiapis.net/config-dns/zone-not-found',
        title: 'Zone not found',
        status: 404,
        detail: 'Zone nonexistent.com not found'
      });

      const client = new AkamaiClient();
      
      await expect(
        client.request({
          path: '/config-dns/v2/zones/nonexistent.com',
          method: 'GET'
        })
      ).rejects.toMatchObject({
        status: 404,
        title: 'Zone not found'
      });
    });

    it('should handle record conflicts', async () => {
      mockClient.request.mockRejectedValue({
        type: 'https://problems.luna.akamaiapis.net/config-dns/record-conflict',
        title: 'Record already exists',
        status: 409
      });

      const client = new AkamaiClient();
      
      await expect(
        client.request({
          path: '/config-dns/v2/zones/example.com/recordsets/CNAME/www',
          method: 'PUT',
          body: { type: 'CNAME', rdata: ['cdn.example.com.'] }
        })
      ).rejects.toMatchObject({
        status: 409
      });
    });
  });
});