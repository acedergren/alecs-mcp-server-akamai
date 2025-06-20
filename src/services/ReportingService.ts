import { EdgeGridClient } from '@utils/edgegrid-client';
import { logger } from '@utils/logger';
import { PerformanceMonitor } from '@utils/performance-monitor';

export interface ReportingMetric {
  timestamp: string;
  value: number;
  unit?: string;
  dimensions?: Record<string, string>;
}

export interface TrafficSummary {
  bandwidth: number;
  requests: number;
  cacheHitRatio: number;
  errorRate: number;
  responseTime: number;
  origin: {
    bandwidth: number;
    requests: number;
    responseTime: number;
  };
}

export interface ReportingPeriod {
  start: string;
  end: string;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface ReportingFilter {
  cpCodes?: number[];
  hostnames?: string[];
  countries?: string[];
  regions?: string[];
  userAgents?: string[];
  httpStatus?: string[];
  cacheStatus?: string[];
}

export interface CostOptimizationInsight {
  type: 'bandwidth' | 'requests' | 'cache_efficiency' | 'origin_offload';
  title: string;
  description: string;
  potentialSavings: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'complex';
}

export interface PerformanceBenchmark {
  metric: string;
  current: number;
  benchmark: number;
  percentile: number;
  trend: 'improving' | 'stable' | 'degrading';
  recommendation?: string;
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
}

export interface ReportingDashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  filters?: ReportingFilter;
  refreshInterval?: number;
  shared: boolean;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'map';
  title: string;
  metric: string;
  visualization: 'line' | 'bar' | 'pie' | 'gauge' | 'heatmap';
  timeRange: string;
  filters?: ReportingFilter;
  position: { x: number; y: number; width: number; height: number };
}

export class ReportingService {
  private client: EdgeGridClient;
  private performanceMonitor: PerformanceMonitor;

  constructor(customer = 'default') {
    this.client = EdgeGridClient.getInstance(customer);
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Get traffic summary for a given period
   */
  async getTrafficSummary(
    period: ReportingPeriod,
    filter?: ReportingFilter,
  ): Promise<TrafficSummary> {
    const operationId = this.performanceMonitor.startOperation('reporting_traffic_summary');

    try {
      logger.info('Fetching traffic summary', { period, filter });

      // Build query parameters
      const params = this.buildReportingParams(period, filter);

      // Fetch multiple metrics in parallel
      const [
        bandwidthData,
        requestsData,
        cacheData,
        errorData,
        performanceData,
        originBandwidthData,
        originRequestsData,
        originResponseTimeData,
      ] = await Promise.all([
        this.fetchMetric('bandwidth', params),
        this.fetchMetric('requests', params),
        this.fetchMetric('cache-ratio', params),
        this.fetchMetric('error-rate', params),
        this.fetchMetric('response-time', params),
        this.fetchMetric('origin-bandwidth', params),
        this.fetchMetric('origin-requests', params),
        this.fetchMetric('origin-response-time', params),
      ]);

      const summary: TrafficSummary = {
        bandwidth: this.aggregateMetric(bandwidthData, 'sum'),
        requests: this.aggregateMetric(requestsData, 'sum'),
        cacheHitRatio: this.aggregateMetric(cacheData, 'avg'),
        errorRate: this.aggregateMetric(errorData, 'avg'),
        responseTime: this.aggregateMetric(performanceData, 'avg'),
        origin: {
          bandwidth: this.aggregateMetric(originBandwidthData, 'sum'),
          requests: this.aggregateMetric(originRequestsData, 'sum'),
          responseTime: this.aggregateMetric(originResponseTimeData, 'avg'),
        },
      };

      logger.info('Traffic summary fetched successfully', { summary });
      return summary;
    } catch (_error) {
      logger.error('Failed to fetch traffic summary', { error, period, filter });
      this.performanceMonitor.endOperation(operationId, { errorOccurred: true });
      throw new Error(
        `Failed to fetch traffic summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.performanceMonitor.endOperation(operationId);
    }
  }

  /**
   * Get time-series data for specific metrics
   */
  async getTimeSeriesData(
    metrics: string[],
    period: ReportingPeriod,
    filter?: ReportingFilter,
  ): Promise<Record<string, ReportingMetric[]>> {
    const operationId = this.performanceMonitor.startOperation('reporting_timeseries');

    try {
      logger.info('Fetching time-series data', { metrics, period, filter });

      const params = this.buildReportingParams(period, filter);
      const results: Record<string, ReportingMetric[]> = {};

      // Fetch metrics in parallel
      const metricPromises = metrics.map(async (metric) => {
        const data = await this.fetchMetric(metric, params);
        return { metric, data };
      });

      const metricResults = await Promise.all(metricPromises);

      for (const { metric, data } of metricResults) {
        results[metric] = data;
      }

      logger.info('Time-series data fetched successfully', {
        metrics: Object.keys(results),
        dataPoints: Object.values(results).reduce((sum, data) => sum + data.length, 0),
      });

      return results;
    } catch (_error) {
      logger.error('Failed to fetch time-series data', { error, metrics, period, filter });
      this.performanceMonitor.endOperation(operationId, { errorOccurred: true });
      throw new Error(
        `Failed to fetch time-series data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.performanceMonitor.endOperation(operationId);
    }
  }

  /**
   * Generate cost optimization insights
   */
  async getCostOptimizationInsights(
    period: ReportingPeriod,
    filter?: ReportingFilter,
  ): Promise<CostOptimizationInsight[]> {
    const operationId = this.performanceMonitor.startOperation('reporting_cost_insights');

    try {
      logger.info('Generating cost optimization insights', { period, filter });

      const insights: CostOptimizationInsight[] = [];

      // Get current traffic data
      const summary = await this.getTrafficSummary(period, filter);

      // Analyze cache efficiency
      if (summary.cacheHitRatio < 85) {
        insights.push({
          type: 'cache_efficiency',
          title: 'Low Cache Hit Ratio',
          description: `Current cache hit ratio is ${summary.cacheHitRatio.toFixed(1)}%, below optimal 85%+`,
          potentialSavings: this.calculateBandwidthSavings(
            summary.bandwidth,
            summary.cacheHitRatio,
            85,
          ),
          recommendation: 'Review cache headers, TTL settings, and cacheable content configuration',
          priority: summary.cacheHitRatio < 70 ? 'high' : 'medium',
          effort: 'moderate',
        });
      }

      // Analyze origin offload
      const originOffloadRatio =
        ((summary.requests - summary.origin.requests) / summary.requests) * 100;
      if (originOffloadRatio < 90) {
        insights.push({
          type: 'origin_offload',
          title: 'Low Origin Offload',
          description: `Origin offload ratio is ${originOffloadRatio.toFixed(1)}%, below optimal 90%+`,
          potentialSavings: this.calculateOriginSavings(
            summary.origin.requests,
            originOffloadRatio,
            90,
          ),
          recommendation: 'Optimize caching rules and increase TTL for static content',
          priority: originOffloadRatio < 80 ? 'high' : 'medium',
          effort: 'moderate',
        });
      }

      // Analyze peak traffic patterns
      const timeSeriesData = await this.getTimeSeriesData(
        ['bandwidth', 'requests'],
        period,
        filter,
      );
      const peakAnalysis = this.analyzePeakTraffic(timeSeriesData);

      if (peakAnalysis.peakVariance > 300) {
        insights.push({
          type: 'bandwidth',
          title: 'High Traffic Variance',
          description: `Peak traffic is ${peakAnalysis.peakVariance}% above average`,
          potentialSavings: this.calculateVarianceSavings(
            summary.bandwidth,
            peakAnalysis.peakVariance,
          ),
          recommendation:
            'Consider implementing adaptive caching or traffic shaping during peak hours',
          priority: 'medium',
          effort: 'complex',
        });
      }

      logger.info('Cost optimization insights generated', {
        insightCount: insights.length,
        totalPotentialSavings: insights.reduce((sum, insight) => sum + insight.potentialSavings, 0),
      });

      return insights;
    } catch (_error) {
      logger.error('Failed to generate cost optimization insights', { error, period, filter });
      this.performanceMonitor.endOperation(operationId, { errorOccurred: true });
      throw new Error(
        `Failed to generate cost optimization insights: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.performanceMonitor.endOperation(operationId);
    }
  }

  /**
   * Get performance benchmarks
   */
  async getPerformanceBenchmarks(
    period: ReportingPeriod,
    filter?: ReportingFilter,
  ): Promise<PerformanceBenchmark[]> {
    const operationId = this.performanceMonitor.startOperation('reporting_benchmarks');

    try {
      logger.info('Fetching performance benchmarks', { period, filter });

      const benchmarks: PerformanceBenchmark[] = [];

      // Get current metrics
      const summary = await this.getTrafficSummary(period, filter);

      // Industry benchmarks (these would come from Akamai's benchmark data)
      const industryBenchmarks = {
        cacheHitRatio: 85,
        responseTime: 200,
        errorRate: 0.1,
        originOffload: 90,
      };

      // Calculate percentiles (simplified - would use actual percentile data)
      benchmarks.push({
        metric: 'Cache Hit Ratio',
        current: summary.cacheHitRatio,
        benchmark: industryBenchmarks.cacheHitRatio,
        percentile: this.calculatePercentile(
          summary.cacheHitRatio,
          industryBenchmarks.cacheHitRatio,
        ),
        trend: await this.calculateTrend('cache-ratio', period),
        recommendation:
          summary.cacheHitRatio < industryBenchmarks.cacheHitRatio
            ? 'Optimize cache configuration to improve hit ratio'
            : undefined,
      });

      benchmarks.push({
        metric: 'Response Time',
        current: summary.responseTime,
        benchmark: industryBenchmarks.responseTime,
        percentile: this.calculatePercentile(
          summary.responseTime,
          industryBenchmarks.responseTime,
          true,
        ),
        trend: await this.calculateTrend('response-time', period),
        recommendation:
          summary.responseTime > industryBenchmarks.responseTime
            ? 'Review edge configurations and optimize content delivery'
            : undefined,
      });

      benchmarks.push({
        metric: 'Error Rate',
        current: summary.errorRate,
        benchmark: industryBenchmarks.errorRate,
        percentile: this.calculatePercentile(summary.errorRate, industryBenchmarks.errorRate, true),
        trend: await this.calculateTrend('error-rate', period),
        recommendation:
          summary.errorRate > industryBenchmarks.errorRate
            ? 'Investigate error sources and implement error handling improvements'
            : undefined,
      });

      const originOffload = ((summary.requests - summary.origin.requests) / summary.requests) * 100;
      benchmarks.push({
        metric: 'Origin Offload',
        current: originOffload,
        benchmark: industryBenchmarks.originOffload,
        percentile: this.calculatePercentile(originOffload, industryBenchmarks.originOffload),
        trend: await this.calculateTrend('origin-offload', period),
        recommendation:
          originOffload < industryBenchmarks.originOffload
            ? 'Improve caching strategies to reduce origin load'
            : undefined,
      });

      logger.info('Performance benchmarks calculated', {
        benchmarkCount: benchmarks.length,
        averagePercentile: benchmarks.reduce((sum, b) => sum + b.percentile, 0) / benchmarks.length,
      });

      return benchmarks;
    } catch (_error) {
      logger.error('Failed to fetch performance benchmarks', { error, period, filter });
      this.performanceMonitor.endOperation(operationId, { errorOccurred: true });
      throw new Error(
        `Failed to fetch performance benchmarks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.performanceMonitor.endOperation(operationId);
    }
  }

  /**
   * Create or update a reporting dashboard
   */
  async createDashboard(dashboard: Omit<ReportingDashboard, 'id'>): Promise<ReportingDashboard> {
    const operationId = this.performanceMonitor.startOperation('reporting_create_dashboard');

    try {
      logger.info('Creating reporting dashboard', { name: dashboard.name });

      const dashboardData = {
        ...dashboard,
        id: this.generateDashboardId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // In a real implementation, this would save to a database
      // For now, we'll simulate the API call
      const response = await this.client.request({
        method: 'POST',
        path: '/reporting/v1/dashboards',
        body: dashboardData,
      });

      const createdDashboard: ReportingDashboard = response.data;

      logger.info('Dashboard created successfully', {
        id: createdDashboard.id,
        name: createdDashboard.name,
        widgetCount: createdDashboard.widgets.length,
      });

      return createdDashboard;
    } catch (_error) {
      logger.error('Failed to create dashboard', { error, name: dashboard.name });
      this.performanceMonitor.endOperation(operationId, { errorOccurred: true });
      throw new Error(
        `Failed to create dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.performanceMonitor.endOperation(operationId);
    }
  }

  /**
   * Export report data
   */
  async exportReport(
    format: 'csv' | 'json' | 'xlsx',
    metrics: string[],
    period: ReportingPeriod,
    filter?: ReportingFilter,
  ): Promise<{ data: any; filename: string; contentType: string }> {
    const operationId = this.performanceMonitor.startOperation('reporting_export');

    try {
      logger.info('Exporting report data', { format, metrics, period, filter });

      const timeSeriesData = await this.getTimeSeriesData(metrics, period, filter);
      const summary = await this.getTrafficSummary(period, filter);

      const exportData = {
        summary,
        timeSeries: timeSeriesData,
        period,
        filter,
        exportedAt: new Date().toISOString(),
      };

      const filename = this.generateExportFilename(format, period);
      const contentType = this.getContentType(format);

      let processedData: any;

      switch (format) {
        case 'csv':
          processedData = this.convertToCSV(exportData);
          break;
        case 'json':
          processedData = JSON.stringify(exportData, null, 2);
          break;
        case 'xlsx':
          processedData = this.convertToExcel(exportData);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      logger.info('Report exported successfully', {
        format,
        filename,
        dataSize: JSON.stringify(exportData).length,
      });

      return {
        data: processedData,
        filename,
        contentType,
      };
    } catch (_error) {
      logger.error('Failed to export report', { error, format, metrics, period, filter });
      this.performanceMonitor.endOperation(operationId, { errorOccurred: true });
      throw new Error(
        `Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.performanceMonitor.endOperation(operationId);
    }
  }

  /**
   * Set up real-time monitoring alerts
   */
  async configureAlerts(thresholds: AlertThreshold[]): Promise<void> {
    const operationId = this.performanceMonitor.startOperation('reporting_configure_alerts');

    try {
      logger.info('Configuring monitoring alerts', { thresholdCount: thresholds.length });

      const alertConfig = {
        thresholds,
        updatedAt: new Date().toISOString(),
      };

      await this.client.request({
        method: 'PUT',
        path: '/reporting/v1/alerts/configuration',
        body: alertConfig,
      });

      logger.info('Alerts configured successfully', {
        enabledAlerts: thresholds.filter((t) => t.enabled).length,
        totalAlerts: thresholds.length,
      });
    } catch (_error) {
      logger.error('Failed to configure alerts', { error, thresholds });
      this.performanceMonitor.endOperation(operationId, { errorOccurred: true });
      throw new Error(
        `Failed to configure alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.performanceMonitor.endOperation(operationId);
    }
  }

  // Private helper methods

  private buildReportingParams(
    period: ReportingPeriod,
    filter?: ReportingFilter,
  ): Record<string, any> {
    const params: Record<string, any> = {
      start: period.start,
      end: period.end,
      granularity: period.granularity,
    };

    if (filter) {
      if (filter.cpCodes?.length) {
        params.cpCodes = filter.cpCodes.join(',');
      }
      if (filter.hostnames?.length) {
        params.hostnames = filter.hostnames.join(',');
      }
      if (filter.countries?.length) {
        params.countries = filter.countries.join(',');
      }
      if (filter.regions?.length) {
        params.regions = filter.regions.join(',');
      }
      if (filter.httpStatus?.length) {
        params.httpStatus = filter.httpStatus.join(',');
      }
      if (filter.cacheStatus?.length) {
        params.cacheStatus = filter.cacheStatus.join(',');
      }
    }

    return params;
  }

  private async fetchMetric(
    metric: string,
    params: Record<string, any>,
  ): Promise<ReportingMetric[]> {
    const response = await this.client.request({
      method: 'GET',
      path: `/reporting/v1/reports/${metric}`,
      queryParams: params,
    });

    return response.data.map((item: any) => ({
      timestamp: item.datetime,
      value: item.value,
      unit: item.unit,
      dimensions: item.dimensions,
    }));
  }

  private aggregateMetric(data: ReportingMetric[], method: 'sum' | 'avg' | 'max' | 'min'): number {
    if (!data || data.length === 0) {
return 0;
}

    const values = data.map((d) => d.value);

    switch (method) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      default:
        return 0;
    }
  }

  private calculateBandwidthSavings(
    currentBandwidth: number,
    currentRatio: number,
    targetRatio: number,
  ): number {
    const improvement = (targetRatio - currentRatio) / 100;
    return currentBandwidth * improvement * 0.1; // Simplified calculation
  }

  private calculateOriginSavings(
    originRequests: number,
    currentRatio: number,
    targetRatio: number,
  ): number {
    const improvement = (targetRatio - currentRatio) / 100;
    return originRequests * improvement * 0.001; // Cost per request
  }

  private calculateVarianceSavings(bandwidth: number, variance: number): number {
    return bandwidth * (variance / 100) * 0.05; // Simplified calculation
  }

  private analyzePeakTraffic(timeSeriesData: Record<string, ReportingMetric[]>): {
    peakVariance: number;
  } {
    const bandwidthData = timeSeriesData.bandwidth || [];
    if (bandwidthData.length === 0) {
return { peakVariance: 0 };
}

    const values = bandwidthData.map((d) => d.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const peak = Math.max(...values);

    return {
      peakVariance: ((peak - average) / average) * 100,
    };
  }

  private calculatePercentile(current: number, benchmark: number, lowerIsBetter = false): number {
    if (lowerIsBetter) {
      return Math.max(0, Math.min(100, 100 - ((current - benchmark) / benchmark) * 100));
    } else {
      return Math.max(0, Math.min(100, (current / benchmark) * 100));
    }
  }

  private async calculateTrend(
    _metric: string,
    _period: ReportingPeriod,
  ): Promise<'improving' | 'stable' | 'degrading'> {
    // Simplified trend calculation - would use historical data comparison
    return 'stable';
  }

  private generateDashboardId(): string {
    return `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExportFilename(format: string, period: ReportingPeriod): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    return `akamai_report_${period.start}_${period.end}_${timestamp}.${format}`;
  }

  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      csv: 'text/csv',
      json: 'application/json',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return contentTypes[format] || 'application/octet-stream';
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    const lines = ['Metric,Value,Unit,Timestamp'];

    // Add summary data
    lines.push(`Bandwidth,${data.summary.bandwidth},bytes,${data.period.start}`);
    lines.push(`Requests,${data.summary.requests},count,${data.period.start}`);
    lines.push(`Cache Hit Ratio,${data.summary.cacheHitRatio},%,${data.period.start}`);
    lines.push(`Error Rate,${data.summary.errorRate},%,${data.period.start}`);

    return lines.join('\n');
  }

  private convertToExcel(data: any): any {
    // This would require a proper Excel library like 'xlsx'
    // For now, return JSON as placeholder
    return JSON.stringify(data, null, 2);
  }
}
