/**
 * Edge Diagnostics Tools Implementation
 * 
 * Provides comprehensive edge diagnostics and troubleshooting tools
 * for analyzing content delivery, network connectivity, and edge behavior
 * 
 * Updated on 2025-01-11 to use AkamaiOperation.execute pattern
 */

import { type MCPToolResponse, AkamaiOperation } from '../common';
import type { z } from 'zod';
import {
  DiagnosticsEndpoints,
  DiagnosticsToolSchemas,
  type DiagnosticsAsyncResponse,
  type DigResponse,
  type MtrResponse,
  type GrepResponse,
  type EdgeLocation
} from './api';

interface CurlResponse {
  url?: string;
  status?: number;
  statusText?: string;
  edgeIP?: string;
  [key: string]: any;
}

/**
 * Format cURL response for display
 */
function formatCurlResponse(curlData: CurlResponse): string {
  let text = `🌐 **cURL Request Results**\n`;
  text += `URL: ${curlData.url}\n`;
  text += `Status: ${curlData.status} ${curlData.statusText}\n`;
  text += `Edge IP: ${curlData.edgeIP}\n`;
  text += `Request ID: ${curlData['requestId']}\n\n`;
  
  text += `**Timing**:\n`;
  text += `• DNS: ${curlData['timing']?.['dns']}ms\n`;
  text += `• Connect: ${curlData['timing']?.['connect']}ms\n`;
  text += `• SSL: ${curlData['timing']?.['ssl']}ms\n`;
  text += `• First Byte: ${curlData['timing']?.['firstByte']}ms\n`;
  text += `• Total: ${curlData['timing']?.['total']}ms\n\n`;
  
  text += `**Headers**:\n`;
  Object.entries(curlData['headers'] || {}).forEach(([key, value]) => {
    text += `• ${key}: ${value}\n`;
  });
  
  if (curlData['body']) {
    text += `\n**Body** (truncated):\n`;
    const body = curlData['body'] as string;
    text += `${body.substring(0, 1000)}${body.length > 1000 ? '...' : ''}\n`;
  }
  
  return text;
}

/**
 * Format dig response for display
 */
function formatDigResponse(digData: DigResponse, hostname: string, queryType?: string): string {
  let text = `🌐 **DNS Lookup Results**\n`;
  text += `Hostname: ${hostname}\n`;
  text += `Query Type: ${queryType || 'A'}\n`;
  text += `Server: ${digData.server}\n`;
  text += `Query Time: ${digData.queryTime}ms\n\n`;
  
  if (digData.answers.length > 0) {
    text += `**Answers** (${digData.answers.length}):\n`;
    digData.answers.forEach((answer, index) => {
      text += `${index + 1}. ${answer.name} ${answer.ttl} ${answer.type} ${answer.data}\n`;
    });
  } else {
    text += `⚠️ No DNS records found\n`;
  }
  
  return text;
}

/**
 * Format MTR response for display
 */
function formatMtrResponse(mtrData: MtrResponse, destinationDomain: string): string {
  let text = `🛤️ **MTR Trace Results**\n`;
  text += `Destination: ${destinationDomain}\n`;
  text += `Total Hops: ${mtrData.hops.length}\n\n`;
  
  text += `**Route**:\n`;
  mtrData.hops.forEach(hop => {
    text += `${hop.hopNumber}. ${hop.hostname || hop.ip} (${hop.ip})\n`;
    text += `   Loss: ${hop.loss}% | Sent: ${hop.sent} | Last: ${hop.last}ms\n`;
    text += `   Avg: ${hop.avg}ms | Best: ${hop.best}ms | Worst: ${hop.worst}ms | StdDev: ${hop.stdDev}ms\n\n`;
  });
  
  return text;
}

/**
 * Format grep response for display
 */
function formatGrepResponse(grepData: GrepResponse, cpCode: string): string {
  let text = `🔍 **Edge Server Log Search**\n`;
  text += `CP Code: ${cpCode}\n`;
  text += `Total Matches: ${(grepData as any).totalMatches}\n`;
  text += `Returned: ${(grepData as any).results?.length || 0}\n\n`;
  
  if ((grepData as any).results?.length > 0) {
    text += `**Log Entries**:\n`;
    (grepData as any).results.forEach((entry: any, index: any) => {
      text += `${index + 1}. [${entry.timestamp}] ${entry.message}\n`;
      if (entry.details) {
        Object.entries(entry.details).forEach(([key, value]) => {
          text += `   • ${key}: ${value}\n`;
        });
      }
      text += '\n';
    });
  } else {
    text += `⚠️ No matching log entries found\n`;
  }
  
  return text;
}

/**
 * Format edge locations for display
 */
function formatEdgeLocations(locations: EdgeLocation[]): string {
  let text = `🌍 **Edge Server Locations**\n`;
  text += `Total Locations: ${locations.length}\n\n`;
  
  const byRegion = locations.reduce((acc, loc) => {
    const region = (loc as any).region || 'Unknown';
    if (!acc[region]) {acc[region] = [];}
    acc[region].push(loc);
    return acc;
  }, {} as Record<string, EdgeLocation[]>);
  
  Object.entries(byRegion).forEach(([region, locs]) => {
    text += `**${region}** (${locs.length} locations):\n`;
    locs.forEach(loc => {
      text += `• ${(loc as any).id}: ${(loc as any).city}, ${(loc as any).country} (${(loc as any).latitude}, ${(loc as any).longitude})\n`;
    });
    text += '\n';
  });
  
  return text;
}

/**
 * Format async diagnostic status
 */
function formatAsyncStatus(status: DiagnosticsAsyncResponse): string {
  let text = `📊 **Diagnostic Request Status**\n`;
  text += `Request ID: ${status.requestId}\n`;
  text += `Status: ${status.status}\n`;
  text += `Type: ${(status as any).testType}\n`;
  text += `Created: ${(status as any).createdTime}\n`;
  
  if ((status as any).completedTime) {
    text += `Completed: ${(status as any).completedTime}\n`;
  }
  
  if ((status as any).results) {
    text += `\n**Results**:\n`;
    text += JSON.stringify((status as any).results, null, 2);
  }
  
  return text;
}

/**
 * Request content with cURL
 */
export async function runCurl(args: z.infer<typeof DiagnosticsToolSchemas.runCurl>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'diagnostics',
    'diagnostics_curl',
    args,
    async (client) => {
      const { customer: _, ...params } = args;
      return client.request<CurlResponse>({
        path: DiagnosticsEndpoints.curl(),
        method: 'POST',
        body: params
      });
    },
    {
      format: 'text',
      formatter: (result) => formatCurlResponse(result),
      cacheKey: (p) => `diagnostics:curl:${p.url}:${p.edgeLocationId || 'auto'}`,
      cacheTtl: 60 // 1 minute
    }
  );
}

/**
 * Perform DNS lookup with dig
 */
export async function runDig(args: z.infer<typeof DiagnosticsToolSchemas.runDig>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'diagnostics',
    'diagnostics_dig',
    args,
    async (client) => {
      const { customer: _, ...params } = args;
      return client.request<DigResponse>({
        path: DiagnosticsEndpoints.dig(),
        method: 'POST',
        body: params
      });
    },
    {
      format: 'text',
      formatter: (result) => formatDigResponse(result, args.hostname, args.queryType),
      cacheKey: (p) => `diagnostics:dig:${p.hostname}:${p.queryType || 'A'}:${p.edgeLocationId || 'auto'}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Test network connectivity with MTR
 */
export async function runMtr(args: z.infer<typeof DiagnosticsToolSchemas.runMtr>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'diagnostics',
    'diagnostics_mtr',
    args,
    async (client) => {
      const { customer: _, ...params } = args;
      return client.request<MtrResponse>({
        path: DiagnosticsEndpoints.mtr(),
        method: 'POST',
        body: params
      });
    },
    {
      format: 'text',
      formatter: (result) => formatMtrResponse(result, args.destinationDomain),
      cacheKey: (p) => `diagnostics:mtr:${p.destinationDomain}:${p.edgeLocationId || 'auto'}`,
      cacheTtl: 60 // 1 minute
    }
  );
}

/**
 * Search edge server logs with GREP
 */
export async function runGrep(args: z.infer<typeof DiagnosticsToolSchemas.runGrep>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'diagnostics',
    'diagnostics_grep',
    args,
    async (client) => {
      const { customer: _, ...params } = args;
      return client.request<GrepResponse>({
        path: DiagnosticsEndpoints.grep(),
        method: 'POST',
        body: params
      });
    },
    {
      format: 'text',
      formatter: (result) => formatGrepResponse(result, args.cpCode),
      cacheKey: (p) => `diagnostics:grep:${p.cpCode}:${p.start || 'all'}`,
      cacheTtl: 60 // 1 minute
    }
  );
}

/**
 * Get available edge server locations
 */
export async function listEdgeLocations(args: z.infer<typeof DiagnosticsToolSchemas.listEdgeLocations>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'diagnostics',
    'diagnostics_edge_locations',
    args,
    async (client) => {
      return client.request<EdgeLocation[]>({
        path: DiagnosticsEndpoints.edgeLocations(),
        method: 'GET'
      });
    },
    {
      format: 'text',
      formatter: formatEdgeLocations,
      cacheKey: () => 'diagnostics:edge-locations',
      cacheTtl: 3600 // 1 hour
    }
  );
}

/**
 * Get async diagnostic request status
 */
export async function getAsyncRequestStatus(args: z.infer<typeof DiagnosticsToolSchemas.getAsyncRequestStatus>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'diagnostics',
    'diagnostics_async_status',
    args,
    async (client) => {
      return client.request<DiagnosticsAsyncResponse>({
        path: DiagnosticsEndpoints.asyncRequestStatus(args.requestId),
        method: 'GET'
      });
    },
    {
      format: 'text',
      formatter: formatAsyncStatus,
      progress: true
    }
  );
}

/**
 * Run diagnostic test URL
 */
export async function runTestUrl(args: z.infer<typeof DiagnosticsToolSchemas.runTestUrl>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'diagnostics',
    'diagnostics_test_url',
    args,
    async (client) => {
      const { customer: _, ...params } = args;
      return client.request<DiagnosticsAsyncResponse>({
        path: DiagnosticsEndpoints.testUrl(),
        method: 'POST',
        body: params
      });
    },
    {
      format: 'text',
      formatter: (result) => `Diagnostic test initiated. Request ID: ${result.requestId}\nStatus: ${result.status}\n\nUse diagnostics_async_status to check progress.`,
      progress: true
    }
  );
}

/**
 * Legacy class exports for backward compatibility
 * @deprecated Use direct function exports instead
 */
export const diagnosticsOperations = {
  runCurl,
  runDig,
  runMtr,
  runGrep,
  listEdgeLocations,
  getAsyncRequestStatus,
  runTestUrl
};