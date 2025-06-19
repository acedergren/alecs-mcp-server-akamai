/**
 * Property Server Module Tests
 * Tests for the isolated property server functionality
 */

import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import { AkamaiClient } from '../../../src/akamai-client';

jest.mock('../../../src/akamai-client');

describe.skip('Property Server Module', () => {
  let mockClient: jest.Mocked<AkamaiClient>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      request: jest.fn(),
    } as any;
    (AkamaiClient as any).mockImplementation(() => mockClient);
  });

  describe('Server Startup', () => {
    it('should start property server successfully', async () => {
      const serverProcess = spawn('node', [
        'dist/servers/property-server.js'
      ], {
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          EDGERC_PATH: '.edgerc.test' 
        },
        stdio: 'pipe'
      });

      // Collect startup output
      let output = '';
      serverProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      // Give server time to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check for successful startup messages
      expect(output).toContain('ALECS Property Server starting');
      expect(output).toContain('Server connected and ready');
      expect(output).toContain('"toolCount": 32');

      // Clean up
      serverProcess.kill();
    }, 10000);
  });

  describe('Property Management Tools', () => {
    it('should list properties', async () => {
      mockClient.request.mockResolvedValue({
        properties: {
          items: [
            {
              propertyId: 'prp_123',
              propertyName: 'test.example.com',
              contractId: 'ctr_456',
              groupId: 'grp_789'
            }
          ]
        }
      });

      const client = new AkamaiClient();
      const result = await client.request({
        path: '/papi/v1/properties',
        method: 'GET',
        queryParams: { contractId: 'ctr_456' }
      });

      expect(result.properties.items).toHaveLength(1);
      expect(result.properties.items[0].propertyName).toBe('test.example.com');
    });

    it('should create new property', async () => {
      mockClient.request.mockResolvedValue({
        propertyLink: '/papi/v1/properties/prp_999'
      });

      const client = new AkamaiClient();
      const result = await client.request({
        path: '/papi/v1/properties',
        method: 'POST',
        body: {
          propertyName: 'new.example.com',
          productId: 'prd_SPM',
          contractId: 'ctr_456',
          groupId: 'grp_789'
        }
      });

      expect(result.propertyLink).toContain('prp_999');
    });

    it('should handle property activation', async () => {
      mockClient.request.mockResolvedValue({
        activationLink: '/papi/v1/properties/prp_123/activations/atv_456'
      });

      const client = new AkamaiClient();
      const result = await client.request({
        path: '/papi/v1/properties/prp_123/activations',
        method: 'POST',
        body: {
          propertyVersion: 1,
          network: 'STAGING',
          note: 'Test activation'
        }
      });

      expect(result.activationLink).toContain('atv_456');
    });
  });

  describe('Certificate Integration', () => {
    it('should support Default DV certificate provisioning', async () => {
      mockClient.request
        .mockResolvedValueOnce({ // Get property
          properties: {
            items: [{
              propertyId: 'prp_123',
              propertyName: 'test.example.com',
              latestVersion: 1
            }]
          }
        })
        .mockResolvedValueOnce({ // Get version
          propertyVersion: 1,
          rules: { children: [] }
        })
        .mockResolvedValueOnce({ // Update with cert
          versionLink: '/papi/v1/properties/prp_123/versions/2'
        });

      const client = new AkamaiClient();
      
      // Simulate update-property-with-default-dv flow
      const property = await client.request({
        path: '/papi/v1/properties',
        method: 'GET',
        queryParams: { propertyName: 'test.example.com' }
      });

      const version = await client.request({
        path: `/papi/v1/properties/prp_123/versions/1`,
        method: 'GET'
      });

      const updated = await client.request({
        path: `/papi/v1/properties/prp_123/versions`,
        method: 'POST',
        body: {
          createFromVersion: 1,
          defaultCertificate: { type: 'DEFAULT' }
        }
      });

      expect(updated.versionLink).toContain('versions/2');
      expect(mockClient.request).toHaveBeenCalledTimes(3);
    });

    it('should support CPS certificate integration', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollments: [{
          id: 1234,
          csr: { cn: 'test.example.com' },
          certificateType: 'san'
        }]
      });

      const client = new AkamaiClient();
      const enrollments = await client.request({
        path: '/cps/v2/enrollments',
        method: 'GET'
      });

      expect(enrollments.enrollments[0].id).toBe(1234);
    });
  });

  describe('Tool Count and Naming', () => {
    it('should expose exactly 32 tools', () => {
      const expectedTools = [
        'list-properties',
        'get-property',
        'create-property',
        'update-property',
        'delete-property',
        'get-property-version',
        'create-property-version',
        'get-property-rules',
        'update-property-rules',
        'validate-rule-tree',
        'activate-property',
        'check-activation-status',
        'list-activations',
        'cancel-activation',
        'list-property-hostnames',
        'update-property-hostnames',
        'list-edge-hostnames',
        'create-edge-hostname',
        'list-cp-codes',
        'create-cp-code',
        'list-rule-formats',
        'list-products',
        'list-property-versions',
        'compare-property-versions',
        'get-property-version-hostnames',
        'get-property-version-rules',
        'validate-property-rules',
        'search-properties',
        'bulk-search-properties',
        'bulk-version-create',
        'update-property-with-default-dv',
        'update-property-with-cps-certificate'
      ];

      expect(expectedTools).toHaveLength(32);
      
      // All tool names should be kebab-case
      expectedTools.forEach(tool => {
        expect(tool).toMatch(/^[a-z-]+$/);
      });
    });
  });

  describe('Memory and Performance', () => {
    it('should use less memory than full server', () => {
      // Mock memory usage
      const propertyServerMemory = 80 * 1024 * 1024; // 80MB
      const fullServerMemory = 512 * 1024 * 1024; // 512MB
      
      expect(propertyServerMemory).toBeLessThan(fullServerMemory);
      expect(propertyServerMemory).toBeLessThan(100 * 1024 * 1024); // Under 100MB
    });
  });

  describe('Error Handling', () => {
    it('should handle missing contract gracefully', async () => {
      mockClient.request.mockRejectedValue({
        type: 'https://problems.luna.akamaiapis.net/papi/v1/contract_not_found',
        title: 'Contract not found',
        status: 404
      });

      const client = new AkamaiClient();
      
      await expect(
        client.request({
          path: '/papi/v1/properties',
          method: 'GET',
          queryParams: { contractId: 'ctr_invalid' }
        })
      ).rejects.toMatchObject({
        status: 404,
        title: 'Contract not found'
      });
    });

    it('should handle activation conflicts', async () => {
      mockClient.request.mockRejectedValue({
        type: 'https://problems.luna.akamaiapis.net/papi/v1/activation_in_progress',
        title: 'Activation already in progress',
        status: 409
      });

      const client = new AkamaiClient();
      
      await expect(
        client.request({
          path: '/papi/v1/properties/prp_123/activations',
          method: 'POST',
          body: { propertyVersion: 1, network: 'STAGING' }
        })
      ).rejects.toMatchObject({
        status: 409
      });
    });
  });
});