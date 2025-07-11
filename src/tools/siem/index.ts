/**
 * SIEM Tools Module
 * 
 * Exports all SIEM-related tools for security event monitoring and streaming
 * 
 * Updated on 2025-01-11 to use BaseTool.execute pattern
 */

import {
  fetchEvents,
  streamEvents,
  replayEvents
} from './siem-tools';
import { z } from 'zod';
import { CustomerSchema } from '../common';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { MCPToolResponse } from '../../types/mcp-protocol';

// Re-export schemas for external use
const EventModeSchema = z.enum(['offset', 'time']).default('offset');

const SIEMFetchSchema = CustomerSchema.extend({
  configIds: z.array(z.string()).min(1).describe('Security configuration IDs to fetch events from'),
  mode: EventModeSchema,
  // Offset mode parameters
  offset: z.string().optional().describe('Starting offset for fetching events (offset mode)'),
  limit: z.number().int().min(1000).max(600000).default(10000).describe('Number of events to fetch (1000-600000)'),
  // Time mode parameters  
  from: z.string().optional().describe('Start time in epoch seconds (time mode)'),
  to: z.string().optional().describe('End time in epoch seconds (time mode)'),
});

const SIEMStreamSchema = CustomerSchema.extend({
  configIds: z.array(z.string()).min(1).describe('Security configuration IDs to stream events from'),
  pollInterval: z.number().int().min(30).max(300).default(60).describe('Polling interval in seconds (30-300)'),
  limit: z.number().int().min(1000).max(200000).default(10000).describe('Events per poll (1000-200000)'),
  filterPolicies: z.array(z.string()).optional().describe('Filter by specific security policy IDs'),
});

const SIEMReplaySchema = CustomerSchema.extend({
  configIds: z.array(z.string()).min(1).describe('Security configuration IDs to replay events from'),
  from: z.string().describe('Start time in epoch seconds (up to 12 hours ago)'),
  to: z.string().describe('End time in epoch seconds'),
  limit: z.number().int().min(1000).max(600000).default(50000),
});

/**
 * Tool interface with proper typing
 */
interface SIEMTool {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (client: unknown, args: Record<string, unknown>) => Promise<MCPToolResponse>;
}

/**
 * SIEM Domain Tools
 * 
 * Complete SIEM API implementation following MCP patterns
 */
export const siemTools: Record<string, SIEMTool> = {
  'siem_fetch_events': {
    name: 'siem_fetch_events',
    description: 'Fetch security events from Akamai SIEM',
    inputSchema: zodToJsonSchema(SIEMFetchSchema),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = SIEMFetchSchema.parse(args);
      return fetchEvents(validatedArgs);
    }
  },

  'siem_stream_events': {
    name: 'siem_stream_events',
    description: 'Stream security events continuously',
    inputSchema: zodToJsonSchema(SIEMStreamSchema),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = SIEMStreamSchema.parse(args);
      return streamEvents(validatedArgs);
    }
  },

  'siem_replay_events': {
    name: 'siem_replay_events',
    description: 'Replay historical security events',
    inputSchema: zodToJsonSchema(SIEMReplaySchema),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = SIEMReplaySchema.parse(args);
      return replayEvents(validatedArgs);
    }
  }
};

/**
 * Handler function for SIEM tool execution (for backwards compatibility)
 */
export async function handleSIEMToolCall(name: string, args: Record<string, unknown>): Promise<MCPToolResponse> {
  const tool = siemTools[name];
  if (!tool) {
    throw new Error(`Unknown SIEM tool: ${name}`);
  }
  return tool.handler(null, args);
}

// Export for backward compatibility with tools-registry.ts
export const SIEMTools = siemTools;

// Export default
export default siemTools;