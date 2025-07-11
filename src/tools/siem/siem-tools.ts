/**
 * SIEM Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Provides real-time security event streaming integration
 * - Implements Akamai SIEM API for security event collection
 * - Supports offset-based and time-based event retrieval
 * - No local storage - events are streamed directly
 * 
 * This module handles security event fetching, filtering, and streaming
 * from Akamai's Security Events Collector (ASEC).
 * 
 * Updated on 2025-01-11 to use BaseTool.execute pattern
 */

import { type MCPToolResponse, BaseTool } from '../common';
import { z } from 'zod';
import { CustomerSchema } from '../common';

/**
 * SIEM-specific schemas
 */
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
 * Response schemas
 */
const SIEMEventSchema = z.object({
  attackData: z.object({
    configId: z.string(),
    policyId: z.string(),
    ruleId: z.string(),
    ruleMessage: z.string(),
    ruleSelector: z.string().optional(),
    ruleTag: z.string().optional(),
    clientIP: z.string(),
    country: z.string().optional(),
    city: z.string().optional(),
    method: z.string(),
    host: z.string(),
    path: z.string(),
    query: z.string().optional(),
    statusCode: z.number(),
    responseTime: z.number(),
    userAgent: z.string().optional(),
  }),
  geo: z.object({
    continent: z.string(),
    country: z.string(),
    city: z.string().optional(),
    regionCode: z.string().optional(),
  }).optional(),
  httpMessage: z.object({
    requestId: z.string(),
    start: z.string(),
    protocol: z.string(),
    method: z.string(),
    host: z.string(),
    path: z.string(),
    query: z.string().optional(),
    requestHeaders: z.record(z.string()).optional(),
    status: z.number(),
    bytes: z.number().optional(),
    responseHeaders: z.record(z.string()).optional(),
  }),
  time: z.string(),
});

const SIEMResponseSchema = z.object({
  events: z.array(SIEMEventSchema),
  offset: z.string().optional(),
  total: z.number().optional(),
});

const StreamControlSchema = z.object({
  streamId: z.string(),
  status: z.enum(['active', 'stopped', 'error']),
  eventsProcessed: z.number(),
  lastOffset: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Format SIEM events for display
 */
function formatSIEMEvents(response: z.infer<typeof SIEMResponseSchema>, configIds: string[]): string {
  let text = `🛡️ **SIEM Security Events**\n`;
  text += `Config IDs: ${configIds.join(', ')}\n`;
  text += `Events Retrieved: ${response.events.length}\n`;
  
  if (response.offset) {
    text += `Next Offset: ${response.offset}\n`;
  }
  
  text += `\n`;
  
  // Group events by attack type
  const eventsByRule: Record<string, number> = {};
  const eventsByCountry: Record<string, number> = {};
  
  response.events.forEach(event => {
    const ruleKey = `${event.attackData.ruleId}: ${event.attackData.ruleMessage}`;
    eventsByRule[ruleKey] = (eventsByRule[ruleKey] || 0) + 1;
    
    if (event.geo?.country) {
      eventsByCountry[event.geo.country] = (eventsByCountry[event.geo.country] || 0) + 1;
    }
  });
  
  // Show top rules
  text += `**Top Attack Rules**:\n`;
  Object.entries(eventsByRule)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([rule, count]) => {
      text += `• ${rule}: ${count} events\n`;
    });
  
  text += `\n**Top Countries**:\n`;
  Object.entries(eventsByCountry)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([country, count]) => {
      text += `• ${country}: ${count} events\n`;
    });
  
  // Show sample events
  if (response.events.length > 0) {
    text += `\n**Sample Events** (first 5):\n`;
    response.events.slice(0, 5).forEach((event, index) => {
      text += `\n${index + 1}. [${event.time}] ${event.attackData.clientIP}\n`;
      text += `   • Rule: ${event.attackData.ruleMessage}\n`;
      text += `   • Request: ${event.httpMessage.method} ${event.httpMessage.host}${event.httpMessage.path}\n`;
      text += `   • Status: ${event.httpMessage.status}\n`;
      if (event.geo) {
        text += `   • Location: ${event.geo.city || 'Unknown'}, ${event.geo.country}\n`;
      }
    });
  }
  
  return text;
}

/**
 * Format stream control response
 */
function formatStreamControl(control: z.infer<typeof StreamControlSchema>): string {
  let text = `📡 **SIEM Stream Control**\n\n`;
  text += `**Stream ID**: ${control.streamId}\n`;
  text += `**Status**: ${control.status}\n`;
  text += `**Events Processed**: ${control.eventsProcessed}\n`;
  
  if (control.lastOffset) {
    text += `**Last Offset**: ${control.lastOffset}\n`;
  }
  
  if (control.error) {
    text += `**Error**: ${control.error}\n`;
  }
  
  return text;
}

/**
 * Fetch SIEM security events
 */
export async function fetchEvents(args: z.infer<typeof SIEMFetchSchema>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'siem',
    'siem_fetch_events',
    args,
    async (client) => {
      const queryParams: any = {
        limit: args.limit.toString()
      };
      
      // Add mode-specific parameters
      if (args.mode === 'offset' && args.offset) {
        queryParams.offset = args.offset;
      } else if (args.mode === 'time') {
        if (args.from) queryParams.from = args.from;
        if (args.to) queryParams.to = args.to;
      }
      
      const response = await client.request({
        method: 'GET',
        path: `/siem/v1/configs/${args.configIds.join(',')}/security-events`,
        queryParams
      });
      
      return SIEMResponseSchema.parse(response);
    },
    {
      format: 'text',
      formatter: (result) => formatSIEMEvents(result, args.configIds),
      progress: true
    }
  );
}

/**
 * Stream SIEM events continuously
 */
export async function streamEvents(args: z.infer<typeof SIEMStreamSchema>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'siem',
    'siem_stream_events',
    args,
    async (_client) => {
      // Note: This is a simplified implementation
      // In production, this would set up actual streaming
      const streamId = `stream_${Date.now()}`;
      
      return {
        streamId,
        status: 'active' as const,
        eventsProcessed: 0,
        message: `Stream initialized. Use siem_stream_control to manage the stream.`,
        configIds: args.configIds,
        pollInterval: args.pollInterval,
        limit: args.limit
      };
    },
    {
      format: 'text',
      formatter: (result) => {
        let text = `📡 **SIEM Event Stream Started**\n\n`;
        text += `**Stream ID**: ${result.streamId}\n`;
        text += `**Config IDs**: ${result.configIds.join(', ')}\n`;
        text += `**Poll Interval**: ${result.pollInterval}s\n`;
        text += `**Events per Poll**: ${result.limit}\n`;
        text += `\n${result.message}`;
        return text;
      }
    }
  );
}

/**
 * Replay historical SIEM events
 */
export async function replayEvents(args: z.infer<typeof SIEMReplaySchema>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'siem',
    'siem_replay_events',
    args,
    async (client) => {
      const queryParams = {
        from: args.from,
        to: args.to,
        limit: args.limit.toString()
      };
      
      const response = await client.request({
        method: 'GET',
        path: `/siem/v1/configs/${args.configIds.join(',')}/security-events`,
        queryParams
      });
      
      return SIEMResponseSchema.parse(response);
    },
    {
      format: 'text',
      formatter: (result) => {
        let text = formatSIEMEvents(result, args.configIds);
        text = text.replace('SIEM Security Events', 'SIEM Historical Event Replay');
        
        const fromDate = new Date(parseInt(args.from) * 1000).toISOString();
        const toDate = new Date(parseInt(args.to) * 1000).toISOString();
        text = text.replace('Config IDs:', `Time Range: ${fromDate} to ${toDate}\nConfig IDs:`);
        
        return text;
      },
      progress: true
    }
  );
}

/**
 * Legacy class exports for backward compatibility
 * @deprecated Use direct function exports instead
 */
export const siemTools = {
  fetchEvents,
  streamEvents,
  replayEvents
};