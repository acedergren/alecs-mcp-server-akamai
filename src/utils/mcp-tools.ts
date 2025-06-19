/**
 * MCP Tool Creation Utility
 * Simplified tool creation for MCP servers
 */

import { type z } from 'zod';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

export interface MCPToolConfig<T = any> {
  name: string;
  description: string;
  schema: z.ZodSchema<T>;
  handler: (args: T, client: AkamaiClient) => Promise<MCPToolResponse>;
}

export function createMCPTool<T = any>(config: MCPToolConfig<T>) {
  return {
    name: config.name,
    description: config.description,
    schema: config.schema,
    handler: config.handler,
  };
}
