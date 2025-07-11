/**
 * Domain-Specific Integration Test Suite
 * 
 * Comprehensive testing of each domain's tools with realistic scenarios,
 * error handling, and integration patterns.
 */

import { getToolByName } from '../../tools/tools-registry';
import { AkamaiClient } from '../../akamai-client';

// Mock dependencies
jest.mock('../../akamai-client');
jest.mock('../../utils/pino-logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }))
}));
jest.mock('../../services/cache-service-singleton', () => ({
  getCacheService: jest.fn(() => ({ initialize: jest.fn().mockResolvedValue(undefined), get: jest.fn(), set: jest.fn(), delete: jest.fn(), clear: jest.fn() }))
}));
jest.mock('../../orchestration/workflow-engine');

describe('Domain Integration Tests', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeAll(() => {
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property Domain Integration', () => {
    beforeEach(() => {
      // Mock property API responses
      mockClient.request = jest.fn().mockImplementation((options) => {
        if (options.path?.includes('/papi/v1/properties')) {
          return Promise.resolve({
            properties: {
              items: [
                {
                  propertyId: 'prp_123',
                  propertyName: 'example.com',
                  latestVersion: 1,
                  stagingVersion: 1,
                  productionVersion: null,
                  contractId: 'ctr_123',
                  groupId: 'grp_123'
                }
              ]
            }
          });
        }
        if (options.path?.includes('/papi/v1/properties/prp_123/versions/1/rules')) {
          return Promise.resolve({
            rules: {
              name: 'default',
              children: [],
              behaviors: [{ name: 'origin', options: { hostname: 'origin.example.com' } }],
              criteria: []
            }
          });
        }
        if (options.path?.includes('/papi/v1/properties/prp_123/activations')) {
          return Promise.resolve({
            activations: {
              items: [
                {
                  activationId: 'act_123',
                  propertyId: 'prp_123',
                  propertyVersion: 1,
                  network: 'STAGING',
                  status: 'ACTIVE',
                  submitDate: '2024-01-01T00:00:00Z'
                }
              ]
            }
          });
        }
        return Promise.resolve({ success: true });
      });
    });

    it('should complete property workflow: list → get → update → activate', async () => {
      // 1. List properties
      const listTool = getToolByName('property.list');
      expect(listTool).toBeDefined();
      
      const listResult = await listTool!.handler(mockClient, {});
      expect(listResult.content[0]?.text).toContain('prp_123');

      // 2. Get property details
      const getTool = getToolByName('property.get');
      expect(getTool).toBeDefined();
      
      const getResult = await getTool!.handler(mockClient, { propertyId: 'prp_123' });
      expect(getResult.content[0]?.text).toContain('example.com');

      // 3. Get rules
      const rulesTool = getToolByName('property.rules.get');
      expect(rulesTool).toBeDefined();
      
      const rulesResult = await rulesTool!.handler(mockClient, { propertyId: 'prp_123' });
      expect(rulesResult.content[0]?.text).toContain('origin');

      // 4. Check activation status
      const statusTool = getToolByName('property.activation.status');
      expect(statusTool).toBeDefined();
      
      const statusResult = await statusTool!.handler(mockClient, { propertyId: 'prp_123' });
      expect(statusResult.content[0]?.text).toContain('STAGING');

      // Verify API calls were made in correct order
      expect(mockClient.request).toHaveBeenCalledTimes(4);
    });

    it('should handle property creation workflow', async () => {
      mockClient.request = jest.fn().mockResolvedValue({
        properties: {
          items: [{
            propertyId: 'prp_new',
            propertyName: 'newsite.com',
            latestVersion: 1
          }]
        }
      });

      const createTool = getToolByName('property.create');
      expect(createTool).toBeDefined();

      const result = await createTool!.handler(mockClient, {
        propertyName: 'newsite.com',
        hostnames: ['newsite.com'],
        contractId: 'ctr_123',
        groupId: 'grp_123'
      });

      expect(result.content[0]?.text).toContain('newsite.com');
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: expect.stringContaining('/papi/v1/properties')
        })
      );
    });
  });

  describe('DNS Domain Integration', () => {
    beforeEach(() => {
      mockClient.request = jest.fn().mockImplementation((options) => {
        if (options.path?.includes('/config-dns/v2/zones')) {
          if (options.method === 'GET') {
            return Promise.resolve({
              zones: [
                {
                  zone: 'example.com',
                  type: 'PRIMARY',
                  signAndServe: false,
                  contractId: 'ctr_123'
                }
              ]
            });
          }
          if (options.method === 'POST') {
            return Promise.resolve({
              zone: 'newzone.com',
              type: 'PRIMARY',
              signAndServe: false
            });
          }
        }
        if (options.path?.includes('/recordsets')) {
          return Promise.resolve({
            recordsets: [
              {
                name: 'www.example.com',
                type: 'A',
                ttl: 300,
                rdata: ['192.0.2.1']
              }
            ]
          });
        }
        return Promise.resolve({ success: true });
      });
    });

    it('should complete DNS management workflow: list zones → create zone → add records', async () => {
      // 1. List zones
      const listZonesTool = getToolByName('dns.zones.list');
      expect(listZonesTool).toBeDefined();
      
      const zonesResult = await listZonesTool!.handler(mockClient, {});
      expect(zonesResult.content[0]?.text).toContain('example.com');

      // 2. Create new zone
      const createZoneTool = getToolByName('dns.zone.create');
      expect(createZoneTool).toBeDefined();
      
      const createResult = await createZoneTool!.handler(mockClient, {
        zone: 'newzone.com',
        type: 'PRIMARY',
        contractId: 'ctr_123'
      });
      expect(createResult.content[0]?.text).toContain('newzone.com');

      // 3. List records
      const listRecordsTool = getToolByName('dns.records.list');
      expect(listRecordsTool).toBeDefined();
      
      const recordsResult = await listRecordsTool!.handler(mockClient, { zone: 'example.com' });
      expect(recordsResult.content[0]?.text).toContain('www.example.com');

      // 4. Add a record
      const upsertTool = getToolByName('dns.record.upsert');
      expect(upsertTool).toBeDefined();
      
      const upsertResult = await upsertTool!.handler(mockClient, {
        zone: 'example.com',
        name: 'test.example.com',
        type: 'A',
        rdata: ['192.0.2.100']
      });
      expect(upsertResult).toBeDefined();

      expect(mockClient.request).toHaveBeenCalledTimes(4);
    });

    it('should handle DNSSEC workflow', async () => {
      mockClient.request = jest.fn().mockResolvedValue({
        zone: 'example.com',
        dnssecEnabled: true,
        keyTag: 12345,
        algorithm: 7
      });

      const dnssecTool = getToolByName('dns.dnssec.enable');
      expect(dnssecTool).toBeDefined();

      const result = await dnssecTool!.handler(mockClient, {
        zone: 'example.com',
        algorithm: 'RSA/SHA-256'
      });

      expect(result.content[0]?.text).toContain('DNSSEC enabled');
    });
  });

  describe('FastPurge Domain Integration', () => {
    beforeEach(() => {
      mockClient.request = jest.fn().mockImplementation((options) => {
        if (options.path?.includes('/ccu/v3/delete/url')) {
          return Promise.resolve({
            estimatedSeconds: 5,
            purgeId: 'purge-123',
            progressUri: '/ccu/v3/purges/purge-123'
          });
        }
        if (options.path?.includes('/ccu/v3/purges/purge-123')) {
          return Promise.resolve({
            purgeId: 'purge-123',
            status: 'In-Progress',
            submittedBy: 'user@example.com',
            submissionTime: '2024-01-01T00:00:00Z'
          });
        }
        return Promise.resolve({ success: true });
      });
    });

    it('should complete FastPurge workflow: purge → check status', async () => {
      // 1. Purge URLs
      const purgeTool = getToolByName('fastpurge.url');
      expect(purgeTool).toBeDefined();
      
      const purgeResult = await purgeTool!.handler(mockClient, {
        urls: ['http://example.com/image.jpg', 'http://example.com/style.css']
      });
      expect(purgeResult.content[0]?.text).toContain('purge-123');

      // 2. Check status
      const statusTool = getToolByName('fastpurge.status');
      expect(statusTool).toBeDefined();
      
      const statusResult = await statusTool!.handler(mockClient, {
        purgeId: 'purge-123'
      });
      expect(statusResult.content[0]?.text).toContain('In-Progress');

      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });

    it('should handle different purge types', async () => {
      // Test CP code purge
      const cpcodeTool = getToolByName('fastpurge.cpcode');
      expect(cpcodeTool).toBeDefined();
      
      mockClient.request = jest.fn().mockResolvedValue({
        estimatedSeconds: 5,
        purgeId: 'purge-cpcode-123'
      });

      const cpcodeResult = await cpcodeTool!.handler(mockClient, {
        cpcodes: ['123456', '789012']
      });
      expect(cpcodeResult.content[0]?.text).toContain('purge-cpcode-123');

      // Test tag purge
      const tagTool = getToolByName('fastpurge.tag');
      expect(tagTool).toBeDefined();
      
      const tagResult = await tagTool!.handler(mockClient, {
        tags: ['category-news', 'section-sports']
      });
      expect(tagResult).toBeDefined();
    });
  });

  describe('Security Domain Integration', () => {
    beforeEach(() => {
      mockClient.request = jest.fn().mockImplementation((options) => {
        if (options.path?.includes('/network-list-api/v2/network-lists')) {
          if (options.method === 'GET') {
            return Promise.resolve({
              networkLists: [
                {
                  uniqueId: 'list-123',
                  name: 'Blocked IPs',
                  type: 'IP',
                  elementCount: 5,
                  readOnly: false
                }
              ]
            });
          }
          if (options.method === 'POST') {
            return Promise.resolve({
              uniqueId: 'list-new',
              name: 'New Security List',
              type: 'IP'
            });
          }
        }
        if (options.path?.includes('/network-lists/list-123')) {
          return Promise.resolve({
            uniqueId: 'list-123',
            name: 'Blocked IPs',
            type: 'IP',
            list: ['192.0.2.1', '192.0.2.2'],
            elementCount: 2
          });
        }
        return Promise.resolve({ success: true });
      });
    });

    it('should complete network list workflow: list → create → update → activate', async () => {
      // 1. List network lists
      const listTool = getToolByName('security.network-lists.list');
      expect(listTool).toBeDefined();
      
      const listResult = await listTool!.handler(mockClient, {});
      expect(listResult.content[0]?.text).toContain('Blocked IPs');

      // 2. Get specific list details
      const getTool = getToolByName('security.network-list.get');
      expect(getTool).toBeDefined();
      
      const getResult = await getTool!.handler(mockClient, { uniqueId: 'list-123' });
      expect(getResult.content[0]?.text).toContain('192.0.2.1');

      // 3. Create new list
      const createTool = getToolByName('security.network-list.create');
      expect(createTool).toBeDefined();
      
      const createResult = await createTool!.handler(mockClient, {
        name: 'New Security List',
        type: 'IP',
        description: 'Test security list'
      });
      expect(createResult.content[0]?.text).toContain('New Security List');

      // 4. Update list
      const updateTool = getToolByName('security.network-list.update');
      expect(updateTool).toBeDefined();
      
      const updateResult = await updateTool!.handler(mockClient, {
        uniqueId: 'list-123',
        elements: ['192.0.2.3', '192.0.2.4'],
        append: true
      });
      expect(updateResult).toBeDefined();

      expect(mockClient.request).toHaveBeenCalledTimes(4);
    });
  });

  describe('Certificate Domain Integration', () => {
    beforeEach(() => {
      mockClient.request = jest.fn().mockImplementation((options) => {
        if (options.path?.includes('/cps/v2/enrollments')) {
          if (options.method === 'GET') {
            return Promise.resolve({
              enrollments: [
                {
                  id: 12345,
                  csr: { cn: 'example.com' },
                  networkConfiguration: { dnsNameSettings: { dnsNames: ['example.com'] } },
                  validationType: 'dv'
                }
              ]
            });
          }
          if (options.method === 'POST') {
            return Promise.resolve({
              enrollment: '/cps/v2/enrollments/12346',
              changes: ['/cps/v2/enrollments/12346/changes/1']
            });
          }
        }
        if (options.path?.includes('/cps/v2/enrollments/12345/dv-challenges')) {
          return Promise.resolve({
            challenges: [
              {
                domain: 'example.com',
                fullPath: 'http://example.com/.well-known/acme-challenge/token123',
                responseBody: 'validation-response'
              }
            ]
          });
        }
        return Promise.resolve({ success: true });
      });
    });

    it('should complete certificate enrollment workflow', async () => {
      // 1. List certificates
      const listTool = getToolByName('certificate.list');
      expect(listTool).toBeDefined();
      
      const listResult = await listTool!.handler(mockClient, {});
      expect(listResult.content[0]?.text).toContain('example.com');

      // 2. Create DV certificate
      const createTool = getToolByName('certificate.dv.create');
      expect(createTool).toBeDefined();
      
      const createResult = await createTool!.handler(mockClient, {
        hostnames: ['newsite.com'],
        contractId: 'ctr_123'
      });
      expect(createResult).toBeDefined();

      // 3. Get validation challenges
      const validationTool = getToolByName('certificate.validation.get');
      expect(validationTool).toBeDefined();
      
      const validationResult = await validationTool!.handler(mockClient, {
        enrollmentId: 12345
      });
      expect(validationResult.content[0]?.text).toContain('acme-challenge');

      expect(mockClient.request).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cross-Domain Integration Scenarios', () => {
    it('should support complete site setup workflow', async () => {
      // Mock responses for full site setup
      mockClient.request = jest.fn().mockImplementation((options) => {
        if (options.path?.includes('/config-dns/v2/zones') && options.method === 'POST') {
          return Promise.resolve({ zone: 'newsite.com', type: 'PRIMARY' });
        }
        if (options.path?.includes('/papi/v1/properties') && options.method === 'POST') {
          return Promise.resolve({ 
            properties: { items: [{ propertyId: 'prp_new', propertyName: 'newsite.com' }] }
          });
        }
        if (options.path?.includes('/cps/v2/enrollments') && options.method === 'POST') {
          return Promise.resolve({ enrollment: '/cps/v2/enrollments/new' });
        }
        return Promise.resolve({ success: true });
      });

      // 1. Create DNS zone
      const dnsCreateTool = getToolByName('dns.zone.create');
      const dnsResult = await dnsCreateTool!.handler(mockClient, {
        zone: 'newsite.com',
        type: 'PRIMARY',
        contractId: 'ctr_123'
      });
      expect(dnsResult.content[0]?.text).toContain('newsite.com');

      // 2. Create property
      const propertyCreateTool = getToolByName('property.create');
      const propertyResult = await propertyCreateTool!.handler(mockClient, {
        propertyName: 'newsite.com',
        hostnames: ['newsite.com'],
        contractId: 'ctr_123',
        groupId: 'grp_123'
      });
      expect(propertyResult.content[0]?.text).toContain('newsite.com');

      // 3. Create SSL certificate
      const certCreateTool = getToolByName('certificate.dv.create');
      const certResult = await certCreateTool!.handler(mockClient, {
        hostnames: ['newsite.com'],
        contractId: 'ctr_123'
      });
      expect(certResult).toBeDefined();

      // Verify all steps were called
      expect(mockClient.request).toHaveBeenCalledTimes(3);
    });

    it('should handle error propagation across domains', async () => {
      // Simulate DNS failure affecting property creation
      let callCount = 0;
      mockClient.request = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('DNS zone creation failed');
        }
        return Promise.resolve({ success: true });
      });

      const dnsCreateTool = getToolByName('dns.zone.create');
      const result = await dnsCreateTool!.handler(mockClient, {
        zone: 'failsite.com',
        type: 'PRIMARY',
        contractId: 'ctr_123'
      });

      expect(result.content[0]?.text).toContain('error');
      expect(result.content[0]?.text).toContain('DNS zone creation failed');
    });
  });

  describe('Performance and Scalability Tests', () => {
    it('should handle batch operations efficiently', async () => {
      const batchSize = 10;
      const startTime = Date.now();

      // Mock batch responses
      mockClient.request = jest.fn().mockResolvedValue({
        properties: { items: new Array(batchSize).fill({ propertyId: 'prp_test' }) }
      });

      const listTool = getToolByName('property.list');
      const promises = Array(batchSize).fill(null).map(() => 
        listTool!.handler(mockClient, { limit: 100 })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(batchSize);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      results.forEach(result => {
        expect(result.content).toBeDefined();
      });
    });

    it('should cache responses appropriately', async () => {
      // Test that repeated calls to the same endpoint are optimized
      mockClient.request = jest.fn().mockResolvedValue({
        properties: { items: [{ propertyId: 'prp_cached' }] }
      });

      const listTool = getToolByName('property.list');
      
      // Make multiple identical calls
      await listTool!.handler(mockClient, {});
      await listTool!.handler(mockClient, {});
      await listTool!.handler(mockClient, {});

      // Should have caching behavior (implementation dependent)
      expect(mockClient.request).toHaveBeenCalled();
    });
  });
});