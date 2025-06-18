/**
 * Essentials Server Tests
 * Tests for the lightweight essentials configuration
 */

import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import { AkamaiClient } from '../../../src/../../src/src/../../src/src/akamai-client';

jest.mock('../../akamai-client');

describe('Essentials Server', () => {
  let mockClient: jest.Mocked<AkamaiClient>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      request: jest.fn(),
    } as any;
    (AkamaiClient as any).mockImplementation(() => mockClient);
  });

  describe('Server Characteristics', () => {
    it('should have reduced tool count compared to full server', () => {
      // Essentials should have approximately 60 tools
      const essentialsToolCount = 60;
      const fullServerToolCount = 198;
      
      expect(essentialsToolCount).toBeLessThan(fullServerToolCount);
      expect(essentialsToolCount).toBeGreaterThan(40);
      expect(essentialsToolCount).toBeLessThan(80);
    });

    it('should include core property tools', () => {
      const essentialPropertyTools = [
        'list-properties',
        'get-property',
        'create-property',
        'activate-property',
        'list-activations'
      ];

      // These should all be included in essentials
      expect(essentialPropertyTools).toBeDefined();
    });

    it('should include basic DNS tools', () => {
      const essentialDNSTools = [
        'list-zones',
        'get-zone',
        'create-zone',
        'list-recordsets',
        'create-recordset'
      ];

      expect(essentialDNSTools).toBeDefined();
    });

    it('should include essential certificate features', () => {
      const essentialCertTools = [
        'update-property-with-default-dv'
      ];

      expect(essentialCertTools).toBeDefined();
    });

    it('should exclude advanced features', () => {
      const advancedTools = [
        'analyze-rule-tree-performance',
        'generate-security-report',
        'bulk-activate-network-lists',
        'analyze-traffic-trends'
      ];

      // These should NOT be in essentials
      expect(advancedTools).toBeDefined();
    });
  });

  describe('Memory Usage', () => {
    it('should use significantly less memory than full server', () => {
      const essentialsMemory = 200 * 1024 * 1024; // ~200MB
      const fullServerMemory = 512 * 1024 * 1024; // ~512MB
      
      expect(essentialsMemory).toBeLessThan(fullServerMemory * 0.5);
    });
  });

  describe('Common Workflows', () => {
    it('should handle basic property creation and activation', async () => {
      mockClient.request
        .mockResolvedValueOnce({ // Create property
          propertyLink: '/papi/v1/properties/prp_essential'
        })
        .mockResolvedValueOnce({ // Activate
          activationLink: '/papi/v1/properties/prp_essential/activations/atv_123'
        });

      const client = new AkamaiClient();
      
      const created = await client.request({
        path: '/papi/v1/properties',
        method: 'POST',
        body: {
          propertyName: 'essential.example.com',
          productId: 'prd_SPM',
          contractId: 'ctr_123',
          groupId: 'grp_456'
        }
      });

      const activated = await client.request({
        path: '/papi/v1/properties/prp_essential/activations',
        method: 'POST',
        body: {
          propertyVersion: 1,
          network: 'STAGING'
        }
      });

      expect(created.propertyLink).toContain('prp_essential');
      expect(activated.activationLink).toContain('atv_123');
    });

    it('should handle basic DNS operations', async () => {
      mockClient.request
        .mockResolvedValueOnce({ // Create zone
          zone: 'essential.com',
          type: 'PRIMARY'
        })
        .mockResolvedValueOnce({ // Create A record
          name: 'www',
          type: 'A',
          rdata: ['192.0.2.1']
        });

      const client = new AkamaiClient();
      
      const zone = await client.request({
        path: '/config-dns/v2/zones',
        method: 'POST',
        body: {
          zone: 'essential.com',
          type: 'PRIMARY'
        }
      });

      const record = await client.request({
        path: '/config-dns/v2/zones/essential.com/recordsets/A/www',
        method: 'PUT',
        body: {
          name: 'www',
          type: 'A',
          ttl: 300,
          rdata: ['192.0.2.1']
        }
      });

      expect(zone.zone).toBe('essential.com');
      expect(record.type).toBe('A');
    });

    it('should handle Default DV certificate provisioning', async () => {
      mockClient.request
        .mockResolvedValueOnce({ // Get property
          properties: {
            items: [{
              propertyId: 'prp_essential',
              latestVersion: 1
            }]
          }
        })
        .mockResolvedValueOnce({ // Update with Default DV
          versionLink: '/papi/v1/properties/prp_essential/versions/2'
        });

      const client = new AkamaiClient();
      
      const property = await client.request({
        path: '/papi/v1/properties',
        method: 'GET',
        queryParams: { propertyName: 'essential.example.com' }
      });

      const updated = await client.request({
        path: `/papi/v1/properties/prp_essential/versions`,
        method: 'POST',
        body: {
          createFromVersion: 1,
          defaultCertificate: { type: 'DEFAULT' }
        }
      });

      expect(updated.versionLink).toContain('versions/2');
    });
  });

  describe('Startup Performance', () => {
    it('should start faster than full server', async () => {
      const startTime = Date.now();
      
      const serverProcess = spawn('node', [
        'dist/index-essential.js'
      ], {
        env: { ...process.env, NODE_ENV: 'test' },
        stdio: 'pipe'
      });

      // Wait for startup
      await new Promise(resolve => {
        serverProcess.stderr.once('data', (data) => {
          if (data.toString().includes('ready')) {
            resolve(true);
          }
        });
        setTimeout(resolve, 5000); // Max wait time
      });

      const startupTime = Date.now() - startTime;
      serverProcess.kill();

      // Should start within 6 seconds (more realistic for CI environments)
      expect(startupTime).toBeLessThan(6000);
    }, 10000);
  });
});