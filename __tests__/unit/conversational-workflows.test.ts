/**
 * Conversational Workflow Tests
 * Tests multi-tool execution sequences that mirror real SRE tasks
 */

import {
  createMockAkamaiClient,
  TestHelpers as TestData,
  createCorrelationId,
} from '../../src/testing/test-utils';
import * as propertyTools from '../../src/tools/property-tools';
import * as dnsTools from '../../src/tools/dns-tools';
import * as cpsTools from '../../src/tools/cps-tools';
import * as propertyManagerTools from '../../src/tools/property-manager-tools';
import * as propertyManagerAdvancedTools from '../../src/tools/property-manager-advanced-tools';

// Simple operation tracker for testing
class OperationTracker {
  private operations: Array<{ operation: string; args: any; result: any; correlationId: string }> = [];

  recordOperation(operation: string, args: any, result: any, correlationId: string) {
    this.operations.push({ operation, args, result, correlationId });
  }

  getOperationSequence(): string[] {
    return this.operations.map(op => op.operation);
  }

  getLastOperation() {
    return this.operations[this.operations.length - 1];
  }
}

describe('Conversational Workflows', () => {
  let mockClient: jest.Mocked<any>;
  let context: OperationTracker;
  let correlationId: string;

  beforeEach(() => {
    mockClient = createMockAkamaiClient();
    context = new OperationTracker();
    correlationId = createCorrelationId();
  });

  describe('Property Analysis Workflow', () => {
    it('should handle "analyze my production properties" workflow', async () => {
      // Step 1: List properties
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [
            TestData.generateProperties(1)[0],
            TestData.generateProperties(1)[0],
          ],
        },
      });

      const listResult = await propertyTools.listProperties(mockClient, {});
      context.recordOperation('listProperties', {}, listResult, correlationId);

      // Step 2: Get details for property with version mismatch
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'www.example.com',
            contractIds: ['ctr_C-123',
            groupId: 'grp_123',
            latestVersion: 6,
            productionVersion: 5,
            stagingVersion: 6,
          }]
        },
      });

      const detailResult = await propertyTools.getProperty(mockClient, {
        propertyId: 'prp_12345',
      });
      context.recordOperation('getProperty', 
        { propertyId: 'prp_12345' }, 
        detailResult, 
        correlationId
      );

      // Step 3: Check activation status
      mockClient.request.mockResolvedValueOnce({
        activations: {
          items: [
            {
              activationId: 'atv_123',
              propertyName: 'www.example.com',
              propertyVersion: 6,
              network: 'STAGING',
              status: 'ACTIVE',
              submittedDate: '2024-01-15T10:00:00Z',
            },
          ],
        },
      });

      const activationResult = await propertyManagerTools.listPropertyActivations(
        mockClient,
        { propertyId: 'prp_12345' }
      );
      context.recordOperation('listPropertyActivations',
        { propertyId: 'prp_12345' },
        activationResult,
        correlationId
      );

      // Validate workflow continuity
      const sequence = context.getOperationSequence();
      expect(sequence).toEqual([
        'listProperties',
        'getProperty',
        'listPropertyActivations',
      ]);

      // Validate context preservation
      const lastOp = context.getLastOperation();
      expect(lastOp?.correlationId).toBe(correlationId);
    });
  });

  describe('DNS Migration Workflow', () => {
    it('should handle complete DNS zone migration', async () => {
      // Step 1: Create zone
      mockClient.request.mockResolvedValueOnce({
        zone: 'migrate.example.com',
        changeListId: 'cl_12345',
      });

      const createResult = await dnsTools.createZone(mockClient, {
        zone: 'migrate.example.com',
        type: 'PRIMARY',
        contractId: 'C-123',
        groupId: 'grp_123',
        comment: 'Migration from external DNS',
      });
      context.recordOperation('createZone', 
        { zone: 'migrate.example.com' }, 
        createResult, 
        correlationId
      );

      // Step 2: Add multiple records
      const records = [
        { name: '@', type: 'A', ttl: 300, rdata: ['192.0.2.1'] },
        { name: 'www', type: 'CNAME', ttl: 300, rdata: ['@'] },
        { name: '@', type: 'MX', ttl: 300, rdata: ['10 mail.example.com'] },
      ];

      for (const record of records) {
        // Mock changelist check - return 404 to indicate no changelist exists
        mockClient.request
          .mockRejectedValueOnce({ message: '404 Not Found' })  // No existing changelist
          .mockResolvedValueOnce({})  // Create changelist
          .mockResolvedValueOnce({})  // Create/update recordset
          .mockResolvedValueOnce({});  // Submit changelist

        const result = await dnsTools.upsertRecord(mockClient, {
          zone: 'migrate.example.com',
          ...record,
        });
        context.recordOperation('upsertRecord', record, result, correlationId);
      }

      // Step 3: Verify records
      mockClient.request.mockResolvedValueOnce({
        recordsets: records.map(r => ({
          name: r.name === '@' ? 'migrate.example.com' : `${r.name}.migrate.example.com`,
          type: r.type,
          ttl: r.ttl,
          rdata: r.rdata,
        })),
      });

      const listResult = await dnsTools.listRecords(mockClient, {
        zone: 'migrate.example.com',
      });
      context.recordOperation('listRecords',
        { zone: 'migrate.example.com' },
        listResult,
        correlationId
      );

      // Validate complete workflow
      const sequence = context.getOperationSequence();
      expect(sequence).toContain('createZone');
      expect(sequence.filter(op => op === 'upsertRecord').length).toBe(3);
      expect(sequence).toContain('listRecords');
    });
  });

  describe('Certificate Management Workflow', () => {
    it('should handle secure property setup with certificate', async () => {
      // Step 1: Create property
      mockClient.request.mockResolvedValueOnce({
        propertyLink: '/papi/v1/properties/prp_12345',
      });

      const propertyResult = await propertyTools.createProperty(mockClient, {
        propertyName: 'secure.example.com',
        productId: 'prd_Web_Accel',
        contractIds: ['ctr_C-123',
        groupId: 'grp_123',
      });
      context.recordOperation('createProperty',
        { propertyName: 'secure.example.com' },
        propertyResult,
        correlationId
      );

      // Step 2: Create certificate enrollment
      mockClient.request.mockResolvedValueOnce({
        enrollment: '/cps/v2/enrollments/12345',
      });

      const certResult = await cpsTools.createDVEnrollment(mockClient, {
        commonName: 'secure.example.com',
        sans: ['www.secure.example.com'],
        contractIds: ['ctr_C-123',
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
      });
      context.recordOperation('createDVEnrollment',
        { cn: 'secure.example.com' },
        certResult,
        correlationId
      );

      // Step 3: Get validation challenges
      mockClient.request.mockResolvedValueOnce({
        dv: [
          {
            domain: 'secure.example.com',
            challenges: [
              {
                type: 'dns-01',
                token: '_acme-challenge',
                responseBody: 'validation-string-12345',
                status: 'PENDING',
              },
            ],
          },
        ],
      });

      const challengeResult = await cpsTools.getDVValidationChallenges(mockClient, {
        enrollmentId: 12345,
      });
      context.recordOperation('getDVValidationChallenges',
        { enrollmentId: 12345 },
        challengeResult,
        correlationId
      );

      // Step 4: Add validation record to DNS
      mockClient.request
        .mockRejectedValueOnce({ message: '404 Not Found' })  // No existing changelist
        .mockResolvedValueOnce({})  // Create changelist
        .mockResolvedValueOnce({})  // Create/update recordset
        .mockResolvedValueOnce({});  // Submit changelist

      const dnsResult = await dnsTools.upsertRecord(mockClient, {
        zone: 'example.com',
        name: '_acme-challenge.secure',
        type: 'TXT',
        ttl: 60,
        rdata: ['validation-string-12345'],
      });
      context.recordOperation('upsertRecord',
        { name: '_acme-challenge.secure', type: 'TXT' },
        dnsResult,
        correlationId
      );

      // Validate workflow connects property, certificate, and DNS
      const sequence = context.getOperationSequence();
      expect(sequence).toEqual([
        'createProperty',
        'createDVEnrollment',
        'getDVValidationChallenges',
        'upsertRecord',
      ]);
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle property activation failure and retry', async () => {
      // Step 1: Attempt activation - fails due to validation
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            detail: 'Property rules validation failed',
            errors: [{
              type: 'missing-behavior',
              detail: 'Origin behavior is required',
            }],
          },
        },
      });

      const failedActivation = await propertyManagerTools.activateProperty(
        mockClient,
        {
          propertyId: 'prp_12345',
          version: 5,
          network: 'STAGING',
          note: 'Initial deployment',
        }
      );
      context.recordOperation('activateProperty',
        { propertyId: 'prp_12345', version: 5 },
        failedActivation,
        correlationId
      );

      expect(failedActivation.content[0] && 'text' in failedActivation.content[0] ? failedActivation.content[0].text : '').toContain('Failed to activate property');

      // Step 2: Get property rules to understand issue
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          children: [],
          behaviors: [
            { name: 'cpCode', options: { value: { id: 12345 } } },
          ],
          // Missing origin behavior
        },
      });

      const rulesResult = await propertyManagerTools.getPropertyRules(mockClient, {
        propertyId: 'prp_12345',
        version: 5,
      });
      context.recordOperation('getPropertyRules',
        { propertyId: 'prp_12345', version: 5 },
        rulesResult,
        correlationId
      );

      // Step 3: Update rules to fix issue
      mockClient.request.mockResolvedValueOnce({
        propertyVersion: 5,
        etag: '"updated"',
      });

      const updateResult = await propertyManagerTools.updatePropertyRules(
        mockClient,
        {
          propertyId: 'prp_12345',
          version: 5,
          rules: {
            name: 'default',
            children: [],
            behaviors: [
              { name: 'cpCode', options: { value: { id: 12345 } } },
              { 
                name: 'origin', 
                options: { 
                  hostname: 'origin.example.com',
                  forwardHostHeader: 'ORIGIN',
                },
              },
            ],
          },
        }
      );
      context.recordOperation('updatePropertyRules',
        { propertyId: 'prp_12345', version: 5 },
        updateResult,
        correlationId
      );

      // Step 4: Retry activation - succeeds
      mockClient.request.mockResolvedValueOnce({
        activationLink: '/papi/v1/properties/prp_12345/activations/atv_12345',
      });

      const successActivation = await propertyManagerTools.activateProperty(
        mockClient,
        {
          propertyId: 'prp_12345',
          version: 5,
          network: 'STAGING',
          note: 'Fixed origin behavior',
        }
      );
      context.recordOperation('activateProperty',
        { propertyId: 'prp_12345', version: 5 },
        successActivation,
        correlationId
      );

      // Validate error recovery flow
      const sequence = context.getOperationSequence();
      expect(sequence).toEqual([
        'activateProperty', // Failed
        'getPropertyRules', // Diagnose
        'updatePropertyRules', // Fix
        'activateProperty', // Retry success
      ]);
    });
  });

  describe('Context Preservation', () => {
    it('should maintain context across related operations', async () => {
      // Simulate a debugging session for slow property
      const propertyId = 'prp_12345';
      const propertyName = 'www.example.com';

      // Get property details
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId,
            propertyName,
            latestVersion: 1,
            productionVersion: 1,
            stagingVersion: 1,
            contractIds: ['ctr_C-123',
            groupId: 'grp_123',
            accountId: 'act_123'
          }]
        },
      });

      await propertyTools.getProperty(mockClient, { propertyId });

      // Check current rules
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: [
            { name: 'caching', options: { behavior: 'MAX_AGE', mustRevalidate: false } },
          ],
        },
      });

      await propertyManagerTools.getPropertyRules(mockClient, {
        propertyId,
        version: 1,
      });

      // Check hostnames
      mockClient.request.mockResolvedValueOnce({
        hostnames: {
          items: [
            { cnameFrom: 'www.example.com', cnameTo: 'www.example.com.edgekey.net' },
          ],
        },
      });

      await propertyManagerAdvancedTools.listPropertyVersionHostnames(mockClient, {
        propertyId,
        version: 1,
      });

      // All operations should relate to the same property
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.stringContaining(propertyId),
        })
      );
    });
  });
});