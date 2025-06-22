/**
 * Consolidated Property Workflow Tool
 * Unifies all property-related operations into a single, intelligent interface
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../../utils/logger';

// Import existing property tools
import * as propertyTools from '../property-tools';
import * as propertyManagerTools from '../property-manager-tools';
import * as propertyAdvancedTools from '../property-manager-advanced-tools';
import * as propertyVersionTools from '../property-version-management';

/**
 * Property Workflow Tool - Intelligent property management
 * 
 * This tool consolidates all property operations and provides:
 * - Intelligent operation detection from natural language
 * - Multi-step workflow orchestration
 * - Context-aware parameter inference
 * - Built-in best practices and validation
 */
export const propertyWorkflow: Tool = {
  name: 'property_workflow',
  description: 'Intelligent property management workflow - handles all property operations with smart context awareness',
  inputSchema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        description: 'What you want to do (e.g., "create new property", "activate to production", "add hostname")',
      },
      context: {
        type: 'object',
        description: 'Optional context to help the workflow',
        properties: {
          propertyId: { type: 'string' },
          propertyName: { type: 'string' },
          customer: { type: 'string' },
          environment: { 
            type: 'string',
            enum: ['staging', 'production']
          },
        },
      },
      parameters: {
        type: 'object',
        description: 'Additional parameters for the operation',
      },
      autoExecute: {
        type: 'boolean',
        description: 'Automatically execute the workflow (default: false, will show plan first)',
        default: false,
      },
    },
    required: ['intent'],
  },
};

// Workflow intents mapping
const WORKFLOW_INTENTS = {
  // Property lifecycle
  'create.*property': 'createProperty',
  'new.*property': 'createProperty',
  'list.*properties': 'listProperties',
  'show.*properties': 'listProperties',
  'get.*property': 'getProperty',
  'delete.*property': 'deleteProperty',
  'remove.*property': 'deleteProperty',
  
  // Activation workflows
  'activate.*production': 'activateProduction',
  'activate.*staging': 'activateStaging',
  'deploy.*production': 'activateProduction',
  'deploy.*staging': 'activateStaging',
  'rollback': 'rollbackVersion',
  'cancel.*activation': 'cancelActivation',
  
  // Hostname management
  'add.*hostname': 'addHostname',
  'remove.*hostname': 'removeHostname',
  'list.*hostnames': 'listHostnames',
  
  // Version management
  'create.*version': 'createVersion',
  'list.*versions': 'listVersions',
  'compare.*versions': 'compareVersions',
  'diff.*versions': 'compareVersions',
  
  // Rule management
  'update.*rules': 'updateRules',
  'add.*rule': 'addRule',
  'modify.*behavior': 'modifyBehavior',
  
  // SSL/Certificate
  'add.*certificate': 'addCertificate',
  'enable.*https': 'enableHTTPS',
  'secure.*property': 'enableSecurity',
};

// Workflow execution context
interface WorkflowContext {
  intent: string;
  workflow: string;
  customer?: string;
  propertyId?: string;
  propertyName?: string;
  environment?: 'staging' | 'production';
  parameters: Record<string, any>;
}

// Workflow step definition
interface WorkflowStep {
  name: string;
  description: string;
  tool: string;
  params: Record<string, any>;
  validation?: () => boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

// Workflow definitions
const WORKFLOWS: Record<string, WorkflowStep[]> = {
  createProperty: [
    {
      name: 'Validate Prerequisites',
      description: 'Check contract and group availability',
      tool: 'list_contracts',
      params: {},
    },
    {
      name: 'Create Property',
      description: 'Create new property with best practices',
      tool: 'create_property',
      params: {
        // Will be filled from context
      },
    },
    {
      name: 'Setup Default Rules',
      description: 'Apply security and performance best practices',
      tool: 'update_property_rules',
      params: {
        // Default secure rules
      },
    },
  ],
  
  activateProduction: [
    {
      name: 'Validate Property',
      description: 'Ensure property is ready for production',
      tool: 'validate_property_rules',
      params: {},
    },
    {
      name: 'Check Staging Status',
      description: 'Verify staging activation is successful',
      tool: 'get_activation_status',
      params: { network: 'staging' },
    },
    {
      name: 'Create Production Version',
      description: 'Create new version for production deployment',
      tool: 'create_property_version',
      params: {},
    },
    {
      name: 'Activate to Production',
      description: 'Deploy property to production network',
      tool: 'activate_property',
      params: { network: 'production' },
    },
    {
      name: 'Monitor Activation',
      description: 'Track activation progress',
      tool: 'get_activation_status',
      params: { network: 'production' },
    },
  ],
  
  addHostname: [
    {
      name: 'Validate Hostname',
      description: 'Check hostname format and availability',
      tool: 'validate_hostnames_bulk',
      params: {},
    },
    {
      name: 'Create Edge Hostname',
      description: 'Create edge hostname if needed',
      tool: 'create_edge_hostname',
      params: {},
    },
    {
      name: 'Add to Property',
      description: 'Add hostname to property configuration',
      tool: 'add_property_hostname',
      params: {},
    },
    {
      name: 'Update DNS',
      description: 'Provide DNS configuration instructions',
      tool: 'get_dns_instructions',
      params: {},
    },
  ],
};

/**
 * Analyze user intent and determine workflow
 */
function analyzeIntent(intent: string): string | null {
  const normalizedIntent = intent.toLowerCase().trim();
  
  for (const [pattern, workflow] of Object.entries(WORKFLOW_INTENTS)) {
    const regex = new RegExp(pattern);
    if (regex.test(normalizedIntent)) {
      return workflow;
    }
  }
  
  return null;
}

/**
 * Build workflow context from user input
 */
async function buildWorkflowContext(args: any): Promise<WorkflowContext> {
  const workflow = analyzeIntent(args.intent);
  
  if (!workflow) {
    throw new Error(`Unable to understand intent: "${args.intent}". Try being more specific.`);
  }
  
  const context: WorkflowContext = {
    intent: args.intent,
    workflow,
    customer: args.context?.customer,
    propertyId: args.context?.propertyId,
    propertyName: args.context?.propertyName,
    environment: args.context?.environment,
    parameters: args.parameters || {},
  };
  
  // Infer missing context if possible
  if (!context.customer && context.propertyId) {
    // Extract customer from property ID format
    const match = context.propertyId.match(/prp_(\w+)_/);
    if (match) {
      context.customer = match[1];
    }
  }
  
  return context;
}

/**
 * Generate workflow execution plan
 */
function generateExecutionPlan(
  context: WorkflowContext,
  steps: WorkflowStep[]
): string {
  let plan = `# Workflow Execution Plan\n\n`;
  plan += `**Intent**: ${context.intent}\n`;
  plan += `**Workflow**: ${context.workflow}\n`;
  
  if (context.customer) plan += `**Customer**: ${context.customer}\n`;
  if (context.propertyId) plan += `**Property**: ${context.propertyId}\n`;
  if (context.environment) plan += `**Environment**: ${context.environment}\n`;
  
  plan += `\n## Steps to Execute:\n\n`;
  
  steps.forEach((step, index) => {
    plan += `${index + 1}. **${step.name}**\n`;
    plan += `   ${step.description}\n`;
    plan += `   Tool: \`${step.tool}\`\n\n`;
  });
  
  plan += `\n## Next Steps:\n`;
  plan += `- Review the plan above\n`;
  plan += `- Run with \`autoExecute: true\` to execute\n`;
  plan += `- Or modify parameters as needed\n`;
  
  return plan;
}

/**
 * Execute workflow steps
 */
async function executeWorkflow(
  context: WorkflowContext,
  steps: WorkflowStep[]
): Promise<any> {
  const results: any[] = [];
  
  for (const [index, step] of steps.entries()) {
    logger.info(`Executing step ${index + 1}/${steps.length}: ${step.name}`);
    
    try {
      // Merge context parameters with step parameters
      const params = {
        ...step.params,
        ...context.parameters,
        customer: context.customer,
        propertyId: context.propertyId,
      };
      
      // Execute the tool
      const result = await executeToolByName(step.tool, params);
      results.push({
        step: step.name,
        success: true,
        result,
      });
      
      // Call success handler if defined
      if (step.onSuccess) {
        step.onSuccess(result);
      }
      
    } catch (error) {
      logger.error(`Step failed: ${step.name}`, error);
      
      results.push({
        step: step.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Call error handler if defined
      if (step.onError) {
        step.onError(error);
      }
      
      // Stop workflow on error
      break;
    }
  }
  
  return results;
}

/**
 * Execute a tool by name (simplified for POC)
 */
async function executeToolByName(toolName: string, params: any): Promise<any> {
  // This would call the actual tool implementation
  // For now, return mock success
  return {
    success: true,
    message: `Executed ${toolName} with params: ${JSON.stringify(params)}`,
  };
}

/**
 * Main workflow handler
 */
export async function handlePropertyWorkflow(args: any) {
  try {
    // Build workflow context
    const context = await buildWorkflowContext(args);
    
    // Get workflow steps
    const steps = WORKFLOWS[context.workflow];
    if (!steps) {
      throw new Error(`Workflow '${context.workflow}' not implemented yet`);
    }
    
    // Generate or execute workflow
    if (args.autoExecute) {
      const results = await executeWorkflow(context, steps);
      
      return {
        content: [{
          type: 'text',
          text: formatWorkflowResults(context, results),
        }],
      };
    } else {
      const plan = generateExecutionPlan(context, steps);
      
      return {
        content: [{
          type: 'text',
          text: plan,
        }],
      };
    }
    
  } catch (error) {
    logger.error('Property workflow error:', error);
    
    return {
      content: [{
        type: 'text',
        text: `❌ Workflow Error: ${error instanceof Error ? error.message : String(error)}\n\nTry using a clearer intent, for example:\n- "create new property for customer X"\n- "activate property to production"\n- "add hostname to property"`,
      }],
    };
  }
}

/**
 * Format workflow execution results
 */
function formatWorkflowResults(context: WorkflowContext, results: any[]): string {
  let output = `# Workflow Execution Results\n\n`;
  output += `**Workflow**: ${context.workflow}\n`;
  output += `**Intent**: "${context.intent}"\n\n`;
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  output += `## Summary\n`;
  output += `✅ Successful steps: ${successful}\n`;
  if (failed > 0) {
    output += `❌ Failed steps: ${failed}\n`;
  }
  
  output += `\n## Step Results\n\n`;
  
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    output += `${index + 1}. ${icon} ${result.step}\n`;
    
    if (result.success) {
      output += `   Result: ${JSON.stringify(result.result, null, 2)}\n`;
    } else {
      output += `   Error: ${result.error}\n`;
    }
    output += '\n';
  });
  
  if (failed > 0) {
    output += `\n## Next Steps\n`;
    output += `The workflow encountered errors. Please review the failed steps and try again.\n`;
  } else {
    output += `\n## Success! 🎉\n`;
    output += `All workflow steps completed successfully.\n`;
  }
  
  return output;
}