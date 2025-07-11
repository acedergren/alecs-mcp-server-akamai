/**
 * MCP Tool Executor for Workflow Engine
 * 
 * CODE KAI IMPLEMENTATION:
 * - Integrates workflow engine with MCP tools
 * - Provides tool discovery and execution
 * - Handles tool validation and error mapping
 * - Supports all registered MCP tools
 */

import { ToolExecutor } from './workflow-engine';
import { getAllToolDefinitions, getToolByName } from '../tools/tools-registry';
import { AkamaiClient } from '../akamai-client';
import { logger } from '../utils/pino-logger';
import { z } from 'zod';

/**
 * MCP Tool Executor implementation
 */
export class MCPToolExecutor implements ToolExecutor {
  private client: AkamaiClient;

  constructor(client?: AkamaiClient) {
    this.client = client || new AkamaiClient();
    this.loadTools();
  }

  /**
   * Load and cache all available tools
   */
  private loadTools(): void {
    const tools = getAllToolDefinitions();
    logger.info(`Loaded ${tools.length} MCP tools for workflow execution`);
  }

  /**
   * Execute a tool by name
   */
  async execute(toolName: string, args: Record<string, any>): Promise<any> {
    logger.info(`Executing tool: ${toolName}`, { args });

    // Get tool definition
    const toolDef = getToolByName(toolName);
    if (!toolDef) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    try {
      // Validate arguments if schema is available
      let validatedArgs = args;
      if (toolDef.schema) {
        validatedArgs = await this.validateArgs(toolDef.schema, args);
      }

      // Extract customer context if provided
      const customer = validatedArgs['customer'] || args['customer'];
      const client = customer ? new AkamaiClient(customer) : this.client;

      // Execute the tool handler
      const result = await toolDef.handler(client, validatedArgs);

      // Extract result based on tool response format
      if (result && typeof result === 'object') {
        if ('content' in result && Array.isArray(result.content)) {
          // MCPToolResponse format
          const content = result.content[0];
          if (content && content.type === 'text' && content.text) {
            try {
              // Try to parse JSON response
              return JSON.parse(content.text);
            } catch {
              // Return as text if not JSON
              return content.text;
            }
          }
        }
        // Return raw result if not MCPToolResponse
        return result;
      }

      return result;
    } catch (error: any) {
      logger.error(`Tool execution failed: ${toolName}`, { error, args });
      
      // Enhance error with context
      const enhancedError = new Error(
        `Tool ${toolName} failed: ${error.message || 'Unknown error'}`
      );
      (enhancedError as any).tool = toolName;
      (enhancedError as any).args = args;
      (enhancedError as any).originalError = error;
      
      throw enhancedError;
    }
  }

  /**
   * Validate tool arguments against schema
   */
  private async validateArgs(
    schema: z.ZodSchema | any,
    args: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      // Handle both Zod schemas and plain schemas
      if (schema && typeof schema.parse === 'function') {
        return schema.parse(args);
      }
      
      // For non-Zod schemas, perform basic validation
      return this.basicValidation(schema, args);
    } catch (error: any) {
      if (error.errors) {
        // Zod validation error
        const issues = error.errors.map((e: any) => 
          `${e.path.join('.')}: ${e.message}`
        ).join(', ');
        throw new Error(`Validation failed: ${issues}`);
      }
      throw error;
    }
  }

  /**
   * Basic validation for non-Zod schemas
   */
  private basicValidation(
    schema: any,
    args: Record<string, any>
  ): Record<string, any> {
    if (!schema || typeof schema !== 'object') {
      return args;
    }

    const validated: Record<string, any> = {};

    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in args)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [key, value] of Object.entries(args)) {
        if (schema.properties[key]) {
          validated[key] = this.validateProperty(
            key,
            value,
            schema.properties[key] as any
          );
        } else if (schema.additionalProperties === false) {
          throw new Error(`Unknown property: ${key}`);
        } else {
          validated[key] = value;
        }
      }
    } else {
      return args;
    }

    return validated;
  }

  /**
   * Validate a single property
   */
  private validateProperty(
    name: string,
    value: any,
    schema: any
  ): any {
    if (!schema) return value;

    // Type validation
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
      
      if (!expectedTypes.includes(actualType)) {
        throw new Error(
          `Property ${name}: expected ${expectedTypes.join(' or ')}, got ${actualType}`
        );
      }
    }

    // String validations
    if (schema.type === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        throw new Error(
          `Property ${name}: minimum length is ${schema.minLength}`
        );
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        throw new Error(
          `Property ${name}: maximum length is ${schema.maxLength}`
        );
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        throw new Error(
          `Property ${name}: does not match pattern ${schema.pattern}`
        );
      }
      if (schema.enum && !schema.enum.includes(value)) {
        throw new Error(
          `Property ${name}: must be one of ${schema.enum.join(', ')}`
        );
      }
    }

    // Number validations
    if (schema.type === 'number' || schema.type === 'integer') {
      if (schema.type === 'integer' && !Number.isInteger(value)) {
        throw new Error(`Property ${name}: must be an integer`);
      }
      if (schema.minimum !== undefined && value < schema.minimum) {
        throw new Error(
          `Property ${name}: minimum value is ${schema.minimum}`
        );
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        throw new Error(
          `Property ${name}: maximum value is ${schema.maximum}`
        );
      }
    }

    // Array validations
    if (schema.type === 'array') {
      if (schema.minItems && value.length < schema.minItems) {
        throw new Error(
          `Property ${name}: minimum ${schema.minItems} items required`
        );
      }
      if (schema.maxItems && value.length > schema.maxItems) {
        throw new Error(
          `Property ${name}: maximum ${schema.maxItems} items allowed`
        );
      }
    }

    return value;
  }

  /**
   * Get available tools for discovery
   */
  getAvailableTools(): string[] {
    return getAllToolDefinitions().map(tool => tool.name);
  }

  /**
   * Get tool metadata
   */
  getToolMetadata(toolName: string): any {
    const tool = getToolByName(toolName);
    if (!tool) {
      return null;
    }

    return {
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
      category: this.getToolCategory(toolName)
    };
  }

  /**
   * Get tool category from name
   */
  private getToolCategory(toolName: string): string {
    const parts = toolName.split('.');
    return parts[0] || 'general';
  }
}