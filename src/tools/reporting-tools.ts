import { Tool } from '@modelcontextprotocol/sdk/types';
import { ReportingService } from '../services/ReportingService';
import { logger } from '../utils/logger';

/**
 * MCP Tools for Akamai Reporting API - Traffic Analytics and Performance Metrics
 * 
 * This module provides comprehensive reporting capabilities including:
 * - Traffic and bandwidth analytics
 * - Performance metrics and benchmarking
 * - Cost optimization insights
 * - Real-time monitoring and alerts
 * - Custom dashboards and data exports
 */

const reportingToolsBase: Tool[] = [
  // Traffic Analytics Tools
  {
    name: 'get-traffic-summary',
    description: 'Get comprehensive traffic summary including bandwidth, requests, cache metrics, and performance data',
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
    description: 'Get time-series data for specific metrics with configurable granularity and filtering',
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
          description: 'Metrics to retrieve (e.g., ["bandwidth", "requests", "cache-ratio", "response-time"])',
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
            httpStatus: { type: 'array', items: { type: 'string' } },
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
    description: 'Get performance benchmarks comparing current metrics against industry standards and historical data',
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
    description: 'Analyze cache performance including hit ratios, miss reasons, and optimization opportunities',
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
    description: 'Generate cost optimization insights and recommendations based on traffic patterns and performance metrics',
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
    description: 'Analyze bandwidth usage patterns, peak traffic times, and identify optimization opportunities',
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
    description: 'Export reporting data in various formats (CSV, JSON, Excel) for external analysis',
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
    description: 'Configure real-time monitoring alerts with custom thresholds and notification settings',
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
              metric: { type: 'string', description: 'Metric to monitor (e.g., "bandwidth", "error-rate", "response-time")' },
              operator: { type: 'string', enum: ['gt', 'lt', 'eq', 'gte', 'lte'], description: 'Comparison operator' },
              value: { type: 'number', description: 'Threshold value' },
              severity: { type: 'string', enum: ['critical', 'warning', 'info'], description: 'Alert severity level' },
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
              target: { type: 'string', description: 'Email address, webhook URL, or phone number' },
              severity: { type: 'array', items: { type: 'string', enum: ['critical', 'warning', 'info'] } },
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
    description: 'Analyze historical traffic trends and patterns for capacity planning and optimization',
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
    description: 'Generate comprehensive performance report with executive summary, trends, and recommendations',
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
          description: 'Metrics to analyze by geography (default: ["bandwidth", "requests", "response-time", "error-rate"])',
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
    description: 'Analyze error patterns, status codes, and security events for troubleshooting and optimization',
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
            httpStatus: { type: 'array', items: { type: 'string' } },
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
 * Implementation functions for the reporting tools
 */

export async function handleGetTrafficSummary(args: any) {
  const { customer = 'default', period, filter } = args;
  
  try {
    logger.info('Getting traffic summary', { customer, period, filter });
    
    const reportingService = new ReportingService(customer);
    const summary = await reportingService.getTrafficSummary(period, filter);
    
    return {
      success: true,
      data: summary,
      message: 'Traffic summary retrieved successfully'
    };
  } catch (error) {
    logger.error('Failed to get traffic summary', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to retrieve traffic summary'
    };
  }
}

export async function handleGetTimeseriesData(args: any) {
  const { customer = 'default', metrics, period, filter } = args;
  
  try {
    logger.info('Getting timeseries data', { customer, metrics, period, filter });
    
    const reportingService = new ReportingService(customer);
    const data = await reportingService.getTimeSeriesData(metrics, period, filter);
    
    return {
      success: true,
      data,
      message: `Time-series data retrieved for ${metrics.length} metrics`
    };
  } catch (error) {
    logger.error('Failed to get timeseries data', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to retrieve time-series data'
    };
  }
}

export async function handleGetPerformanceBenchmarks(args: any) {
  const { customer = 'default', period, filter } = args;
  
  try {
    logger.info('Getting performance benchmarks', { customer, period, filter });
    
    const reportingService = new ReportingService(customer);
    const benchmarks = await reportingService.getPerformanceBenchmarks(period, filter);
    
    return {
      success: true,
      data: benchmarks,
      message: `Performance benchmarks calculated for ${benchmarks.length} metrics`
    };
  } catch (error) {
    logger.error('Failed to get performance benchmarks', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to retrieve performance benchmarks'
    };
  }
}

export async function handleGetCostOptimizationInsights(args: any) {
  const { customer = 'default', period, filter, analysisType = 'all' } = args;
  
  try {
    logger.info('Getting cost optimization insights', { customer, period, filter, analysisType });
    
    const reportingService = new ReportingService(customer);
    const insights = await reportingService.getCostOptimizationInsights(period, filter);
    
    // Filter insights by analysis type if specified
    let filteredInsights = insights;
    if (analysisType !== 'all') {
      filteredInsights = insights.filter(insight => insight.type === analysisType);
    }
    
    const totalSavings = filteredInsights.reduce((sum, insight) => sum + insight.potentialSavings, 0);
    
    return {
      success: true,
      data: {
        insights: filteredInsights,
        summary: {
          totalInsights: filteredInsights.length,
          totalPotentialSavings: totalSavings,
          highPriorityInsights: filteredInsights.filter(i => i.priority === 'high').length
        }
      },
      message: `Generated ${filteredInsights.length} cost optimization insights`
    };
  } catch (error) {
    logger.error('Failed to get cost optimization insights', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to generate cost optimization insights'
    };
  }
}

export async function handleCreateReportingDashboard(args: any) {
  const { customer = 'default', name, description, widgets, filters, refreshInterval, shared = false } = args;
  
  try {
    logger.info('Creating reporting dashboard', { customer, name, widgetCount: widgets.length });
    
    const reportingService = new ReportingService(customer);
    const dashboard = await reportingService.createDashboard({
      name,
      description,
      widgets,
      filters,
      refreshInterval,
      shared
    });
    
    return {
      success: true,
      data: dashboard,
      message: `Dashboard "${name}" created successfully with ${widgets.length} widgets`
    };
  } catch (error) {
    logger.error('Failed to create reporting dashboard', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to create reporting dashboard'
    };
  }
}

export async function handleExportReportData(args: any) {
  const { customer = 'default', format, metrics, period, filter } = args;
  
  try {
    logger.info('Exporting report data', { customer, format, metrics, period });
    
    const reportingService = new ReportingService(customer);
    const exportResult = await reportingService.exportReport(format, metrics, period, filter);
    
    return {
      success: true,
      data: {
        filename: exportResult.filename,
        contentType: exportResult.contentType,
        dataSize: exportResult.data.length,
        // Note: In a real implementation, you'd return a download link or file handle
        // For MCP, we return metadata about the export
        preview: format === 'json' ? exportResult.data.substring(0, 500) + '...' : 'Binary data'
      },
      message: `Report exported successfully as ${format.toUpperCase()}`
    };
  } catch (error) {
    logger.error('Failed to export report data', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to export report data'
    };
  }
}

export async function handleConfigureMonitoringAlerts(args: any) {
  const { customer = 'default', thresholds, notificationChannels = [] } = args;
  
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
        }, {})
      },
      message: `Configured ${enabledAlerts} active monitoring alerts`
    };
  } catch (error) {
    logger.error('Failed to configure monitoring alerts', { error, args });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to configure monitoring alerts'
    };
  }
}

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
        details: 'This reporting tool is defined but handler implementation is pending'
      });
  }
}

// Add handlers to tools
const reportingToolsWithHandlers = reportingToolsBase.map(tool => ({
  ...tool,
  handler: getHandlerForTool(tool.name)
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