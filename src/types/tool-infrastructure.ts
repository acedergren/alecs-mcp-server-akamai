/**
 * CODE KAI: Essential Tool Infrastructure
 * Core types integrated into existing tools - no new files
 * Enhances existing property-tools.ts and activation tools
 */

import { z } from 'zod';
import { MCPToolResponse } from '../types';

/**
 * Base interface for all tool arguments
 * Ensures consistent customer parameter across all tools
 */
export interface BaseToolArgs {
  /** Optional customer section name for multi-tenant support */
  customer?: string;
  /** Optional timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Tool implementation function type with strict typing
 */
export type ToolImplementation<TArgs extends BaseToolArgs = BaseToolArgs> = (
  client: any, // Will be AkamaiClient
  args: TArgs
) => Promise<MCPToolResponse>;

/**
 * Tool definition with compile-time parameter validation
 */
export interface ToolDefinition<TArgs extends BaseToolArgs = BaseToolArgs> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TArgs>;
  implementation: ToolImplementation<TArgs>;
  examples?: ToolExample<TArgs>[];
  category?: ToolCategory;
  tags?: string[];
}

/**
 * Tool example for documentation and testing
 */
export interface ToolExample<TArgs extends BaseToolArgs = BaseToolArgs> {
  description: string;
  input: TArgs;
  expectedOutput?: Partial<MCPToolResponse>;
  customer?: string;
}

/**
 * Tool categories for organization
 */
export enum ToolCategory {
  PROPERTY_MANAGEMENT = 'property-management',
  DNS_MANAGEMENT = 'dns-management',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  REPORTING = 'reporting',
  CERTIFICATES = 'certificates',
  PURGING = 'purging'
}

/**
 * Enhanced error with context for better debugging
 */
export class ToolError extends Error {
  constructor(
    public readonly context: {
      operation: string;
      toolName: string;
      args: Record<string, any>;
      customer?: string;
      propertyId?: string;
      originalError?: Error;
      suggestion?: string;
    }
  ) {
    const message = ToolError.formatMessage(context);
    super(message);
    this.name = 'ToolError';
  }

  private static formatMessage(context: ToolError['context']): string {
    let message = `[${context.toolName}] ${context.operation} failed`;
    
    if (context.propertyId) {
      message += ` for property ${context.propertyId}`;
    }
    
    if (context.customer) {
      message += ` (customer: ${context.customer})`;
    }
    
    if (context.originalError) {
      message += `\\n\\nOriginal error: ${context.originalError.message}`;
    }
    
    if (context.suggestion) {
      message += `\\n\\nSuggestion: ${context.suggestion}`;
    }
    
    return message;
  }

  /**
   * Get structured error response for MCP
   */
  toMCPResponse(): MCPToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: this.message
        }
      ]
    };
  }
}

/**
 * Tool validation result
 */
export interface ToolValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Compile-time tool parameter validator
 */
export type ValidateToolParams<TDef, TImpl> = TDef extends TImpl ? TDef : never;

/**
 * Runtime tool registry with type safety
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<any>>();

  /**
   * Register a tool with compile-time and runtime validation
   */
  register<TArgs extends BaseToolArgs>(
    definition: ToolDefinition<TArgs>
  ): void {
    // Validate tool name format (snake_case)
    if (!/^[a-z][a-z0-9_]*$/.test(definition.name)) {
      throw new Error(
        `Tool name '${definition.name}' must be snake_case (lowercase letters, numbers, underscores)`
      );
    }

    // Check for duplicates
    if (this.tools.has(definition.name)) {
      throw new Error(`Tool '${definition.name}' is already registered`);
    }

    this.tools.set(definition.name, definition);
  }

  /**
   * Get a tool definition
   */
  get<TArgs extends BaseToolArgs>(name: string): ToolDefinition<TArgs> | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  getAll(): ToolDefinition<any>[] {
    return Array.from(this.tools.values());
  }

  /**
   * Validate tool arguments
   */
  validateArgs<TArgs extends BaseToolArgs>(
    toolName: string,
    args: unknown
  ): ToolValidationResult {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        valid: false,
        errors: [{ path: '', message: `Tool '${toolName}' not found`, code: 'TOOL_NOT_FOUND' }],
        warnings: []
      };
    }

    try {
      tool.inputSchema.parse(args);
      return { valid: true, errors: [], warnings: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code
          })),
          warnings: []
        };
      }
      throw error;
    }
  }
}

/**
 * Test defaults for consistent testing
 */
export const TEST_DEFAULTS = {
  customer: 'testing',
  domain: 'solutionsedge.io',
  testPropertyPrefix: 'mcp-test-',
  timeout: 30000,
  contracts: {
    testing: 'ctr_1-5C13O2',
    production: 'ctr_V-44KRACO'
  },
  groups: {
    testing: 'grp_125952'
  }
} as const;

/**
 * Default timeout configuration
 */
export const TIMEOUT_CONFIG = {
  DEFAULT: 30000, // 30 seconds
  LONG_OPERATION: 120000, // 2 minutes
  ACTIVATION: 300000, // 5 minutes
  REPORT: 60000, // 1 minute
} as const;