/**
 * WORKFLOW STATUS TOOL
 * 
 * Checks the status of workflow executions with detailed
 * step-by-step progress information.
 */

import { z } from 'zod';
import { createMCPTool } from '../../utils/mcp-tool-factory';
import { workflowOrchestrator, WorkflowStatus } from '../../services/workflow-orchestrator-service';
// import { IdTranslationService } from '../../services/id-translation-service';

const parametersSchema = z.object({
  customer: z.string().describe('Customer section name from .edgerc'),
  executionId: z.string().optional().describe('Specific workflow execution ID to check'),
  workflowName: z.string().optional().describe('Filter by workflow name'),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'rolling_back', 'rolled_back', 'partially_completed']).optional().describe('Filter by status'),
  limit: z.number().optional().default(10).describe('Maximum number of executions to return')
});

export const workflow_status = createMCPTool({
  name: 'workflow_status',
  description: 'Check workflow execution status and progress',
  schema: parametersSchema,
  handler: async (_client, params) => {
    
    try {
      // Get specific execution
      if (params.executionId) {
        const execution = workflowOrchestrator.getWorkflowStatus(params.executionId);
        
        if (!execution) {
          return {
            content: [{
              type: 'text',
              text: `Workflow execution '${params.executionId}' not found`
            }],
            isError: true
          };
        }
        
        // Get workflow definition for step names
        const workflows = workflowOrchestrator.listWorkflows();
        const workflow = workflows.find(w => w.name === execution.workflowName);
        
        // Format detailed execution info
        const stepDetails = execution.steps.map(step => {
          const stepDef = workflow?.steps.find(s => s.id === step.stepId);
          return {
            name: stepDef?.name || step.stepId,
            status: step.status,
            startTime: step.startTime?.toISOString(),
            endTime: step.endTime?.toISOString(),
            duration: step.endTime && step.startTime ? 
              `${(step.endTime.getTime() - step.startTime.getTime()) / 1000}s` : 
              null,
            retryCount: step.retryCount || 0,
            error: step.error
          };
        });
        
        const currentStepName = execution.currentStep ? 
          workflow?.steps.find(s => s.id === execution.currentStep)?.name || execution.currentStep :
          null;
        
        return {
          content: [
            {
              type: 'text',
              text: `Workflow Execution Details:`
            },
            {
              type: 'text',
              text: JSON.stringify({
                id: execution.id,
                workflow: execution.workflowName,
                status: execution.status,
                currentStep: currentStepName,
                startTime: execution.startTime.toISOString(),
                endTime: execution.endTime?.toISOString(),
                duration: execution.endTime ? 
                  `${(execution.endTime.getTime() - execution.startTime.getTime()) / 1000}s` : 
                  'In progress',
                progress: `${stepDetails.filter(s => s.status === 'completed').length}/${stepDetails.length} steps completed`,
                error: execution.error
              }, null, 2)
            },
            {
              type: 'text',
              text: '\nStep Progress:\n' + JSON.stringify(stepDetails, null, 2)
            },
            {
              type: 'text',
              text: '\nParameters:\n' + JSON.stringify(execution.parameters, null, 2)
            }
          ]
        };
      }
      
      // List executions with filters
      const filters: any = {};
      if (params.workflowName) filters.workflowName = params.workflowName;
      if (params.status) filters.status = params.status;
      
      const executions = workflowOrchestrator.getWorkflowExecutions(filters)
        .slice(0, params.limit);
      
      if (executions.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No workflow executions found matching the criteria'
          }]
        };
      }
      
      // Format execution list
      const formattedExecutions = executions.map(exec => ({
        id: exec.id,
        workflow: exec.workflowName,
        status: exec.status,
        startTime: exec.startTime.toISOString(),
        endTime: exec.endTime?.toISOString(),
        duration: exec.endTime ? 
          `${(exec.endTime.getTime() - exec.startTime.getTime()) / 1000}s` : 
          'In progress',
        currentStep: exec.currentStep,
        error: exec.error
      }));
      
      // Add status summary
      const statusCounts = executions.reduce((acc, exec) => {
        acc[exec.status] = (acc[exec.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        content: [
          {
            type: 'text',
            text: `Found ${executions.length} workflow executions:`
          },
          {
            type: 'text',
            text: JSON.stringify(formattedExecutions, null, 2)
          },
          {
            type: 'text',
            text: '\nStatus Summary:\n' + 
                  Object.entries(statusCounts)
                    .map(([status, count]) => `- ${status}: ${count}`)
                    .join('\n')
          },
          {
            type: 'text',
            text: '\nTip: Use executionId parameter to get detailed information about a specific execution'
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error checking workflow status: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
});