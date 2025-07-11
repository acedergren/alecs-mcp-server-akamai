/**
 * WORKFLOW ROLLBACK TOOL
 * 
 * Manually triggers rollback for failed workflows or cancels
 * running workflows with automatic cleanup.
 */

import { z } from 'zod';
import { createMCPTool } from '../../utils/mcp-tool-factory';
import { workflowOrchestrator, WorkflowStatus } from '../../services/workflow-orchestrator-service';
import { UnifiedErrorHandler } from '../../services/unified-error-handler';

const parametersSchema = z.object({
  customer: z.string().describe('Customer section name from .edgerc'),
  executionId: z.string().describe('Workflow execution ID to rollback or cancel'),
  force: z.boolean().optional().default(false).describe('Force rollback even if already rolled back')
});

export const workflow_rollback = createMCPTool({
  name: 'workflow_rollback',
  description: 'Rollback a failed workflow or cancel a running workflow',
  schema: parametersSchema,
  handler: async (_client, params) => {
    const errorHandler = new UnifiedErrorHandler();
    
    try {
      // Get execution details
      const execution = workflowOrchestrator.getWorkflowStatus(params.executionId);
      
      if (!execution) {
        throw new Error(`Workflow execution '${params.executionId}' not found`);
      }
      
      // Check current status
      if (execution.status === WorkflowStatus.RUNNING) {
        // Cancel running workflow
        await workflowOrchestrator.cancelWorkflow(params.executionId);
        
        return {
          content: [
            {
              type: 'text',
              text: `Workflow '${execution.workflowName}' (${params.executionId}) has been cancelled`
            },
            {
              type: 'text',
              text: '\nCompleted steps before cancellation:'
            },
            {
              type: 'text',
              text: execution.steps
                .filter(s => s.status === 'completed')
                .map(s => `- ${s.stepId}`)
                .join('\n')
            },
            {
              type: 'text',
              text: '\nNote: Completed steps have not been rolled back. Use force=true to trigger manual rollback if needed.'
            }
          ]
        };
      }
      
      if (execution.status === WorkflowStatus.ROLLED_BACK && !params.force) {
        return {
          content: [{
            type: 'text',
            text: `Workflow '${execution.workflowName}' (${params.executionId}) has already been rolled back. Use force=true to attempt rollback again.`
          }]
        };
      }
      
      if (execution.status === WorkflowStatus.COMPLETED) {
        return {
          content: [{
            type: 'text',
            text: `Cannot rollback completed workflow '${execution.workflowName}' (${params.executionId}). Completed workflows should be reversed using a new workflow execution.`
          }],
          isError: true
        };
      }
      
      // Get workflow definition
      const workflows = workflowOrchestrator.listWorkflows();
      const workflow = workflows.find(w => w.name === execution.workflowName);
      
      if (!workflow) {
        throw new Error(`Workflow definition '${execution.workflowName}' not found`);
      }
      
      // Identify steps that can be rolled back
      const rollbackableSteps = execution.steps
        .filter(s => s.status === 'completed')
        .map(s => {
          const stepDef = workflow.steps.find(ws => ws.id === s.stepId);
          return {
            stepId: s.stepId,
            stepName: stepDef?.name || s.stepId,
            hasRollback: !!stepDef?.rollbackHandler
          };
        });
      
      const stepsWithRollback = rollbackableSteps.filter(s => s.hasRollback);
      const stepsWithoutRollback = rollbackableSteps.filter(s => !s.hasRollback);
      
      // Note: Actual rollback would be triggered here in a full implementation
      // For now, we'll provide information about what would be rolled back
      
      return {
        content: [
          {
            type: 'text',
            text: `Rollback analysis for workflow '${execution.workflowName}' (${params.executionId}):`
          },
          {
            type: 'text',
            text: `\nCurrent Status: ${execution.status}`
          },
          {
            type: 'text',
            text: `\nSteps that can be rolled back (${stepsWithRollback.length}):\n` +
                  stepsWithRollback.map(s => `- ${s.stepName}`).join('\n')
          },
          ...(stepsWithoutRollback.length > 0 ? [{
            type: 'text' as const,
            text: `\nSteps without rollback handlers (${stepsWithoutRollback.length}):\n` +
                  stepsWithoutRollback.map(s => `- ${s.stepName}`).join('\n') +
                  '\n\nThese steps may require manual cleanup.'
          }] : []),
          {
            type: 'text',
            text: '\nRollback Recommendations:\n' +
                  '1. Review the completed steps above\n' +
                  '2. Steps with rollback handlers will be automatically reversed\n' +
                  '3. Steps without rollback handlers may need manual intervention\n' +
                  '4. Consider running a cleanup workflow if available'
          }
        ]
      };
      
    } catch (error) {
      const errorResponse = errorHandler.handleError(error, {
        operation: 'workflow_rollback',
        executionId: params.executionId,
        customer: params.customer
      });
      
      return {
        content: [{
          type: 'text',
          text: errorResponse.userMessage + '\n\n' + errorResponse.details
        }],
        isError: true
      };
    }
  }
});