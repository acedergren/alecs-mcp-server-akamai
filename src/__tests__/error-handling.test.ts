/**
 * Error Handling Tests
 * Validates error translation and recovery scenarios
 */

import {
  createMockAkamaiClient,
  ErrorScenarios,
  ConversationContext,
} from '../testing/test-utils.js';
import * as propertyTools from '../tools/property-tools.js';
import * as dnsTools from '../tools/dns-tools.js';
import * as cpsTools from '../tools/cps-tools.js';
import { formatError } from '../utils/errors.js';

describe('Error Handling', () => {
  let mockClient: jest.Mocked<any>;
  let context: ConversationContext;

  beforeEach(() => {
    mockClient = createMockAkamaiClient();
    context = new ConversationContext();
  });

  describe('Authentication Errors', () => {
    it('should provide clear guidance for auth failures', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            type: 'https://problems.luna.akamaiapis.net/auth/unauthorized',
            title: 'Unauthorized',
            detail: 'Invalid authentication credentials',
          },
        },
      });

      const result = await propertyTools.listProperties(mockClient, {});
      
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toMatch(/auth|credential/i);
      
      // Should suggest checking .edgerc
      const errorText = result.content[0].text.toLowerCase();
      expect(errorText).toMatch(/edgerc|configuration/);
    });

    it('should handle account switch key errors', async () => {
      mockClient.accountSwitchKey = 'INVALID-KEY';
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            detail: 'Account switch key not authorized for this operation',
          },
        },
      });

      const result = await propertyTools.listProperties(mockClient, {
        customer: 'production',
      });

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toMatch(/account.*switch|permission/i);
    });
  });

  describe('Validation Errors', () => {
    it('should translate property validation errors clearly', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            type: 'https://problems.luna.akamaiapis.net/papi/validation-error',
            errors: [
              {
                type: 'invalid-property-name',
                detail: 'Property name must not contain spaces',
                field: 'propertyName',
              },
              {
                type: 'missing-required',
                detail: 'productId is required',
                field: 'productId',
              },
            ],
          },
        },
      });

      const result = await propertyTools.createProperty(mockClient, {
        propertyName: 'invalid name with spaces',
        contractId: 'ctr_C-123',
        groupId: 'grp_123',
        productId: '', // Missing
      });

      const errorText = result.content[0].text;
      expect(errorText).toContain('Error');
      expect(errorText).toContain('Property name must not contain spaces');
      expect(errorText).toContain('productId is required');
    });

    it('should handle DNS record validation errors', async () => {
      mockClient.request
        .mockResolvedValueOnce({ changelists: [] })
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce({
          response: {
            status: 400,
            data: {
              detail: 'Invalid DNS record: CNAME records cannot coexist with other record types',
              field: 'recordsets',
            },
          },
        });

      const result = await dnsTools.upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'www',
        type: 'CNAME',
        ttl: 300,
        rdata: ['target.example.com'],
      });

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('CNAME');
      expect(result.content[0].text).toMatch(/coexist|conflict/i);
    });

    it('should handle certificate validation errors with remediation', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            type: 'https://problems.luna.akamaiapis.net/cps/validation-error',
            errors: [
              {
                type: 'invalid-san',
                detail: 'SAN *.*.example.com contains too many wildcard levels',
              },
              {
                type: 'invalid-key-algorithm',
                detail: 'RSA key must be at least 2048 bits',
              },
            ],
          },
        },
      });

      const result = await cpsTools.createDVEnrollment(mockClient, {
        cn: 'example.com',
        sans: ['*.*.example.com'],
        org: 'Test',
        orgUnit: 'IT',
        city: 'Boston',
        state: 'MA',
        country: 'US',
        adminContact: {
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          phone: '+1-555-0100',
        },
        techContact: {
          firstName: 'Tech',
          lastName: 'User',
          email: 'tech@example.com',
          phone: '+1-555-0200',
        },
        networkConfiguration: {
          geography: 'core',
          secureNetwork: 'enhanced-tls',
          mustHaveCiphers: 'ak-akamai-default',
          preferredCiphers: 'ak-akamai-default',
        },
      });

      const errorText = result.content[0].text;
      expect(errorText).toContain('too many wildcard levels');
      expect(errorText).toContain('RSA key must be at least 2048 bits');
      
      // Should suggest fixes
      expect(errorText).toMatch(/single.*wildcard|one.*level/i);
    });
  });

  describe('Conflict Errors', () => {
    it('should handle DNS zone already exists', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            type: 'https://problems.luna.akamaiapis.net/dns/zone-exists',
            detail: 'Zone example.com already exists',
            instance: 'zone_12345',
          },
        },
      });

      const result = await dnsTools.createZone(mockClient, {
        zone: 'example.com',
        type: 'PRIMARY',
        contractId: 'C-123',
        groupId: 'grp_123',
      });

      expect(result.content[0].text).toContain('already exists');
      // Should suggest next steps
      expect(result.content[0].text).toMatch(/use.*existing|update|modify/i);
    });

    it('should handle property name conflicts', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            detail: 'A property with name www.example.com already exists in this group',
            conflictingPropertyId: 'prp_99999',
          },
        },
      });

      const result = await propertyTools.createProperty(mockClient, {
        propertyName: 'www.example.com',
        productId: 'prd_Web_Accel',
        contractId: 'ctr_C-123',
        groupId: 'grp_123',
      });

      expect(result.content[0].text).toContain('already exists');
      expect(result.content[0].text).toContain('prp_99999');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limits with retry guidance', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 429,
          headers: {
            'retry-after': '30',
            'x-ratelimit-limit': '100',
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1642000000',
          },
          data: {
            type: 'https://problems.luna.akamaiapis.net/common/rate-limit',
            title: 'Too Many Requests',
            detail: 'Rate limit exceeded. Please retry after 30 seconds',
          },
        },
      });

      const result = await propertyTools.listProperties(mockClient, {});
      
      const errorText = result.content[0].text;
      expect(errorText).toContain('Rate limit');
      expect(errorText).toContain('30 seconds');
      expect(errorText).toMatch(/retry|wait/i);
    });
  });

  describe('Async Operation Errors', () => {
    it('should handle activation timeout with status check guidance', async () => {
      // Activation starts successfully
      mockClient.request.mockResolvedValueOnce({
        activationLink: '/papi/v1/properties/prp_123/activations/atv_123',
      });

      const activationResult = await propertyManagerTools.activateProperty(
        mockClient,
        {
          propertyId: 'prp_123',
          version: 5,
          network: 'PRODUCTION',
          note: 'Production deployment',
        }
      );

      expect(activationResult.content[0].text).toContain('Activation started');
      expect(activationResult.content[0].text).toContain('atv_123');
      
      // Should provide guidance on checking status
      expect(activationResult.content[0].text).toMatch(/check.*status|monitor/i);
    });

    it('should handle certificate enrollment pending validation', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollment: {
          id: 12345,
          validationStatus: 'PENDING',
          dv: [
            {
              domain: 'secure.example.com',
              challenges: [
                {
                  type: 'dns-01',
                  status: 'PENDING',
                  error: 'DNS record not found',
                },
              ],
            },
          ],
        },
      });

      const result = await cpsTools.checkDVEnrollmentStatus(mockClient, {
        enrollmentId: 12345,
      });

      const text = result.content[0].text;
      expect(text).toContain('PENDING');
      expect(text).toContain('DNS record not found');
      expect(text).toMatch(/add.*DNS|create.*TXT/i);
    });
  });

  describe('Error Recovery Suggestions', () => {
    it('should suggest recovery for property rule errors', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            type: 'https://problems.luna.akamaiapis.net/papi/validation-error',
            errors: [
              {
                type: 'incompatible-behaviors',
                detail: 'Behavior "caching" conflicts with "noStore"',
                suggestedFix: 'Remove one of the conflicting behaviors',
              },
            ],
          },
        },
      });

      const result = await propertyManagerTools.updatePropertyRules(mockClient, {
        propertyId: 'prp_123',
        version: 5,
        rules: {
          behaviors: [
            { name: 'caching', options: {} },
            { name: 'noStore', options: {} },
          ],
        },
      });

      const errorText = result.content[0].text;
      expect(errorText).toContain('conflicts with');
      expect(errorText).toContain('Remove one of the conflicting behaviors');
    });

    it('should provide context for DNS propagation delays', async () => {
      mockClient.request
        .mockResolvedValueOnce({ changelists: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ requestId: 'req_123' });

      const result = await dnsTools.upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'test',
        type: 'A',
        ttl: 300,
        rdata: ['192.0.2.1'],
      });

      const text = result.content[0].text;
      expect(text).toContain('Successfully');
      // Should mention propagation time
      expect(text).toMatch(/propagat|minutes|TTL/i);
    });
  });

  describe('Complex Error Scenarios', () => {
    it('should handle multi-step operation partial failure', async () => {
      // Creating property succeeds
      mockClient.request.mockResolvedValueOnce({
        propertyLink: '/papi/v1/properties/prp_12345',
      });

      // But adding hostname fails
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            detail: 'Hostname www.example.com is already assigned to another property',
            conflictingPropertyId: 'prp_99999',
          },
        },
      });

      // Workflow continues despite error
      const propertyResult = await propertyTools.createProperty(mockClient, {
        propertyName: 'new.example.com',
        productId: 'prd_Web_Accel',
        contractId: 'ctr_C-123',
        groupId: 'grp_123',
      });

      expect(propertyResult.content[0].text).toContain('Created property');

      const hostnameResult = await propertyManagerTools.addPropertyHostname(
        mockClient,
        {
          propertyId: 'prp_12345',
          version: 1,
          hostname: 'www.example.com',
        }
      );

      const errorText = hostnameResult.content[0].text;
      expect(errorText).toContain('already assigned');
      expect(errorText).toContain('prp_99999');
      
      // Should suggest resolution
      expect(errorText).toMatch(/remove.*from.*other|different.*hostname/i);
    });
  });

  describe('Error Context Preservation', () => {
    it('should maintain conversation context through errors', async () => {
      const propertyId = 'prp_12345';
      
      // First operation succeeds
      mockClient.request.mockResolvedValueOnce({
        properties: {
          propertyId,
          propertyName: 'test.example.com',
        },
      });

      const success = await propertyTools.getProperty(mockClient, { propertyId });
      context.recordOperation('getProperty', { propertyId }, success, 'corr-123');

      // Second operation fails
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            detail: 'You do not have permission to modify this property',
          },
        },
      });

      const failure = await propertyManagerTools.updatePropertyRules(mockClient, {
        propertyId,
        version: 1,
        rules: {},
      });
      context.recordOperation('updatePropertyRules', { propertyId }, failure, 'corr-123');

      // Context should show both operations
      const sequence = context.getOperationSequence();
      expect(sequence).toEqual(['getProperty', 'updatePropertyRules']);
      
      // Error should reference the property we were working with
      expect(failure.content[0].text).toContain(propertyId);
    });
  });
});