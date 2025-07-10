/**
 * Edge Diagnostics Tools Implementation
 * 
 * Provides comprehensive edge diagnostics and troubleshooting tools
 * for analyzing content delivery, network connectivity, and edge behavior
 * 
 * Generated on 2025-07-10T04:52:42.926Z using ALECSCore CLI
 */

import { type MCPToolResponse } from '../../types/mcp-protocol';
import { AkamaiClient } from '../../akamai-client';
import { createLogger } from '../../utils/pino-logger';
import { ToolErrorHandler } from '../../utils/error-handler';
import type { z } from 'zod';
import {
  DiagnosticsEndpoints,
  DiagnosticsToolSchemas,
  type DiagnosticsAsyncResponse,
  type CurlResponse,
  type DigResponse,
  type MtrResponse,
  type GrepResponse,
  type EdgeLocation
} from './diagnostics-api-implementation';

const logger = createLogger('diagnostics-tools');

/**
 * Edge Diagnostics Tools Implementation
 * 
 * Implements all edge diagnostics operations for troubleshooting
 */
export class DiagnosticsTools {
  private client: AkamaiClient;
  private errorHandler: ToolErrorHandler;

  constructor(customer?: string) {
    this.client = new AkamaiClient(customer);
    this.errorHandler = new ToolErrorHandler({
      tool: 'diagnostics',
      operation: 'diagnostics-operation',
      customer
    });
  }

  /**
   * Request content with cURL
   */
  async runCurl(args: z.infer<typeof DiagnosticsToolSchemas.runCurl>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<CurlResponse>({
        path: DiagnosticsEndpoints.curl(),
        method: 'POST',
        body: params
      });

      const curlData = response;

      let text = `🔍 **cURL Response**\n`;
      text += `URL: ${params.url}\n`;
      text += `Status: ${curlData.httpStatus}\n\n`;
      
      text += `**Timing**:\n`;
      text += `• DNS: ${curlData.timing.dns}ms\n`;
      text += `• Connect: ${curlData.timing.connect}ms\n`;
      text += `• SSL: ${curlData.timing.ssl}ms\n`;
      text += `• First Byte: ${curlData.timing.firstByte}ms\n`;
      text += `• Total: ${curlData.timing.total}ms\n\n`;
      
      text += `**Headers**:\n`;
      Object.entries(curlData.headers).forEach(([key, value]) => {
        text += `• ${key}: ${value}\n`;
      });
      
      if (curlData.body) {
        text += `\n**Body** (truncated):\n`;
        text += `${curlData.body.substring(0, 1000)}${curlData.body.length > 1000 ? '...' : ''}\n`;
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to run cURL');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Perform DNS lookup with dig
   */
  async runDig(args: z.infer<typeof DiagnosticsToolSchemas.runDig>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<DigResponse>({
        path: DiagnosticsEndpoints.dig(),
        method: 'POST',
        body: params
      });

      const digData = response;

      let text = `🌐 **DNS Lookup Results**\n`;
      text += `Hostname: ${params.hostname}\n`;
      text += `Query Type: ${params.queryType || 'A'}\n`;
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

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to run dig');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Test network connectivity with MTR
   */
  async runMtr(args: z.infer<typeof DiagnosticsToolSchemas.runMtr>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<MtrResponse>({
        path: DiagnosticsEndpoints.mtr(),
        method: 'POST',
        body: params
      });

      const mtrData = response;

      let text = `🛤️ **MTR Trace Results**\n`;
      text += `Destination: ${params.destinationDomain}\n`;
      text += `Total Hops: ${mtrData.hops.length}\n\n`;
      
      text += `**Route**:\n`;
      mtrData.hops.forEach(hop => {
        text += `${hop.hopNumber}. ${hop.hostname || hop.ip} (${hop.ip})\n`;
        text += `   Loss: ${hop.loss}% | Sent: ${hop.sent} | Last: ${hop.last}ms\n`;
        text += `   Avg: ${hop.avg}ms | Best: ${hop.best}ms | Worst: ${hop.worst}ms | StdDev: ${hop.stdDev}ms\n\n`;
      });

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to run MTR');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Search edge server logs with GREP
   */
  async grepLogs(args: z.infer<typeof DiagnosticsToolSchemas.grepLogs>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<DiagnosticsAsyncResponse>({
        path: DiagnosticsEndpoints.grep(),
        method: 'POST',
        body: params
      });

      const asyncResponse = response;

      let text = `📝 **GREP Log Search Initiated**\n`;
      text += `Edge IP: ${params.edgeIp}\n`;
      text += `CP Code: ${params.cpCode}\n`;
      text += `Request ID: ${asyncResponse.requestId}\n`;
      text += `Status: ${asyncResponse.status}\n\n`;
      text += `⏳ Use \`diagnostics_get_grep_result\` with requestId: ${asyncResponse.requestId} to retrieve results`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to initiate GREP');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get GREP request results
   */
  async getGrepResult(args: z.infer<typeof DiagnosticsToolSchemas.getGrepResult>): Promise<MCPToolResponse> {
    const { customer: _, requestId } = args;
    
    try {
      const response = await this.client.request<any>({
        path: DiagnosticsEndpoints.getGrepRequest(requestId),
        method: 'GET'
      });

      const result = response;

      let text = `📝 **GREP Results**\n`;
      text += `Request ID: ${requestId}\n`;
      text += `Status: ${result.status}\n\n`;

      if (result.status === 'IN_PROGRESS') {
        text += `⏳ Request is still in progress. Please check again later.`;
      } else if (result.status === 'FAILED') {
        text += `❌ Request failed: ${result.error || 'Unknown error'}`;
      } else {
        const grepData = result.result as GrepResponse;
        text += `Total Matches: ${grepData.totalMatches}\n\n`;
        
        if (grepData.logs && grepData.logs.length > 0) {
          text += `**Log Entries** (showing first ${Math.min(100, grepData.logs.length)}):\n`;
          grepData.logs.slice(0, 100).forEach((log, index) => {
            text += `${index + 1}. [${log.timestamp}] ${log.clientIp} - ${log.method} ${log.path} - ${log.httpStatus}\n`;
            text += `   Cache: ${log.cacheStatus} | Size: ${log.responseSize} bytes\n`;
            text += `   User-Agent: ${log.userAgent}\n\n`;
          });
        }
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to get GREP results');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Run eStats analysis
   */
  async runEstats(args: z.infer<typeof DiagnosticsToolSchemas.runEstats>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<any>({
        path: DiagnosticsEndpoints.estats(),
        method: 'POST',
        body: params
      });

      const estatsData = response;

      let text = `📊 **eStats Analysis**\n`;
      text += `URL: ${params.url}\n\n`;
      text += `**Statistics**:\n`;
      text += JSON.stringify(estatsData, null, 2);

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to run eStats');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Check URL health status
   */
  async checkUrlHealth(args: z.infer<typeof DiagnosticsToolSchemas.checkUrlHealth>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<DiagnosticsAsyncResponse>({
        path: DiagnosticsEndpoints.urlHealthCheck(),
        method: 'POST',
        body: params
      });

      const asyncResponse = response;

      let text = `🏥 **URL Health Check Initiated**\n`;
      text += `URL: ${params.url}\n`;
      text += `Request ID: ${asyncResponse.requestId}\n`;
      text += `Status: ${asyncResponse.status}\n\n`;
      text += `⏳ Use \`diagnostics_get_url_health_result\` with requestId: ${asyncResponse.requestId} to retrieve results`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to initiate URL health check');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get URL health check results
   */
  async getUrlHealthCheckResult(args: z.infer<typeof DiagnosticsToolSchemas.getUrlHealthCheckResult>): Promise<MCPToolResponse> {
    const { customer: _, requestId } = args;
    
    try {
      const response = await this.client.request<any>({
        path: DiagnosticsEndpoints.getUrlHealthCheckRequest(requestId),
        method: 'GET'
      });

      const result = response;

      let text = `🏥 **URL Health Check Results**\n`;
      text += `Request ID: ${requestId}\n`;
      text += `Status: ${result.status}\n\n`;

      if (result.status === 'IN_PROGRESS') {
        text += `⏳ Health check is still in progress. Please check again later.`;
      } else {
        text += `**Health Data**:\n`;
        text += JSON.stringify(result.result, null, 2);
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to get URL health check results');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get translated URL
   */
  async getTranslatedUrl(args: z.infer<typeof DiagnosticsToolSchemas.getTranslatedUrl>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<any>({
        path: DiagnosticsEndpoints.translatedUrl(),
        method: 'POST',
        body: params
      });

      const translatedData = response;

      let text = `🔄 **URL Translation**\n`;
      text += `Original URL: ${params.url}\n`;
      text += `Translated URL: ${translatedData.translatedUrl}\n`;
      text += `Type Code: ${translatedData.typeCode}\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to translate URL');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Translate error messages
   */
  async translateError(args: z.infer<typeof DiagnosticsToolSchemas.translateError>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<DiagnosticsAsyncResponse>({
        path: DiagnosticsEndpoints.errorTranslator(),
        method: 'POST',
        body: params
      });

      const asyncResponse = response;

      let text = `🔍 **Error Translation Initiated**\n`;
      text += `URL: ${params.url}\n`;
      text += `Request ID: ${asyncResponse.requestId}\n`;
      text += `Status: ${asyncResponse.status}\n\n`;
      text += `⏳ Use \`diagnostics_get_error_translation\` with requestId: ${asyncResponse.requestId} to retrieve results`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to initiate error translation');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get error translation results
   */
  async getErrorTranslation(args: z.infer<typeof DiagnosticsToolSchemas.getErrorTranslation>): Promise<MCPToolResponse> {
    const { customer: _, requestId } = args;
    
    try {
      const response = await this.client.request<any>({
        path: DiagnosticsEndpoints.getErrorTranslatorRequest(requestId),
        method: 'GET'
      });

      const result = response;

      let text = `🔍 **Error Translation Results**\n`;
      text += `Request ID: ${requestId}\n`;
      text += `Status: ${result.status}\n\n`;

      if (result.status === 'IN_PROGRESS') {
        text += `⏳ Translation is still in progress. Please check again later.`;
      } else {
        text += `**Error Details**:\n`;
        text += JSON.stringify(result.result, null, 2);
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to get error translation');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Trace metadata through edge network
   */
  async traceMetadata(args: z.infer<typeof DiagnosticsToolSchemas.traceMetadata>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<DiagnosticsAsyncResponse>({
        path: DiagnosticsEndpoints.metadataTracer(),
        method: 'POST',
        body: params
      });

      const asyncResponse = response;

      let text = `🔎 **Metadata Trace Initiated**\n`;
      text += `URL: ${params.url}\n`;
      text += `Request ID: ${asyncResponse.requestId}\n`;
      text += `Status: ${asyncResponse.status}\n\n`;
      text += `⏳ Use \`diagnostics_get_metadata_trace\` with requestId: ${asyncResponse.requestId} to retrieve results`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to initiate metadata trace');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get metadata trace results
   */
  async getMetadataTrace(args: z.infer<typeof DiagnosticsToolSchemas.getMetadataTrace>): Promise<MCPToolResponse> {
    const { customer: _, requestId } = args;
    
    try {
      const response = await this.client.request<any>({
        path: DiagnosticsEndpoints.getMetadataTracerRequest(requestId),
        method: 'GET'
      });

      const result = response;

      let text = `🔎 **Metadata Trace Results**\n`;
      text += `Request ID: ${requestId}\n`;
      text += `Status: ${result.status}\n\n`;

      if (result.status === 'IN_PROGRESS') {
        text += `⏳ Trace is still in progress. Please check again later.`;
      } else {
        text += `**Metadata**:\n`;
        text += JSON.stringify(result.result, null, 2);
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to get metadata trace');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * List available metadata tracer locations
   */
  async listMetadataLocations(args: z.infer<typeof DiagnosticsToolSchemas.listMetadataLocations>): Promise<MCPToolResponse> {
    const { customer: _ } = args;
    
    try {
      const response = await this.client.request<EdgeLocation[]>({
        path: DiagnosticsEndpoints.metadataTracerLocations(),
        method: 'GET'
      });

      const locations = response;

      let text = `📍 **Metadata Tracer Locations**\n`;
      text += `Total Locations: ${locations.length}\n\n`;
      
      if (locations.length > 0) {
        text += `**Locations**:\n`;
        locations.forEach((loc, index) => {
          text += `${index + 1}. **${loc.value}** (${loc.id})\n`;
          if (loc.region) text += `   Region: ${loc.region}\n`;
          if (loc.country) text += `   Country: ${loc.country}\n`;
          if (loc.city) text += `   City: ${loc.city}\n`;
          text += '\n';
        });
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to list metadata locations');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Run comprehensive connectivity test
   */
  async runConnectivityTest(args: z.infer<typeof DiagnosticsToolSchemas.runConnectivityTest>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<DiagnosticsAsyncResponse>({
        path: DiagnosticsEndpoints.connectivityProblems(),
        method: 'POST',
        body: params
      });

      const asyncResponse = response;

      let text = `🔗 **Connectivity Test Initiated**\n`;
      text += `URL: ${params.url}\n`;
      text += `Request ID: ${asyncResponse.requestId}\n`;
      text += `Status: ${asyncResponse.status}\n\n`;
      text += `⏳ Use \`diagnostics_get_connectivity_result\` with requestId: ${asyncResponse.requestId} to retrieve results`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to initiate connectivity test');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get connectivity test results
   */
  async getConnectivityTestResult(args: z.infer<typeof DiagnosticsToolSchemas.getConnectivityTestResult>): Promise<MCPToolResponse> {
    const { customer: _, requestId } = args;
    
    try {
      const response = await this.client.request<any>({
        path: DiagnosticsEndpoints.getConnectivityProblemsRequest(requestId),
        method: 'GET'
      });

      const result = response;

      let text = `🔗 **Connectivity Test Results**\n`;
      text += `Request ID: ${requestId}\n`;
      text += `Status: ${result.status}\n\n`;

      if (result.status === 'IN_PROGRESS') {
        text += `⏳ Test is still in progress. Please check again later.`;
      } else {
        text += `**Connectivity Data**:\n`;
        text += JSON.stringify(result.result, null, 2);
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to get connectivity test results');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Run content delivery test
   */
  async runContentTest(args: z.infer<typeof DiagnosticsToolSchemas.runContentTest>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<DiagnosticsAsyncResponse>({
        path: DiagnosticsEndpoints.contentProblems(),
        method: 'POST',
        body: params
      });

      const asyncResponse = response;

      let text = `📦 **Content Test Initiated**\n`;
      text += `URL: ${params.url}\n`;
      text += `Request ID: ${asyncResponse.requestId}\n`;
      text += `Status: ${asyncResponse.status}\n\n`;
      text += `⏳ Use \`diagnostics_get_content_result\` with requestId: ${asyncResponse.requestId} to retrieve results`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to initiate content test');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get content test results
   */
  async getContentTestResult(args: z.infer<typeof DiagnosticsToolSchemas.getContentTestResult>): Promise<MCPToolResponse> {
    const { customer: _, requestId } = args;
    
    try {
      const response = await this.client.request<any>({
        path: DiagnosticsEndpoints.getContentProblemsRequest(requestId),
        method: 'GET'
      });

      const result = response;

      let text = `📦 **Content Test Results**\n`;
      text += `Request ID: ${requestId}\n`;
      text += `Status: ${result.status}\n\n`;

      if (result.status === 'IN_PROGRESS') {
        text += `⏳ Test is still in progress. Please check again later.`;
      } else {
        text += `**Content Data**:\n`;
        text += JSON.stringify(result.result, null, 2);
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to get content test results');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * List available edge server locations
   */
  async listEdgeLocations(args: z.infer<typeof DiagnosticsToolSchemas.listEdgeLocations>): Promise<MCPToolResponse> {
    const { customer: _ } = args;
    
    try {
      const response = await this.client.request<EdgeLocation[]>({
        path: DiagnosticsEndpoints.edgeLocations(),
        method: 'GET'
      });

      const locations = response;

      let text = `🌍 **Edge Server Locations**\n`;
      text += `Total Locations: ${locations.length}\n\n`;
      
      if (locations.length > 0) {
        text += `**Locations**:\n`;
        locations.forEach((loc, index) => {
          text += `${index + 1}. **${loc.value}** (${loc.id})\n`;
          if (loc.region) text += `   Region: ${loc.region}\n`;
          if (loc.country) text += `   Country: ${loc.country}\n`;
          if (loc.city) text += `   City: ${loc.city}\n`;
          text += '\n';
        });
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to list edge locations');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Locate an IP address
   */
  async locateIp(args: z.infer<typeof DiagnosticsToolSchemas.locateIp>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<any>({
        path: DiagnosticsEndpoints.locateIp(),
        method: 'POST',
        body: params
      });

      const locationData = response;

      let text = `📍 **IP Location**\n`;
      text += `IP Address: ${params.ip}\n\n`;
      text += `**Location Data**:\n`;
      text += JSON.stringify(locationData, null, 2);

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to locate IP');
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Verify if an IP is an edge server
   */
  async verifyEdgeIp(args: z.infer<typeof DiagnosticsToolSchemas.verifyEdgeIp>): Promise<MCPToolResponse> {
    const { customer: _, ...params } = args;
    
    try {
      const response = await this.client.request<any>({
        path: DiagnosticsEndpoints.verifyEdgeIp(),
        method: 'POST',
        body: params
      });

      const verificationData = response;

      let text = `✅ **Edge IP Verification**\n`;
      text += `IP Address: ${params.ip}\n`;
      text += `Is Edge IP: ${verificationData.isEdgeIp ? 'Yes' : 'No'}\n\n`;
      
      if (verificationData.details) {
        text += `**Details**:\n`;
        text += JSON.stringify(verificationData.details, null, 2);
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to verify edge IP');
      return this.errorHandler.handleError(error);
    }
  }
}