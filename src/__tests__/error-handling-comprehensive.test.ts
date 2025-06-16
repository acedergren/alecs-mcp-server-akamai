/**
 * Comprehensive Error Handling Tests
 * Validates how ALECS translates complex Akamai API errors into language model-comprehensible explanations
 */

import {
  createMockAkamaiClient,
  validateMCPResponse,
  ErrorScenarios,
  TestDataGenerators,
  ConversationalContextTracker,
  createTestServer
} from '../testing/test-utils.js';
import * as propertyTools from '../tools/property-tools.js';
import * as dnsTools from '../tools/dns-tools.js';
import * as cpsTools from '../tools/cps-tools.js';
import * as secureOnboarding from '../tools/secure-by-default-onboarding.js';
import { ErrorTranslator } from '../utils/errors.js';

describe('Comprehensive Error Handling', () => {
  const mockClient = createMockAkamaiClient();
  const testServer = createTestServer();
  const contextTracker = new ConversationalContextTracker();
  const errorTranslator = new ErrorTranslator();

  beforeEach(() => {
    jest.clearAllMocks();
    contextTracker.reset();
  });

  describe('Authentication Error Handling', () => {
    it('should handle invalid credentials gracefully', async () => {
      const authErrors = [
        {
          error: {
            response: {
              status: 401,
              data: 'Invalid authentication credentials',
            },
          },
          expectedMessage: /invalid credentials|authentication failed|check your .edgerc/i,
          suggestedAction: /verify|check|update|credentials/i,
        },
        {
          error: {
            response: {
              status: 401,
              data: {
                detail: 'Authentication token expired',
                type: 'token_expired',
              },
            },
          },
          expectedMessage: /token expired|authentication expired/i,
          suggestedAction: /re-authenticate|refresh|try again/i,
        },
        {
          error: {
            response: {
              status: 401,
              data: {
                detail: 'Invalid client token',
                type: 'invalid_client',
              },
            },
          },
          expectedMessage: /client token|invalid token/i,
          suggestedAction: /check.*edgerc|configuration/i,
        },
      ];

      for (const { error, expectedMessage, suggestedAction } of authErrors) {
        mockClient.request.mockRejectedValueOnce(error);

        const result = await propertyTools.listProperties(mockClient, {});
        
        validateMCPResponse(result);
        expect(result.content[0].text).toMatch(expectedMessage);
        expect(result.content[0].text).toMatch(suggestedAction);
        expect(result.content[0].text).not.toContain('401'); // Don't expose HTTP codes
        expect(result.content[0].text).not.toContain('stack'); // No stack traces
      }
    });

    it('should handle account permission errors', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            type: 'forbidden',
            title: 'Insufficient permissions',
            detail: 'User lacks property-manager-write permission for contract C-123',
            requiredPermissions: ['property-manager-write'],
            userPermissions: ['property-manager-read'],
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
      const errorText = result.content[0].text;
      
      // Should explain the permission issue clearly
      expect(errorText).toContain('permission');
      expect(errorText).toContain('property-manager-write');
      expect(errorText).toMatch(/contact.*administrator|request.*access/i);
      
      // Should not expose internal permission arrays
      expect(errorText).not.toContain('requiredPermissions');
      expect(errorText).not.toContain('userPermissions');
    });

    it('should handle account switching errors', async () => {
      mockClient._customer = 'invalid-customer';
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            detail: 'Invalid account switch key: INVALID-KEY',
            type: 'invalid_account_switch',
          },
        },
      });

      const result = await propertyTools.listProperties(mockClient, {
        customer: 'invalid-customer',
      });

      validateMCPResponse(result);
      expect(result.content[0].text).toContain('account');
      expect(result.content[0].text).toContain('invalid-customer');
      expect(result.content[0].text).toMatch(/check.*edgerc|configuration/i);
    });
  });

  describe('Validation Error Handling', () => {
    it('should translate property validation errors', async () => {
      const validationErrors = [
        {
          error: {
            response: {
              status: 400,
              data: {
                type: '/papi/v1/errors/validation.required_field',
                title: 'Missing required field',
                errors: [{
                  type: 'missing_required_field',
                  detail: 'contractId is required',
                  errorLocation: 'contractId',
                }],
              },
            },
          },
          expectedExplanation: 'contractId is required',
          suggestedFix: /provide.*contractId|specify.*contract/i,
        },
        {
          error: {
            response: {
              status: 400,
              data: {
                type: 'validation_error',
                title: 'Invalid property name',
                detail: 'Property names cannot contain spaces',
                invalidValue: 'my property name',
              },
            },
          },
          expectedExplanation: 'Property names cannot contain spaces',
          suggestedFix: /use.*hyphens|remove.*spaces|my-property-name/i,
        },
        {
          error: {
            response: {
              status: 400,
              data: {
                errors: [{
                  type: 'invalid_hostname',
                  detail: 'Hostname www.example.com is already in use by property prp_999',
                  conflictingResource: 'prp_999',
                }],
              },
            },
          },
          expectedExplanation: 'Hostname www.example.com is already in use',
          suggestedFix: /different.*hostname|remove.*existing|prp_999/i,
        },
      ];

      for (const { error, expectedExplanation, suggestedFix } of validationErrors) {
        mockClient.request.mockRejectedValueOnce(error);

        const result = await propertyTools.createProperty(mockClient, {
          propertyName: 'test property',
          productId: 'prd_Web_Accel',
          groupId: 'G-123',
          // Missing contractId in first case
        });

        validateMCPResponse(result);
        const errorText = result.content[0].text;
        
        expect(errorText).toContain(expectedExplanation);
        expect(errorText).toMatch(suggestedFix);
        
        // Should not expose technical API paths
        expect(errorText).not.toContain('/papi/v1/errors');
        expect(errorText).not.toContain('errorLocation');
      }
    });

    it('should handle rule validation errors with context', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            type: 'rule_validation_error',
            title: 'Invalid rule configuration',
            errors: [{
              type: 'invalid_behavior_option',
              detail: 'Caching TTL value "30 days" exceeds maximum of 7 days',
              behaviorName: 'caching',
              optionName: 'ttl',
              providedValue: '30d',
              allowedValues: '1s-7d',
              rulePath: '/rules/children/0/children/2',
            }],
          },
        },
      });

      const result = await propertyTools.updatePropertyRules(mockClient, {
        propertyId: 'prp_123',
        version: 1,
        rules: TestDataGenerators.generatePropertyRules(),
      });

      validateMCPResponse(result);
      const errorText = result.content[0].text;
      
      // Should explain the issue clearly
      expect(errorText).toContain('TTL');
      expect(errorText).toContain('7 days');
      expect(errorText).toContain('caching');
      
      // Should provide actionable fix
      expect(errorText).toMatch(/reduce|change|set.*to.*7d|maximum/i);
      
      // Should not expose rule paths
      expect(errorText).not.toContain('rulePath');
      expect(errorText).not.toContain('/rules/children');
    });
  });

  describe('DNS Configuration Error Handling', () => {
    it('should handle DNS zone conflicts', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            type: 'zone_exists',
            title: 'Zone already exists',
            detail: 'Zone example.com already exists in contract C-999',
            existingZone: {
              zone: 'example.com',
              contractId: 'C-999',
              type: 'PRIMARY',
            },
          },
        },
      });

      const result = await dnsTools.createZone(mockClient, {
        zone: 'example.com',
        type: 'PRIMARY',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      validateMCPResponse(result);
      const errorText = result.content[0].text;
      
      expect(errorText).toContain('already exists');
      expect(errorText).toContain('example.com');
      expect(errorText).toMatch(/different contract|C-999|use existing/i);
    });

    it('should handle DNS record validation errors', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            errors: [{
              type: 'invalid_record_data',
              detail: 'Invalid IP address format: 999.999.999.999',
              recordType: 'A',
              fieldName: 'rdata',
            }],
          },
        },
      });

      const result = await dnsTools.upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'www',
        type: 'A',
        ttl: 300,
        rdata: ['999.999.999.999'],
      });

      validateMCPResponse(result);
      expect(result.content[0].text).toContain('Invalid IP address');
      expect(result.content[0].text).toContain('999.999.999.999');
      expect(result.content[0].text).toMatch(/valid.*IP.*format|0-255/i);
    });

    it('should handle AXFR transfer failures', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 502,
          data: {
            type: 'axfr_failed',
            detail: 'AXFR transfer failed: Connection refused to 192.0.2.1:53',
            masterServer: '192.0.2.1',
            error: 'ECONNREFUSED',
          },
        },
      });

      const result = await dnsTools.importZoneViaAXFR(mockClient, {
        zone: 'example.com',
        masterServer: '192.0.2.1',
      });

      validateMCPResponse(result);
      const errorText = result.content[0].text;
      
      expect(errorText).toContain('transfer failed');
      expect(errorText).toContain('192.0.2.1');
      expect(errorText).toMatch(/firewall|allow.*53|network.*access|TSIG/i);
    });
  });

  describe('Certificate Enrollment Error Handling', () => {
    it('should handle DV validation failures', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            type: 'validation_failed',
            title: 'Domain validation failed',
            validationErrors: [{
              domain: 'secure.example.com',
              validationType: 'dns-01',
              error: 'DNS record not found',
              expectedRecord: {
                name: '_acme-challenge.secure.example.com',
                type: 'CNAME',
                value: 'dcv.akamai.com',
              },
            }],
          },
        },
      });

      const result = await cpsTools.checkDVStatus(mockClient, {
        enrollmentId: 12345,
      });

      validateMCPResponse(result);
      const errorText = result.content[0].text;
      
      expect(errorText).toContain('validation failed');
      expect(errorText).toContain('_acme-challenge.secure.example.com');
      expect(errorText).toContain('CNAME');
      expect(errorText).toContain('dcv.akamai.com');
      expect(errorText).toMatch(/create.*DNS.*record|add.*CNAME/i);
    });

    it('should handle certificate deployment errors', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            type: 'deployment_failed',
            detail: 'Certificate deployment to Enhanced TLS network failed',
            enrollmentId: 12345,
            network: 'enhanced-tls',
            reason: 'Certificate chain validation error',
          },
        },
      });

      const result = await cpsTools.deployCertificate(mockClient, {
        enrollmentId: 12345,
        network: 'enhanced-tls',
      });

      validateMCPResponse(result);
      const errorText = result.content[0].text;
      
      expect(errorText).toContain('deployment failed');
      expect(errorText).toContain('certificate chain');
      expect(errorText).toMatch(/contact.*support|try.*again|check.*certificate/i);
      
      // Should not expose internal network names
      expect(errorText).not.toContain('enhanced-tls');
    });
  });

  describe('Async Operation Error Handling', () => {
    it('should handle activation failures with detailed context', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            type: 'activation_validation_failed',
            activationId: 'atv_123',
            errors: [{
              type: 'missing_origin',
              detail: 'No origin behavior found in rule tree',
              suggestion: 'Add an origin behavior with your origin hostname',
            }],
            propertyVersion: 5,
            network: 'PRODUCTION',
          },
        },
      });

      const result = await propertyTools.activateProperty(mockClient, {
        propertyId: 'prp_123',
        version: 5,
        network: 'PRODUCTION',
      });

      validateMCPResponse(result);
      const errorText = result.content[0].text;
      
      expect(errorText).toContain('activation failed');
      expect(errorText).toContain('origin behavior');
      expect(errorText).toContain('Add an origin');
      expect(errorText).toMatch(/fix.*configuration|update.*rules/i);
    });

    it('should handle timeout errors for long operations', async () => {
      mockClient.request.mockRejectedValueOnce({
        code: 'ETIMEDOUT',
        message: 'Request timeout after 30000ms',
        config: {
          url: '/papi/v1/properties/prp_123/activations',
        },
      });

      const result = await propertyTools.activateProperty(mockClient, {
        propertyId: 'prp_123',
        network: 'PRODUCTION',
      });

      validateMCPResponse(result);
      const errorText = result.content[0].text;
      
      expect(errorText).toContain('timed out');
      expect(errorText).toMatch(/taking longer.*expected|try.*again|check.*status/i);
      expect(errorText).not.toContain('30000ms');
      expect(errorText).not.toContain('ETIMEDOUT');
    });
  });

  describe('Error Recovery Suggestions', () => {
    it('should provide specific recovery steps for common errors', async () => {
      const errorRecoveryScenarios = [
        {
          error: ErrorScenarios.rateLimited(),
          expectedSuggestions: [
            /wait.*60.*seconds/i,
            /reduce.*frequency/i,
            /batch.*operations/i,
          ],
        },
        {
          error: ErrorScenarios.serverError(),
          expectedSuggestions: [
            /temporary.*issue/i,
            /try.*again/i,
            /contact.*support.*persists/i,
          ],
        },
        {
          error: ErrorScenarios.networkError(),
          expectedSuggestions: [
            /network.*connectivity/i,
            /firewall/i,
            /proxy.*settings/i,
          ],
        },
      ];

      for (const { error, expectedSuggestions } of errorRecoveryScenarios) {
        mockClient.request.mockRejectedValueOnce(error);

        const result = await propertyTools.listProperties(mockClient, {});
        
        validateMCPResponse(result);
        const errorText = result.content[0].text;
        
        expectedSuggestions.forEach(suggestion => {
          expect(errorText).toMatch(suggestion);
        });
      }
    });

    it('should maintain conversational context during error recovery', async () => {
      // First attempt fails
      contextTracker.addUserMessage('Create property for newsite.example.com');
      
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            errors: [{
              type: 'invalid_product',
              detail: 'Product prd_Unknown is not available in contract C-123',
              availableProducts: ['prd_Fresca', 'prd_Site_Accel'],
            }],
          },
        },
      });

      const failedResult = await propertyTools.createProperty(mockClient, {
        propertyName: 'newsite.example.com',
        productId: 'prd_Unknown',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      contextTracker.addAssistantResponse(failedResult.content[0].text);
      
      // Error should suggest available products
      expect(failedResult.content[0].text).toContain('prd_Fresca');
      expect(failedResult.content[0].text).toContain('prd_Site_Accel');
      
      // User accepts suggestion
      contextTracker.addUserMessage('Ok use prd_Fresca');
      
      mockClient.request.mockResolvedValueOnce({
        propertyId: 'prp_new',
      });

      const successResult = await propertyTools.createProperty(mockClient, {
        propertyName: 'newsite.example.com',
        productId: 'prd_Fresca',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      contextTracker.addAssistantResponse(successResult.content[0].text);
      
      expect(successResult.content[0].text).toContain('Successfully created');
      expect(successResult.content[0].text).toContain('prp_new');
      
      // Context should show error recovery
      const context = contextTracker.getContext();
      expect(context.errors).toContain('invalid_product');
      expect(context.resolutions).toContain('used_valid_product');
    });
  });

  describe('Bulk Operation Error Handling', () => {
    it('should handle partial failures in bulk operations', async () => {
      mockClient.request.mockResolvedValueOnce({
        results: [
          { 
            zone: 'zone1.com', 
            status: 'success',
            zone_id: 'zone_1',
          },
          { 
            zone: 'zone2.com', 
            status: 'failed',
            error: 'Zone already exists',
          },
          { 
            zone: 'zone3.com', 
            status: 'failed',
            error: 'Invalid zone name',
          },
          { 
            zone: 'zone4.com', 
            status: 'success',
            zone_id: 'zone_4',
          },
        ],
        summary: {
          total: 4,
          successful: 2,
          failed: 2,
        },
      });

      const result = await dnsTools.bulkCreateZones(mockClient, {
        zones: [
          { zone: 'zone1.com', type: 'PRIMARY' },
          { zone: 'zone2.com', type: 'PRIMARY' },
          { zone: 'zone3.com', type: 'PRIMARY' },
          { zone: 'zone4.com', type: 'PRIMARY' },
        ],
        contractId: 'C-123',
        groupId: 'G-123',
      });

      validateMCPResponse(result);
      const responseText = result.content[0].text;
      
      // Should summarize results clearly
      expect(responseText).toContain('2 successful');
      expect(responseText).toContain('2 failed');
      
      // Should list failures with reasons
      expect(responseText).toContain('zone2.com');
      expect(responseText).toContain('already exists');
      expect(responseText).toContain('zone3.com');
      expect(responseText).toContain('Invalid zone name');
      
      // Should provide next steps
      expect(responseText).toMatch(/retry.*failed|fix.*errors/i);
    });
  });

  describe('Error Formatting for LLMs', () => {
    it('should format errors for easy LLM parsing', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            type: 'complex_validation_error',
            errors: [
              {
                field: 'rules.behaviors[0].options.hostname',
                error: 'Invalid hostname format',
                provided: 'origin server.com',
                expected: 'Valid hostname without spaces',
              },
              {
                field: 'rules.behaviors[1].options.ttl',
                error: 'Value out of range',
                provided: '30d',
                expected: '1s-7d',
              },
            ],
          },
        },
      });

      const result = await propertyTools.updatePropertyRules(mockClient, {
        propertyId: 'prp_123',
        rules: TestDataGenerators.generatePropertyRules(),
      });

      validateMCPResponse(result);
      const errorText = result.content[0].text;
      
      // Should structure errors clearly
      expect(errorText).toMatch(/Error 1:|Issue 1:|First,/i);
      expect(errorText).toMatch(/Error 2:|Issue 2:|Second,/i);
      
      // Should provide specific fixes
      expect(errorText).toContain('origin server.com');
      expect(errorText).toMatch(/remove.*spaces|origin-server.com/i);
      expect(errorText).toContain('30d');
      expect(errorText).toMatch(/change.*to.*7d|reduce.*TTL/i);
    });

    it('should preserve error codes for support escalation', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            type: 'internal_server_error',
            title: 'Unexpected error occurred',
            detail: 'An internal error occurred processing your request',
            reference: 'ERR-2024-12345',
            timestamp: '2024-01-20T10:30:00Z',
          },
        },
      });

      const result = await propertyTools.listProperties(mockClient, {});
      
      validateMCPResponse(result);
      const errorText = result.content[0].text;
      
      // Should include reference for support
      expect(errorText).toContain('ERR-2024-12345');
      expect(errorText).toMatch(/reference.*support|contact.*support.*ERR-2024-12345/i);
      
      // Should not include technical details
      expect(errorText).not.toContain('internal_server_error');
      expect(errorText).not.toContain('500');
    });
  });

  describe('Multi-Language Error Support', () => {
    it('should handle errors with suggested fixes in common patterns', async () => {
      const commonErrors = [
        {
          input: 'example.com/path',
          error: 'Invalid hostname - cannot contain path',
          suggestion: 'Use only the hostname: example.com',
        },
        {
          input: 'https://example.com',
          error: 'Invalid hostname - cannot contain protocol',
          suggestion: 'Use only the hostname: example.com',
        },
        {
          input: 'example.com:8080',
          error: 'Invalid hostname - cannot contain port',
          suggestion: 'Use only the hostname: example.com',
        },
      ];

      for (const { input, error, suggestion } of commonErrors) {
        mockClient.request.mockRejectedValueOnce({
          response: {
            status: 400,
            data: {
              errors: [{
                detail: error,
                providedValue: input,
              }],
            },
          },
        });

        const result = await propertyTools.addHostname(mockClient, {
          propertyId: 'prp_123',
          hostname: input,
        });

        validateMCPResponse(result);
        expect(result.content[0].text).toContain(suggestion);
      }
    });
  });
});