/**
 * End-to-End Workflow Integration Tests
 * 
 * Tests complete workflows that span multiple domains and demonstrate
 * the full capabilities of the ALECS orchestration system.
 */

import { WorkflowEngine, WorkflowState } from '../../orchestration/workflow-engine';
import { MCPToolExecutor } from '../../orchestration/mcp-tool-executor';
import { WORKFLOW_TEMPLATES } from '../../orchestration/workflow-templates';
import { OrchestrationTools } from '../../tools/orchestration/workflow-tools';
import { AkamaiClient } from '../../akamai-client';

// Mock dependencies with realistic responses
jest.mock('../../akamai-client');
jest.mock('../../utils/pino-logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }))
}));
jest.mock('../../services/cache-service-singleton', () => ({
  getCacheService: jest.fn(() => ({ initialize: jest.fn().mockResolvedValue(undefined), get: jest.fn(), set: jest.fn(), delete: jest.fn(), clear: jest.fn() }))
}));

// Mock tool registry with realistic tool responses
jest.mock('../../tools/tools-registry', () => ({
  getAllToolDefinitions: jest.fn(() => []),
  getToolByName: jest.fn((name) => {
    const toolResponses: Record<string, any> = {
      'dns.zones.list': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"zones": []}' }] }) },
      'dns.zone.create': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"zone": "example.com", "created": true}' }] }) },
      'dns.zone.activate': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"activated": true}' }] }) },
      'dns.records.list': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"records": []}' }] }) },
      'dns.record.upsert': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"record": "created"}' }] }) },
      'property.create': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"propertyId": "prp_123", "created": true}' }] }) },
      'property.rules.update': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"updated": true}' }] }) },
      'property.activate': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"activationId": "act_123"}' }] }) },
      'property.activation.status': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"status": "ACTIVE"}' }] }) },
      'certificate.dv.create': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"enrollmentId": 12345}' }] }) },
      'certificate.validation.get': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"challenges": []}' }] }) },
      'certificate.status': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"status": "issued"}' }] }) },
      'fastpurge.url': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"purgeId": "purge-123"}' }] }) },
      'fastpurge.status': { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"status": "complete"}' }] }) }
    };
    return toolResponses[name] || { handler: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"success": true}' }] }) };
  })
}));

describe('End-to-End Workflow Tests', () => {
  let workflowEngine: WorkflowEngine;
  let toolExecutor: MCPToolExecutor;
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeAll(() => {
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    toolExecutor = new MCPToolExecutor(mockClient);
    workflowEngine = new WorkflowEngine(toolExecutor);

    // Register all workflow templates
    Object.values(WORKFLOW_TEMPLATES).forEach(template => {
      if (template.steps && template.steps.length > 0) {
        workflowEngine.registerWorkflow(template);
      }
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Site Migration Workflow (15 steps)', () => {
    it('should execute full site migration successfully', async () => {
      const context = {
        domain: 'newsite.example.com',
        source_provider: 'cloudflare',
        origin_hostname: 'origin.newsite.example.com',
        contractId: 'ctr_123456',
        groupId: 'grp_789012',
        notification_email: 'admin@example.com',
        customer: 'enterprise-client'
      };

      const execution = await workflowEngine.executeWorkflow('site-migration-v1', context);

      expect(execution.state).toBe(WorkflowState.COMPLETED);
      expect(execution.steps.size).toBe(15);

      // Verify critical steps were executed
      const analyzeStep = execution.steps.get('analyze-dns');
      expect(analyzeStep?.state).toBe('completed');
      
      const createZoneStep = execution.steps.get('create-dns-zone');
      expect(createZoneStep?.state).toBe('completed');
      
      const createPropertyStep = execution.steps.get('create-property');
      expect(createPropertyStep?.state).toBe('completed');
      
      const sslProvisionStep = execution.steps.get('provision-ssl');
      expect(sslProvisionStep?.state).toBe('completed');
      
      const productionActivationStep = execution.steps.get('production-activation');
      expect(productionActivationStep?.state).toBe('completed');

      expect(execution.completedAt).toBeDefined();
      expect(execution.startedAt).toBeDefined();
    }, 30000); // 30 second timeout for complex workflow

    it('should handle migration rollback on failure', async () => {
      // Mock a failure in property creation step
      const failingToolExecutor = {
        execute: jest.fn().mockImplementation((toolName: string) => {
          if (toolName === 'property.create') {
            throw new Error('Property creation failed: Contract permission denied');
          }
          return Promise.resolve({ success: true });
        })
      };

      const failingEngine = new WorkflowEngine(failingToolExecutor);
      failingEngine.registerWorkflow(WORKFLOW_TEMPLATES.SITE_MIGRATION);

      const context = {
        domain: 'failsite.example.com',
        source_provider: 'aws',
        origin_hostname: 'origin.failsite.example.com',
        contractId: 'ctr_invalid',
        groupId: 'grp_123',
        notification_email: 'admin@example.com'
      };

      const execution = await failingEngine.executeWorkflow('site-migration-v1', context);

      expect(execution.state).toBe(WorkflowState.ROLLED_BACK);
      expect(execution.error?.message).toContain('Property creation failed');
      
      // Verify rollback was executed
      expect(failingToolExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('delete'),
        expect.any(Object)
      );
    });

    it('should support partial migration with manual intervention', async () => {
      const context = {
        domain: 'manualsite.example.com',
        source_provider: 'manual',
        origin_hostname: 'origin.manualsite.example.com',
        contractId: 'ctr_123',
        groupId: 'grp_123',
        notification_email: 'admin@example.com',
        manual_dns: true, // Skip DNS steps
        ssl_existing: true // Skip SSL steps
      };

      const execution = await workflowEngine.executeWorkflow('site-migration-v1', context);

      expect(execution.state).toBe(WorkflowState.COMPLETED);
      
      // Should skip DNS and SSL steps
      const skippedSteps = Array.from(execution.steps.values()).filter(
        step => step.state === 'skipped'
      );
      expect(skippedSteps.length).toBeGreaterThan(0);
    });
  });

  describe('Zero-Downtime Deployment Workflow (9 steps)', () => {
    it('should execute zero-downtime deployment successfully', async () => {
      const context = {
        propertyId: 'prp_123456',
        baseVersion: 5,
        newRules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'new-origin.example.com' } }
          ]
        },
        testHostname: 'staging.example.com',
        notification_email: 'ops@example.com',
        cpcodes: ['123456', '789012']
      };

      const execution = await workflowEngine.executeWorkflow('zero-downtime-deployment-v1', context);

      expect(execution.state).toBe(WorkflowState.COMPLETED);
      expect(execution.steps.size).toBe(9);

      // Verify deployment pipeline steps
      const createVersionStep = execution.steps.get('create-version');
      expect(createVersionStep?.state).toBe('completed');
      
      const stagingActivationStep = execution.steps.get('staging-activation');
      expect(stagingActivationStep?.state).toBe('completed');
      
      const productionActivationStep = execution.steps.get('production-activation');
      expect(productionActivationStep?.state).toBe('completed');
      
      const purgeStep = execution.steps.get('purge-cache');
      expect(purgeStep?.state).toBe('completed');
    });

    it('should rollback on staging validation failure', async () => {
      // Mock staging validation failure
      const validationFailureExecutor = {
        execute: jest.fn().mockImplementation((toolName: string, args: any) => {
          if (toolName === 'property.activation.status' && args.network === 'STAGING') {
            return Promise.resolve({ status: 'FAILED', error: 'Validation error' });
          }
          return Promise.resolve({ success: true });
        })
      };

      const validationEngine = new WorkflowEngine(validationFailureExecutor);
      validationEngine.registerWorkflow(WORKFLOW_TEMPLATES.ZERO_DOWNTIME_DEPLOYMENT);

      const context = {
        propertyId: 'prp_failing',
        baseVersion: 3,
        newRules: { name: 'invalid-config' },
        testHostname: 'staging.example.com',
        notification_email: 'ops@example.com'
      };

      const execution = await validationEngine.executeWorkflow('zero-downtime-deployment-v1', context);

      expect(execution.state).toBe(WorkflowState.ROLLED_BACK);
      expect(execution.error?.message).toContain('Staging validation failed');
    });
  });

  describe('Multi-Property Activation Workflow', () => {
    it('should coordinate activation of multiple properties', async () => {
      const properties = [
        { propertyId: 'prp_site1', propertyVersion: 2, propertyName: 'site1.example.com' },
        { propertyId: 'prp_site2', propertyVersion: 3, propertyName: 'site2.example.com' },
        { propertyId: 'prp_site3', propertyVersion: 1, propertyName: 'site3.example.com' }
      ];

      const context = {
        properties,
        network: 'PRODUCTION',
        parallel: true,
        notification_email: 'ops@example.com',
        rollback_on_failure: true
      };

      // Create dynamic workflow for multi-property activation
      const multiPropertyWorkflow = {
        id: 'multi-property-activation-test',
        name: 'Multi-Property Activation Test',
        description: 'Activate multiple properties with coordination',
        version: '1.0.0',
        steps: properties.map((prop, index) => ({
          id: `activate-${prop.propertyId}`,
          name: `Activate ${prop.propertyName}`,
          description: `Activate property ${prop.propertyName} to ${context.network}`,
          tool: 'property.activate',
          args: {
            propertyId: prop.propertyId,
            propertyVersion: prop.propertyVersion,
            network: context.network,
            notificationEmail: context.notification_email
          }
        }))
      };

      workflowEngine.registerWorkflow(multiPropertyWorkflow);

      const execution = await workflowEngine.executeWorkflow('multi-property-activation-test', context);

      expect(execution.state).toBe(WorkflowState.COMPLETED);
      expect(execution.steps.size).toBe(3);

      // All properties should be activated
      properties.forEach(prop => {
        const step = execution.steps.get(`activate-${prop.propertyId}`);
        expect(step?.state).toBe('completed');
      });
    });

    it('should handle partial failure with selective rollback', async () => {
      // Mock failure for one property
      const partialFailureExecutor = {
        execute: jest.fn().mockImplementation((toolName: string, args: any) => {
          if (toolName === 'property.activate' && args.propertyId === 'prp_failing') {
            throw new Error('Property activation failed: Invalid configuration');
          }
          return Promise.resolve({ activationId: `act_${args.propertyId}` });
        })
      };

      const partialEngine = new WorkflowEngine(partialFailureExecutor);

      const properties = [
        { propertyId: 'prp_good1', propertyVersion: 1, propertyName: 'good1.example.com' },
        { propertyId: 'prp_failing', propertyVersion: 1, propertyName: 'failing.example.com' },
        { propertyId: 'prp_good2', propertyVersion: 1, propertyName: 'good2.example.com' }
      ];

      const multiPropertyWorkflow = {
        id: 'multi-property-partial-failure',
        name: 'Multi-Property Partial Failure Test',
        description: 'Test partial failure handling',
        version: '1.0.0',
        rollbackStrategy: 'failed' as const,
        steps: properties.map(prop => ({
          id: `activate-${prop.propertyId}`,
          name: `Activate ${prop.propertyName}`,
          description: `Activate property ${prop.propertyName}`,
          tool: 'property.activate',
          args: {
            propertyId: prop.propertyId,
            propertyVersion: prop.propertyVersion,
            network: 'PRODUCTION'
          },
          continueOnError: true
        }))
      };

      partialEngine.registerWorkflow(multiPropertyWorkflow);

      const execution = await partialEngine.executeWorkflow('multi-property-partial-failure', {});

      expect(execution.state).toBe(WorkflowState.COMPLETED); // Continues on error
      
      // Check individual step results
      expect(execution.steps.get('activate-prp_good1')?.state).toBe('completed');
      expect(execution.steps.get('activate-prp_failing')?.state).toBe('failed');
      expect(execution.steps.get('activate-prp_good2')?.state).toBe('completed');
    });
  });

  describe('Complex Enterprise Scenarios', () => {
    it('should execute multi-customer deployment across environments', async () => {
      const customers = ['customer-a', 'customer-b', 'customer-c'];
      const environments = ['staging', 'production'];

      let stepCount = 0;
      const multiCustomerExecutor = {
        execute: jest.fn().mockImplementation(() => {
          stepCount++;
          return Promise.resolve({ success: true, step: stepCount });
        })
      };

      const multiCustomerEngine = new WorkflowEngine(multiCustomerExecutor);

      // Create complex workflow with customer and environment matrix
      const steps = customers.flatMap(customer =>
        environments.map(env => ({
          id: `deploy-${customer}-${env}`,
          name: `Deploy ${customer} to ${env}`,
          description: `Deploy customer ${customer} to ${env} environment`,
          tool: 'property.activate',
          args: {
            customer,
            network: env.toUpperCase(),
            propertyId: `prp_${customer}`,
            propertyVersion: 1
          },
          dependencies: env === 'production' ? [`deploy-${customer}-staging`] : []
        }))
      );

      const multiCustomerWorkflow = {
        id: 'multi-customer-deployment',
        name: 'Multi-Customer Deployment',
        description: 'Deploy multiple customers across environments',
        version: '1.0.0',
        steps
      };

      multiCustomerEngine.registerWorkflow(multiCustomerWorkflow);

      const execution = await multiCustomerEngine.executeWorkflow('multi-customer-deployment', {});

      expect(execution.state).toBe(WorkflowState.COMPLETED);
      expect(execution.steps.size).toBe(6); // 3 customers × 2 environments
      expect(stepCount).toBe(6); // All steps executed

      // Verify staging deployments completed before production
      customers.forEach(customer => {
        const stagingStep = execution.steps.get(`deploy-${customer}-staging`);
        const productionStep = execution.steps.get(`deploy-${customer}-production`);
        
        expect(stagingStep?.state).toBe('completed');
        expect(productionStep?.state).toBe('completed');
        
        // Production should start after staging completes
        if (stagingStep?.completedAt && productionStep?.startedAt) {
          expect(productionStep.startedAt.getTime()).toBeGreaterThanOrEqual(
            stagingStep.completedAt.getTime()
          );
        }
      });
    });

    it('should handle resource contention and queuing', async () => {
      let concurrentExecutions = 0;
      let maxConcurrency = 0;

      const resourceConstrainedExecutor = {
        execute: jest.fn().mockImplementation(async (toolName: string) => {
          concurrentExecutions++;
          maxConcurrency = Math.max(maxConcurrency, concurrentExecutions);
          
          // Simulate resource usage
          await new Promise(resolve => setTimeout(resolve, 50));
          
          concurrentExecutions--;
          return Promise.resolve({ success: true });
        })
      };

      const resourceEngine = new WorkflowEngine(resourceConstrainedExecutor);

      // Create workflow with many parallel steps
      const parallelSteps = Array.from({ length: 10 }, (_, i) => ({
        id: `parallel-step-${i}`,
        name: `Parallel Step ${i}`,
        description: `Execute parallel operation ${i}`,
        tool: 'property.list',
        args: { limit: 100 }
      }));

      const parallelWorkflow = {
        id: 'resource-contention-test',
        name: 'Resource Contention Test',
        description: 'Test resource management under load',
        version: '1.0.0',
        steps: parallelSteps
      };

      resourceEngine.registerWorkflow(parallelWorkflow);

      const execution = await resourceEngine.executeWorkflow('resource-contention-test', {});

      expect(execution.state).toBe(WorkflowState.COMPLETED);
      expect(execution.steps.size).toBe(10);
      expect(maxConcurrency).toBeGreaterThan(1); // Should execute in parallel
      expect(maxConcurrency).toBeLessThanOrEqual(10); // But with some constraints
    });
  });

  describe('Workflow State Management and Recovery', () => {
    it('should persist and restore workflow state', async () => {
      const persistentExecutor = {
        execute: jest.fn().mockImplementation(async (toolName: string) => {
          // Simulate slow operation that could be interrupted
          await new Promise(resolve => setTimeout(resolve, 100));
          return Promise.resolve({ success: true });
        })
      };

      const persistentEngine = new WorkflowEngine(persistentExecutor);
      persistentEngine.registerWorkflow(WORKFLOW_TEMPLATES.SITE_MIGRATION);

      const context = {
        domain: 'persistent.example.com',
        source_provider: 'manual',
        origin_hostname: 'origin.persistent.example.com',
        contractId: 'ctr_123',
        groupId: 'grp_123',
        notification_email: 'admin@example.com'
      };

      const execution = await persistentEngine.executeWorkflow('site-migration-v1', context);

      // Verify execution state is trackable
      expect(execution.id).toBeDefined();
      expect(execution.startedAt).toBeDefined();
      expect(execution.completedAt).toBeDefined();
      expect(execution.context).toEqual(context);

      // Should be able to retrieve execution by ID
      const retrievedExecution = persistentEngine.getExecution(execution.id);
      expect(retrievedExecution).toBeDefined();
      expect(retrievedExecution?.id).toBe(execution.id);
      expect(retrievedExecution?.state).toBe(WorkflowState.COMPLETED);
    });

    it('should handle concurrent workflow executions', async () => {
      const concurrentExecutor = {
        execute: jest.fn().mockResolvedValue({ success: true })
      };

      const concurrentEngine = new WorkflowEngine(concurrentExecutor);
      concurrentEngine.registerWorkflow(WORKFLOW_TEMPLATES.ZERO_DOWNTIME_DEPLOYMENT);

      // Start multiple workflows simultaneously
      const promises = Array.from({ length: 5 }, (_, i) =>
        concurrentEngine.executeWorkflow('zero-downtime-deployment-v1', {
          propertyId: `prp_concurrent_${i}`,
          baseVersion: 1,
          newRules: { name: 'default' },
          testHostname: `test${i}.example.com`,
          notification_email: 'ops@example.com'
        })
      );

      const executions = await Promise.all(promises);

      // All executions should complete successfully
      expect(executions).toHaveLength(5);
      executions.forEach((execution, i) => {
        expect(execution.state).toBe(WorkflowState.COMPLETED);
        expect(execution.context.propertyId).toBe(`prp_concurrent_${i}`);
      });

      // Should have 5 separate executions tracked
      const allExecutions = concurrentEngine.listExecutions();
      expect(allExecutions.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Integration with MCP Tools', () => {
    it('should integrate orchestration tools with MCP protocol', async () => {
      // Test that orchestration tools work through MCP interface
      const executeWorkflowTool = OrchestrationTools.getTool('workflow.execute');
      expect(executeWorkflowTool).toBeDefined();

      if (executeWorkflowTool) {
        const result = await executeWorkflowTool.handler(mockClient, {
          workflowId: 'site-migration-v1',
          context: {
            domain: 'mcp.example.com',
            source_provider: 'cloudflare',
            origin_hostname: 'origin.mcp.example.com',
            contractId: 'ctr_123',
            groupId: 'grp_123',
            notification_email: 'admin@example.com'
          }
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0]?.text).toContain('executionId');
      }
    });

    it('should support workflow monitoring through MCP tools', async () => {
      // Start a workflow
      const startTime = Date.now();
      const execution = await workflowEngine.executeWorkflow('site-migration-v1', {
        domain: 'monitor.example.com',
        source_provider: 'aws',
        origin_hostname: 'origin.monitor.example.com',
        contractId: 'ctr_123',
        groupId: 'grp_123',
        notification_email: 'admin@example.com'
      });

      // Test status monitoring
      const statusTool = OrchestrationTools.getTool('workflow.status');
      expect(statusTool).toBeDefined();

      if (statusTool) {
        const statusResult = await statusTool.handler(mockClient, {
          executionId: execution.id
        });

        expect(statusResult.content[0]?.text).toContain(execution.id);
        expect(statusResult.content[0]?.text).toContain('completed');
      }

      // Test workflow listing
      const listTool = OrchestrationTools.getTool('workflow.list');
      expect(listTool).toBeDefined();

      if (listTool) {
        const listResult = await listTool.handler(mockClient, { limit: 10 });

        expect(listResult.content[0]?.text).toContain('availableWorkflows');
        expect(listResult.content[0]?.text).toContain('site-migration-v1');
      }
    });
  });
});