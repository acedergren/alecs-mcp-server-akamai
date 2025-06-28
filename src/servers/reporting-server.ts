/**
 * AKAMAI REPORTING MCP SERVER
 * 
 * ARCHITECTURAL SEPARATION:
 * This dedicated reporting server handles all analytics, metrics, and performance
 * data operations, cleanly separated from property management configuration tasks.
 * Uses Akamai's Reporting API v1 for comprehensive CDN analytics.
 * 
 * REPORTING CAPABILITIES:
 * 📊 Traffic Analytics - Bandwidth, requests, hit rates
 * 📈 Performance Metrics - Response times, error rates
 * 🌍 Geographic Distribution - Traffic by region/country
 * 💾 Cache Performance - Hit/miss ratios, offload rates
 * 🔍 Origin Analytics - Origin performance and health
 * 📋 Custom Reports - Flexible report generation
 * 
 * WHY SEPARATE FROM PROPERTY MANAGER:
 * - Different API endpoint (/reporting-api/v1 vs /papi/v1)
 * - Read-only analytics vs configuration management
 * - Large data volumes requiring different handling
 * - Different permission models and access patterns
 * - Time-series data vs configuration snapshots
 * 
 * MCP JUNE 2025 COMPLIANCE:
 * - All tools use snake_case naming convention
 * - JSON Schema validation for all inputs
 * - Proper error handling and user guidance
 * - Human-readable response formatting
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { AkamaiClient } from '../akamai-client';
import { CustomerConfigManager } from '../utils/customer-config';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Initialize services
const configManager = CustomerConfigManager.getInstance();

// =============================================================================
// SCHEMA DEFINITIONS FOR REPORTING
// =============================================================================

const dateRangeSchema = z.object({
  customer: z.string().optional().describe('Customer configuration name from .edgerc'),
  start_date: z.string().describe('Start date (YYYY-MM-DD or ISO 8601)'),
  end_date: z.string().describe('End date (YYYY-MM-DD or ISO 8601)'),
  granularity: z.enum(['FIVE_MINUTES', 'HOUR', 'DAY', 'WEEK', 'MONTH']).optional().default('DAY').describe('Data granularity'),
});

const trafficReportSchema = dateRangeSchema.extend({
  group_by: z.enum(['cpcode', 'hostname', 'geo', 'protocol']).optional().describe('Group results by dimension'),
  cp_codes: z.array(z.string()).optional().describe('Filter by specific CP codes'),
  hostnames: z.array(z.string()).optional().describe('Filter by specific hostnames'),
  metrics: z.array(z.enum(['edge_hits', 'edge_bandwidth', 'origin_hits', 'origin_bandwidth']))
    .optional()
    .default(['edge_hits', 'edge_bandwidth'])
    .describe('Traffic metrics to include'),
});

const performanceReportSchema = dateRangeSchema.extend({
  metrics: z.array(z.enum(['response_time', 'error_rate', 'availability', 'throughput']))
    .optional()
    .default(['response_time', 'error_rate'])
    .describe('Performance metrics to include'),
  percentiles: z.array(z.number()).optional().default([50, 95, 99]).describe('Response time percentiles'),
  group_by: z.enum(['cpcode', 'hostname']).optional().describe('Group by dimension'),
});

const cacheReportSchema = dateRangeSchema.extend({
  cp_codes: z.array(z.string()).optional().describe('Filter by specific CP codes'),
  include_offload: z.boolean().optional().default(true).describe('Include offload percentage'),
  include_ttl_analysis: z.boolean().optional().default(false).describe('Include TTL distribution'),
  group_by: z.enum(['cpcode', 'hostname', 'cache_status']).optional().describe('Group by dimension'),
});

const geoReportSchema = dateRangeSchema.extend({
  metrics: z.array(z.enum(['hits', 'bandwidth', 'unique_visitors']))
    .optional()
    .default(['hits', 'bandwidth'])
    .describe('Metrics to analyze by geography'),
  level: z.enum(['country', 'region', 'city']).optional().default('country').describe('Geographic granularity'),
  top_n: z.number().optional().default(20).describe('Number of top locations to show'),
});

const errorAnalysisSchema = dateRangeSchema.extend({
  error_codes: z.array(z.string()).optional().describe('Specific HTTP error codes to analyze (e.g., ["404", "500"])'),
  group_by: z.enum(['error_code', 'hostname', 'url_path']).optional().describe('Group errors by dimension'),
  include_details: z.boolean().optional().default(false).describe('Include detailed error samples'),
});

// =============================================================================
// REPORTING TOOLS IMPLEMENTATION
// =============================================================================

/**
 * GET TRAFFIC REPORT
 * 
 * Retrieves comprehensive traffic analytics including bandwidth usage,
 * request counts, and traffic distribution across your CDN properties.
 * 
 * BUSINESS VALUE:
 * - Understand traffic patterns and peaks
 * - Plan capacity and infrastructure
 * - Identify cost drivers and optimization opportunities
 * - Monitor growth trends
 */
const getTrafficReport = {
  name: 'get_traffic_report',
  description: 'Retrieve comprehensive traffic analytics including bandwidth, requests, and hit rates',
  inputSchema: zodToJsonSchema(trafficReportSchema) as any,
  handler: async (args: z.infer<typeof trafficReportSchema>) => {
    const validated = trafficReportSchema.parse(args);
    const client = new AkamaiClient(validated.customer);
    
    // Build report parameters following Akamai API structure
    const params: Record<string, any> = {
      start: validated.start_date,
      end: validated.end_date,
      interval: validated.granularity,
    };

    if (validated.group_by) {
      params.groupBy = validated.group_by;
    }
    if (validated.cp_codes && validated.cp_codes.length > 0) {
      params.objectIds = validated.cp_codes.join(',');
      params.objectType = 'cpcode';
    }
    if (validated.hostnames && validated.hostnames.length > 0) {
      params.objectIds = validated.hostnames.join(',');
      params.objectType = 'hostname';
    }

    // Use correct Akamai Reporting API endpoint
    const response = await client.request({
      path: '/reporting-api/v1/reports/traffic/edge-hits-by-time',
      method: 'GET',
      queryParams: params,
    });

    // Format response for human readability
    let text = `# Traffic Report\n\n`;
    text += `**Period:** ${validated.start_date} to ${validated.end_date}\n`;
    text += `**Granularity:** ${validated.granularity}\n`;
    if (validated.group_by) text += `**Grouped By:** ${validated.group_by}\n`;
    text += `\n`;

    if (response.data && response.data.length > 0) {
      text += `## Traffic Summary\n\n`;
      
      // Calculate totals
      const totalHits = response.data.reduce((sum: number, item: any) => 
        sum + (item.edgeHits || 0), 0);
      const totalBandwidth = response.data.reduce((sum: number, item: any) => 
        sum + (item.edgeBandwidth || 0), 0);
      
      text += `- **Total Edge Hits:** ${formatNumber(totalHits)}\n`;
      text += `- **Total Edge Bandwidth:** ${formatBytes(totalBandwidth)}\n`;
      text += `- **Average Hits/Interval:** ${formatNumber(Math.round(totalHits / response.data.length))}\n`;
      text += `\n`;

      // Show top entries if grouped
      if (validated.group_by && response.data[0][validated.group_by]) {
        text += `## Top ${validated.group_by} by Traffic\n\n`;
        const sorted = [...response.data].sort((a, b) => b.edgeHits - a.edgeHits).slice(0, 10);
        sorted.forEach((item, index) => {
          text += `${index + 1}. **${item[validated.group_by!]}**\n`;
          text += `   - Edge Hits: ${formatNumber(item.edgeHits)}\n`;
          text += `   - Edge Bandwidth: ${formatBytes(item.edgeBandwidth)}\n`;
          if (item.cacheHitRatio !== undefined) {
            text += `   - Cache Hit Ratio: ${(item.cacheHitRatio * 100).toFixed(2)}%\n`;
          }
          text += `\n`;
        });
      }

      // Time series data
      text += `## Traffic Over Time\n\n`;
      text += `\`\`\`\n`;
      text += `Date/Time          | Edge Hits      | Edge Bandwidth | Cache Hit %\n`;
      text += `-------------------|----------------|----------------|------------\n`;
      response.data.slice(0, 20).forEach((item: any) => {
        const hitRatio = item.cacheHitRatio !== undefined ? 
          `${(item.cacheHitRatio * 100).toFixed(1)}%` : 'N/A';
        text += `${item.startTime.padEnd(18)} | ${formatNumber(item.edgeHits).padEnd(14)} | ${formatBytes(item.edgeBandwidth).padEnd(14)} | ${hitRatio}\n`;
      });
      if (response.data.length > 20) {
        text += `... (${response.data.length - 20} more entries)\n`;
      }
      text += `\`\`\`\n`;
    } else {
      text += `No traffic data found for the specified period.\n`;
    }

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  },
};

/**
 * GET CACHE PERFORMANCE
 * 
 * Analyzes cache hit rates, offload percentages, and cache efficiency
 * to help optimize content delivery and reduce origin load.
 * 
 * BUSINESS VALUE:
 * - Reduce origin infrastructure costs
 * - Improve content delivery speed
 * - Identify caching opportunities
 * - Optimize cache configurations
 */
const getCachePerformance = {
  name: 'get_cache_performance',
  description: 'Analyze cache hit rates, offload percentages, and caching efficiency',
  inputSchema: zodToJsonSchema(cacheReportSchema) as any,
  handler: async (args: z.infer<typeof cacheReportSchema>) => {
    const validated = cacheReportSchema.parse(args);
    const client = new AkamaiClient(validated.customer);
    
    const params: Record<string, any> = {
      start: validated.start_date,
      end: validated.end_date,
      interval: validated.granularity,
    };
    
    if (validated.cp_codes && validated.cp_codes.length > 0) {
      params.objectIds = validated.cp_codes.join(',');
      params.objectType = 'cpcode';
    }

    // Use correct endpoint for cache performance
    const response = await client.request({
      path: '/reporting-api/v1/reports/caching/cacheable-responses',
      method: 'GET',
      queryParams: params,
    });

    let text = `# Cache Performance Report\n\n`;
    text += `**Period:** ${validated.start_date} to ${validated.end_date}\n`;
    if (validated.cp_codes) text += `**CP Codes:** ${validated.cp_codes.join(', ')}\n`;
    text += `\n`;

    if (response.data && response.data.length > 0) {
      // Calculate overall metrics
      const totalCacheable = response.data.reduce((sum: number, item: any) => 
        sum + (item.cacheableResponses || 0), 0);
      const totalUncacheable = response.data.reduce((sum: number, item: any) => 
        sum + (item.uncacheableResponses || 0), 0);
      const totalResponses = totalCacheable + totalUncacheable;
      const cacheableRatio = totalResponses > 0 ? (totalCacheable / totalResponses) * 100 : 0;

      text += `## Cache Summary\n\n`;
      text += `- **Cacheable Ratio:** ${cacheableRatio.toFixed(2)}%\n`;
      text += `- **Total Cacheable Responses:** ${formatNumber(totalCacheable)}\n`;
      text += `- **Total Uncacheable Responses:** ${formatNumber(totalUncacheable)}\n`;
      
      if (validated.include_offload) {
        const offloadResponse = await client.request({
          path: '/reporting-api/v1/reports/caching/offload-by-time',
          method: 'GET',
          queryParams: params,
        });
        
        if (offloadResponse.data && offloadResponse.data.length > 0) {
          const avgOffload = offloadResponse.data.reduce((sum: number, item: any) => 
            sum + (item.offloadRate || 0), 0) / offloadResponse.data.length;
          text += `- **Average Offload Rate:** ${(avgOffload * 100).toFixed(2)}%\n`;
        }
      }
      text += `\n`;

      // Cache performance over time
      text += `## Cache Performance Timeline\n\n`;
      text += `\`\`\`\n`;
      text += `Timestamp          | Cacheable % | Cacheable    | Uncacheable\n`;
      text += `-------------------|-------------|--------------|------------\n`;
      response.data.slice(0, 20).forEach((item: any) => {
        const ratio = item.cacheableResponses + item.uncacheableResponses > 0 
          ? (item.cacheableResponses / (item.cacheableResponses + item.uncacheableResponses)) * 100 
          : 0;
        text += `${item.startTime.padEnd(18)} | ${ratio.toFixed(1).padStart(10)}% | ${formatNumber(item.cacheableResponses).padStart(12)} | ${formatNumber(item.uncacheableResponses).padStart(12)}\n`;
      });
      text += `\`\`\`\n`;

      // Optimization recommendations
      text += `\n## 💡 Optimization Recommendations\n\n`;
      if (cacheableRatio < 80) {
        text += `- **Low Cacheable Ratio Alert:** Only ${cacheableRatio.toFixed(1)}% of responses are cacheable.\n`;
        text += `  - Review cache headers (Cache-Control, Expires)\n`;
        text += `  - Consider caching more content types\n`;
        text += `  - Analyze uncacheable response reasons\n\n`;
      }
      if (cacheableRatio > 95) {
        text += `- **Excellent Cache Configuration:** Your content is highly cacheable!\n`;
        text += `  - Continue monitoring for any degradation\n`;
        text += `  - Consider extending cache TTLs for better performance\n\n`;
      }
    } else {
      text += `No cache performance data found for the specified period.\n`;
    }

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  },
};

/**
 * GET GEOGRAPHIC DISTRIBUTION
 * 
 * Analyzes traffic distribution by geography to understand where your
 * users are located and optimize content delivery strategies.
 * 
 * BUSINESS VALUE:
 * - Optimize CDN deployment by region
 * - Understand user demographics
 * - Plan regional expansions
 * - Identify growth markets
 */
const getGeographicDistribution = {
  name: 'get_geographic_distribution',
  description: 'Analyze traffic distribution by country, region, or city',
  inputSchema: zodToJsonSchema(geoReportSchema) as any,
  handler: async (args: z.infer<typeof geoReportSchema>) => {
    const validated = geoReportSchema.parse(args);
    const client = new AkamaiClient(validated.customer);
    
    const params: Record<string, any> = {
      start: validated.start_date,
      end: validated.end_date,
      interval: validated.granularity,
      level: validated.level,
      limit: validated.top_n,
    };

    const response = await client.request({
      path: '/reporting-api/v1/reports/geography/traffic-by-geography',
      method: 'GET',
      queryParams: params,
    });

    let text = `# Geographic Distribution Report\n\n`;
    text += `**Period:** ${validated.start_date} to ${validated.end_date}\n`;
    text += `**Level:** ${validated.level}\n`;
    text += `**Top Locations:** ${validated.top_n}\n\n`;

    if (response.data && response.data.length > 0) {
      // Aggregate data by location
      const locationData: Record<string, { hits: number; bandwidth: number }> = {};
      
      response.data.forEach((item: any) => {
        const location = item[validated.level] || 'Unknown';
        if (!locationData[location]) {
          locationData[location] = { hits: 0, bandwidth: 0 };
        }
        locationData[location].hits += item.edgeHits || 0;
        locationData[location].bandwidth += item.edgeBandwidth || 0;
      });

      // Sort by hits
      const sortedLocations = Object.entries(locationData)
        .sort(([, a], [, b]) => b.hits - a.hits)
        .slice(0, validated.top_n);

      text += `## Top ${validated.level === 'country' ? 'Countries' : validated.level === 'region' ? 'Regions' : 'Cities'}\n\n`;
      
      sortedLocations.forEach(([location, data], index) => {
        const totalHits = Object.values(locationData).reduce((sum, loc) => sum + loc.hits, 0);
        const percentage = totalHits > 0 ? (data.hits / totalHits) * 100 : 0;
        
        text += `${index + 1}. **${location}**\n`;
        text += `   - Traffic Share: ${percentage.toFixed(2)}%\n`;
        text += `   - Total Hits: ${formatNumber(data.hits)}\n`;
        text += `   - Total Bandwidth: ${formatBytes(data.bandwidth)}\n\n`;
      });

      // Visual representation
      text += `## Traffic Distribution Chart\n\n`;
      text += `\`\`\`\n`;
      sortedLocations.slice(0, 10).forEach(([location, data]) => {
        const totalHits = Object.values(locationData).reduce((sum, loc) => sum + loc.hits, 0);
        const percentage = totalHits > 0 ? (data.hits / totalHits) * 100 : 0;
        const barLength = Math.round(percentage / 2);
        const bar = '█'.repeat(barLength);
        text += `${location.padEnd(20)} ${bar} ${percentage.toFixed(1)}%\n`;
      });
      text += `\`\`\`\n`;
    } else {
      text += `No geographic data found for the specified period.\n`;
    }

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  },
};

/**
 * GET ERROR ANALYSIS
 * 
 * Analyzes HTTP error codes to identify issues affecting user experience
 * and help troubleshoot problems.
 * 
 * BUSINESS VALUE:
 * - Identify and fix user-facing errors
 * - Improve site reliability
 * - Reduce support tickets
 * - Monitor deployment impacts
 */
const getErrorAnalysis = {
  name: 'get_error_analysis',
  description: 'Analyze HTTP error codes and their patterns',
  inputSchema: zodToJsonSchema(errorAnalysisSchema) as any,
  handler: async (args: z.infer<typeof errorAnalysisSchema>) => {
    const validated = errorAnalysisSchema.parse(args);
    const client = new AkamaiClient(validated.customer);
    
    const params: Record<string, any> = {
      start: validated.start_date,
      end: validated.end_date,
      interval: validated.granularity,
    };

    if (validated.error_codes && validated.error_codes.length > 0) {
      params.httpStatusCodes = validated.error_codes.join(',');
    }

    const response = await client.request({
      path: '/reporting-api/v1/reports/performance/http-status-codes-by-time',
      method: 'GET',
      queryParams: params,
    });

    let text = `# Error Analysis Report\n\n`;
    text += `**Period:** ${validated.start_date} to ${validated.end_date}\n`;
    if (validated.error_codes) text += `**Filtered Codes:** ${validated.error_codes.join(', ')}\n`;
    text += `\n`;

    if (response.data && response.data.length > 0) {
      // Aggregate errors by code
      const errorCounts: Record<string, number> = {};
      let totalErrors = 0;
      let totalRequests = 0;
      
      response.data.forEach((item: any) => {
        Object.entries(item).forEach(([key, value]) => {
          if (key.startsWith('http_') && typeof value === 'number') {
            const code = key.replace('http_', '');
            if (parseInt(code) >= 400) {
              errorCounts[code] = (errorCounts[code] || 0) + value;
              totalErrors += value;
            }
            totalRequests += value;
          }
        });
      });

      const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

      text += `## Error Summary\n\n`;
      text += `- **Total Errors:** ${formatNumber(totalErrors)}\n`;
      text += `- **Total Requests:** ${formatNumber(totalRequests)}\n`;
      text += `- **Overall Error Rate:** ${errorRate.toFixed(3)}%\n\n`;

      // Top errors
      const sortedErrors = Object.entries(errorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      if (sortedErrors.length > 0) {
        text += `## Top Error Codes\n\n`;
        sortedErrors.forEach(([code, count], index) => {
          const percentage = totalErrors > 0 ? (count / totalErrors) * 100 : 0;
          text += `${index + 1}. **HTTP ${code}** - ${getErrorDescription(code)}\n`;
          text += `   - Count: ${formatNumber(count)}\n`;
          text += `   - Percentage of Errors: ${percentage.toFixed(2)}%\n\n`;
        });
      }

      // Error timeline
      text += `## Error Timeline\n\n`;
      text += `\`\`\`\n`;
      text += `Timestamp          | 4xx Errors | 5xx Errors | Error Rate\n`;
      text += `-------------------|------------|------------|------------\n`;
      
      response.data.slice(0, 20).forEach((item: any) => {
        let errors4xx = 0;
        let errors5xx = 0;
        let requests = 0;
        
        Object.entries(item).forEach(([key, value]) => {
          if (key.startsWith('http_') && typeof value === 'number') {
            const code = parseInt(key.replace('http_', ''));
            requests += value;
            if (code >= 400 && code < 500) errors4xx += value;
            if (code >= 500) errors5xx += value;
          }
        });
        
        const rate = requests > 0 ? ((errors4xx + errors5xx) / requests) * 100 : 0;
        text += `${item.startTime.padEnd(18)} | ${formatNumber(errors4xx).padStart(10)} | ${formatNumber(errors5xx).padStart(10)} | ${rate.toFixed(2).padStart(10)}%\n`;
      });
      text += `\`\`\`\n`;

      // Recommendations
      text += `\n## 🔍 Error Analysis & Recommendations\n\n`;
      
      const has404s = errorCounts['404'] > 0;
      const has5xxs = Object.keys(errorCounts).some(code => parseInt(code) >= 500);
      
      if (has404s) {
        text += `### 404 Not Found Errors\n`;
        text += `- Review broken links and missing resources\n`;
        text += `- Implement proper redirects for moved content\n`;
        text += `- Monitor for bot activity scanning for vulnerabilities\n\n`;
      }
      
      if (has5xxs) {
        text += `### 5xx Server Errors\n`;
        text += `- Check origin server health and capacity\n`;
        text += `- Review error logs for application issues\n`;
        text += `- Consider implementing failover origins\n\n`;
      }
    } else {
      text += `No error data found for the specified period.\n`;
    }

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  },
};

// Helper functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function getErrorDescription(code: string): string {
  const descriptions: Record<string, string> = {
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '403': 'Forbidden',
    '404': 'Not Found',
    '405': 'Method Not Allowed',
    '408': 'Request Timeout',
    '429': 'Too Many Requests',
    '500': 'Internal Server Error',
    '502': 'Bad Gateway',
    '503': 'Service Unavailable',
    '504': 'Gateway Timeout',
  };
  return descriptions[code] || 'Unknown Error';
}

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

const server = new Server(
  {
    name: 'akamai-reporting-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Register tools
const tools = [
  getTrafficReport,
  getCachePerformance,
  getGeographicDistribution,
  getErrorAnalysis,
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  const tool = tools.find(t => t.name === name);
  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  try {
    return await tool.handler(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = `Invalid arguments: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
      throw new McpError(ErrorCode.InvalidParams, errorMessage);
    }
    throw error;
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Akamai Reporting Server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start reporting server:', error);
  process.exit(1);
});

// Future tools to implement:
// - get_origin_performance - Origin response times and health
// - get_bandwidth_by_cpcode - Detailed CP code usage
// - get_top_urls - Most requested URLs
// - get_performance_summary - Executive dashboard metrics
// - get_custom_report - Flexible custom reporting
// - schedule_recurring_report - Automated report generation
// - export_report_data - CSV/JSON export capabilities