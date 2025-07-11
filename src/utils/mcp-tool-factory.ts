/**
 * MCP TOOL FACTORY
 * 
 * Factory function for creating MCP tools with consistent structure
 */

import { z } from 'zod';
import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types/mcp-protocol';

export interface MCPToolConfig<TSchema extends z.ZodType> {
  name: string;
  description: string;
  schema: TSchema;
  handler: (client: AkamaiClient, params: z.infer<TSchema>) => Promise<MCPToolResponse>;
}

export function createMCPTool<TSchema extends z.ZodType>(config: MCPToolConfig<TSchema>) {
  return {
    name: config.name,
    description: config.description,
    inputSchema: config.schema,
    handler: config.handler
  };
}