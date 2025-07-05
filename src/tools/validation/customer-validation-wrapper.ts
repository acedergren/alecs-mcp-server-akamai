/**
 * Customer Validation Wrapper for MCP Tools
 * Applies customer validation to tool handlers
 */

import { getCustomerValidator } from '../../middleware/customer-validator';
import { InvalidCustomerError } from '../../errors/auth-errors';

// Get singleton instance
const validator = getCustomerValidator();

/**
 * Tool handler type
 */
type ToolHandler = (args: any) => Promise<any>;

/**
 * Tool definition interface
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: ToolHandler;
}

/**
 * Wrap a tool handler with customer validation
 */
export function withCustomerValidation(handler: ToolHandler): ToolHandler {
  return async (args: any) => {
    // Extract customer from args
    const customer = args.customer || 'default';
    
    try {
      // Validate customer access
      await validator.validateCustomerAccess(customer, {
        customer: customer,
      });
    } catch (error) {
      // Convert to tool-friendly error format
      if (error instanceof InvalidCustomerError) {
        return {
          success: false,
          error: `Invalid customer: ${customer}. Please check your .edgerc configuration.`,
        };
      }
      throw error;
    }
    
    // Call original handler
    return handler(args);
  };
}

/**
 * Apply customer validation to a tool definition
 */
export function applyCustomerValidation(tool: ToolDefinition): ToolDefinition {
  return {
    ...tool,
    handler: withCustomerValidation(tool.handler),
  };
}

/**
 * Apply customer validation to multiple tools
 */
export function applyCustomerValidationToTools(tools: ToolDefinition[]): ToolDefinition[] {
  return tools.map(tool => applyCustomerValidation(tool));
}

/**
 * Create a validated tool handler that creates AkamaiClient with validation
 */
export function createValidatedHandler(
  handlerLogic: (client: any, args: any) => Promise<any>
): ToolHandler {
  return withCustomerValidation(async (args: any) => {
    // Import dynamically to avoid circular dependencies
    const { AkamaiClient } = await import('../../akamai-client');
    
    // Create client with validated customer
    const client = new AkamaiClient(args.customer || 'default');
    
    // Execute handler logic
    return handlerLogic(client, args);
  });
}