/**
 * Diagnostics Domain Export Module
 * 
 * Exports Edge Diagnostics tools using the standard BaseTool pattern
 * 
 * Updated on 2025-01-11 to use BaseTool.execute pattern
 */

import { 
  runCurl,
  runDig,
  runMtr,
  runGrep,
  getEdgeLocations,
  getAsyncRequestStatus,
  runTestUrl
} from './diagnostics-tools';
import { DiagnosticsToolSchemas } from './diagnostics-api-implementation';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { MCPToolResponse } from '../../types/mcp-protocol';

/**
 * Tool interface with proper typing
 */
interface DiagnosticsTool {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (client: unknown, args: Record<string, unknown>) => Promise<MCPToolResponse>;
}

/**
 * Diagnostics Domain Tools with handlers
 * 
 * Complete Edge Diagnostics API implementation following MCP patterns
 */
export const diagnosticsTools: Record<string, DiagnosticsTool> = {
  // Network Diagnostic Tools
  'diagnostics_curl': {
    name: 'diagnostics_curl',
    description: 'Request content with cURL for testing edge behavior',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.runCurl),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.runCurl.parse(args);
      return runCurl(validatedArgs);
    }
  },
  
  'diagnostics_dig': {
    name: 'diagnostics_dig',
    description: 'Perform DNS lookup with dig for hostname resolution testing',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.runDig),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.runDig.parse(args);
      return runDig(validatedArgs);
    }
  },
  
  'diagnostics_mtr': {
    name: 'diagnostics_mtr',
    description: 'Test network connectivity with MTR for route tracing',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.runMtr),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.runMtr.parse(args);
      return runMtr(validatedArgs);
    }
  },
  
  // Log Analysis
  'diagnostics_grep': {
    name: 'diagnostics_grep',
    description: 'Search edge server logs with GREP for troubleshooting',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.runGrep),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.runGrep.parse(args);
      return runGrep(validatedArgs);
    }
  },
  
  // Edge Locations
  'diagnostics_edge_locations': {
    name: 'diagnostics_edge_locations',
    description: 'List available edge server locations for testing',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.getEdgeLocations),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.getEdgeLocations.parse(args);
      return getEdgeLocations(validatedArgs);
    }
  },
  
  // Async Operations
  'diagnostics_async_status': {
    name: 'diagnostics_async_status',
    description: 'Get status of an async diagnostic request',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.getAsyncRequestStatus),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.getAsyncRequestStatus.parse(args);
      return getAsyncRequestStatus(validatedArgs);
    }
  },
  
  'diagnostics_test_url': {
    name: 'diagnostics_test_url',
    description: 'Run comprehensive diagnostic tests on a URL',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.runTestUrl),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.runTestUrl.parse(args);
      return runTestUrl(validatedArgs);
    }
  }
};

/**
 * Handler function for diagnostics tool execution (for backwards compatibility)
 */
export async function handleDiagnosticsToolCall(name: string, args: Record<string, unknown>): Promise<MCPToolResponse> {
  const tool = diagnosticsTools[name];
  if (!tool) {
    throw new Error(`Unknown diagnostics tool: ${name}`);
  }
  return tool.handler(null, args);
}

// Export all tools as default
export default diagnosticsTools;