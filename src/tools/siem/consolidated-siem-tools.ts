/**
 * Consolidated SIEM Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Provides real-time security event streaming integration
 * - Implements Akamai SIEM API for security event collection
 * - Supports offset-based and time-based event retrieval
 * - No local storage - events are streamed directly
 * 
 * This module handles security event fetching, filtering, and streaming
 * from Akamai's Security Events Collector (ASEC).
 */

import { z } from 'zod';
import { 
  CustomerSchema,
  type MCPToolResponse
} from '../common';
import { AkamaiClient } from '../../akamai-client';

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
 * SIEM Event Fetch handler
 */
async function fetchSIEMEvents(
  client: AkamaiClient,
  args: z.infer<typeof SIEMFetchSchema>
): Promise<MCPToolResponse> {
    try {
      // Build query parameters based on mode
      const params: Record<string, string> = {
        limit: args.limit.toString()
      };

      if (args.mode === 'offset' && args.offset) {
        params['offset'] = args.offset;
      } else if (args.mode === 'time') {
        if (args.from) params['from'] = args.from;
        if (args.to) params['to'] = args.to;
      }

      // Fetch events for each config ID
      const allEvents = [];
      let totalEvents = 0;
      let nextOffset = null;

      for (const configId of args.configIds) {
        const response = await client.request({
          path: `/siem/v1/configs/${configId}/events`,
          method: 'GET',
          queryParams: params
        });
        
        // Parse JSONL response (newline-delimited JSON)
        const events = (response as string).split('\n')
          .filter(Boolean)
          .map((line: string) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        // Last line contains offset metadata
        const offsetData = events.pop();
        if (offsetData && offsetData.offset) {
          nextOffset = offsetData.offset;
        }

        allEvents.push(...events);
        totalEvents += events.length;
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            summary: {
              totalEvents,
              configIds: args.configIds,
              mode: args.mode,
              nextOffset,
              hasMore: totalEvents === args.limit
            },
            events: allEvents.slice(0, 100), // Limit output for readability
            message: totalEvents > 100 ? `Showing first 100 of ${totalEvents} events` : `Retrieved ${totalEvents} events`
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching SIEM events: ${error.message || JSON.stringify(error)}`
        }]
      };
    }
}

/**
 * SIEM Continuous Stream handler
 */
async function streamSIEMEvents(
  client: AkamaiClient,
  args: z.infer<typeof SIEMStreamSchema>
): Promise<MCPToolResponse> {
    try {
      // For MCP, we'll simulate streaming by fetching once and providing instructions
      const params: Record<string, string> = {
        limit: args.limit.toString()
      };

      const events = [];
      for (const configId of args.configIds) {
        const response = await client.request({
          path: `/siem/v1/configs/${configId}/events`,
          method: 'GET',
          queryParams: params
        });
        
        const configEvents = (response as string).split('\n')
          .filter(Boolean)
          .slice(0, -1) // Remove offset line
          .map((line: string) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        // Apply policy filter if specified
        if (args.filterPolicies && args.filterPolicies.length > 0) {
          const filtered = configEvents.filter((event: any) => 
            args.filterPolicies!.includes(event.policyId)
          );
          events.push(...filtered);
        } else {
          events.push(...configEvents);
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            streamConfig: {
              configIds: args.configIds,
              pollInterval: args.pollInterval,
              eventsPerPoll: args.limit,
              filterPolicies: args.filterPolicies
            },
            initialBatch: {
              eventCount: events.length,
              events: events.slice(0, 50), // Show first 50 events
              message: `Initial batch: ${events.length} events. Set up polling every ${args.pollInterval}s for continuous updates.`
            },
            instructions: 'To continuously stream, poll siem_events_fetch with offset from previous response'
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error setting up SIEM stream: ${error.message || JSON.stringify(error)}`
        }]
      };
    }
}

/**
 * SIEM Event Replay handler
 */
async function replaySIEMEvents(
  client: AkamaiClient,
  args: z.infer<typeof SIEMReplaySchema>
): Promise<MCPToolResponse> {
    try {
      const params: Record<string, string> = {
        from: args.from,
        to: args.to,
        limit: args.limit.toString()
      };

      const allEvents = [];
      for (const configId of args.configIds) {
        const response = await client.request({
          path: `/siem/v1/configs/${configId}/events`,
          method: 'GET',
          queryParams: params
        });
        
        const events = (response as string).split('\n')
          .filter(Boolean)
          .slice(0, -1) // Remove offset line
          .map((line: string) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        allEvents.push(...events);
      }

      // Group events by type for summary
      const eventTypes: Record<string, number> = {};
      allEvents.forEach((event: any) => {
        const type = event.attackData?.ruleAction || 'unknown';
        eventTypes[type] = (eventTypes[type] || 0) + 1;
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            replay: {
              from: new Date(parseInt(args.from) * 1000).toISOString(),
              to: new Date(parseInt(args.to) * 1000).toISOString(),
              totalEvents: allEvents.length,
              eventTypes,
              configIds: args.configIds
            },
            sample: allEvents.slice(0, 20), // Show first 20 events
            message: `Replayed ${allEvents.length} events from specified time range`
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error replaying SIEM events: ${error.message || JSON.stringify(error)}`
        }]
      };
    }
}

/**
 * SIEM Event Search Tool
 */
const SIEMSearchSchema = CustomerSchema.extend({
  configIds: z.array(z.string()).min(1).describe('Security configuration IDs'),
  clientIp: z.string().optional().describe('Filter by client IP'),
  country: z.string().optional().describe('Filter by country code'),
  httpStatus: z.number().optional().describe('Filter by HTTP status code'),
  ruleAction: z.string().optional().describe('Filter by rule action (alert, deny, etc.)'),
  from: z.string().optional().describe('Start time in epoch seconds'),
  to: z.string().optional().describe('End time in epoch seconds'),
});

async function searchSIEMEvents(
  client: AkamaiClient,
  args: z.infer<typeof SIEMSearchSchema>
): Promise<MCPToolResponse> {
    try {
      // First fetch events
      const params: Record<string, string> = { limit: '50000' };
      if (args.from) params['from'] = args.from;
      if (args.to) params['to'] = args.to;

      const allEvents = [];
      for (const configId of args.configIds) {
        const response = await client.request({
          path: `/siem/v1/configs/${configId}/events`,
          method: 'GET',
          queryParams: params
        });
        
        const events = (response as string).split('\n')
          .filter(Boolean)
          .slice(0, -1)
          .map((line: string) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        allEvents.push(...events);
      }

      // Apply filters
      let filtered = allEvents;
      if (args.clientIp) {
        filtered = filtered.filter((e: any) => e.clientIP === args.clientIp);
      }
      if (args.country) {
        filtered = filtered.filter((e: any) => e.country === args.country);
      }
      if (args.httpStatus) {
        filtered = filtered.filter((e: any) => e.httpStatus === args.httpStatus);
      }
      if (args.ruleAction) {
        filtered = filtered.filter((e: any) => e.attackData?.ruleAction === args.ruleAction);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            search: {
              totalMatches: filtered.length,
              filters: {
                clientIp: args.clientIp,
                country: args.country,
                httpStatus: args.httpStatus,
                ruleAction: args.ruleAction,
                timeRange: args.from && args.to ? `${args.from} to ${args.to}` : 'all'
              }
            },
            results: filtered.slice(0, 50), // Show first 50 matches
            message: filtered.length > 50 ? `Showing first 50 of ${filtered.length} matches` : `Found ${filtered.length} matches`
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error searching SIEM events: ${error.message || JSON.stringify(error)}`
        }]
      };
    }
}

/**
 * SIEM Tools Registry
 */
export class SIEMTools {
  private static tools = {
    'siem_events_fetch': {
      description: 'Fetch security events from Akamai SIEM API (offset or time-based)',
      inputSchema: SIEMFetchSchema,
      handler: fetchSIEMEvents
    },
    'siem_events_stream': {
      description: 'Stream security events continuously with polling (near real-time)',
      inputSchema: SIEMStreamSchema,
      handler: streamSIEMEvents
    },
    'siem_events_replay': {
      description: 'Replay missed security events from the last 12 hours',
      inputSchema: SIEMReplaySchema,
      handler: replaySIEMEvents
    },
    'siem_events_search': {
      description: 'Search security events with filters',
      inputSchema: SIEMSearchSchema,
      handler: searchSIEMEvents
    }
  };

  static getAllTools() {
    return this.tools;
  }

  static getTool(name: string) {
    return this.tools[name as keyof typeof this.tools];
  }
}