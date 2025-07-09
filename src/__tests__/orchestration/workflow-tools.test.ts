/**
 * Workflow Tools Test Suite
 * 
 * Tests for the MCP orchestration tools
 */

import { OrchestrationTools } from '../../tools/orchestration/workflow-tools';
import { WorkflowEngine, WorkflowState, StepState } from '../../orchestration/workflow-engine';
import { MCPToolExecutor } from '../../orchestration/mcp-tool-executor';
import { WORKFLOW_TEMPLATES } from '../../orchestration/workflow-templates';
import { AkamaiClient } from '../../akamai-client';

// Mock dependencies
jest.mock('../../akamai-client');
jest.mock('../../orchestration/workflow-engine');
jest.mock('../../orchestration/mcp-tool-executor');
jest.mock('../../utils/pino-logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

describe('OrchestrationTools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;
  let mockEngine: jest.Mocked<WorkflowEngine>;
  let mockExecutor: jest.Mocked<MCPToolExecutor>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    mockExecutor = new MCPToolExecutor() as jest.Mocked<MCPToolExecutor>;
    mockEngine = new WorkflowEngine(mockExecutor) as jest.Mocked<WorkflowEngine>;
    
    // Mock WorkflowEngine constructor to return our mock
    (WorkflowEngine as jest.MockedClass<typeof WorkflowEngine>).mockImplementation(() => mockEngine);
    (MCPToolExecutor as jest.MockedClass<typeof MCPToolExecutor>).mockImplementation(() => mockExecutor);
  });

  describe('Tool Registry', () => {
    it('should have all orchestration tools', () => {
      const tools = OrchestrationTools.getAllTools();
      const toolNames = Object.keys(tools);

      expect(toolNames).toContain('workflow.execute');
      expect(toolNames).toContain('workflow.site.migration');
      expect(toolNames).toContain('workflow.deployment.zero-downtime');
      expect(toolNames).toContain('workflow.property.multi-activate');
      expect(toolNames).toContain('workflow.status');
      expect(toolNames).toContain('workflow.list');
      expect(toolNames).toContain('workflow.cancel');
    });

    it('should get individual tool', () => {
      const tool = OrchestrationTools.getTool('workflow.execute');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('Execute a workflow template');
    });
  });

  describe('workflow.execute', () => {
    it('should execute a workflow successfully', async () => {
      const executeTool = OrchestrationTools.getTool('workflow.execute');
      if (!executeTool) throw new Error('Tool not found');
      const mockExecution = {
        id: 'exec-123',
        workflowId: 'test-workflow',
        state: WorkflowState.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        context: { domain: 'example.com' },
        steps: new Map([
          ['step1', { 
            stepId: 'step1', 
            state: StepState.COMPLETED, 
            attempts: 1,
            startedAt: new Date(),
            completedAt: new Date()
          }]
        ])
      };

      mockEngine.listWorkflows.mockReturnValue([
        { id: 'test-workflow', name: 'Test', description: 'Test workflow', version: '1.0', steps: [] }
      ]);
      mockEngine.executeWorkflow.mockResolvedValue(mockExecution);

      // Call handler directly with the execute workflow schema args
      const result = await executeTool.handler(mockClient, {
        workflowId: 'test-workflow',
        context: { domain: 'example.com' },
        customer: 'default'
      });

      expect(result.content[0]?.text).toContain('"executionId": "exec-123"');
      expect(result.content[0]?.text).toContain('"state": "completed"');
      expect(mockEngine.executeWorkflow).toHaveBeenCalledWith('test-workflow', { domain: 'example.com' });
    });

    it('should handle dry run', async () => {
      const executeTool = OrchestrationTools.getTool('workflow.execute');
      if (!executeTool) throw new Error('Tool not found');
      mockEngine.listWorkflows.mockReturnValue([
        { 
          id: 'test-workflow', 
          name: 'Test Workflow', 
          description: 'Test workflow', 
          version: '1.0', 
          steps: [{ id: 'step1', name: 'Step 1', description: 'Test', tool: 'test.tool', args: {} }],
          maxDuration: 3600000
        }
      ]);

      const result = await executeTool.handler(mockClient, {
        workflowId: 'test-workflow',
        context: { test: 'value' },
        dryRun: true,
        customer: 'default'
      });

      expect(result.content[0]?.text).toContain('"validation": "Workflow is valid and ready to execute"');
      expect(result.content[0]?.text).toContain('"steps": 1');
      expect(mockEngine.executeWorkflow).not.toHaveBeenCalled();
    });

    it('should handle workflow not found', async () => {
      const executeTool = OrchestrationTools.getTool('workflow.execute');
      if (!executeTool) throw new Error('Tool not found');
      mockEngine.listWorkflows.mockReturnValue([]);

      const result = await executeTool.handler(mockClient, {
        workflowId: 'non-existent',
        context: {},
        dryRun: true,
        customer: 'default'
      });

      expect(result.content[0]?.text).toContain('"error": "Workflow not found"');
    });
  });

  describe('workflow.site.migration', () => {
    it('should start site migration', async () => {
      const migrationTool = OrchestrationTools.getTool('workflow.site.migration');
      if (!migrationTool) throw new Error('Tool not found');
      const mockExecution = {
        id: 'migration-123',
        workflowId: 'site-migration-v1',
        state: WorkflowState.RUNNING,
        startedAt: new Date(),
        context: {},
        steps: new Map([
          ['analyze-dns', { 
            stepId: 'analyze-dns', 
            state: StepState.COMPLETED, 
            attempts: 1,
            startedAt: new Date(), 
            completedAt: new Date() 
          }],
          ['create-dns-zone', { 
            stepId: 'create-dns-zone', 
            state: StepState.RUNNING, 
            attempts: 1,
            startedAt: new Date() 
          }]
        ])
      };

      mockEngine.executeWorkflow.mockResolvedValue(mockExecution);

      const result = await migrationTool.handler(mockClient, {
        domain: 'example.com',
        sourceProvider: 'cloudflare',
        originHostname: 'origin.example.com',
        contractId: 'ctr-123',
        groupId: 'grp-456',
        notificationEmail: 'admin@example.com'
      });

      expect(result.content[0]?.text).toContain('"workflowId": "site-migration-v1"');
      expect(result.content[0]?.text).toContain('"domain": "example.com"');
      expect(result.content[0]?.text).toContain('Migration in progress');
    });

    it('should handle completed migration', async () => {
      const migrationTool = OrchestrationTools.getTool('workflow.site.migration');
      if (!migrationTool) throw new Error('Tool not found');
      const mockExecution = {
        id: 'migration-123',
        workflowId: 'site-migration-v1',
        state: WorkflowState.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        context: {},
        steps: new Map()
      };

      mockEngine.executeWorkflow.mockResolvedValue(mockExecution);

      const result = await migrationTool.handler(mockClient, {
        domain: 'example.com',
        sourceProvider: 'aws',
        originHostname: 'origin.example.com',
        contractId: 'ctr-123',
        groupId: 'grp-456',
        notificationEmail: 'admin@example.com'
      });

      expect(result.content[0]?.text).toContain('Successfully migrated example.com to Akamai');
    });
  });

  describe('workflow.deployment.zero-downtime', () => {
    it('should start zero-downtime deployment', async () => {
      const deploymentTool = OrchestrationTools.getTool('workflow.deployment.zero-downtime');
      if (!deploymentTool) throw new Error('Tool not found');
      const mockExecution = {
        id: 'deploy-123',
        workflowId: 'zero-downtime-deployment-v1',
        state: WorkflowState.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        context: {},
        steps: new Map([
          ['create-version', { 
            stepId: 'create-version', 
            state: StepState.COMPLETED, 
            attempts: 1,
            startedAt: new Date(), 
            completedAt: new Date() 
          }],
          ['staging-activation', { 
            stepId: 'staging-activation', 
            state: StepState.COMPLETED, 
            attempts: 1,
            startedAt: new Date(), 
            completedAt: new Date() 
          }]
        ])
      };

      mockEngine.executeWorkflow.mockResolvedValue(mockExecution);

      const result = await deploymentTool.handler(mockClient, {
        propertyId: 'prp_123',
        baseVersion: 1,
        newRules: { rules: [] },
        testHostname: 'test.example.com',
        notificationEmail: 'ops@example.com',
        cpcodes: ['123456']
      });

      expect(result.content[0]?.text).toContain('Deployment completed successfully with zero downtime');
      expect(result.content[0]?.text).toContain('"propertyId": "prp_123"');
    });
  });

  describe('workflow.property.multi-activate', () => {
    it('should activate multiple properties', async () => {
      const multiActivateTool = OrchestrationTools.getTool('workflow.property.multi-activate');
      if (!multiActivateTool) throw new Error('Tool not found');
      const mockExecution = {
        id: 'multi-123',
        workflowId: 'multi-property-activation-',
        state: WorkflowState.RUNNING,
        startedAt: new Date(),
        context: {},
        steps: new Map([
          ['activate-prp_1', { stepId: 'activate-prp_1', state: StepState.COMPLETED, attempts: 1 }],
          ['activate-prp_2', { stepId: 'activate-prp_2', state: StepState.RUNNING, attempts: 1 }]
        ])
      };

      mockEngine.registerWorkflow.mockImplementation(() => {});
      mockEngine.executeWorkflow.mockResolvedValue(mockExecution);

      const result = await multiActivateTool.handler(mockClient, {
        properties: [
          { propertyId: 'prp_1', propertyVersion: 1, propertyName: 'Site 1' },
          { propertyId: 'prp_2', propertyVersion: 2, propertyName: 'Site 2' }
        ],
        network: 'PRODUCTION',
        parallel: true,
        notificationEmail: 'ops@example.com'
      });

      expect(result.content[0]?.text).toContain('"properties": ["Site 1", "Site 2"]');
      expect(result.content[0]?.text).toContain('"network": "PRODUCTION"');
      expect(result.content[0]?.text).toContain('"parallel": true');
      expect(mockEngine.registerWorkflow).toHaveBeenCalled();
    });
  });

  describe('workflow.status', () => {
    it('should get workflow execution status', async () => {
      const statusTool = OrchestrationTools.getTool('workflow.status');
      if (!statusTool) throw new Error('Tool not found');
      const mockExecution = {
        id: 'exec-123',
        workflowId: 'test-workflow',
        state: WorkflowState.RUNNING,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        currentStep: 'step2',
        context: {},
        steps: new Map([
          ['step1', { 
            stepId: 'step1', 
            state: StepState.COMPLETED, 
            attempts: 1,
            startedAt: new Date('2024-01-01T10:00:00Z'),
            completedAt: new Date('2024-01-01T10:01:00Z')
          }],
          ['step2', { 
            stepId: 'step2', 
            state: StepState.RUNNING, 
            attempts: 2,
            startedAt: new Date('2024-01-01T10:01:00Z'),
            error: new Error('Retrying')
          }]
        ])
      };

      mockEngine.getExecution.mockReturnValue(mockExecution);

      const result = await statusTool.handler(mockClient, {
        executionId: 'exec-123',
        customer: 'default'
      });

      expect(result.content[0]?.text).toContain('"executionId": "exec-123"');
      expect(result.content[0]?.text).toContain('"state": "running"');
      expect(result.content[0]?.text).toContain('"currentStep": "step2"');
      expect(result.content[0]?.text).toContain('"completed": 1');
      expect(result.content[0]?.text).toContain('"duration": "60s"');
    });

    it('should handle execution not found', async () => {
      const statusTool = OrchestrationTools.getTool('workflow.status');
      if (!statusTool) throw new Error('Tool not found');
      mockEngine.getExecution.mockReturnValue(undefined);

      const result = await statusTool.handler(mockClient, {
        executionId: 'non-existent',
        customer: 'default'
      });

      expect(result.content[0]?.text).toContain('"error": "Execution not found"');
    });
  });

  describe('workflow.list', () => {
    it('should list workflows and executions', async () => {
      const listTool = OrchestrationTools.getTool('workflow.list');
      if (!listTool) throw new Error('Tool not found');
      mockEngine.listWorkflows.mockReturnValue([
        WORKFLOW_TEMPLATES.SITE_MIGRATION,
        WORKFLOW_TEMPLATES.ZERO_DOWNTIME_DEPLOYMENT
      ]);

      mockEngine.listExecutions.mockReturnValue([
        {
          id: 'exec-1',
          workflowId: 'site-migration-v1',
          state: WorkflowState.COMPLETED,
          startedAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:30:00Z'),
          context: {},
          steps: new Map()
        },
        {
          id: 'exec-2',
          workflowId: 'zero-downtime-deployment-v1',
          state: WorkflowState.RUNNING,
          startedAt: new Date('2024-01-01T11:00:00Z'),
          context: {},
          steps: new Map()
        }
      ]);

      const result = await listTool.handler(mockClient, {
        limit: 10,
        customer: 'default'
      });

      expect(result.content[0]?.text).toContain('availableWorkflows');
      expect(result.content[0]?.text).toContain('Complete Site Migration');
      expect(result.content[0]?.text).toContain('Zero Downtime Deployment');
      expect(result.content[0]?.text).toContain('"duration": "1800s"');
    });

    it('should filter executions by state', async () => {
      const listTool = OrchestrationTools.getTool('workflow.list');
      if (!listTool) throw new Error('Tool not found');
      mockEngine.listWorkflows.mockReturnValue([]);
      mockEngine.listExecutions.mockReturnValue([]);

      await listTool.handler(mockClient, {
        state: 'running',
        limit: 5,
        customer: 'default'
      });

      expect(mockEngine.listExecutions).toHaveBeenCalledWith({
        state: WorkflowState.RUNNING,
        limit: 5
      });
    });
  });

  describe('workflow.cancel', () => {
    it('should cancel a running workflow', async () => {
      const cancelTool = OrchestrationTools.getTool('workflow.cancel');
      if (!cancelTool) throw new Error('Tool not found');
      mockEngine.cancelWorkflow.mockResolvedValue(undefined);

      const result = await cancelTool.handler(mockClient, {
        executionId: 'exec-123',
        customer: 'default'
      });

      expect(result.content[0]?.text).toContain('"status": "cancelled"');
      expect(result.content[0]?.text).toContain('Workflow execution cancelled successfully');
      expect(mockEngine.cancelWorkflow).toHaveBeenCalledWith('exec-123');
    });

    it('should handle cancel errors', async () => {
      const cancelTool = OrchestrationTools.getTool('workflow.cancel');
      if (!cancelTool) throw new Error('Tool not found');
      mockEngine.cancelWorkflow.mockRejectedValue(new Error('Cannot cancel completed workflow'));

      const result = await cancelTool.handler(mockClient, {
        executionId: 'exec-123',
        customer: 'default'
      });

      expect(result.content[0]?.text).toContain('Error cancelling workflow');
      expect(result.content[0]?.text).toContain('Cannot cancel completed workflow');
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow execution errors', async () => {
      const executeTool = OrchestrationTools.getTool('workflow.execute');
      
      mockEngine.listWorkflows.mockReturnValue([
        { id: 'test-workflow', name: 'Test', description: 'Test', version: '1.0', steps: [] }
      ]);
      mockEngine.executeWorkflow.mockRejectedValue(new Error('Workflow failed'));

      const result = await executeTool.handler(mockClient, {
        workflowId: 'test-workflow',
        context: {},
        customer: 'default'
      });

      expect(result.content[0]?.text).toContain('Error executing workflow: Workflow failed');
    });

    it('should handle site migration errors', async () => {
      const migrationTool = OrchestrationTools.getTool('workflow.site.migration');
      if (!migrationTool) throw new Error('Tool not found');
      
      mockEngine.executeWorkflow.mockRejectedValue(new Error('DNS conflict'));

      const result = await migrationTool.handler(mockClient, {
        domain: 'example.com',
        sourceProvider: 'cloudflare',
        originHostname: 'origin.example.com',
        contractId: 'ctr-123',
        groupId: 'grp-456',
        notificationEmail: 'admin@example.com',
        customer: 'default'
      });

      expect(result.content[0]?.text).toContain('Error starting site migration: DNS conflict');
    });
  });
});