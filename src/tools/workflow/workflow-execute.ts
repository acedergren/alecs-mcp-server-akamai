/**
 * WORKFLOW EXECUTE TOOL
 * 
 * Executes a workflow template with the provided parameters.
 * Handles multi-step operations with automatic rollback on failure.
 */

import { z } from 'zod';
import { createMCPTool } from '../../utils/mcp-tool-factory';
import { workflowOrchestrator, WorkflowStatus } from '../../services/workflow-orchestrator-service';
import { ConfigurationHintsService } from '../../services/configuration-hints-service';
// import { IdTranslationService } from '../../services/id-translation-service';
import { UnifiedErrorHandler } from '../../services/unified-error-handler';

const parametersSchema = z.object({
  customer: z.string().describe('Customer section name from .edgerc'),
  workflowName: z.string().describe('Name of the workflow to execute'),
  parameters: z.record(z.any()).describe('Workflow-specific parameters'),
  dryRun: z.boolean().optional().default(false).describe('Validate parameters without executing')
});

export const workflow_execute = createMCPTool({
  name: 'workflow_execute',
  description: 'Execute a workflow template with automatic step management and rollback',
  schema: parametersSchema,
  handler: async (client, params) => {
    const hintsService = new ConfigurationHintsService();
    const errorHandler = new UnifiedErrorHandler();
    
    try {
      // Get workflow definition
      const workflows = workflowOrchestrator.listWorkflows();
      const workflow = workflows.find(w => w.name === params.workflowName);
      
      if (!workflow) {
        const availableWorkflows = workflows.map(w => w.name).join(', ');
        throw new Error(`Workflow '${params.workflowName}' not found. Available workflows: ${availableWorkflows}`);
      }
      
      // Validate parameters
      const validationResult = workflow.parameterSchema.safeParse(params.parameters);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        ).join('\n');
        
        throw new Error(`Invalid workflow parameters:\n${errors}`);
      }
      
      // Dry run - just validate
      if (params.dryRun) {
        return {
          content: [
            {
              type: 'text',
              text: `Workflow '${params.workflowName}' validation successful!`
            },
            {
              type: 'text',
              text: 'Validated parameters:\n' + JSON.stringify(validationResult.data, null, 2)
            },
            {
              type: 'text',
              text: `\nWorkflow would execute ${workflow.steps.length} steps:\n` +
                    workflow.steps.map((s, i) => `${i + 1}. ${s.name} - ${s.description}`).join('\n')
            }
          ]
        };
      }
      
      // Execute workflow
      const execution = await workflowOrchestrator.executeWorkflow(
        client,
        params.workflowName,
        validationResult.data
      );
      
      // Format step results
      const stepResults = execution.steps.map(step => {
        const stepDef = workflow.steps.find(s => s.id === step.stepId);
        return {
          step: stepDef?.name || step.stepId,
          status: step.status,
          duration: step.endTime && step.startTime ? 
            `${(step.endTime.getTime() - step.startTime.getTime()) / 1000}s` : 
            'N/A',
          result: step.result,
          error: step.error
        };
      });
      
      // Get helpful hints based on workflow type
      const hints = await hintsService.getWorkflowSpecificHints(params.workflowName, execution.status);
      
      return {
        content: [
          {
            type: 'text',
            text: `Workflow '${params.workflowName}' execution ${execution.status === WorkflowStatus.COMPLETED ? 'completed successfully' : 'failed'}!`
          },
          {
            type: 'text',
            text: `\nExecution ID: ${execution.id}`
          },
          {
            type: 'text',
            text: `Status: ${execution.status}`
          },
          {
            type: 'text',
            text: `Duration: ${execution.endTime ? 
              `${(execution.endTime.getTime() - execution.startTime.getTime()) / 1000}s` : 
              'In progress'}`
          },
          {
            type: 'text',
            text: '\nStep Results:\n' + JSON.stringify(stepResults, null, 2)
          },
          ...(execution.error ? [{
            type: 'text' as const,
            text: `\nError: ${execution.error}`
          }] : []),
          {
            type: 'text',
            text: '\n' + hints.join('\n')
          }
        ],
        isError: execution.status === WorkflowStatus.FAILED
      };
      
    } catch (error) {
      const errorResponse = errorHandler.handleError(error, {
        operation: 'workflow_execute',
        workflowName: params.workflowName,
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