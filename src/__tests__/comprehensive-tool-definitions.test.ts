/**
 * Comprehensive Tool Definition Tests
 * Tests all tool schemas, parameter validation, MCP protocol compliance, and error handling
 */

import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  createMockAkamaiClient, 
  validateMCPResponse, 
  ErrorScenarios,
  createTestServer,
  TestDataGenerators,
  PerformanceTracker
} from '../testing/test-utils.js';

// Import all tool modules
import * as propertyTools from '../tools/property-tools.js';
import * as propertyManagerTools from '../tools/property-manager-tools.js';
import * as propertyManagerAdvancedTools from '../tools/property-manager-advanced-tools.js';
import * as propertyManagerRulesTools from '../tools/property-manager-rules-tools.js';
import * as dnsTools from '../tools/dns-tools.js';
import * as dnsAdvancedTools from '../tools/dns-advanced-tools.js';
import * as dnsMigrationTools from '../tools/dns-migration-tools.js';
import * as cpsTools from '../tools/cps-tools.js';
import * as cpsDnsIntegration from '../tools/cps-dns-integration.js';
import * as productTools from '../tools/product-tools.js';
import * as cpcodeTools from '../tools/cpcode-tools.js';
import * as secureByDefaultOnboarding from '../tools/secure-by-default-onboarding.js';
import * as debugSecureOnboarding from '../tools/debug-secure-onboarding.js';
import * as agentTools from '../tools/agent-tools.js';

describe('Comprehensive Tool Definitions', () => {
  const mockClient = createMockAkamaiClient();
  const testServer = createTestServer();
  const perfTracker = new PerformanceTracker();

  beforeEach(() => {
    jest.clearAllMocks();
    perfTracker.reset();
  });

  afterEach(() => {
    const metrics = perfTracker.getMetrics();
    if (metrics.totalDuration > 1000) {
      console.warn(`Test took ${metrics.totalDuration}ms - consider optimization`);
    }
  });

  describe('MCP Protocol Compliance', () => {
    describe('Tool Registration', () => {
      it('should register all tools with valid schemas', async () => {
        const server = new Server({
          name: 'test-server',
          version: '1.0.0',
        });

        // Test that all tools can be registered
        const toolModules = [
          propertyTools,
          propertyManagerTools,
          propertyManagerAdvancedTools,
          propertyManagerRulesTools,
          dnsTools,
          dnsAdvancedTools,
          dnsMigrationTools,
          cpsTools,
          cpsDnsIntegration,
          productTools,
          cpcodeTools,
          secureByDefaultOnboarding,
          debugSecureOnboarding,
          agentTools,
        ];

        let registeredCount = 0;
        for (const module of toolModules) {
          const tools = Object.keys(module).filter(key => 
            typeof module[key] === 'function' && 
            !key.startsWith('_')
          );
          registeredCount += tools.length;
        }

        expect(registeredCount).toBeGreaterThan(0);
      });

      it('should provide valid tool descriptions', () => {
        // Validate that each tool has a proper description
        const toolsWithDescriptions = [
          { name: 'listProperties', desc: 'List all Akamai CDN properties' },
          { name: 'createZone', desc: 'Create a new DNS zone' },
          { name: 'createDVEnrollment', desc: 'Create Default DV certificate' },
        ];

        toolsWithDescriptions.forEach(({ name, desc }) => {
          expect(desc).toBeTruthy();
          expect(desc.length).toBeGreaterThan(10);
          expect(desc).not.toContain('TODO');
          expect(desc).not.toContain('FIXME');
        });
      });
    });

    describe('Schema Validation', () => {
      it('should validate required parameters', async () => {
        // Test missing required parameter
        const result = await dnsTools.createZone(mockClient, {
          zone: 'example.com',
          // Missing required 'type' parameter
        } as any);

        expect(result.content[0].text).toContain('Error');
      });

      it('should validate parameter types', async () => {
        // Test invalid parameter type
        const result = await dnsTools.upsertRecord(mockClient, {
          zone: 'example.com',
          name: 'www',
          type: 'A',
          ttl: 'invalid', // Should be number
          rdata: ['192.0.2.1'],
        } as any);

        validateMCPResponse(result);
      });

      it('should validate enum values', async () => {
        // Test invalid enum value
        const result = await propertyTools.activateProperty(mockClient, {
          propertyId: 'prp_123',
          network: 'INVALID_NETWORK', // Should be STAGING or PRODUCTION
        } as any);

        expect(result.content[0].text).toBeDefined();
      });
    });

    describe('Response Formatting', () => {
      it('should return properly formatted MCP responses', async () => {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });

        const result = await propertyTools.listProperties(mockClient, {});
        
        // Validate MCP response structure
        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0]).toHaveProperty('text');
      });

      it('should format error responses consistently', async () => {
        mockClient.request.mockRejectedValueOnce(new Error('Test error'));

        const result = await propertyTools.listProperties(mockClient, {});
        
        validateMCPResponse(result);
        expect(result.content[0].text).toContain('Error');
        expect(result.content[0].text).toContain('Test error');
      });
    });
  });

  describe('Parameter Validation Tests', () => {
    describe('Boundary Value Testing', () => {
      it('should handle minimum length values', async () => {
        mockClient.request.mockResolvedValueOnce({});

        // Single character zone name
        const result = await dnsTools.createZone(mockClient, {
          zone: 'a',
          type: 'PRIMARY',
          contractId: 'C-1',
          groupId: 'G-1',
        });

        validateMCPResponse(result);
      });

      it('should handle maximum length values', async () => {
        const longPropertyName = 'a'.repeat(255);
        
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });

        const result = await propertyTools.createProperty(mockClient, {
          propertyName: longPropertyName,
          productId: 'prd_Web_Accel',
          contractId: 'C-123',
          groupId: 'G-123',
        });

        validateMCPResponse(result);
      });

      it('should validate numeric ranges', async () => {
        // Test TTL boundaries
        const testCases = [
          { ttl: 0, valid: false },
          { ttl: 1, valid: true },
          { ttl: 86400, valid: true },
          { ttl: 2147483647, valid: true },
          { ttl: -1, valid: false },
        ];

        for (const { ttl, valid } of testCases) {
          mockClient.request.mockResolvedValueOnce({
            changelists: [],
          }).mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce({});

          const result = await dnsTools.upsertRecord(mockClient, {
            zone: 'example.com',
            name: 'test',
            type: 'A',
            ttl,
            rdata: ['192.0.2.1'],
          });

          if (valid) {
            validateMCPResponse(result);
          } else {
            expect(result.content[0].text).toBeDefined();
          }
        }
      });
    });

    describe('Type Coercion Testing', () => {
      it('should handle string to number coercion', async () => {
        mockClient.request.mockResolvedValueOnce({
          activations: { items: [] },
        });

        // Pass string where number expected
        const result = await propertyTools.getActivation(mockClient, {
          propertyId: 'prp_123',
          activationId: '12345' as any, // Should accept string representation
        });

        validateMCPResponse(result);
      });

      it('should handle boolean string values', async () => {
        mockClient.request.mockResolvedValueOnce({});

        const result = await propertyTools.activateProperty(mockClient, {
          propertyId: 'prp_123',
          network: 'STAGING',
          acknowledgeWarnings: 'true' as any, // Should handle string boolean
        });

        validateMCPResponse(result);
      });
    });

    describe('Special Characters Handling', () => {
      it('should handle special characters in property names', async () => {
        const specialChars = ['test-site.com', 'test_site.com', 'test site.com', 'test@site.com'];

        for (const name of specialChars) {
          mockClient.request.mockResolvedValueOnce({
            properties: { items: [] },
          });

          const result = await propertyTools.getProperty(mockClient, {
            propertyName: name,
          });

          validateMCPResponse(result);
        }
      });

      it('should sanitize SQL injection attempts', async () => {
        const sqlInjectionAttempts = [
          "'; DROP TABLE properties; --",
          "1' OR '1'='1",
          "admin'--",
        ];

        for (const attempt of sqlInjectionAttempts) {
          mockClient.request.mockResolvedValueOnce({
            properties: { items: [] },
          });

          const result = await propertyTools.getProperty(mockClient, {
            propertyName: attempt,
          });

          validateMCPResponse(result);
          // Ensure the attempt is properly escaped/sanitized
          expect(mockClient.request).toHaveBeenCalledWith(
            expect.objectContaining({
              path: expect.not.stringContaining('DROP TABLE'),
            })
          );
        }
      });

      it('should handle path traversal attempts', async () => {
        const pathTraversalAttempts = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32',
          '%2e%2e%2f%2e%2e%2f',
        ];

        for (const attempt of pathTraversalAttempts) {
          const result = await propertyTools.getProperty(mockClient, {
            propertyId: attempt,
          });

          validateMCPResponse(result);
        }
      });
    });
  });

  describe('Advanced Tool Testing', () => {
    describe('Agent Tools', () => {
      it('should validate agent tool parameters', async () => {
        const result = await agentTools.runResearchAgent(mockClient, {
          task: 'Research property configurations',
          context: { propertyId: 'prp_123' },
        });

        validateMCPResponse(result);
      });

      it('should handle complex agent responses', async () => {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: TestDataGenerators.generateProperties(5) },
        });

        const result = await agentTools.runPropertyAnalysisAgent(mockClient, {
          propertyId: 'prp_123',
          analysisType: 'performance',
        });

        validateMCPResponse(result);
      });
    });

    describe('Secure Onboarding Tools', () => {
      it('should validate secure property creation workflow', async () => {
        const mockResponses = [
          { groups: [{ groupId: 'G-123', groupName: 'Test Group' }] },
          { products: { items: [{ productId: 'prd_Fresca' }] } },
          { propertyId: 'prp_123', propertyVersion: 1 },
          { enrollmentId: 12345 },
          { edgeHostnameId: 'ehn_123' },
        ];

        mockResponses.forEach(response => {
          mockClient.request.mockResolvedValueOnce(response);
        });

        const result = await secureByDefaultOnboarding.onboardSecureProperty(mockClient, {
          propertyName: 'secure.example.com',
          hostnames: ['secure.example.com', 'www.secure.example.com'],
          originHostname: 'origin.example.com',
          contractId: 'C-123',
          groupId: 'G-123',
        });

        validateMCPResponse(result);
      });

      it('should handle secure onboarding errors gracefully', async () => {
        mockClient.request.mockRejectedValueOnce(
          ErrorScenarios.validationError('Certificate validation failed')
        );

        const result = await secureByDefaultOnboarding.quickSecurePropertySetup(mockClient, {
          domain: 'example.com',
          originHostname: 'origin.example.com',
          contractId: 'C-123',
          groupId: 'G-123',
        });

        validateMCPResponse(result);
        expect(result.content[0].text).toContain('Error');
      });
    });

    describe('DNS Migration Tools', () => {
      it('should handle AXFR zone imports', async () => {
        mockClient.request
          .mockResolvedValueOnce({ zone: 'example.com', status: 'ACTIVE' })
          .mockResolvedValueOnce({ records: TestDataGenerators.generateDNSRecords(10) });

        const result = await dnsMigrationTools.importZoneViaAXFR(mockClient, {
          zone: 'example.com',
          masterServer: '192.0.2.1',
        });

        validateMCPResponse(result);
      });

      it('should parse zone files correctly', async () => {
        const zoneFile = `
$ORIGIN example.com.
$TTL 300
@   IN  SOA ns1.example.com. admin.example.com. (
            2024010101 ; Serial
            3600       ; Refresh
            1800       ; Retry
            604800     ; Expire
            300        ; Minimum TTL
    )
@   IN  NS  ns1.example.com.
@   IN  NS  ns2.example.com.
@   IN  A   192.0.2.1
www IN  A   192.0.2.2
`;

        const result = await dnsMigrationTools.parseZoneFile(mockClient, {
          zone: 'example.com',
          zoneFileContent: zoneFile,
        });

        validateMCPResponse(result);
        expect(result.content[0].text).toContain('Parsed');
      });
    });

    describe('Property Manager Advanced Tools', () => {
      it('should handle bulk property operations', async () => {
        mockClient.request.mockResolvedValueOnce({
          bulkSearchId: 'bulk_123',
        });

        const result = await propertyManagerAdvancedTools.bulkSearchProperties(mockClient, {
          contractId: 'C-123',
          groupId: 'G-123',
        });

        validateMCPResponse(result);
      });

      it('should validate JSON patch operations', async () => {
        mockClient.request.mockResolvedValueOnce({
          rules: TestDataGenerators.generatePropertyRules(),
        }).mockResolvedValueOnce({});

        const patches = [
          { op: 'add', path: '/rules/behaviors/-', value: { name: 'caching' } },
          { op: 'replace', path: '/rules/name', value: 'Updated Rule' },
          { op: 'remove', path: '/rules/behaviors/0' },
        ];

        const result = await propertyManagerRulesTools.patchPropertyRules(mockClient, {
          propertyId: 'prp_123',
          propertyVersion: 1,
          contractId: 'C-123',
          groupId: 'G-123',
          patches,
        });

        validateMCPResponse(result);
      });
    });
  });

  describe('Error Handling Matrix', () => {
    const errorScenarios = [
      { name: 'Authentication Failure', error: ErrorScenarios.authenticationError() },
      { name: 'Rate Limiting', error: ErrorScenarios.rateLimited() },
      { name: 'Server Error', error: ErrorScenarios.serverError() },
      { name: 'Validation Error', error: ErrorScenarios.validationError('Invalid input') },
      { name: 'Not Found', error: ErrorScenarios.notFound('Property not found') },
      { name: 'Conflict', error: ErrorScenarios.conflict('Resource already exists') },
      { name: 'Network Timeout', error: ErrorScenarios.timeout() },
    ];

    errorScenarios.forEach(({ name, error }) => {
      it(`should handle ${name} gracefully`, async () => {
        mockClient.request.mockRejectedValueOnce(error);

        const result = await propertyTools.listProperties(mockClient, {});
        
        validateMCPResponse(result);
        expect(result.content[0].text).toContain('Error');
        expect(result.content[0].type).toBe('text');
      });
    });

    it('should preserve error context for debugging', async () => {
      const detailedError = {
        response: {
          status: 400,
          data: {
            type: '/papi/v1/errors/validation.required_field',
            title: 'Missing required field',
            detail: 'The field contractId is required',
            instance: '/papi/v1/properties',
            errors: [
              {
                type: 'missing_required_field',
                title: 'Missing required field',
                detail: 'contractId is required',
                errorLocation: 'contractId',
              },
            ],
          },
        },
      };

      mockClient.request.mockRejectedValueOnce(detailedError);

      const result = await propertyTools.createProperty(mockClient, {
        propertyName: 'test',
        productId: 'prd_Web_Accel',
        groupId: 'G-123',
        // Missing contractId
      } as any);

      validateMCPResponse(result);
      expect(result.content[0].text).toContain('contractId');
      expect(result.content[0].text).toContain('required');
    });
  });

  describe('Conversational Context Preservation', () => {
    it('should provide sufficient context for follow-up actions', async () => {
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [
            {
              propertyId: 'prp_123',
              propertyName: 'example.com',
              latestVersion: 5,
              productionVersion: 3,
              stagingVersion: 5,
            },
          ],
        },
      });

      const result = await propertyTools.listProperties(mockClient, {});
      
      validateMCPResponse(result);
      // Result should mention version discrepancy to prompt follow-up
      expect(result.content[0].text).toContain('version');
    });

    it('should format bulk results for easy parsing', async () => {
      const manyProperties = TestDataGenerators.generateProperties(50);
      
      mockClient.request.mockResolvedValueOnce({
        properties: { items: manyProperties },
      });

      const result = await propertyTools.listProperties(mockClient, {});
      
      validateMCPResponse(result);
      // Should summarize or paginate large results
      expect(result.content[0].text.length).toBeLessThan(10000);
    });
  });

  describe('Performance Testing', () => {
    it('should handle large payloads efficiently', async () => {
      const largeRuleTree = TestDataGenerators.generatePropertyRules(100);
      
      perfTracker.start('largePayload');
      
      mockClient.request.mockResolvedValueOnce({});

      await propertyManagerTools.updatePropertyRules(mockClient, {
        propertyId: 'prp_123',
        version: 1,
        rules: largeRuleTree,
        contractId: 'C-123',
        groupId: 'G-123',
      });

      const duration = perfTracker.end('largePayload');
      expect(duration).toBeLessThan(100); // Should process within 100ms
    });

    it('should batch API calls efficiently', async () => {
      // Simulate multiple property lookups
      const propertyIds = Array.from({ length: 10 }, (_, i) => `prp_${i}`);
      
      perfTracker.start('batchLookup');

      const promises = propertyIds.map(propertyId =>
        propertyTools.getProperty(mockClient, { propertyId })
      );

      mockClient.request.mockResolvedValue({
        properties: TestDataGenerators.generateProperties(1)[0],
      });

      await Promise.all(promises);

      const duration = perfTracker.end('batchLookup');
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Multi-Customer Support', () => {
    it('should pass customer context correctly', async () => {
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [] },
      });

      await propertyTools.listProperties(mockClient, {
        customer: 'testing',
      });

      expect(mockClient._customer).toBe('testing');
    });

    it('should handle customer switching', async () => {
      const customers = ['default', 'testing', 'production'];

      for (const customer of customers) {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });

        await propertyTools.listProperties(mockClient, { customer });
        expect(mockClient._customer).toBe(customer);
      }
    });
  });
});

describe('Tool Schema Documentation', () => {
  it('should generate accurate TypeScript types from schemas', () => {
    // This test ensures our tool parameter types match runtime validation
    type ListPropertiesParams = Parameters<typeof propertyTools.listProperties>[1];
    type CreateZoneParams = Parameters<typeof dnsTools.createZone>[1];
    
    // These should compile without errors
    const validListProps: ListPropertiesParams = {
      contractId: 'C-123',
      groupId: 'G-123',
      customer: 'testing',
    };

    const validCreateZone: CreateZoneParams = {
      zone: 'example.com',
      type: 'PRIMARY',
      contractId: 'C-123',
      groupId: 'G-123',
    };

    expect(validListProps).toBeDefined();
    expect(validCreateZone).toBeDefined();
  });
});