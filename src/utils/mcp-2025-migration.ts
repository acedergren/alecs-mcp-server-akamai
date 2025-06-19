/**
 * MCP 2025-06-18 Migration Utilities
 * Helpers for migrating existing tools to new MCP format
 */

import { z, type ZodSchema } from 'zod';

import { type McpToolResponse } from '../types/mcp';
import {
  type Mcp2025ToolDefinition,
  type Mcp2025ToolResponse,
  type McpResponseMeta,
  createMcp2025Response,
  toSnakeCase,
} from '../types/mcp-2025';

/**
 * Convert Zod schema to JSON Schema format for MCP 2025
 * This is a simplified converter for common cases
 */
export function zodToJsonSchema(schema: ZodSchema): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as ZodSchema;
      const fieldJsonSchema = zodTypeToJsonSchema(fieldSchema);

      properties[key] = fieldJsonSchema;

      // Check if field is required
      if (!fieldSchema.isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 && { required }),
      additionalProperties: false,
    };
  }

  return { type: 'object', properties: {} };
}

/**
 * Convert individual Zod type to JSON Schema
 */
function zodTypeToJsonSchema(schema: ZodSchema): Record<string, unknown> {
  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  } else if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  } else if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  } else if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodTypeToJsonSchema(schema.element),
    };
  } else if (schema instanceof z.ZodEnum) {
    const values = schema.options;
    return {
      type: 'string',
      enum: values,
    };
  } else if (schema instanceof z.ZodOptional) {
    return zodTypeToJsonSchema(schema.unwrap());
  } else if (schema instanceof z.ZodObject) {
    return zodToJsonSchema(schema);
  }

  // Default fallback
  return { type: 'string' };
}

/**
 * Create MCP 2025 compliant tool definition
 */
export function createMcp2025Tool(
  name: string,
  description: string,
  zodSchema: ZodSchema,
): Mcp2025ToolDefinition {
  const snakeCaseName = toSnakeCase(name);
  const jsonSchema = zodToJsonSchema(zodSchema);

  return {
    name: snakeCaseName,
    description,
    inputSchema: jsonSchema as Mcp2025ToolDefinition['inputSchema'],
  };
}

/**
 * Wrap existing tool handler for MCP 2025 compliance
 */
export function wrapToolHandler<T>(
  handler: (...args: any[]) => Promise<McpToolResponse<T>>,
  toolName: string,
  version: string = '1.0.0',
): (...args: any[]) => Promise<Mcp2025ToolResponse<T>> {
  return async (...args: any[]): Promise<Mcp2025ToolResponse<T>> => {
    const startTime = Date.now();

    try {
      const oldResponse = await handler(...args);

      // Convert old response to new format
      const meta: McpResponseMeta = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        version,
        tool: toSnakeCase(toolName),
      };

      // Include old metadata if present
      if (oldResponse.metadata) {
        Object.assign(meta, oldResponse.metadata);
      }

      return createMcp2025Response(
        oldResponse.success,
        oldResponse.data as T,
        oldResponse.error,
        meta,
      );
    } catch (error) {
      const meta: McpResponseMeta = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        version,
        tool: toSnakeCase(toolName),
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      };

      return createMcp2025Response(
        false,
        undefined as any as T,
        error instanceof Error ? error.message : 'Unknown error',
        meta,
      );
    }
  };
}

/**
 * Batch convert tool definitions to MCP 2025 format
 */
export interface ToolMigrationConfig {
  name: string;
  description: string;
  zodSchema: ZodSchema;
  handler: (...args: any[]) => Promise<any>;
  version?: string;
}

export function migrateTools(tools: ToolMigrationConfig[]): Array<{
  definition: Mcp2025ToolDefinition;
  handler: (...args: any[]) => Promise<Mcp2025ToolResponse>;
}> {
  return tools.map(tool => ({
    definition: createMcp2025Tool(tool.name, tool.description, tool.zodSchema),
    handler: wrapToolHandler(tool.handler, tool.name, tool.version),
  }));
}

/**
 * Validate tool name compliance
 */
export function validateToolName(name: string): { valid: boolean; suggestion?: string } {
  const snakeCase = toSnakeCase(name);

  if (name === snakeCase) {
    return { valid: true };
  }

  return {
    valid: false,
    suggestion: snakeCase,
  };
}

/**
 * Migration report generator
 */
export interface MigrationIssue {
  type: 'naming' | 'schema' | 'response';
  tool: string;
  issue: string;
  suggestion?: string;
}

export function generateMigrationReport(
  tools: Array<{ name: string; inputSchema?: any; responseExample?: any }>,
): MigrationIssue[] {
  const issues: MigrationIssue[] = [];

  for (const tool of tools) {
    // Check naming
    const nameValidation = validateToolName(tool.name);
    if (!nameValidation.valid) {
      issues.push({
        type: 'naming',
        tool: tool.name,
        issue: 'Tool name should use snake_case',
        suggestion: nameValidation.suggestion,
      });
    }

    // Check schema format
    if (tool.inputSchema && !isValidJsonSchema(tool.inputSchema)) {
      issues.push({
        type: 'schema',
        tool: tool.name,
        issue: 'Input schema should be valid JSON Schema format',
        suggestion: 'Use proper JSON Schema with type definitions',
      });
    }

    // Check response format
    if (tool.responseExample && !hasMetaField(tool.responseExample)) {
      issues.push({
        type: 'response',
        tool: tool.name,
        issue: 'Response should include optional _meta field',
        suggestion: 'Add _meta field with timestamp and metadata',
      });
    }
  }

  return issues;
}

/**
 * Check if schema is valid JSON Schema
 */
function isValidJsonSchema(schema: any): boolean {
  return (
    typeof schema === 'object' &&
    schema.type === 'object' &&
    typeof schema.properties === 'object'
  );
}

/**
 * Check if response has _meta field capability
 */
function hasMetaField(response: any): boolean {
  return typeof response === 'object' && ('_meta' in response || response._meta === undefined);
}

/**
 * Create backwards-compatible tool wrapper
 * Allows tools to accept both old and new naming conventions
 */
export function createBackwardsCompatibleTool(
  oldName: string,
  newName: string,
  handler: (...args: any[]) => Promise<Mcp2025ToolResponse>,
): Array<{
  name: string;
  handler: (...args: any[]) => Promise<Mcp2025ToolResponse>;
}> {
  return [
    { name: newName, handler },
    {
      name: oldName,
      handler: async (...args: any[]) => {
        console.warn(`Tool '${oldName}' is deprecated. Use '${newName}' instead.`);
        return handler(...args);
      },
    },
  ];
}
