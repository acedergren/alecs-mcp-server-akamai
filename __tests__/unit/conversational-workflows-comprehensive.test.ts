/**
 * Conversational Workflow Tests
 * Validates multi-tool workflows that mirror real SRE tasks
 */

import { 
  createMockAkamaiClient,
  createTestServer,
  validateMCPResponse,
  TestDataGenerators,
  ConversationalContextTracker,
  WorkflowSimulator,
  PerformanceTracker
} from '../../src/testing/test-utils';

describe('Conversational Workflows', () => {
  const mockClient = createMockAkamaiClient();
  const testServer = createTestServer();
  const contextTracker = new ConversationalContextTracker();
  const workflowSim = new WorkflowSimulator(testServer, mockClient);
  const perfTracker = new PerformanceTracker();

  beforeEach(() => {
    jest.clearAllMocks();
    contextTracker.reset();
    perfTracker.reset();
  });

  describe('Property Onboarding Workflow', () => {
    it('should complete full property onboarding conversation', async () => {
      const workflow = {
        domain: 'newsite.example.com',
        origin: 'origin.example.com',
        contractId: 'C-123',
        groupId: 'G-123',
      };

      // Step 1: User asks to create a new property
      contextTracker.addUserMessage('I need to set up a new CDN property for newsite.example.com');
      
      // Simulate research phase
      mockClient.request
        .mockResolvedValueOnce({ // List groups to confirm access
          groups: [{ groupId: 'G-123', groupName: 'Production Sites' }]
        })
        .mockResolvedValueOnce({ // List products to find best fit
          products: { items: [
            { productId: 'prd_Fresca', productName: 'Ion Standard' },
            { productId: 'prd_Site_Accel', productName: 'Dynamic Site Accelerator' }
          ]}
        });

      const analysisResult = await workflowSim.runTool('agent.property.analysis', {
        task: 'Analyze requirements for newsite.example.com',
        context: workflow,
      });

      expect(analysisResult.content[0].text).toContain('Ion Standard');
      contextTracker.addAssistantResponse(analysisResult.content[0].text);

      // Step 2: Create the property
      contextTracker.addUserMessage('Create the property with Ion Standard product');
      mockClient.request.mockResolvedValueOnce({
        propertyLink: '/papi/v1/properties/prp_123',
        propertyId: 'prp_123',
      });

      const createResult = await workflowSim.runTool('property.create', {
        propertyName: workflow.domain,
        productId: 'prd_Fresca',
        contractId: workflow.contractId,
        groupId: workflow.groupId,
      });

      expect(createResult.content[0].text).toContain('prp_123');
      contextTracker.addAssistantResponse(createResult.content[0].text);

      // Step 3: Configure origin server
      contextTracker.addUserMessage('Set up origin server for the property');
      mockClient.request
        .mockResolvedValueOnce({ // Get current rules
          rules: TestDataGenerators.generatePropertyRules()
        })
        .mockResolvedValueOnce({}); // Update rules

      const configResult = await workflowSim.runTool('property.rules.update', {
        propertyId: 'prp_123',
        updates: {
          origin: workflow.origin,
          caching: 'standard',
        },
      });

      expect(configResult.content[0].text).toContain('configured');
      contextTracker.addAssistantResponse(configResult.content[0].text);

      // Step 4: Add hostname and edge hostname
      contextTracker.addUserMessage('Add the hostname mapping');
      mockClient.request
        .mockResolvedValueOnce({ // Create edge hostname
          edgeHostnameId: 'ehn_456',
          domainPrefix: 'newsite',
          domainSuffix: '.edgesuite.net',
        })
        .mockResolvedValueOnce({}); // Add hostname

      const hostnameResult = await workflowSim.runTool('property.hostname.add', {
        propertyId: 'prp_123',
        hostname: workflow.domain,
        edgeHostname: 'newsite.example.com.edgesuite.net',
      });

      expect(hostnameResult.content[0].text).toContain('hostname added');
      contextTracker.addAssistantResponse(hostnameResult.content[0].text);

      // Step 5: Activate to staging
      contextTracker.addUserMessage('Activate the property to staging');
      mockClient.request.mockResolvedValueOnce({
        activationLink: '/papi/v1/properties/prp_123/activations/atv_789',
        activationId: 'atv_789',
      });

      const activateResult = await workflowSim.runTool('property.activate', {
        propertyId: 'prp_123',
        network: 'STAGING',
        note: 'Initial staging deployment',
      });

      expect(activateResult.content[0].text).toContain('atv_789');
      expect(activateResult.content[0].text).toContain('staging');
      contextTracker.addAssistantResponse(activateResult.content[0].text);

      // Verify conversation flow maintained context
      const context = contextTracker.getContext();
      expect(context.messages.length).toBe(10); // 5 user + 5 assistant
      expect(context.entities.propertyId).toBe('prp_123');
      expect(context.entities.domain).toBe(workflow.domain);
    });

    it('should handle errors gracefully in workflow', async () => {
      // Simulate property creation with validation error
      contextTracker.addUserMessage('Create a property for invalid domain.com');

      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            title: 'Invalid property name',
            detail: 'Property name contains invalid characters',
          },
        },
      });

      const createResult = await workflowSim.runTool('property.create', {
        propertyName: 'invalid domain.com',
        productId: 'prd_Fresca',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      expect(createResult.content[0].text).toContain('invalid characters');
      contextTracker.addAssistantResponse(createResult.content[0].text);

      // Assistant should suggest correction
      expect(createResult.content[0].text).toMatch(/try|suggest|instead/i);

      // User corrects the issue
      contextTracker.addUserMessage('Ok, use invalid-domain.com instead');

      mockClient.request.mockResolvedValueOnce({
        propertyId: 'prp_124',
      });

      const retryResult = await workflowSim.runTool('property.create', {
        propertyName: 'invalid-domain.com',
        productId: 'prd_Fresca',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      expect(retryResult.content[0].text).toContain('prp_124');
      expect(retryResult.content[0].text).toContain('Successfully created');
    });
  });

  describe('DNS Migration Workflow', () => {
    it('should handle complete DNS zone migration', async () => {
      const workflow = {
        zone: 'migrate.example.com',
        sourceServer: '192.0.2.1',
      };

      // Set workflow context
      contextTracker.setWorkflowState({
        type: 'dns_migration',
        zone: workflow.zone,
        sourceServer: workflow.sourceServer,
      });

      // Step 1: Analyze existing DNS configuration
      contextTracker.addUserMessage(
        `I need to migrate DNS for ${workflow.zone} from ${workflow.sourceServer} to Akamai`
      );

      mockClient.request.mockResolvedValueOnce({
        zoneInfo: {
          recordCount: 42,
          hasNS: true,
          hasMX: true,
          hasSPF: true,
        },
      });

      const analysisResult = await workflowSim.runTool('dns.zone.analyze', {
        zone: workflow.zone,
        masterServer: workflow.sourceServer,
      });

      expect(analysisResult.content[0].text).toContain('42 records');
      contextTracker.addAssistantResponse(analysisResult.content[0].text);

      // Step 2: Create zone
      mockClient.request.mockResolvedValueOnce({
        zone: workflow.zone,
        versionId: 'v1',
      });

      const createResult = await workflowSim.runTool('dns.zone.create', {
        zone: workflow.zone,
        type: 'PRIMARY',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      expect(createResult.content[0].text).toContain('Created zone');
      contextTracker.addAssistantResponse(createResult.content[0].text);

      // Step 3: Import records via AXFR
      const mockRecords = TestDataGenerators.generateDNSRecords(42);
      
      mockClient.request
        .mockResolvedValueOnce({ // AXFR transfer
          records: mockRecords,
          transferStatus: 'success',
        })
        .mockResolvedValueOnce({ // Bulk import
          imported: 42,
          failed: 0,
        });

      const importResult = await workflowSim.runTool('dns.zone.import', {
        zone: workflow.zone,
        masterServer: workflow.sourceServer,
        method: 'AXFR',
      });

      expect(importResult.content[0].text).toContain('42 records imported');
      contextTracker.addAssistantResponse(importResult.content[0].text);

      // Step 4: Validate imported records
      mockClient.request.mockResolvedValueOnce({
        validation: {
          valid: true,
          warnings: ['SPF record may need updating'],
        },
      });

      const validateResult = await workflowSim.runTool('dns.zone.validate', {
        zone: workflow.zone,
      });

      expect(validateResult.content[0].text).toContain('validation passed');
      expect(validateResult.content[0].text).toContain('SPF record');
      contextTracker.addAssistantResponse(validateResult.content[0].text);

      // Step 5: Generate migration instructions
      const instructionsResult = await workflowSim.runTool('dns.migration.instructions', {
        zone: workflow.zone,
        nameservers: ['a1-1.akam.net', 'a2-2.akam.net'],
      });

      expect(instructionsResult.content[0].text).toContain('Update nameservers');
      expect(instructionsResult.content[0].text).toContain('a1-1.akam.net');
      contextTracker.addAssistantResponse(instructionsResult.content[0].text);

      // Verify workflow maintained context
      const context = contextTracker.getContext();
      expect(context.entities.zone).toBe(workflow.zone);
      expect(context.workflow).toBe('dns_migration');
    });

    it('should handle incremental DNS updates', async () => {
      // User wants to add records to existing zone
      contextTracker.addUserMessage('Add load balancing records to app.example.com');

      mockClient.request.mockResolvedValueOnce({
        recordsets: TestDataGenerators.generateDNSRecords(10),
      });

      // First, check existing records
      const listResult = await workflowSim.runTool('dns.records.list', {
        zone: 'app.example.com',
        name: 'www',
      });

      expect(listResult.content[0].text).toContain('Current records');
      contextTracker.addAssistantResponse(listResult.content[0].text);

      // Add new A records for load balancing
      const newRecords = [
        { name: 'www', type: 'A', ttl: 300, rdata: ['192.0.2.10'] },
        { name: 'www', type: 'A', ttl: 300, rdata: ['192.0.2.11'] },
        { name: 'www', type: 'A', ttl: 300, rdata: ['192.0.2.12'] },
      ];

      mockClient.request.mockResolvedValueOnce({
        changelist: 'cl_123',
        changes: 3,
      });

      const updateResult = await workflowSim.runTool('dns.records.bulk.upsert', {
        zone: 'app.example.com',
        records: newRecords,
        comment: 'Add load balancing IPs',
      });

      expect(updateResult.content[0].text).toContain('3 records');
      expect(updateResult.content[0].text).toContain('load balancing');
      contextTracker.addAssistantResponse(updateResult.content[0].text);
    });
  });

  describe('Certificate Management Workflow', () => {
    it('should handle secure property setup with DV certificate', async () => {
      const workflow = {
        domain: 'secure.example.com',
        san: ['www.secure.example.com', 'api.secure.example.com'],
      };

      // Set workflow context
      contextTracker.setWorkflowState({
        type: 'certificate_setup',
        domain: 'secure.example.com',
        subdomains: ['www', 'api'],
      });

      contextTracker.addUserMessage(
        'Set up HTTPS for secure.example.com with www and api subdomains'
      );

      // Step 1: Check if property exists
      mockClient.request.mockResolvedValueOnce({
        properties: { 
          items: [{
            propertyId: 'prp_999',
            propertyName: 'secure.example.com',
            latestVersion: 3,
          }]
        },
      });

      const searchResult = await workflowSim.runTool('property.search', {
        hostname: workflow.domain,
      });

      expect(searchResult.content[0].text).toContain('Found existing property');
      expect(searchResult.content[0].text).toContain('prp_999');
      contextTracker.addAssistantResponse(searchResult.content[0].text);

      // Step 2: Create DV enrollment
      mockClient.request.mockResolvedValueOnce({
        enrollmentId: 12345,
        status: 'pending-validation',
      });

      const enrollResult = await workflowSim.runTool('certificate.dv.create', {
        commonName: workflow.domain,
        sans: workflow.san,
        contractId: 'C-123',
        adminContact: TestDataGenerators.generateContact(),
        techContact: TestDataGenerators.generateContact(),
      });

      expect(enrollResult.content[0].text).toContain('12345');
      expect(enrollResult.content[0].text).toContain('validation required');
      contextTracker.addAssistantResponse(enrollResult.content[0].text);

      // Step 3: Get validation challenges
      mockClient.request.mockResolvedValueOnce({
        challenges: [
          {
            domain: 'secure.example.com',
            validationType: 'dns-01',
            dnsRecord: {
              name: '_acme-challenge.secure.example.com',
              type: 'CNAME',
              target: 'dcv.akamai.com',
            },
          },
          {
            domain: 'www.secure.example.com',
            validationType: 'dns-01',
            dnsRecord: {
              name: '_acme-challenge.www.secure.example.com',
              type: 'CNAME',
              target: 'dcv.akamai.com',
            },
          },
        ],
      });

      const challengesResult = await workflowSim.runTool('certificate.dv.challenges', {
        enrollmentId: 12345,
      });

      expect(challengesResult.content[0].text).toContain('DNS validation');
      expect(challengesResult.content[0].text).toContain('_acme-challenge');
      contextTracker.addAssistantResponse(challengesResult.content[0].text);

      // Step 4: Create validation records
      mockClient.request.mockResolvedValueOnce({
        recordsCreated: 2,
      });

      const dnsResult = await workflowSim.runTool('dns.records.bulk.create', {
        zone: 'example.com',
        records: [
          {
            name: '_acme-challenge.secure',
            type: 'CNAME',
            ttl: 300,
            rdata: ['dcv.akamai.com'],
          },
          {
            name: '_acme-challenge.www.secure',
            type: 'CNAME', 
            ttl: 300,
            rdata: ['dcv.akamai.com'],
          },
        ],
      });

      expect(dnsResult.content[0].text).toContain('validation records created');
      contextTracker.addAssistantResponse(dnsResult.content[0].text);

      // Step 5: Check validation status
      mockClient.request.mockResolvedValueOnce({
        status: 'validated',
        certificate: {
          serialNumber: 'ABC123',
          validFrom: '2024-01-01',
          validTo: '2025-01-01',
        },
      });

      const statusResult = await workflowSim.runTool('certificate.dv.status', {
        enrollmentId: 12345,
      });

      expect(statusResult.content[0].text).toContain('validated');
      expect(statusResult.content[0].text).toContain('2025-01-01');
      contextTracker.addAssistantResponse(statusResult.content[0].text);

      // Step 6: Link certificate to property
      mockClient.request.mockResolvedValueOnce({
        linked: true,
        edgeHostname: 'secure.example.com.edgekey.net',
      });

      const linkResult = await workflowSim.runTool('property.certificate.link', {
        propertyId: 'prp_999',
        enrollmentId: 12345,
      });

      expect(linkResult.content[0].text).toContain('linked');
      expect(linkResult.content[0].text).toContain('edgekey.net');
      contextTracker.addAssistantResponse(linkResult.content[0].text);

      // Verify complete workflow context
      const context = contextTracker.getContext();
      expect(context.entities.propertyId).toBe('prp_999');
      expect(context.entities.enrollmentId).toBe(12345);
      expect(context.workflow).toBe('certificate_setup');
    });
  });

  describe('Multi-Step Property Analysis', () => {
    it('should perform comprehensive property analysis', async () => {
      contextTracker.addUserMessage(
        'Analyze the performance and configuration of my main website property'
      );

      // Step 1: Find the property
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [{
          propertyId: 'prp_main',
          propertyName: 'www.company.com',
          latestVersion: 15,
          productionVersion: 12,
          stagingVersion: 15,
        }]},
      });

      const findResult = await workflowSim.runTool('property.search', {
        propertyName: 'www.company.com',
      });

      expect(findResult.content[0].text).toContain('prp_main');
      expect(findResult.content[0].text).toContain('staging is ahead');
      contextTracker.addAssistantResponse(findResult.content[0].text);

      // Step 2: Get production configuration
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin.company.com' } },
            { name: 'caching', options: { behavior: 'MAX_AGE', ttl: '1d' } },
            { name: 'cpCode', options: { value: { id: 12345 } } },
          ],
        },
      });

      const rulesResult = await workflowSim.runTool('property.rules.get', {
        propertyId: 'prp_main',
        version: 12,
      });

      expect(rulesResult.content[0].text).toContain('origin.company.com');
      expect(rulesResult.content[0].text).toContain('1d');
      contextTracker.addAssistantResponse(rulesResult.content[0].text);

      // Step 3: Check recent activations
      mockClient.request.mockResolvedValueOnce({
        activations: { items: [
          {
            activationId: 'atv_100',
            propertyVersion: 12,
            network: 'PRODUCTION',
            status: 'ACTIVE',
            submitDate: '2024-01-15T10:00:00Z',
            updateDate: '2024-01-15T10:15:00Z',
          },
          {
            activationId: 'atv_101',
            propertyVersion: 15,
            network: 'STAGING',
            status: 'ACTIVE',
            submitDate: '2024-01-20T14:00:00Z',
            updateDate: '2024-01-20T14:10:00Z',
          },
        ]},
      });

      const activationsResult = await workflowSim.runTool('property.activations.list', {
        propertyId: 'prp_main',
      });

      expect(activationsResult.content[0].text).toContain('Recent activations');
      expect(activationsResult.content[0].text).toContain('v15 in staging');
      contextTracker.addAssistantResponse(activationsResult.content[0].text);

      // Step 4: Analyze differences between versions
      mockClient.request
        .mockResolvedValueOnce({ // Get staging rules
          rules: {
            name: 'default',
            behaviors: [
              { name: 'origin', options: { hostname: 'origin.company.com' } },
              { name: 'caching', options: { behavior: 'MAX_AGE', ttl: '2d' } },
              { name: 'cpCode', options: { value: { id: 12345 } } },
              { name: 'http2', options: { enabled: true } },
            ],
          },
        });

      const diffResult = await workflowSim.runTool('property.versions.diff', {
        propertyId: 'prp_main',
        version1: 12,
        version2: 15,
      });

      expect(diffResult.content[0].text).toContain('Changes between versions');
      expect(diffResult.content[0].text).toContain('TTL increased');
      expect(diffResult.content[0].text).toContain('HTTP/2 enabled');
      contextTracker.addAssistantResponse(diffResult.content[0].text);

      // Step 5: Performance recommendations
      const recommendationsResult = await workflowSim.runTool('agent.performance.analyze', {
        propertyId: 'prp_main',
        configuration: contextTracker.getContext().entities,
      });

      expect(recommendationsResult.content[0].text).toContain('Recommendations');
      contextTracker.addAssistantResponse(recommendationsResult.content[0].text);

      // Verify analysis workflow maintained proper context
      const context = contextTracker.getContext();
      expect(context.entities.propertyId).toBe('prp_main');
      expect(context.entities.productionVersion).toBe(12);
      expect(context.entities.stagingVersion).toBe(15);
      expect(context.insights).toContain('version_mismatch');
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle activation failure and recovery', async () => {
      contextTracker.addUserMessage('Deploy property prp_123 to production');

      // Step 1: Attempt activation
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            type: 'validation_error',
            title: 'Property validation failed',
            errors: [{
              type: 'missing_behavior',
              detail: 'Origin behavior is required but not configured',
            }],
          },
        },
      });

      const activateResult = await workflowSim.runTool('property.activate', {
        propertyId: 'prp_123',
        network: 'PRODUCTION',
      });

      expect(activateResult.content[0].text).toContain('validation failed');
      expect(activateResult.content[0].text).toContain('Origin behavior');
      contextTracker.addAssistantResponse(activateResult.content[0].text);

      // Step 2: Get current configuration
      mockClient.request.mockResolvedValueOnce({
        rules: TestDataGenerators.generatePropertyRules(),
      });

      contextTracker.addUserMessage('What\'s the current origin configuration?');

      const rulesResult = await workflowSim.runTool('property.rules.get', {
        propertyId: 'prp_123',
      });

      expect(rulesResult.content[0].text).toContain('Current configuration');
      contextTracker.addAssistantResponse(rulesResult.content[0].text);

      // Step 3: Fix the configuration
      mockClient.request.mockResolvedValueOnce({
        updated: true,
        version: 2,
      });

      contextTracker.addUserMessage('Add origin behavior for origin.example.com');

      const updateResult = await workflowSim.runTool('property.rules.patch', {
        propertyId: 'prp_123',
        patches: [{
          op: 'add',
          path: '/rules/behaviors/-',
          value: {
            name: 'origin',
            options: { hostname: 'origin.example.com' },
          },
        }],
      });

      expect(updateResult.content[0].text).toContain('Updated');
      contextTracker.addAssistantResponse(updateResult.content[0].text);

      // Step 4: Retry activation
      mockClient.request.mockResolvedValueOnce({
        activationId: 'atv_retry',
        status: 'PENDING',
      });

      const retryResult = await workflowSim.runTool('property.activate', {
        propertyId: 'prp_123',
        network: 'PRODUCTION',
        acknowledgeWarnings: true,
      });

      expect(retryResult.content[0].text).toContain('atv_retry');
      expect(retryResult.content[0].text).toContain('successfully initiated');
      contextTracker.addAssistantResponse(retryResult.content[0].text);

      // Verify error recovery context
      const context = contextTracker.getContext();
      expect(context.errors).toContain('validation_error');
      expect(context.resolutions).toContain('added_origin_behavior');
    });
  });

  describe('Workflow Performance', () => {
    it('should complete workflows within reasonable time', async () => {
      perfTracker.start('fullWorkflow');

      // Simulate a complete property setup workflow
      const steps = [
        () => workflowSim.runTool('property.create', {
          propertyName: 'perf-test.example.com',
          productId: 'prd_Fresca',
          contractId: 'C-123',
          groupId: 'G-123',
        }),
        () => workflowSim.runTool('property.rules.update', {
          propertyId: 'prp_perf',
          rules: TestDataGenerators.generatePropertyRules(),
        }),
        () => workflowSim.runTool('property.hostname.add', {
          propertyId: 'prp_perf',
          hostname: 'perf-test.example.com',
        }),
        () => workflowSim.runTool('property.activate', {
          propertyId: 'prp_perf',
          network: 'STAGING',
        }),
      ];

      // Mock all responses
      mockClient.request
        .mockResolvedValueOnce({ propertyId: 'prp_perf' })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ activationId: 'atv_perf' });

      // Execute workflow steps
      for (const step of steps) {
        await step();
      }

      const duration = perfTracker.end('fullWorkflow');
      
      // Complete workflow should execute in under 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should handle parallel tool invocations efficiently', async () => {
      perfTracker.start('parallelOps');

      // Simulate parallel property lookups
      const properties = ['site1.com', 'site2.com', 'site3.com', 'site4.com', 'site5.com'];
      
      mockClient.request.mockImplementation(() => 
        Promise.resolve({
          properties: { items: [TestDataGenerators.generateProperties(1)[0]] },
        })
      );

      const promises = properties.map(name =>
        workflowSim.runTool('property.search', { propertyName: name })
      );

      const results = await Promise.all(promises);
      
      const duration = perfTracker.end('parallelOps');

      // Parallel operations should complete faster than sequential
      expect(duration).toBeLessThan(1000);
      expect(results).toHaveLength(5);
      results.forEach((result: any) => validateMCPResponse(result));
    });
  });

  describe('Context Preservation', () => {
    it('should maintain context across conversation turns', async () => {
      // Turn 1: User asks about a property
      contextTracker.addUserMessage('What\'s the status of example.com?');
      
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [{
          propertyId: 'prp_ctx',
          propertyName: 'example.com',
          latestVersion: 5,
        }]},
      });

      const searchResult = await workflowSim.runTool('property.get', {
        propertyName: 'example.com',
      });

      contextTracker.addAssistantResponse(searchResult.content[0].text);
      expect(contextTracker.getContext().entities.propertyId).toBe('prp_ctx');

      // Turn 2: User asks follow-up without mentioning property ID
      contextTracker.addUserMessage('Show me the current rules');

      mockClient.request.mockResolvedValueOnce({
        rules: TestDataGenerators.generatePropertyRules(),
      });

      // System should use context to know which property
      const rulesResult = await workflowSim.runTool('property.rules.get', {
        propertyId: contextTracker.getContext().entities.propertyId,
      });

      expect(rulesResult.content[0].text).toContain('rules');
      contextTracker.addAssistantResponse(rulesResult.content[0].text);

      // Turn 3: User references "it" 
      contextTracker.addUserMessage('Activate it to staging');

      mockClient.request.mockResolvedValueOnce({
        activationId: 'atv_ctx',
      });

      const activateResult = await workflowSim.runTool('property.activate', {
        propertyId: contextTracker.getContext().entities.propertyId,
        network: 'STAGING',
      });

      expect(activateResult.content[0].text).toContain('atv_ctx');
      contextTracker.addAssistantResponse(activateResult.content[0].text);

      // Verify context was maintained throughout
      const finalContext = contextTracker.getContext();
      expect(finalContext.entities.propertyId).toBe('prp_ctx');
      expect(finalContext.entities.activationId).toBe('atv_ctx');
      expect(finalContext.messages).toHaveLength(6);
    });

    it('should track workflow state for complex operations', async () => {
      // Define all workflow steps upfront
      const steps = [
        { name: 'clone_property', status: 'pending' },
        { name: 'update_hostnames', status: 'pending' },
        { name: 'migrate_rules', status: 'pending' },
        { name: 'validate_config', status: 'pending' },
        { name: 'activate_staging', status: 'pending' },
      ];

      const workflowState = {
        type: 'property_migration',
        source: 'old.example.com',
        target: 'new.example.com',
        steps: steps,
      };

      contextTracker.setWorkflowState(workflowState);

      // Execute migration steps by updating status
      const stepUpdates = [
        { name: 'clone_property', status: 'completed' },
        { name: 'update_hostnames', status: 'completed' },
        { name: 'migrate_rules', status: 'in_progress' },
        { name: 'validate_config', status: 'pending' },
        { name: 'activate_staging', status: 'pending' },
      ];

      for (let i = 0; i < stepUpdates.length; i++) {
        const stepUpdate = stepUpdates[i];
        // Update the step status in the workflow
        if (workflowState.steps[i] && stepUpdate) {
          const currentStep = workflowState.steps[i];
          if (currentStep) {
            currentStep.status = stepUpdate.status;
            contextTracker.updateWorkflowState(workflowState);

            if (stepUpdate.status === 'in_progress') {
              // Current step should be highlighted in responses
              const status = contextTracker.getWorkflowStatus();
              expect(status.currentStep).toBe('migrate_rules');
              expect(status.completedSteps).toBe(2);
              expect(status.totalSteps).toBe(5);
            }
          }
        }
      }
    });
  });
});