/**
 * Orchestration Workflow Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Exposes workflow engine through MCP interface
 * - Provides workflow execution and monitoring
 * - Supports workflow templates and custom workflows
 * - Enables complex multi-service operations
 */

import { z } from 'zod';
import { 
  CustomerSchema,
  type MCPToolResponse
} from '../common';
import { AkamaiClient } from '../../akamai-client';
import { WorkflowEngine, WorkflowState } from '../../orchestration/workflow-engine';
import { MCPToolExecutor } from '../../orchestration/mcp-tool-executor';
import { WORKFLOW_TEMPLATES, generateMultiPropertyActivation } from '../../orchestration/workflow-templates';
import { logger } from '../../utils/pino-logger';

// Initialize workflow engine singleton
let workflowEngine: WorkflowEngine | null = null;

function getWorkflowEngine(client: AkamaiClient): WorkflowEngine {
  if (!workflowEngine) {
    const executor = new MCPToolExecutor(client);
    workflowEngine = new WorkflowEngine(executor, client);
    
    // Register all templates
    Object.values(WORKFLOW_TEMPLATES).forEach(template => {
      if (template.steps && template.steps.length > 0) {
        workflowEngine!.registerWorkflow(template);
      }
    });
    
    logger.info('Workflow engine initialized with templates');
  }
  return workflowEngine;
}

/**
 * Workflow execution schemas
 */
const ExecuteWorkflowSchema = CustomerSchema.extend({
  workflowId: z.string().describe('ID of the workflow template to execute'),
  context: z.record(z.any()).describe('Context variables for the workflow'),
  dryRun: z.boolean().optional().describe('Validate without executing')
});

const SiteMigrationSchema = CustomerSchema.extend({
  domain: z.string().describe('Domain to migrate'),
  sourceProvider: z.string().describe('Current CDN provider (cloudflare, aws, etc)'),
  originHostname: z.string().describe('Origin server hostname'),
  contractId: z.string().describe('Akamai contract ID'),
  groupId: z.string().describe('Akamai group ID'),
  notificationEmail: z.string().email().describe('Email for notifications')
});

const ZeroDowntimeSchema = CustomerSchema.extend({
  propertyId: z.string().describe('Property ID to deploy'),
  baseVersion: z.number().describe('Base version for new changes'),
  newRules: z.object({}).describe('New rule configuration'),
  testHostname: z.string().describe('Hostname for staging tests'),
  notificationEmail: z.string().email().describe('Email for notifications'),
  cpcodes: z.array(z.string()).optional().describe('CP codes to purge after deployment')
});

const MultiPropertySchema = CustomerSchema.extend({
  properties: z.array(z.object({
    propertyId: z.string(),
    propertyVersion: z.number(),
    propertyName: z.string()
  })).describe('Properties to activate'),
  network: z.enum(['STAGING', 'PRODUCTION']).describe('Target network'),
  parallel: z.boolean().default(false).describe('Activate in parallel'),
  notificationEmail: z.string().email().describe('Email for notifications')
});

const WorkflowStatusSchema = CustomerSchema.extend({
  executionId: z.string().describe('Workflow execution ID')
});

const ListWorkflowsSchema = CustomerSchema.extend({
  state: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
  limit: z.number().int().min(1).max(100).default(10)
});

/**
 * Execute a workflow template
 */
async function executeWorkflow(
  client: AkamaiClient,
  args: z.infer<typeof ExecuteWorkflowSchema>
): Promise<MCPToolResponse> {
  try {
    const engine = getWorkflowEngine(client);
    
    if (args.dryRun) {
      // Validate workflow exists
      const workflows = engine.listWorkflows();
      const workflow = workflows.find(w => w.id === args.workflowId);
      
      if (!workflow) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Workflow not found',
              availableWorkflows: workflows.map(w => ({
                id: w.id,
                name: w.name,
                description: w.description
              }))
            }, null, 2)
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            workflow: {
              id: workflow.id,
              name: workflow.name,
              description: workflow.description,
              steps: workflow.steps.length,
              estimatedDuration: workflow.maxDuration ? 
                `${workflow.maxDuration / 60000} minutes` : 'Unknown'
            },
            context: args.context,
            validation: 'Workflow is valid and ready to execute'
          }, null, 2)
        }]
      };
    }
    
    // Execute workflow
    const execution = await engine.executeWorkflow(args.workflowId, args.context);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          executionId: execution.id,
          workflowId: execution.workflowId,
          state: execution.state,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
          currentStep: execution.currentStep,
          steps: Array.from(execution.steps.entries()).map(([id, step]) => ({
            id,
            state: step.state,
            attempts: step.attempts,
            error: step.error?.message
          })),
          result: execution.state === WorkflowState.COMPLETED ? 
            'Workflow completed successfully' : 
            execution.error?.message || 'Workflow in progress'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error executing workflow: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * Execute site migration workflow
 */
async function executeSiteMigration(
  client: AkamaiClient,
  args: z.infer<typeof SiteMigrationSchema>
): Promise<MCPToolResponse> {
  try {
    const engine = getWorkflowEngine(client);
    
    const context = {
      domain: args.domain,
      source_provider: args.sourceProvider,
      origin_hostname: args.originHostname,
      contractId: args.contractId,
      groupId: args.groupId,
      notification_email: args.notificationEmail,
      customer: args.customer
    };
    
    const execution = await engine.executeWorkflow('site-migration-v1', context);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          workflowId: 'site-migration-v1',
          executionId: execution.id,
          domain: args.domain,
          status: execution.state,
          message: execution.state === WorkflowState.COMPLETED ?
            `Successfully migrated ${args.domain} to Akamai` :
            `Migration in progress for ${args.domain}`,
          steps: Array.from(execution.steps.entries()).map(([id, step]) => ({
            id,
            state: step.state,
            startedAt: step.startedAt,
            completedAt: step.completedAt
          }))
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error starting site migration: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * Execute zero-downtime deployment
 */
async function executeZeroDowntimeDeployment(
  client: AkamaiClient,
  args: z.infer<typeof ZeroDowntimeSchema>
): Promise<MCPToolResponse> {
  try {
    const engine = getWorkflowEngine(client);
    
    const context = {
      propertyId: args.propertyId,
      baseVersion: args.baseVersion,
      new_rules: args.newRules,
      test_hostname: args.testHostname,
      notification_email: args.notificationEmail,
      cpcodes: args.cpcodes || [],
      customer: args.customer
    };
    
    const execution = await engine.executeWorkflow('zero-downtime-deployment-v1', context);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          workflowId: 'zero-downtime-deployment-v1',
          executionId: execution.id,
          propertyId: args.propertyId,
          status: execution.state,
          message: execution.state === WorkflowState.COMPLETED ?
            'Deployment completed successfully with zero downtime' :
            'Deployment in progress',
          deploymentSteps: Array.from(execution.steps.entries()).map(([id, step]) => ({
            step: id,
            status: step.state,
            duration: step.completedAt && step.startedAt ?
              `${(step.completedAt.getTime() - step.startedAt.getTime()) / 1000}s` :
              'In progress'
          }))
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error starting deployment: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * Execute multi-property activation
 */
async function executeMultiPropertyActivation(
  client: AkamaiClient,
  args: z.infer<typeof MultiPropertySchema>
): Promise<MCPToolResponse> {
  try {
    const engine = getWorkflowEngine(client);
    
    // Generate workflow for these properties
    const workflow = generateMultiPropertyActivation(
      args.properties,
      {
        network: args.network,
        parallel: args.parallel,
        notificationEmail: args.notificationEmail
      }
    );
    
    // Register the generated workflow
    engine.registerWorkflow(workflow);
    
    // Execute it
    const execution = await engine.executeWorkflow(workflow.id, {
      customer: args.customer
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          workflowId: workflow.id,
          executionId: execution.id,
          properties: args.properties.map(p => p.propertyName),
          network: args.network,
          parallel: args.parallel,
          status: execution.state,
          message: execution.state === WorkflowState.COMPLETED ?
            `Successfully activated ${args.properties.length} properties` :
            `Activation in progress for ${args.properties.length} properties`,
          activations: Array.from(execution.steps.entries())
            .filter(([id]) => id.startsWith('activate-'))
            .map(([id, step]) => ({
              propertyId: id.replace('activate-', ''),
              state: step.state,
              attempts: step.attempts
            }))
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error starting multi-property activation: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * Get workflow execution status
 */
async function getWorkflowStatus(
  client: AkamaiClient,
  args: z.infer<typeof WorkflowStatusSchema>
): Promise<MCPToolResponse> {
  try {
    const engine = getWorkflowEngine(client);
    const execution = engine.getExecution(args.executionId);
    
    if (!execution) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Execution not found',
            executionId: args.executionId
          }, null, 2)
        }]
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          executionId: execution.id,
          workflowId: execution.workflowId,
          state: execution.state,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
          duration: execution.completedAt ?
            `${(execution.completedAt.getTime() - execution.startedAt.getTime()) / 1000}s` :
            'In progress',
          currentStep: execution.currentStep,
          progress: {
            total: execution.steps.size,
            completed: Array.from(execution.steps.values())
              .filter(s => s.state === 'completed').length,
            failed: Array.from(execution.steps.values())
              .filter(s => s.state === 'failed').length
          },
          steps: Array.from(execution.steps.entries()).map(([id, step]) => ({
            id,
            state: step.state,
            attempts: step.attempts,
            startedAt: step.startedAt,
            completedAt: step.completedAt,
            duration: step.completedAt && step.startedAt ?
              `${(step.completedAt.getTime() - step.startedAt.getTime()) / 1000}s` :
              null,
            error: step.error?.message,
            result: step.state === 'completed' ? 'Success' : null
          })),
          error: execution.error?.message
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting workflow status: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * List workflows and executions
 */
async function listWorkflows(
  client: AkamaiClient,
  args: z.infer<typeof ListWorkflowsSchema>
): Promise<MCPToolResponse> {
  try {
    const engine = getWorkflowEngine(client);
    
    // Get available workflows
    const workflows = engine.listWorkflows();
    
    // Get executions
    const executions = engine.listExecutions({
      state: args.state as WorkflowState,
      limit: args.limit
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          availableWorkflows: workflows.map(w => ({
            id: w.id,
            name: w.name,
            description: w.description,
            version: w.version,
            steps: w.steps.length,
            rollbackStrategy: w.rollbackStrategy
          })),
          recentExecutions: executions.map(e => ({
            executionId: e.id,
            workflowId: e.workflowId,
            state: e.state,
            startedAt: e.startedAt,
            completedAt: e.completedAt,
            duration: e.completedAt ?
              `${(e.completedAt.getTime() - e.startedAt.getTime()) / 1000}s` :
              'In progress'
          }))
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error listing workflows: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * Cancel a running workflow
 */
async function cancelWorkflow(
  client: AkamaiClient,
  args: z.infer<typeof WorkflowStatusSchema>
): Promise<MCPToolResponse> {
  try {
    const engine = getWorkflowEngine(client);
    await engine.cancelWorkflow(args.executionId);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          executionId: args.executionId,
          status: 'cancelled',
          message: 'Workflow execution cancelled successfully'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error cancelling workflow: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * Orchestration Workflow Tools Registry
 */
export class OrchestrationTools {
  private static tools = {
    'workflow_execute': {
      description: 'Execute a workflow template with context variables',
      inputSchema: ExecuteWorkflowSchema,
      handler: executeWorkflow
    },
    'workflow_site_migration': {
      description: 'Migrate a complete site to Akamai (DNS, CDN, SSL)',
      inputSchema: SiteMigrationSchema,
      handler: executeSiteMigration
    },
    'workflow_deployment_zero_downtime': {
      description: 'Deploy changes with automatic rollback on errors',
      inputSchema: ZeroDowntimeSchema,
      handler: executeZeroDowntimeDeployment
    },
    'workflow_property_multi_activate': {
      description: 'Activate multiple properties in coordination',
      inputSchema: MultiPropertySchema,
      handler: executeMultiPropertyActivation
    },
    'workflow_status': {
      description: 'Get workflow execution status and progress',
      inputSchema: WorkflowStatusSchema,
      handler: getWorkflowStatus
    },
    'workflow_list': {
      description: 'List available workflows and recent executions',
      inputSchema: ListWorkflowsSchema,
      handler: listWorkflows
    },
    'workflow_cancel': {
      description: 'Cancel a running workflow execution',
      inputSchema: WorkflowStatusSchema,
      handler: cancelWorkflow
    }
  };

  static getAllTools() {
    return this.tools;
  }

  static getTool(name: string) {
    return this.tools[name as keyof typeof this.tools];
  }
}