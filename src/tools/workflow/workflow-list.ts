/**
 * WORKFLOW LIST TOOL
 * 
 * Lists available workflow templates with filtering options.
 * Provides detailed information about each workflow including
 * steps, parameters, and estimated duration.
 */

import { z } from 'zod';
import { createMCPTool } from '../../utils/mcp-tool-factory';
import { workflowOrchestrator } from '../../services/workflow-orchestrator-service';
import { ConfigurationHintsService } from '../../services/configuration-hints-service';
// import { IdTranslationService } from '../../services/id-translation-service';

const parametersSchema = z.object({
  customer: z.string().describe('Customer section name from .edgerc'),
  category: z.string().optional().describe('Filter workflows by category (deployment, security, dns, migration)'),
  tags: z.array(z.string()).optional().describe('Filter workflows by tags'),
  detailed: z.boolean().optional().default(false).describe('Include detailed step information')
});

export const workflow_list = createMCPTool({
  name: 'workflow_list',
  description: 'List available workflow templates with optional filtering',
  schema: parametersSchema,
  handler: async (_client, params) => {
    const hintsService = new ConfigurationHintsService();
    
    try {
      // Get available workflows
      const workflows = workflowOrchestrator.listWorkflows(params.category);
      
      // Filter by tags if provided
      let filteredWorkflows = workflows;
      if (params.tags && params.tags.length > 0) {
        filteredWorkflows = workflows.filter(w => 
          w.tags?.some(tag => params.tags!.includes(tag))
        );
      }
      
      // Format response
      const formattedWorkflows = filteredWorkflows.map(workflow => {
        const baseInfo = {
          name: workflow.name,
          description: workflow.description,
          category: workflow.category,
          estimatedDuration: workflow.estimatedDuration ? `${workflow.estimatedDuration} minutes` : 'Variable',
          tags: workflow.tags || [],
          parameterCount: workflow.parameterSchema && (workflow.parameterSchema as any).shape ? 
            Object.keys((workflow.parameterSchema as any).shape).length : 0,
          stepCount: workflow.steps.length
        };
        
        if (params.detailed) {
          return {
            ...baseInfo,
            parameters: workflow.parameterSchema && (workflow.parameterSchema as any).shape ? 
              Object.entries((workflow.parameterSchema as any).shape).map(([key, schema]: [string, any]) => ({
              name: key,
              type: schema._def.typeName.replace('Zod', '').toLowerCase(),
              required: !schema.isOptional(),
              description: schema.description || ''
            })) : [],
            steps: workflow.steps.map(step => ({
              id: step.id,
              name: step.name,
              description: step.description,
              dependencies: step.dependencies || [],
              parallel: step.parallel || false,
              optional: step.optional || false,
              retryable: step.retryable || false,
              hasRollback: !!step.rollbackHandler
            }))
          };
        }
        
        return baseInfo;
      });
      
      // Add helpful hints
      const hints = await hintsService.getWorkflowHints();
      
      return {
        content: [
          {
            type: 'text',
            text: `Found ${formattedWorkflows.length} workflows${params.category ? ` in category '${params.category}'` : ''}:`
          },
          {
            type: 'text',
            text: JSON.stringify(formattedWorkflows, null, 2)
          },
          {
            type: 'text',
            text: '\n## Available Workflow Categories:\n' + 
                  '- deployment: Property and configuration deployment\n' +
                  '- security: SSL certificates and WAF policies\n' +
                  '- dns: DNS zone and record management\n' +
                  '- migration: Site and configuration migration\n\n' +
                  hints.general.join('\n')
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error listing workflows: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
});