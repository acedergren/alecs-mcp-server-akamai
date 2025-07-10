/**
 * Diagnostics Domain Export Module
 * 
 * This module exports all Edge Diagnostics tools for use in the MCP server
 * 
 * Generated on 2025-07-10T04:53:55.255Z using ALECSCore CLI
 */

import { DiagnosticsTools } from './diagnostics-tools';
import { DiagnosticsToolSchemas } from './diagnostics-api-implementation';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { MCPToolResponse } from '../../types/mcp-protocol';
import type { z } from 'zod';

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
  'diagnostics_run_curl': {
    name: 'diagnostics_run_curl',
    description: 'Request content with cURL for testing edge behavior',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.runCurl),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.runCurl.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.runCurl(restArgs as z.infer<typeof DiagnosticsToolSchemas.runCurl>);
    }
  },
  
  'diagnostics_run_dig': {
    name: 'diagnostics_run_dig',
    description: 'Perform DNS lookup with dig for hostname resolution testing',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.runDig),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.runDig.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.runDig(restArgs as z.infer<typeof DiagnosticsToolSchemas.runDig>);
    }
  },
  
  'diagnostics_run_mtr': {
    name: 'diagnostics_run_mtr',
    description: 'Test network connectivity with MTR for route tracing',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.runMtr),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.runMtr.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.runMtr(restArgs as z.infer<typeof DiagnosticsToolSchemas.runMtr>);
    }
  },
  
  // Log Analysis
  'diagnostics_grep_logs': {
    name: 'diagnostics_grep_logs',
    description: 'Search edge server logs with GREP for troubleshooting',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.grepLogs),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.grepLogs.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.grepLogs(restArgs as z.infer<typeof DiagnosticsToolSchemas.grepLogs>);
    }
  },
  
  'diagnostics_get_grep_result': {
    name: 'diagnostics_get_grep_result',
    description: 'Get results from a GREP log search request',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.getGrepResult),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.getGrepResult.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.getGrepResult(restArgs as z.infer<typeof DiagnosticsToolSchemas.getGrepResult>);
    }
  },
  
  'diagnostics_run_estats': {
    name: 'diagnostics_run_estats',
    description: 'Run eStats analysis for edge server statistics',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.runEstats),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.runEstats.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.runEstats(restArgs as z.infer<typeof DiagnosticsToolSchemas.runEstats>);
    }
  },
  
  // URL Analysis
  'diagnostics_check_url_health': {
    name: 'diagnostics_check_url_health',
    description: 'Check URL health status and performance',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.checkUrlHealth),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.checkUrlHealth.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.checkUrlHealth(restArgs as z.infer<typeof DiagnosticsToolSchemas.checkUrlHealth>);
    }
  },
  
  'diagnostics_get_url_health_result': {
    name: 'diagnostics_get_url_health_result',
    description: 'Get results from a URL health check request',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.getUrlHealthCheckResult),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.getUrlHealthCheckResult.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.getUrlHealthCheckResult(restArgs as z.infer<typeof DiagnosticsToolSchemas.getUrlHealthCheckResult>);
    }
  },
  
  'diagnostics_get_translated_url': {
    name: 'diagnostics_get_translated_url',
    description: 'Get Akamai translated URL for a given URL',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.getTranslatedUrl),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.getTranslatedUrl.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.getTranslatedUrl(restArgs as z.infer<typeof DiagnosticsToolSchemas.getTranslatedUrl>);
    }
  },
  
  // Error Analysis
  'diagnostics_translate_error': {
    name: 'diagnostics_translate_error',
    description: 'Translate Akamai error codes and messages',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.translateError),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.translateError.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.translateError(restArgs as z.infer<typeof DiagnosticsToolSchemas.translateError>);
    }
  },
  
  'diagnostics_get_error_translation': {
    name: 'diagnostics_get_error_translation',
    description: 'Get results from an error translation request',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.getErrorTranslation),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.getErrorTranslation.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.getErrorTranslation(restArgs as z.infer<typeof DiagnosticsToolSchemas.getErrorTranslation>);
    }
  },
  
  // Metadata Tracing
  'diagnostics_trace_metadata': {
    name: 'diagnostics_trace_metadata',
    description: 'Trace metadata through edge network for debugging',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.traceMetadata),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.traceMetadata.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.traceMetadata(restArgs as z.infer<typeof DiagnosticsToolSchemas.traceMetadata>);
    }
  },
  
  'diagnostics_get_metadata_trace': {
    name: 'diagnostics_get_metadata_trace',
    description: 'Get results from a metadata trace request',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.getMetadataTrace),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.getMetadataTrace.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.getMetadataTrace(restArgs as z.infer<typeof DiagnosticsToolSchemas.getMetadataTrace>);
    }
  },
  
  'diagnostics_list_metadata_locations': {
    name: 'diagnostics_list_metadata_locations',
    description: 'List available metadata tracer locations',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.listMetadataLocations),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.listMetadataLocations.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.listMetadataLocations(restArgs as z.infer<typeof DiagnosticsToolSchemas.listMetadataLocations>);
    }
  },
  
  // Problem Scenarios
  'diagnostics_run_connectivity_test': {
    name: 'diagnostics_run_connectivity_test',
    description: 'Run comprehensive connectivity test scenario',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.runConnectivityTest),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.runConnectivityTest.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.runConnectivityTest(restArgs as z.infer<typeof DiagnosticsToolSchemas.runConnectivityTest>);
    }
  },
  
  'diagnostics_get_connectivity_result': {
    name: 'diagnostics_get_connectivity_result',
    description: 'Get results from a connectivity test request',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.getConnectivityTestResult),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.getConnectivityTestResult.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.getConnectivityTestResult(restArgs as z.infer<typeof DiagnosticsToolSchemas.getConnectivityTestResult>);
    }
  },
  
  'diagnostics_run_content_test': {
    name: 'diagnostics_run_content_test',
    description: 'Run content delivery test scenario',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.runContentTest),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.runContentTest.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.runContentTest(restArgs as z.infer<typeof DiagnosticsToolSchemas.runContentTest>);
    }
  },
  
  'diagnostics_get_content_result': {
    name: 'diagnostics_get_content_result',
    description: 'Get results from a content test request',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.getContentTestResult),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.getContentTestResult.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.getContentTestResult(restArgs as z.infer<typeof DiagnosticsToolSchemas.getContentTestResult>);
    }
  },
  
  // Edge Locations
  'diagnostics_list_edge_locations': {
    name: 'diagnostics_list_edge_locations',
    description: 'List available edge server locations for testing',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.listEdgeLocations),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.listEdgeLocations.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.listEdgeLocations(restArgs as z.infer<typeof DiagnosticsToolSchemas.listEdgeLocations>);
    }
  },
  
  'diagnostics_locate_ip': {
    name: 'diagnostics_locate_ip',
    description: 'Locate an IP address geographically',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.locateIp),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.locateIp.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.locateIp(restArgs as z.infer<typeof DiagnosticsToolSchemas.locateIp>);
    }
  },
  
  'diagnostics_verify_edge_ip': {
    name: 'diagnostics_verify_edge_ip',
    description: 'Verify if an IP address is an Akamai edge server',
    inputSchema: zodToJsonSchema(DiagnosticsToolSchemas.verifyEdgeIp),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = DiagnosticsToolSchemas.verifyEdgeIp.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new DiagnosticsTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.verifyEdgeIp(restArgs as z.infer<typeof DiagnosticsToolSchemas.verifyEdgeIp>);
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