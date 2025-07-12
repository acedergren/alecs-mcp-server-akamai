/**
 * Type definitions for dynamic tool discovery system
 */

import { z } from 'zod';
import type { MCPToolResponse } from '../../types/mcp-protocol';
import type { AkamaiClient } from '../../akamai-client';

/**
 * Base tool handler type
 */
export type ToolHandler<TInput = any> = (
  client: AkamaiClient,
  args: TInput
) => Promise<MCPToolResponse>;

/**
 * Tool definition with full type safety
 */
export interface ToolDefinition<TSchema extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema?: TSchema;
  handler: ToolHandler<z.infer<TSchema>>;
  metadata?: ToolMetadata;
}

/**
 * Tool metadata for standard features
 */
export interface ToolMetadata {
  domain: string;
  category?: string;
  cacheable?: boolean;
  cacheTtl?: number;
  progressTracking?: boolean;
  deprecated?: boolean;
  replacedBy?: string;
  tags?: string[];
  requiredPermissions?: string[];
}