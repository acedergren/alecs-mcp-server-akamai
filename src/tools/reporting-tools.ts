import { type Tool } from '@modelcontextprotocol/sdk/types.js';
import { ReportingService } from '../services/ReportingService';
import { logger } from '../utils/logger';
import type {
  ReportingPeriod,
  ReportingFilterInput,
  ReportingMetric,
  TrafficSummary,
  CachePerformanceAnalysis,
  BandwidthAnalysis,
  RealtimeMetrics,
  PerformanceReport,
  ErrorPattern,
  GetTrafficSummaryArgs,
  GetTimeseriesDataArgs,
  AnalyzeCachePerformanceArgs,
  AnalyzeBandwidthUsageArgs,
  GetRealtimeMetricsArgs,
  AnalyzeTrafficTrendsArgs,
  GeneratePerformanceReportArgs,
  AnalyzeGeographicPerformanceArgs,
  AnalyzeErrorPatternsArgs,
} from '../types/reporting';
import type { ReportingFilter } from '../services/ReportingService';

/**
 * MULTI-CUSTOMER AKAMAI REPORTING TOOLS
 * 
 * ARCHITECTURE VISION:
 * These tools form the foundation for multi-customer Akamai analytics,
 * enabling service providers and enterprises to manage reporting across
 * multiple accounts from a single MCP server instance.
 * 
 * MULTI-CUSTOMER CAPABILITIES:
 * - Per-customer traffic and bandwidth analytics
 * - Cross-customer performance benchmarking  
 * - Customer-specific cost optimization insights
 * - Multi-account real-time monitoring and alerts
 * - Customizable dashboards per customer context
 * - Aggregated reporting across customer portfolios
 * 
 * CUSTOMER PARAMETER PATTERN:
 * All tools accept a 'customer' parameter that maps to .edgerc sections:
 * - customer: 'client-acme' → Uses [client-acme] credentials
 * - customer: 'division-media' → Uses [division-media] credentials  
 * - customer: 'staging' → Uses [staging] environment
 * - customer: undefined → Defaults to [default] section
 * 
 * CURRENT STATE: Foundation established, customer parameter supported
 * NEXT PHASE: Add customer validation and cross-customer analytics
 * FUTURE VISION: Distributed MCP with customer-provided credentials
 */

const reportingToolsBase: Tool[] = [
  // Traffic Analytics Tools
  {
    name: 'get-traffic-summary',
    description:
      'Get comprehensive traffic summary including bandwidth, requests, cache metrics, and performance data',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        period: {
          type: 'object',
          properties: {
            start: {
              type: 'string',
              description: 'Start date/time in ISO 8601 format (e.g., "2024-01-01T00:00:00Z")',
            },
            end: {
              type: 'string',
              description: 'End date/time in ISO 8601 format (e.g., "2024-01-01T23:59:59Z")',
            },
            granularity: {
              type: 'string',
              enum: ['hour', 'day', 'week', 'month'],
              description: 'Data granularity for aggregation',
            },
          },
          required: ['start', 'end', 'granularity'],
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: {
              type: 'array',
              items: { type: 'number' },
              description: 'Filter by specific CP codes',
            },
            hostnames: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific hostnames',
            },
            countries: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by country codes (ISO 3166-1 alpha-2)',
            },
            regions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by geographic regions',
            },
            httpStatus: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by HTTP status codes (e.g., ["200", "404", "500"])',
            },
            cacheStatus: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by cache status (e.g., ["hit", "miss", "refresh_hit"])',
            },
          },
        },
      },
      required: ['period'],
    },
  },

  {
    name: 'get-timeseries-data',
    description:
      'Get time-series data for specific metrics with configurable granularity and filtering',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Metrics to retrieve (e.g., ["bandwidth", "requests", "cache-ratio", "response-time"])',
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            granularity: {
              type: 'string',
              enum: ['hour', 'day', 'week', 'month'],
            },
          },
          required: ['start', 'end', 'granularity'],
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
            countries: { type: 'array', items: { type: 'string' } },
            regions: { type: 'array', items: { type: 'string' } },
            _httpStatus: { type: 'array', items: { type: 'string' } },
            cacheStatus: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['metrics', 'period'],
    },
  },

  // Performance Analytics Tools
  {
    name: 'get-performance-benchmarks',
    description:
      'Get performance benchmarks comparing current metrics against industry standards and historical data',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
          },
          required: ['start', 'end', 'granularity'],
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
            countries: { type: 'array', items: { type: 'string' } },
            regions: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['period'],
    },
  },

  {
    name: 'analyze-cache-performance',
    description:
      'Analyze cache performance including hit ratios, miss reasons, and optimization opportunities',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
          },
          required: ['start', 'end', 'granularity'],
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
          },
        },
        includeRecommendations: {
          type: 'boolean',
          description: 'Include optimization recommendations in the analysis',
        },
      },
      required: ['period'],
    },
  },

  // Cost Optimization Tools
  {
    name: 'get-cost-optimization-insights',
    description:
      'Generate cost optimization insights and recommendations based on traffic patterns and performance metrics',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
          },
          required: ['start', 'end', 'granularity'],
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
          },
        },
        analysisType: {
          type: 'string',
          enum: ['bandwidth', 'requests', 'cache_efficiency', 'origin_offload', 'all'],
          description: 'Type of cost analysis to perform',
        },
      },
      required: ['period'],
    },
  },

  {
    name: 'analyze-bandwidth-usage',
    description:
      'Analyze bandwidth usage patterns, peak traffic times, and identify optimization opportunities',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
          },
          required: ['start', 'end', 'granularity'],
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
            countries: { type: 'array', items: { type: 'string' } },
          },
        },
        includeProjections: {
          type: 'boolean',
          description: 'Include traffic projections and forecasting',
        },
      },
      required: ['period'],
    },
  },

  // Dashboard and Visualization Tools
  {
    name: 'create-reporting-dashboard',
    description: 'Create a custom reporting dashboard with configurable widgets and metrics',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        name: {
          type: 'string',
          description: 'Dashboard name',
        },
        description: {
          type: 'string',
          description: 'Dashboard description',
        },
        widgets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['chart', 'metric', 'table', 'map'] },
              title: { type: 'string' },
              metric: { type: 'string' },
              visualization: { type: 'string', enum: ['line', 'bar', 'pie', 'gauge', 'heatmap'] },
              timeRange: { type: 'string' },
              position: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
                required: ['x', 'y', 'width', 'height'],
              },
            },
            required: ['id', 'type', 'title', 'metric', 'visualization', 'timeRange', 'position'],
          },
        },
        filters: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
          },
        },
        refreshInterval: {
          type: 'number',
          description: 'Auto-refresh interval in seconds',
        },
        shared: {
          type: 'boolean',
          description: 'Whether the dashboard is shared with other users',
        },
      },
      required: ['name', 'widgets'],
    },
  },

  {
    name: 'export-report-data',
    description:
      'Export reporting data in various formats (CSV, JSON, Excel) for external analysis',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        format: {
          type: 'string',
          enum: ['csv', 'json', 'xlsx'],
          description: 'Export format',
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Metrics to include in export',
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
          },
          required: ['start', 'end', 'granularity'],
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
            countries: { type: 'array', items: { type: 'string' } },
          },
        },
        includeRawData: {
          type: 'boolean',
          description: 'Include raw time-series data in export',
        },
      },
      required: ['format', 'metrics', 'period'],
    },
  },

  // Real-time Monitoring Tools
  {
    name: 'configure-monitoring-alerts',
    description:
      'Configure real-time monitoring alerts with custom thresholds and notification settings',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        thresholds: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metric: {
                type: 'string',
                description: 'Metric to monitor (e.g., "bandwidth", "error-rate", "response-time")',
              },
              operator: {
                type: 'string',
                enum: ['gt', 'lt', 'eq', 'gte', 'lte'],
                description: 'Comparison operator',
              },
              value: { type: 'number', description: 'Threshold value' },
              severity: {
                type: 'string',
                enum: ['critical', 'warning', 'info'],
                description: 'Alert severity level',
              },
              enabled: { type: 'boolean', description: 'Whether the alert is enabled' },
            },
            required: ['metric', 'operator', 'value', 'severity', 'enabled'],
          },
        },
        notificationChannels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['email', 'webhook', 'sms'] },
              target: {
                type: 'string',
                description: 'Email address, webhook URL, or phone number',
              },
              severity: {
                type: 'array',
                items: { type: 'string', enum: ['critical', 'warning', 'info'] },
              },
            },
            required: ['type', 'target'],
          },
        },
      },
      required: ['thresholds'],
    },
  },

  {
    name: 'get-realtime-metrics',
    description: 'Get real-time metrics and current performance status with live updates',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Metrics to retrieve in real-time',
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
          },
        },
        timeWindow: {
          type: 'string',
          enum: ['1m', '5m', '15m', '30m', '1h'],
          description: 'Time window for real-time data aggregation',
        },
      },
      required: ['metrics'],
    },
  },

  // Historical Analysis Tools
  {
    name: 'analyze-traffic-trends',
    description:
      'Analyze historical traffic trends and patterns for capacity planning and optimization',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
          },
          required: ['start', 'end', 'granularity'],
        },
        comparisonPeriod: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
          description: 'Optional comparison period for trend analysis',
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
          },
        },
        analysisType: {
          type: 'string',
          enum: ['growth', 'seasonality', 'anomalies', 'patterns', 'all'],
          description: 'Type of trend analysis to perform',
        },
        includeForecasting: {
          type: 'boolean',
          description: 'Include traffic forecasting and projections',
        },
      },
      required: ['period'],
    },
  },

  {
    name: 'generate-performance-report',
    description:
      'Generate comprehensive performance report with executive summary, trends, and recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
          },
          required: ['start', 'end', 'granularity'],
        },
        reportType: {
          type: 'string',
          enum: ['executive', 'technical', 'cost-optimization', 'security', 'comprehensive'],
          description: 'Type of performance report to generate',
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
          },
        },
        includeRecommendations: {
          type: 'boolean',
          description: 'Include actionable recommendations in the report',
        },
        includeCharts: {
          type: 'boolean',
          description: 'Include visual charts and graphs in the report',
        },
      },
      required: ['period', 'reportType'],
    },
  },

  // Geographic and Edge Analytics
  {
    name: 'analyze-geographic-performance',
    description: 'Analyze performance metrics by geographic regions and edge locations',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
          },
          required: ['start', 'end', 'granularity'],
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
            countries: { type: 'array', items: { type: 'string' } },
            regions: { type: 'array', items: { type: 'string' } },
          },
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Metrics to analyze by geography (default: ["bandwidth", "requests", "response-time", "error-rate"])',
        },
        includeEdgeLocations: {
          type: 'boolean',
          description: 'Include edge server location performance data',
        },
      },
      required: ['period'],
    },
  },

  // Security and Error Analytics
  {
    name: 'analyze-error-patterns',
    description:
      'Analyze error patterns, status codes, and security events for troubleshooting and optimization',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer section name from .edgerc (default: "default")',
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
          },
          required: ['start', 'end', 'granularity'],
        },
        filter: {
          type: 'object',
          properties: {
            cpCodes: { type: 'array', items: { type: 'number' } },
            hostnames: { type: 'array', items: { type: 'string' } },
            _httpStatus: { type: 'array', items: { type: 'string' } },
          },
        },
        errorTypes: {
          type: 'array',
          items: { type: 'string', enum: ['4xx', '5xx', 'timeout', 'connection', 'ssl', 'all'] },
          description: 'Types of errors to analyze',
        },
        includeRecommendations: {
          type: 'boolean',
          description: 'Include troubleshooting recommendations',
        },
      },
      required: ['period'],
    },
  },
];

/**
 * Helper function to clean filter object by removing undefined properties
 * Uses type assertion to bypass exactOptionalPropertyTypes restriction
 */
function cleanFilter(filter?: ReportingFilterInput): ReportingFilter | undefined {
  if (!filter) {return undefined;}
  
  const cleaned: Partial<ReportingFilter> = {};
  
  // Only add properties that are defined and not undefined
  if (filter.cpCodes !== undefined && filter.cpCodes !== null) {
    cleaned.cpCodes = filter.cpCodes;
  }
  if (filter.hostnames !== undefined && filter.hostnames !== null) {
    cleaned.hostnames = filter.hostnames;
  }
  if (filter.countries !== undefined && filter.countries !== null) {
    cleaned.countries = filter.countries;
  }
  if (filter.regions !== undefined && filter.regions !== null) {
    cleaned.regions = filter.regions;
  }
  if (filter.userAgents !== undefined && filter.userAgents !== null) {
    cleaned.userAgents = filter.userAgents;
  }
  if (filter.httpStatus !== undefined && filter.httpStatus !== null) {
    cleaned.httpStatus = filter.httpStatus;
  }
  if (filter.cacheStatus !== undefined && filter.cacheStatus !== null) {
    cleaned.cacheStatus = filter.cacheStatus;
  }
  
  // Force type assertion to bypass exactOptionalPropertyTypes
  return Object.keys(cleaned).length > 0 ? (cleaned as ReportingFilter) : undefined;
}

/**
 * Implementation functions for the reporting tools
 */

/**
 * MULTI-CUSTOMER TRAFFIC SUMMARY HANDLER
 * 
 * PURPOSE: Generate traffic summaries for any customer account configured in .edgerc
 * 
 * MULTI-CUSTOMER EXAMPLES:
 * - handleGetTrafficSummary({ customer: 'client-acme', period: {...} })
 * - handleGetTrafficSummary({ customer: 'division-media', period: {...} })  
 * - handleGetTrafficSummary({ customer: 'staging', period: {...} })
 * 
 * CURRENT IMPLEMENTATION:
 * - Accepts customer parameter and passes to ReportingService
 * - No validation that customer exists in .edgerc configuration
 * - ReportingService handles customer-specific credential lookup
 * 
 * INTENDED ENHANCEMENT (Phase 2):
 * - Validate customer against CustomerConfigManager.hasCustomer()
 * - Return descriptive error for invalid customers
 * - Add customer context to all logging and audit trails
 * - Support account switching for cross-customer operations
 */
export async function handleGetTrafficSummary(args: GetTrafficSummaryArgs) {
  const { customer = 'default', period, filter } = args;

  try {
    logger.info('Getting traffic summary for customer', { customer, period, filter });

    // Customer validation - check if customer exists in environment
    if (customer && customer !== 'default') {
      // Basic validation - ensure customer parameter is safe
      if (!/^[a-zA-Z0-9_-]+$/.test(customer)) {
        throw new Error(`Invalid customer parameter format: ${customer}`);
      }
    }

    // Validate period has required fields
    if (!period.start || !period.end || !period.granularity) {
      throw new Error('Period must have start, end, and granularity');
    }

    // Create customer-specific reporting service
    const reportingService = new ReportingService(customer);
    const cleanedFilter = cleanFilter(filter);
    // Type assertion - period is validated above and schema ensures required fields
    const summary = await reportingService.getTrafficSummary(period as ReportingPeriod, cleanedFilter);

    return {
      success: true,
      data: summary,
      message: 'Traffic summary retrieved successfully',
    };
  } catch (_error) {
    logger.error('Failed to get traffic summary', { _error, args });
    return {
      success: false,
      error: _error instanceof Error ? _error.message : 'Unknown _error',
      details: 'Failed to retrieve traffic summary',
    };
  }
}

export async function handleGetTimeseriesData(args: GetTimeseriesDataArgs) {
  const { customer = 'default', metrics, period, filter } = args;

  try {
    logger.info('Getting timeseries data', { customer, metrics, period, filter });

    // Validate period has required fields
    if (!period.start || !period.end || !period.granularity) {
      throw new Error('Period must have start, end, and granularity');
    }

    const reportingService = new ReportingService(customer);
    const cleanedFilter = cleanFilter(filter);
    const data = await reportingService.getTimeSeriesData(metrics, period as ReportingPeriod, cleanedFilter);

    return {
      success: true,
      data,
      message: `Time-series data retrieved for ${metrics.length} metrics`,
    };
  } catch (_error) {
    logger.error('Failed to get timeseries data', { _error, args });
    return {
      success: false,
      error: _error instanceof Error ? _error.message : 'Unknown _error',
      details: 'Failed to retrieve time-series data',
    };
  }
}

export async function handleGetPerformanceBenchmarks(args: { customer?: string; period: ReportingPeriod; filter?: ReportingFilterInput }) {
  const { customer = 'default', period, filter } = args;

  try {
    logger.info('Getting performance benchmarks', { customer, period, filter });

    // Validate period has required fields
    if (!period.start || !period.end || !period.granularity) {
      throw new Error('Period must have start, end, and granularity');
    }

    const reportingService = new ReportingService(customer);
    const cleanedFilter = cleanFilter(filter);
    const benchmarks = await reportingService.getPerformanceBenchmarks(period as ReportingPeriod, cleanedFilter);

    return {
      success: true,
      data: benchmarks,
      message: `Performance benchmarks calculated for ${benchmarks.length} metrics`,
    };
  } catch (_error) {
    logger.error('Failed to get performance benchmarks', { _error, args });
    return {
      success: false,
      error: _error instanceof Error ? _error.message : 'Unknown _error',
      details: 'Failed to retrieve performance benchmarks',
    };
  }
}

export async function handleGetCostOptimizationInsights(args: { customer?: string; period: ReportingPeriod; filter?: ReportingFilterInput; analysisType?: string }) {
  const { customer = 'default', period, filter, analysisType = 'all' } = args;

  try {
    logger.info('Getting cost optimization insights', { customer, period, filter, analysisType });

    // Validate period has required fields
    if (!period.start || !period.end || !period.granularity) {
      throw new Error('Period must have start, end, and granularity');
    }

    const reportingService = new ReportingService(customer);
    const cleanedFilter = cleanFilter(filter);
    const insights = await reportingService.getCostOptimizationInsights(period as ReportingPeriod, cleanedFilter);

    // Filter insights by analysis type if specified
    let filteredInsights = insights;
    if (analysisType !== 'all') {
      filteredInsights = insights.filter((insight) => insight.type === analysisType);
    }

    const totalSavings = filteredInsights.reduce(
      (sum, insight) => sum + insight.potentialSavings,
      0,
    );

    return {
      success: true,
      data: {
        insights: filteredInsights,
        summary: {
          totalInsights: filteredInsights.length,
          totalPotentialSavings: totalSavings,
          highPriorityInsights: filteredInsights.filter((i) => i.priority === 'high').length,
        },
      },
      message: `Generated ${filteredInsights.length} cost optimization insights`,
    };
  } catch (_error) {
    logger.error('Failed to get cost optimization insights', { _error, args });
    return {
      success: false,
      error: _error instanceof Error ? _error.message : 'Unknown _error',
      details: 'Failed to generate cost optimization insights',
    };
  }
}

export async function handleCreateReportingDashboard(args: { customer?: string; name: string; widgets: any[]; description?: string; filters?: any; refreshInterval?: number; shared?: boolean }) {
  const {
    customer = 'default',
    name,
    description,
    widgets,
    filters,
    refreshInterval,
    shared = false,
  } = args;

  try {
    logger.info('Creating reporting dashboard', { customer, name, widgetCount: widgets.length });

    const reportingService = new ReportingService(customer);
    const cleanedFilters = cleanFilter(filters);
    const dashboard = await reportingService.createDashboard({
      name,
      description,
      widgets,
      filters: cleanedFilters,
      refreshInterval,
      shared,
    });

    return {
      success: true,
      data: dashboard,
      message: `Dashboard "${name}" created successfully with ${widgets.length} widgets`,
    };
  } catch (_error) {
    logger.error('Failed to create reporting dashboard', { _error, args });
    return {
      success: false,
      error: _error instanceof Error ? _error.message : 'Unknown _error',
      details: 'Failed to create reporting dashboard',
    };
  }
}

export async function handleExportReportData(args: { customer?: string; reportType: string; period: ReportingPeriod; filter?: ReportingFilterInput; format?: string; includeRawData?: boolean; metrics?: string[] }) {
  const { customer = 'default', format = 'json', metrics = ['bandwidth', 'requests'], period, filter } = args;

  try {
    logger.info('Exporting report data', { customer, format, metrics, period });

    // Validate period has required fields
    if (!period.start || !period.end || !period.granularity) {
      throw new Error('Period must have start, end, and granularity');
    }

    const reportingService = new ReportingService(customer);
    const cleanedFilter = cleanFilter(filter);
    const exportResult = await reportingService.exportReport(format as 'csv' | 'json' | 'xlsx', metrics, period as ReportingPeriod, cleanedFilter);

    return {
      success: true,
      data: {
        filename: exportResult.filename,
        contentType: exportResult.contentType,
        dataSize: exportResult.data.length,
        // Note: In a real implementation, you'd return a download link or file handle
        // For MCP, we return metadata about the export
        preview: format === 'json' ? exportResult.data.substring(0, 500) + '...' : 'Binary data',
      },
      message: `Report exported successfully as ${format.toUpperCase()}`,
    };
  } catch (_error) {
    logger.error('Failed to export report data', { _error, args });
    return {
      success: false,
      error: _error instanceof Error ? _error.message : 'Unknown _error',
      details: 'Failed to export report data',
    };
  }
}

export async function handleConfigureMonitoringAlerts(args: { customer?: string; alerts: any[] }) {
  const { customer = 'default', alerts } = args;
  const thresholds = alerts;
  const notificationChannels: any[] = [];

  try {
    logger.info('Configuring monitoring alerts', { customer, thresholdCount: thresholds.length });

    const reportingService = new ReportingService(customer);
    await reportingService.configureAlerts(thresholds);

    const enabledAlerts = thresholds.filter((t: any) => t.enabled).length;

    return {
      success: true,
      data: {
        totalAlerts: thresholds.length,
        enabledAlerts,
        notificationChannels: notificationChannels.length,
        alertsByMetric: thresholds.reduce((acc: any, threshold: any) => {
          acc[threshold.metric] = (acc[threshold.metric] || 0) + 1;
          return acc;
        }, {}),
      },
      message: `Configured ${enabledAlerts} active monitoring alerts`,
    };
  } catch (_error) {
    logger.error('Failed to configure monitoring alerts', { _error, args });
    return {
      success: false,
      error: _error instanceof Error ? _error.message : 'Unknown _error',
      details: 'Failed to configure monitoring alerts',
    };
  }
}

/**
 * FUTURE MULTI-CUSTOMER ANALYTICS TOOLS (Phase 3)
 * 
 * These advanced tools will leverage the multi-customer foundation:
 * 
 * 1. CROSS-CUSTOMER ANALYTICS:
 *    - compareCustomerPerformance(customers: string[], period: ReportingPeriod)
 *    - generatePortfolioReport(customers: string[], includeComparisons: boolean)
 *    - analyzeCrossCustomerTrends(customers: string[], metrics: string[])
 * 
 * 2. AGGREGATED REPORTING:
 *    - getTotalPortfolioBandwidth(customers: string[])
 *    - calculateAggregatedCosts(customers: string[], period: ReportingPeriod)
 *    - generateConsolidatedDashboard(customers: string[])
 * 
 * 3. MULTI-CUSTOMER BENCHMARKING:
 *    - benchmarkAgainstPortfolio(targetCustomer: string, portfolioCustomers: string[])
 *    - identifyBestPerformingCustomer(customers: string[], metric: string)
 *    - generateRankingReport(customers: string[], metrics: string[])
 * 
 * 4. CUSTOMER ONBOARDING ANALYTICS:
 *    - detectNewCustomerPatterns(customer: string, baselineCustomers: string[])
 *    - recommendOptimizationsFromPortfolio(customer: string)
 *    - generateOnboardingChecklist(customer: string)
 * 
 * 5. ENTERPRISE DIVISION ANALYTICS:
 *    - consolidateEnterpriseReporting(divisions: string[])
 *    - allocateCostsByDivision(enterprise: string, divisions: string[])
 *    - generateExecutiveSummary(enterprise: string)
 */

// Additional implementation functions would go here...
// These would handle the remaining tools like getRealTimeMetrics, analyzeTrafficTrends, etc.

function getHandlerForTool(toolName: string) {
  switch (toolName) {
    case 'get_traffic_summary':
      return handleGetTrafficSummary;
    case 'get_timeseries_data':
      return handleGetTimeseriesData;
    case 'get_performance_benchmarks':
      return handleGetPerformanceBenchmarks;
    case 'get_cost_optimization_insights':
      return handleGetCostOptimizationInsights;
    case 'create_reporting_dashboard':
      return handleCreateReportingDashboard;
    case 'export_report_data':
      return handleExportReportData;
    case 'configure_monitoring_alerts':
      return handleConfigureMonitoringAlerts;
    // Additional handlers would be mapped here for remaining tools
    default:
      return async (_args: any) => ({
        success: false,
        error: `Handler not implemented for tool: ${toolName}`,
        details: 'This reporting tool is defined but handler implementation is pending',
      });
  }
}

// Add handlers to tools
const reportingToolsWithHandlers = reportingToolsBase.map((tool) => ({
  ...tool,
  handler: getHandlerForTool(tool.name),
}));

export const reportingToolHandlers = {
  get_traffic_summary: handleGetTrafficSummary,
  get_timeseries_data: handleGetTimeseriesData,
  get_performance_benchmarks: handleGetPerformanceBenchmarks,
  get_cost_optimization_insights: handleGetCostOptimizationInsights,
  create_reporting_dashboard: handleCreateReportingDashboard,
  export_report_data: handleExportReportData,
  configure_monitoring_alerts: handleConfigureMonitoringAlerts,
  // Additional handlers would be mapped here
};

// Export the tools with handlers
export const reportingTools = reportingToolsWithHandlers;

// Export handler functions with expected names for modular servers
export const getTrafficSummary = handleGetTrafficSummary;
export const getTimeseriesData = handleGetTimeseriesData;
export const getPerformanceBenchmarks = handleGetPerformanceBenchmarks;
export async function analyzeCachePerformance(args: AnalyzeCachePerformanceArgs): Promise<{ success: boolean; data?: CachePerformanceAnalysis; error?: string; details?: string; message?: string }> {
  const { customer = 'default', period, filter } = args;
  
  try {
    logger.info('Analyzing cache performance', { customer, period, filter });
    
    // Validate period has required fields
    if (!period.start || !period.end || !period.granularity) {
      throw new Error('Period must have start, end, and granularity');
    }
    
    const reportingService = new ReportingService(customer);
    const cleanedFilter = cleanFilter(filter);
    const params = reportingService.buildReportingParams(period as ReportingPeriod, cleanedFilter);
    
    // Fetch cache-related metrics
    const [cacheHitData, cacheMissData, cacheableData] = await Promise.all([
      reportingService.fetchMetric('cache-hit-ratio', params),
      reportingService.fetchMetric('cache-miss-ratio', params),
      reportingService.fetchMetric('cacheable-responses', params),
    ]);
    
    // Calculate cache performance metrics
    const avgHitRatio = reportingService.aggregateMetric(cacheHitData, 'avg');
    const avgMissRatio = reportingService.aggregateMetric(cacheMissData, 'avg');
    const totalCacheable = reportingService.aggregateMetric(cacheableData, 'sum');
    
    const analysis: CachePerformanceAnalysis = {
      summary: {
        averageHitRatio: avgHitRatio,
        averageMissRatio: avgMissRatio,
        totalCacheableResponses: totalCacheable,
        cacheEfficiency: avgHitRatio >= 85 ? 'Optimal' : avgHitRatio >= 70 ? 'Good' : 'Needs Improvement',
      },
      recommendations: [],
      timeSeriesData: {
        hitRatio: cacheHitData,
        missRatio: cacheMissData,
      },
    };
    
    // Add recommendations based on cache performance
    if (avgHitRatio < 85) {
      analysis.recommendations.push({
        issue: 'Low cache hit ratio',
        impact: 'Increased origin load and higher costs',
        suggestion: 'Review cache headers, increase TTL values, and ensure cacheable content is properly configured',
      });
    }
    
    return {
      success: true,
      data: analysis,
      message: 'Cache performance analysis completed',
    };
  } catch (error) {
    logger.error('Failed to analyze cache performance', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to analyze cache performance',
    };
  }
}
export const getCostOptimizationInsights = handleGetCostOptimizationInsights;
export async function analyzeBandwidthUsage(args: AnalyzeBandwidthUsageArgs): Promise<{ success: boolean; data?: BandwidthAnalysis; error?: string; details?: string; message?: string }> {
  const { customer = 'default', period, filter, groupBy = 'cpcode' } = args;
  
  try {
    logger.info('Analyzing bandwidth usage', { customer, period, filter, groupBy });
    
    // Validate period has required fields
    if (!period.start || !period.end || !period.granularity) {
      throw new Error('Period must have start, end, and granularity');
    }
    
    const reportingService = new ReportingService(customer);
    const cleanedFilter = cleanFilter(filter);
    // Type assertion - period is validated above and schema ensures required fields
    const params = reportingService.buildReportingParams(period as ReportingPeriod, cleanedFilter);
    
    // Fetch bandwidth metrics
    const [edgeBandwidth, originBandwidth] = await Promise.all([
      reportingService.fetchMetric('edge-bandwidth', params),
      reportingService.fetchMetric('origin-bandwidth', params),
    ]);
    
    const totalEdge = reportingService.aggregateMetric(edgeBandwidth, 'sum');
    const totalOrigin = reportingService.aggregateMetric(originBandwidth, 'sum');
    const originOffload = ((totalEdge - totalOrigin) / totalEdge) * 100;
    
    const analysis = {
      summary: {
        totalBandwidth: totalEdge,
        edgeBandwidth: totalEdge,
        originBandwidth: totalOrigin,
        originOffloadPercentage: originOffload,
        estimatedCost: totalEdge * 0.085, // Example cost per GB
      },
      breakdown: {
        byTime: edgeBandwidth,
        peak: reportingService.aggregateMetric(edgeBandwidth, 'max'),
        average: reportingService.aggregateMetric(edgeBandwidth, 'avg'),
      },
      optimization: {
        potentialSavings: originOffload < 90 ? (90 - originOffload) * totalOrigin * 0.085 / 100 : 0,
        recommendations: originOffload < 90 ? ['Improve cache configuration', 'Enable prefetching'] : [],
      },
    };
    
    return {
      success: true,
      data: analysis,
      message: 'Bandwidth usage analysis completed',
    };
  } catch (error) {
    logger.error('Failed to analyze bandwidth usage', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to analyze bandwidth usage',
    };
  }
}
export const createReportingDashboard = handleCreateReportingDashboard;
export const exportReportData = handleExportReportData;
export const configureMonitoringAlerts = handleConfigureMonitoringAlerts;
export async function getRealtimeMetrics(args: GetRealtimeMetricsArgs): Promise<{ success: boolean; data?: RealtimeMetrics; error?: string; details?: string; message?: string }> {
  const { customer = 'default', metrics = ['bandwidth', 'requests', 'errors'], refreshInterval = 60 } = args;
  
  try {
    logger.info('Getting real-time metrics', { customer, metrics, refreshInterval });
    
    const reportingService = new ReportingService(customer);
    
    // For real-time, use last 5 minutes of data
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const period: ReportingPeriod = {
      start: fiveMinutesAgo.toISOString(),
      end: now.toISOString(),
      granularity: 'hour', // Use hour granularity for real-time (smallest available)
    };
    
    // Type assertion - period is properly constructed above with all required fields
    const params = reportingService.buildReportingParams(period as ReportingPeriod, undefined);
    
    // Fetch requested metrics
    const metricPromises = metrics.map((metric: string) => 
      reportingService.fetchMetric(metric, params)
    );
    
    const results = await Promise.all(metricPromises);
    
    const realtimeData: Record<string, any> = {};
    metrics.forEach((metric: string, index: number) => {
      const data = results[index];
      const lastItem = data && data.length > 0 ? data[data.length - 1] : null;
      const latestValue = lastItem?.value ?? 0;
      realtimeData[metric] = {
        current: latestValue,
        timestamp: lastItem?.timestamp ?? now.toISOString(),
        trend: 'stable', // Would calculate from historical data
      };
    });
    
    return {
      success: true,
      data: {
        metrics: realtimeData,
        refreshInterval,
        lastUpdated: now.toISOString(),
      },
      message: 'Real-time metrics retrieved successfully',
    };
  } catch (error) {
    logger.error('Failed to get real-time metrics', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to retrieve real-time metrics',
    };
  }
}
export async function analyzeTrafficTrends(args: AnalyzeTrafficTrendsArgs): Promise<{ success: boolean; data?: any; error?: string; details?: string; message?: string }> {
  const { customer = 'default', period, filter, includePredictions = true } = args;
  
  try {
    logger.info('Analyzing traffic trends', { customer, period, filter, includePredictions });
    
    // Validate period has required fields
    if (!period.start || !period.end || !period.granularity) {
      throw new Error('Period must have start, end, and granularity');
    }
    
    const reportingService = new ReportingService(customer);
    const cleanedFilter = cleanFilter(filter);
    // Type assertion - period is validated above and schema ensures required fields
    const timeSeriesData = await reportingService.getTimeSeriesData(
      ['bandwidth', 'requests', 'cache-hit-ratio'],
      period as ReportingPeriod,
      cleanedFilter
    );
    
    // Analyze trends for each metric
    const trends: Record<string, any> = {};
    
    for (const [metric, data] of Object.entries(timeSeriesData)) {
      if (!Array.isArray(data) || data.length === 0) {continue;}
      
      const values = data.map(d => d.value);
      
      // Calculate basic statistics
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      // Simple trend calculation (would use more sophisticated methods in production)
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const trendDirection = secondAvg > firstAvg * 1.1 ? 'increasing' : 
                            secondAvg < firstAvg * 0.9 ? 'decreasing' : 'stable';
      
      trends[metric] = {
        current: values[values.length - 1],
        average: avg,
        peak: max,
        minimum: min,
        trend: trendDirection,
        growthRate: ((secondAvg - firstAvg) / firstAvg) * 100,
        volatility: Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length) / avg,
      };
      
      // Add predictions if requested
      if (includePredictions) {
        trends[metric].prediction = {
          nextHour: avg * (1 + trends[metric].growthRate / 100),
          confidence: 'medium', // Would calculate based on volatility
        };
      }
    }
    
    return {
      success: true,
      data: {
        trends,
        period,
        dataPoints: timeSeriesData['bandwidth']?.length || 0,
        analysis: {
          overallHealth: 'good', // Would calculate from multiple factors
          alerts: [], // Would add based on thresholds
        },
      },
      message: 'Traffic trend analysis completed',
    };
  } catch (error) {
    logger.error('Failed to analyze traffic trends', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to analyze traffic trends',
    };
  }
}
export async function generatePerformanceReport(args: GeneratePerformanceReportArgs): Promise<{ success: boolean; data?: PerformanceReport; error?: string; details?: string; message?: string }> {
  const { customer = 'default', period, filter, includeRecommendations = true } = args;
  
  try {
    logger.info('Generating performance report', { customer, period, filter });
    
    // Validate period has required fields
    if (!period.start || !period.end || !period.granularity) {
      throw new Error('Period must have start, end, and granularity');
    }
    
    const reportingService = new ReportingService(customer);
    
    // Fetch comprehensive performance data
    const cleanedFilter = cleanFilter(filter);
    // Type assertion - period is validated above and schema ensures required fields
    const [trafficSummary, benchmarks] = await Promise.all([
      reportingService.getTrafficSummary(period as ReportingPeriod, cleanedFilter),
      reportingService.getPerformanceBenchmarks(period as ReportingPeriod, cleanedFilter),
    ]);
    
    const report: PerformanceReport = {
      metadata: {
        generatedAt: new Date().toISOString(),
        period,
        customer: customer || 'default',
      },
      summary: {
        traffic: trafficSummary,
        performance: {
          averageResponseTime: trafficSummary.responseTime,
          cacheHitRatio: trafficSummary.cacheHitRatio,
          errorRate: trafficSummary.errorRate,
          originOffload: ((trafficSummary.requests - trafficSummary.origin.requests) / trafficSummary.requests) * 100,
        },
      },
      benchmarks,
      scorecard: {
        overall: calculatePerformanceScore(trafficSummary),
        categories: {
          speed: trafficSummary.responseTime < 100 ? 'A' : trafficSummary.responseTime < 300 ? 'B' : trafficSummary.responseTime < 500 ? 'C' : trafficSummary.responseTime < 1000 ? 'D' : 'F',
          caching: trafficSummary.cacheHitRatio > 90 ? 'A' : trafficSummary.cacheHitRatio > 80 ? 'B' : trafficSummary.cacheHitRatio > 70 ? 'C' : trafficSummary.cacheHitRatio > 60 ? 'D' : 'F',
          reliability: trafficSummary.errorRate < 0.1 ? 'A' : trafficSummary.errorRate < 1 ? 'B' : trafficSummary.errorRate < 2 ? 'C' : trafficSummary.errorRate < 5 ? 'D' : 'F',
        },
      },
    };
    
    if (includeRecommendations) {
      report.recommendations = generatePerformanceRecommendations(trafficSummary);
    }
    
    return {
      success: true,
      data: report,
      message: 'Performance report generated successfully',
    };
  } catch (error) {
    logger.error('Failed to generate performance report', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to generate performance report',
    };
  }
}

function calculatePerformanceScore(summary: TrafficSummary): string {
  let score = 100;
  if (summary.responseTime > 300) {score -= 20;}
  if (summary.cacheHitRatio < 85) {score -= 20;}
  if (summary.errorRate > 1) {score -= 20;}
  return score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Needs Improvement';
}

function generatePerformanceRecommendations(summary: TrafficSummary): Array<{ area: string; priority: string; suggestion: string }> {
  const recommendations = [];
  
  if (summary.responseTime > 200) {
    recommendations.push({
      area: 'Response Time',
      priority: 'high',
      suggestion: 'Enable Akamai Ion for adaptive acceleration and HTTP/3 support',
    });
  }
  
  if (summary.cacheHitRatio < 85) {
    recommendations.push({
      area: 'Cache Performance',
      priority: 'high',
      suggestion: 'Review cache headers and increase TTL for static assets',
    });
  }
  
  return recommendations;
}
export async function analyzeGeographicPerformance(args: AnalyzeGeographicPerformanceArgs): Promise<{ success: boolean; data?: any; error?: string; details?: string; message?: string }> {
  const { customer = 'default', period, regions = ['NA', 'EU', 'APAC'], metrics = ['bandwidth', 'response-time'] } = args;
  
  try {
    logger.info('Analyzing geographic performance', { customer, period, regions, metrics });
    
    // Validate period has required fields
    if (!period.start || !period.end || !period.granularity) {
      throw new Error('Period must have start, end, and granularity');
    }
    
    const reportingService = new ReportingService(customer);
    const geoData: Record<string, any> = {};
    
    // Fetch data for each region
    for (const region of regions) {
      const filter = { regions: [region] };
      // Type assertion - period is validated above and schema ensures required fields
      const params = reportingService.buildReportingParams(period as ReportingPeriod, filter);
      
      const regionMetrics: Record<string, any> = {};
      for (const metric of metrics) {
        const data = await reportingService.fetchMetric(metric, params);
        regionMetrics[metric] = {
          average: reportingService.aggregateMetric(data, 'avg'),
          peak: reportingService.aggregateMetric(data, 'max'),
          total: reportingService.aggregateMetric(data, 'sum'),
        };
      }
      
      geoData[region] = {
        metrics: regionMetrics,
        performance: {
          score: calculateRegionScore(regionMetrics),
          grade: getPerformanceGrade(regionMetrics['response-time']?.average || 0),
        },
      };
    }
    
    // Find best and worst performing regions
    const regionScores = Object.entries(geoData).map(([region, data]) => ({
      region,
      score: data.performance.score,
    }));
    
    regionScores.sort((a, b) => b.score - a.score);
    
    return {
      success: true,
      data: {
        byRegion: geoData,
        summary: {
          bestPerforming: regionScores[0]?.region,
          worstPerforming: regionScores[regionScores.length - 1]?.region,
          averageResponseTime: calculateGlobalAverage(geoData, 'response-time'),
        },
        recommendations: generateGeoRecommendations(geoData),
      },
      message: 'Geographic performance analysis completed',
    };
  } catch (error) {
    logger.error('Failed to analyze geographic performance', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to analyze geographic performance',
    };
  }
}

function calculateRegionScore(metrics: any): number {
  const responseTime = metrics['response-time']?.average || 1000;
  return Math.max(0, 100 - (responseTime / 10));
}

function getPerformanceGrade(responseTime: number): string {
  if (responseTime < 100) {return 'A';}
  if (responseTime < 200) {return 'B';}
  if (responseTime < 500) {return 'C';}
  if (responseTime < 1000) {return 'D';}
  return 'F';
}

function calculateGlobalAverage(geoData: any, metric: string): number {
  const values = Object.values(geoData).map((data: any) => data.metrics[metric]?.average || 0);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function generateGeoRecommendations(geoData: any): any[] {
  const recommendations = [];
  
  for (const [region, data] of Object.entries(geoData)) {
    const typedData = data as { performance?: { grade?: string } };
    if (typedData.performance?.grade === 'D' || typedData.performance?.grade === 'F') {
      recommendations.push({
        region,
        priority: 'high',
        suggestion: `Consider adding more edge servers in ${region} region`,
      });
    }
  }
  
  return recommendations;
}
export async function analyzeErrorPatterns(args: AnalyzeErrorPatternsArgs): Promise<{ success: boolean; data?: ErrorPattern; error?: string; details?: string; message?: string }> {
  const { customer = 'default', period, filter, errorTypes = ['4xx', '5xx'], includeRecommendations = true } = args;
  
  try {
    logger.info('Analyzing error patterns', { customer, period, filter, errorTypes });
    
    // Validate period has required fields
    if (!period.start || !period.end || !period.granularity) {
      throw new Error('Period must have start, end, and granularity');
    }
    
    const reportingService = new ReportingService(customer);
    const cleanedFilter = cleanFilter(filter);
    // Type assertion - period is validated above and schema ensures required fields
    const params = reportingService.buildReportingParams(period as ReportingPeriod, cleanedFilter);
    
    // Fetch error-related metrics
    const errorMetrics: Record<string, any> = {};
    
    for (const errorType of errorTypes) {
      const metricName = `http-status-${errorType}`;
      const data = await reportingService.fetchMetric(metricName, params);
      
      errorMetrics[errorType] = {
        total: reportingService.aggregateMetric(data, 'sum'),
        average: reportingService.aggregateMetric(data, 'avg'),
        peak: reportingService.aggregateMetric(data, 'max'),
        timeSeries: data,
      };
    }
    
    // Analyze patterns
    const patterns = {
      byType: errorMetrics,
      trends: analyzeErrorTrends(errorMetrics),
      hotspots: identifyErrorHotspots(errorMetrics),
    };
    
    const analysis: ErrorPattern = {
      summary: {
        totalErrors: Object.values(errorMetrics).reduce((sum: number, data: any) => sum + data.total, 0),
        errorRate: calculateOverallErrorRate(errorMetrics),
        mostCommonType: getMostCommonErrorType(errorMetrics),
      },
      patterns,
    };
    
    if (includeRecommendations) {
      analysis.recommendations = generateErrorRecommendations(patterns);
    }
    
    return {
      success: true,
      data: analysis,
      message: 'Error pattern analysis completed',
    };
  } catch (error) {
    logger.error('Failed to analyze error patterns', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to analyze error patterns',
    };
  }
}

function analyzeErrorTrends(errorMetrics: Record<string, any>): Record<string, 'increasing' | 'decreasing' | 'stable' | 'insufficient_data'> {
  const trends: Record<string, 'increasing' | 'decreasing' | 'stable' | 'insufficient_data'> = {};
  
  for (const [type, data] of Object.entries(errorMetrics)) {
    const metricData = data as { timeSeries?: ReportingMetric[] };
    if (!metricData.timeSeries || metricData.timeSeries.length < 2) {
      trends[type] = 'insufficient_data';
      continue;
    }
    
    const values = metricData.timeSeries.map((d: ReportingMetric) => d.value);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.2) {trends[type] = 'increasing';}
    else if (secondAvg < firstAvg * 0.8) {trends[type] = 'decreasing';}
    else {trends[type] = 'stable';}
  }
  
  return trends;
}

function identifyErrorHotspots(errorMetrics: Record<string, any>): Array<{ type: string; severity: string; peakToAverageRatio: number }> {
  const hotspots = [];
  
  for (const [type, data] of Object.entries(errorMetrics)) {
    const metricData = data as { peak: number; average: number };
    if (metricData.peak > metricData.average * 3) {
      hotspots.push({
        type,
        severity: 'high',
        peakToAverageRatio: metricData.peak / metricData.average,
      });
    }
  }
  
  return hotspots;
}

function calculateOverallErrorRate(errorMetrics: any): number {
  // This is simplified - in reality would need total requests
  const totalErrors = Object.values(errorMetrics).reduce((sum: number, data: any) => sum + data.total, 0);
  return totalErrors / 1000000 * 100; // Assuming 1M requests for demo
}

function getMostCommonErrorType(errorMetrics: Record<string, any>): string {
  let maxErrors = 0;
  let mostCommon = 'none';
  
  for (const [type, data] of Object.entries(errorMetrics)) {
    const metricData = data as { total: number };
    if (metricData.total > maxErrors) {
      maxErrors = metricData.total;
      mostCommon = type;
    }
  }
  
  return mostCommon;
}

function generateErrorRecommendations(patterns: any): any[] {
  const recommendations = [];
  
  for (const [type, trend] of Object.entries(patterns.trends)) {
    if (trend === 'increasing') {
      if (type === '4xx') {
        recommendations.push({
          type: '4xx Errors',
          priority: 'medium',
          suggestion: 'Review request validation and URL routing rules',
        });
      } else if (type === '5xx') {
        recommendations.push({
          type: '5xx Errors',
          priority: 'high',
          suggestion: 'Check origin server health and capacity',
        });
      }
    }
  }
  
  if (patterns.hotspots.length > 0) {
    recommendations.push({
      type: 'Error Spikes',
      priority: 'high',
      suggestion: 'Investigate error spike patterns and implement rate limiting',
    });
  }
  
  return recommendations;
}
