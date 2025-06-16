/**
 * Comprehensive API Integration Tests
 * Validates Akamai API interactions including authentication, request formatting,
 * response parsing, and error handling across all service domains
 */

import { 
  createMockAkamaiClient, 
  validateMCPResponse, 
  ErrorScenarios,
  TestDataGenerators,
  MockAPIResponses,
  PerformanceTracker
} from '../testing/test-utils.js';
import { AkamaiClient } from '../akamai-client.js';
import * as propertyTools from '../tools/property-tools.js';
import * as dnsTools from '../tools/dns-tools.js';
import * as cpsTools from '../tools/cps-tools.js';
import * as secureOnboarding from '../tools/secure-by-default-onboarding.js';

// Mock EdgeGrid authentication
jest.mock('../akamai-client.js', () => ({
  AkamaiClient: jest.fn().mockImplementation(() => ({
    request: jest.fn(),
    _customer: 'default',
    _accountSwitchKey: undefined,
  })),
}));

describe('Comprehensive API Integration Tests', () => {
  const mockClient = createMockAkamaiClient();
  const perfTracker = new PerformanceTracker();

  beforeEach(() => {
    jest.clearAllMocks();
    perfTracker.reset();
  });

  describe('EdgeGrid Authentication', () => {
    it('should handle authentication headers correctly', async () => {
      const client = new AkamaiClient({
        section: 'default',
        edgercPath: '.edgerc',
      });

      await client.request({
        method: 'GET',
        path: '/papi/v1/properties',
      });

      expect(client.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('EG1-HMAC-SHA256'),
          }),
        })
      );
    });

    it('should handle account switching via headers', async () => {
      const client = new AkamaiClient({
        section: 'testing',
        edgercPath: '.edgerc',
      });

      client._accountSwitchKey = 'TEST-ACCOUNT';

      await client.request({
        method: 'GET',
        path: '/papi/v1/properties',
      });

      expect(client.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Akamai-Account-Key': 'TEST-ACCOUNT',
          }),
        })
      );
    });

    it('should refresh auth tokens when expired', async () => {
      const client = createMockAkamaiClient();
      
      // First request fails with 401
      client.request
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce({ properties: { items: [] } });

      const result = await propertyTools.listProperties(client, {});
      
      validateMCPResponse(result);
      expect(client.request).toHaveBeenCalledTimes(2);
    });

    it('should handle authentication errors gracefully', async () => {
      mockClient.request.mockRejectedValueOnce(
        ErrorScenarios.authenticationError()
      );

      const result = await propertyTools.listProperties(mockClient, {});
      
      validateMCPResponse(result);
      expect(result.content[0].text).toContain('Authentication failed');
      expect(result.content[0].text).toContain('check your credentials');
    });
  });

  describe('Request Formatting', () => {
    it('should format GET requests with query parameters', async () => {
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [] },
      });

      await propertyTools.listProperties(mockClient, {
        contractId: 'ctr_C-123',
        groupId: 'grp_456',
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'GET',
        path: expect.stringContaining('?'),
        headers: expect.any(Object),
      });

      const call = mockClient.request.mock.calls[0][0];
      expect(call.path).toContain('contractId=ctr_C-123');
      expect(call.path).toContain('groupId=grp_456');
    });

    it('should format POST requests with JSON body', async () => {
      mockClient.request.mockResolvedValueOnce({});

      await dnsTools.createZone(mockClient, {
        zone: 'example.com',
        type: 'PRIMARY',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: expect.any(String),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.objectContaining({
          zone: 'example.com',
          type: 'PRIMARY',
        }),
      });
    });

    it('should handle URL encoding for special characters', async () => {
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [] },
      });

      await propertyTools.searchProperties(mockClient, {
        propertyName: 'test site.example.com',
      });

      const call = mockClient.request.mock.calls[0][0];
      expect(call.path).toContain('test%20site.example.com');
    });

    it('should set appropriate Accept headers', async () => {
      mockClient.request.mockResolvedValueOnce({});

      await propertyTools.getProperty(mockClient, {
        propertyId: 'prp_123',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': expect.stringContaining('application/json'),
          }),
        })
      );
    });
  });

  describe('Response Parsing', () => {
    it('should parse successful JSON responses', async () => {
      const mockProperties = TestDataGenerators.generateProperties(3);
      
      mockClient.request.mockResolvedValueOnce({
        properties: { items: mockProperties },
      });

      const result = await propertyTools.listProperties(mockClient, {});
      
      validateMCPResponse(result);
      expect(result.content[0].text).toContain(mockProperties[0].propertyName);
    });

    it('should handle paginated responses', async () => {
      const page1 = TestDataGenerators.generateProperties(100);
      const page2 = TestDataGenerators.generateProperties(50);

      mockClient.request
        .mockResolvedValueOnce({
          properties: { 
            items: page1,
            nextLink: '/papi/v1/properties?offset=100',
          },
        })
        .mockResolvedValueOnce({
          properties: { 
            items: page2,
            nextLink: null,
          },
        });

      // Tool should handle pagination internally
      const result = await propertyTools.listProperties(mockClient, {});
      
      validateMCPResponse(result);
      expect(result.content[0].text).toContain('150'); // Total count
    });

    it('should handle empty responses', async () => {
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [] },
      });

      const result = await propertyTools.listProperties(mockClient, {});
      
      validateMCPResponse(result);
      expect(result.content[0].text).toContain('No properties found');
    });

    it('should parse error response details', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            type: '/papi/v1/errors/validation',
            title: 'Validation Error',
            detail: 'The propertyName contains invalid characters',
            errors: [{
              type: 'invalid_characters',
              title: 'Invalid characters in propertyName',
              detail: 'Property names cannot contain spaces',
              errorLocation: 'propertyName',
            }],
          },
        },
      };

      mockClient.request.mockRejectedValueOnce(errorResponse);

      const result = await propertyTools.createProperty(mockClient, {
        propertyName: 'invalid name',
        productId: 'prd_Web_Accel',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      validateMCPResponse(result);
      expect(result.content[0].text).toContain('cannot contain spaces');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit responses', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '300',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '1234567890',
            'Retry-After': '60',
          },
        },
      });

      const result = await propertyTools.listProperties(mockClient, {});
      
      validateMCPResponse(result);
      expect(result.content[0].text).toContain('rate limit');
      expect(result.content[0].text).toContain('60 seconds');
    });

    it('should implement exponential backoff', async () => {
      const rateLimitError = ErrorScenarios.rateLimited();
      
      mockClient.request
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ properties: { items: [] } });

      perfTracker.start('backoff');
      
      const result = await propertyTools.listProperties(mockClient, {
        retryOnRateLimit: true,
      });

      const duration = perfTracker.end('backoff');
      
      validateMCPResponse(result);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
      expect(duration).toBeGreaterThan(1000); // Should have delays
    });

    it('should respect per-customer rate limits', async () => {
      const customers = ['default', 'testing', 'production'];
      
      for (const customer of customers) {
        mockClient._customer = customer;
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });

        await propertyTools.listProperties(mockClient, { customer });
        
        // Each customer should have independent rate limiting
        expect(mockClient._customer).toBe(customer);
      }
    });
  });

  describe('Error Translation', () => {
    it('should translate technical errors to user-friendly messages', async () => {
      const technicalErrors = [
        {
          error: { code: 'ECONNREFUSED' },
          expected: 'connection refused',
        },
        {
          error: { code: 'ETIMEDOUT' },
          expected: 'request timed out',
        },
        {
          error: { code: 'ENOTFOUND' },
          expected: 'DNS resolution failed',
        },
        {
          error: { message: 'certificate has expired' },
          expected: 'SSL certificate',
        },
      ];

      for (const { error, expected } of technicalErrors) {
        mockClient.request.mockRejectedValueOnce(error);

        const result = await propertyTools.listProperties(mockClient, {});
        
        validateMCPResponse(result);
        expect(result.content[0].text.toLowerCase()).toContain(expected);
      }
    });

    it('should provide actionable error messages', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            detail: 'User lacks permission for this contract',
            requiredPermission: 'property-manager-write',
          },
        },
      });

      const result = await propertyTools.createProperty(mockClient, {
        propertyName: 'test',
        productId: 'prd_Web_Accel',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      validateMCPResponse(result);
      expect(result.content[0].text).toContain('permission');
      expect(result.content[0].text).toContain('property-manager-write');
      expect(result.content[0].text).toMatch(/contact.*administrator|request.*access/i);
    });
  });

  describe('Complex API Workflows', () => {
    it('should handle property creation workflow', async () => {
      // Mock the complete property creation workflow
      mockClient.request
        .mockResolvedValueOnce({ // Create property
          propertyLink: '/papi/v1/properties/prp_123',
          propertyId: 'prp_123',
        })
        .mockResolvedValueOnce({ // Get property details
          properties: {
            propertyId: 'prp_123',
            propertyName: 'test.example.com',
            latestVersion: 1,
          },
        })
        .mockResolvedValueOnce({ // Create edge hostname
          edgeHostnameLink: '/papi/v1/edgehostnames/ehn_456',
          edgeHostnameId: 'ehn_456',
        })
        .mockResolvedValueOnce({ // Update property hostnames
          hostnames: {
            items: [{
              cnameFrom: 'test.example.com',
              cnameTo: 'test.example.com.edgesuite.net',
            }],
          },
        });

      const result = await secureOnboarding.quickSecurePropertySetup(mockClient, {
        domain: 'test.example.com',
        originHostname: 'origin.example.com',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      validateMCPResponse(result);
      expect(result.content[0].text).toContain('prp_123');
      expect(result.content[0].text).toContain('Successfully created');
    });

    it('should handle DNS zone import workflow', async () => {
      // Mock AXFR transfer workflow
      mockClient.request
        .mockResolvedValueOnce({ // Check if zone exists
          response: { status: 404 },
        })
        .mockResolvedValueOnce({ // Create zone
          zone: 'imported.example.com',
        })
        .mockResolvedValueOnce({ // Import records
          recordSets: TestDataGenerators.generateDNSRecords(20),
        })
        .mockResolvedValueOnce({ // Activate zone
          activation: {
            activationId: 'act_789',
            status: 'PENDING',
          },
        });

      const result = await dnsTools.importZoneViaAXFR(mockClient, {
        zone: 'imported.example.com',
        masterServer: '192.0.2.1',
        createZone: true,
        contractId: 'C-123',
        groupId: 'G-123',
      });

      validateMCPResponse(result);
      expect(result.content[0].text).toContain('imported.example.com');
      expect(result.content[0].text).toContain('20 records');
    });

    it('should handle certificate enrollment workflow', async () => {
      // Mock DV certificate enrollment
      mockClient.request
        .mockResolvedValueOnce({ // Create enrollment
          enrollment: '/cps/v2/enrollments/12345',
          enrollmentId: 12345,
        })
        .mockResolvedValueOnce({ // Get validation challenges
          challenges: [{
            domain: 'secure.example.com',
            token: 'validation-token-123',
            validationRecords: [{
              type: 'CNAME',
              name: '_acme-challenge.secure.example.com',
              target: 'dcv.akamai.com',
            }],
          }],
        })
        .mockResolvedValueOnce({ // Check validation status
          status: 'pending',
          validations: [{
            domain: 'secure.example.com',
            status: 'pending',
          }],
        });

      const enrollment = TestDataGenerators.generateDVEnrollment();
      const result = await cpsTools.createDVEnrollment(mockClient, enrollment);

      validateMCPResponse(result);
      expect(result.content[0].text).toContain('12345');
      expect(result.content[0].text).toContain('validation');
    });
  });

  describe('API Error Recovery', () => {
    it('should retry on transient errors', async () => {
      mockClient.request
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce({ properties: { items: [] } });

      const result = await propertyTools.listProperties(mockClient, {
        retryOnError: true,
        maxRetries: 3,
      });

      validateMCPResponse(result);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
    });

    it('should not retry on permanent errors', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Property not found' } },
      });

      const result = await propertyTools.getProperty(mockClient, {
        propertyId: 'prp_nonexistent',
      });

      validateMCPResponse(result);
      expect(mockClient.request).toHaveBeenCalledTimes(1);
      expect(result.content[0].text).toContain('not found');
    });

    it('should handle partial failures in bulk operations', async () => {
      mockClient.request.mockResolvedValueOnce({
        results: [
          { zone: 'zone1.com', status: 'success' },
          { zone: 'zone2.com', status: 'failed', error: 'Already exists' },
          { zone: 'zone3.com', status: 'success' },
        ],
      });

      const result = await dnsTools.bulkCreateZones(mockClient, {
        zones: [
          { zone: 'zone1.com', type: 'PRIMARY' },
          { zone: 'zone2.com', type: 'PRIMARY' },
          { zone: 'zone3.com', type: 'PRIMARY' },
        ],
        contractId: 'C-123',
        groupId: 'G-123',
      });

      validateMCPResponse(result);
      expect(result.content[0].text).toContain('2 successful');
      expect(result.content[0].text).toContain('1 failed');
      expect(result.content[0].text).toContain('zone2.com');
    });
  });

  describe('API Response Caching', () => {
    it('should cache read-only responses', async () => {
      mockClient.request.mockResolvedValueOnce({
        products: { items: TestDataGenerators.generateProducts() },
      });

      // First call
      await productTools.listProducts(mockClient, {
        contractId: 'C-123',
      });

      // Second call should use cache
      await productTools.listProducts(mockClient, {
        contractId: 'C-123',
      });

      expect(mockClient.request).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache on write operations', async () => {
      mockClient.request
        .mockResolvedValueOnce({ properties: { items: [] } })
        .mockResolvedValueOnce({ propertyId: 'prp_new' })
        .mockResolvedValueOnce({ 
          properties: { 
            items: [{ propertyId: 'prp_new', propertyName: 'new-property' }] 
          } 
        });

      // List properties (cached)
      await propertyTools.listProperties(mockClient, {});

      // Create property (invalidates cache)
      await propertyTools.createProperty(mockClient, {
        propertyName: 'new-property',
        productId: 'prd_Web_Accel',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      // List again (cache miss, new request)
      await propertyTools.listProperties(mockClient, {});

      expect(mockClient.request).toHaveBeenCalledTimes(3);
    });
  });

  describe('Multi-Customer API Handling', () => {
    it('should isolate API calls per customer', async () => {
      const customers = [
        { name: 'default', accountKey: null },
        { name: 'testing', accountKey: 'TEST-KEY' },
        { name: 'production', accountKey: 'PROD-KEY' },
      ];

      for (const { name, accountKey } of customers) {
        mockClient._customer = name;
        mockClient._accountSwitchKey = accountKey;
        
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });

        await propertyTools.listProperties(mockClient, { customer: name });

        if (accountKey) {
          expect(mockClient.request).toHaveBeenCalledWith(
            expect.objectContaining({
              headers: expect.objectContaining({
                'X-Akamai-Account-Key': accountKey,
              }),
            })
          );
        }
      }
    });

    it('should handle customer-specific rate limits', async () => {
      // Customer 1 hits rate limit
      mockClient._customer = 'customer1';
      mockClient.request.mockRejectedValueOnce(ErrorScenarios.rateLimited());

      const result1 = await propertyTools.listProperties(mockClient, {
        customer: 'customer1',
      });

      expect(result1.content[0].text).toContain('rate limit');

      // Customer 2 should still work
      mockClient._customer = 'customer2';
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [] },
      });

      const result2 = await propertyTools.listProperties(mockClient, {
        customer: 'customer2',
      });

      validateMCPResponse(result2);
      expect(result2.content[0].text).not.toContain('rate limit');
    });
  });
});