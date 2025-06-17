import { EdgeGridClient } from '../utils/edgegrid-client';
import { logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performance-monitor';

export interface TrafficPattern {
  type: 'peak' | 'valley' | 'spike' | 'trend' | 'seasonality';
  startTime: string;
  endTime: string;
  magnitude: number;
  description: string;
  confidence: number;
}

export interface TrafficForecast {
  timestamp: string;
  predictedValue: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
}

export interface BandwidthAnalysis {
  totalBandwidth: number;
  peakBandwidth: number;
  averageBandwidth: number;
  patterns: TrafficPattern[];
  topConsumers: {
    hostname: string;
    bandwidth: number;
    percentage: number;
  }[];
  regionBreakdown: {
    region: string;
    bandwidth: number;
    percentage: number;
  }[];
  contentTypeBreakdown: {
    contentType: string;
    bandwidth: number;
    percentage: number;
  }[];
  recommendations: string[];
}

export interface RequestAnalysis {
  totalRequests: number;
  peakRequests: number;
  averageRequests: number;
  requestTypes: {
    method: string;
    count: number;
    percentage: number;
  }[];
  statusCodeDistribution: {
    statusCode: string;
    count: number;
    percentage: number;
  }[];
  topEndpoints: {
    endpoint: string;
    requests: number;
    percentage: number;
  }[];
  botTraffic: {
    percentage: number;
    requests: number;
    topBots: string[];
  };
}

export interface CacheAnalysisDetailed {
  hitRatio: number;
  missRatio: number;
  refreshHitRatio: number;
  missReasons: {
    reason: string;
    count: number;
    percentage: number;
  }[];
  cacheableContent: {
    contentType: string;
    hitRatio: number;
    volume: number;
  }[];
  optimizationOpportunities: {
    type: 'ttl_increase' | 'cache_headers' | 'content_optimization';
    description: string;
    potentialImprovement: number;
    effort: 'low' | 'medium' | 'high';
  }[];
}

export interface SecurityAnalysis {
  threatEvents: {
    type: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
  attackPatterns: {
    pattern: string;
    frequency: number;
    blocked: number;
    allowed: number;
  }[];
  geoThreats: {
    country: string;
    threatScore: number;
    events: number;
  }[];
  recommendations: string[];
}

export class TrafficAnalyticsService {
  private client: EdgeGridClient;
  private performanceMonitor: PerformanceMonitor;

  constructor(customer: string = 'default') {
    this.client = EdgeGridClient.getInstance(customer);
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Analyze bandwidth usage patterns and optimization opportunities
   */
  async analyzeBandwidthUsage(
    period: { start: string; end: string; granularity: string },
    filter?: any,
    includeProjections: boolean = false
  ): Promise<BandwidthAnalysis> {
    const operationId = this.performanceMonitor.startOperation('analytics_bandwidth_analysis');
    
    try {
      logger.info('Analyzing bandwidth usage', { period, filter, includeProjections });

      // Fetch bandwidth data with different dimensions
      const [
        timeSeriesData,
        hostnameBreakdown,
        regionBreakdown,
        contentTypeBreakdown
      ] = await Promise.all([
        this.fetchBandwidthTimeSeries(period, filter),
        this.fetchBandwidthByHostname(period, filter),
        this.fetchBandwidthByRegion(period, filter),
        this.fetchBandwidthByContentType(period, filter)
      ]);

      // Calculate basic metrics
      const values = timeSeriesData.map(d => d.value);
      const totalBandwidth = values.reduce((sum, val) => sum + val, 0);
      const peakBandwidth = Math.max(...values);
      const averageBandwidth = totalBandwidth / values.length;

      // Detect patterns
      const patterns = this.detectTrafficPatterns(timeSeriesData);

      // Identify top consumers
      const topConsumers = hostnameBreakdown
        .sort((a, b) => b.bandwidth - a.bandwidth)
        .slice(0, 10)
        .map(item => ({
          hostname: item.hostname,
          bandwidth: item.bandwidth,
          percentage: (item.bandwidth / totalBandwidth) * 100
        }));

      // Process region breakdown
      const regionData = regionBreakdown.map(item => ({
        region: item.region,
        bandwidth: item.bandwidth,
        percentage: (item.bandwidth / totalBandwidth) * 100
      }));

      // Process content type breakdown
      const contentTypeData = contentTypeBreakdown.map(item => ({
        contentType: item.contentType,
        bandwidth: item.bandwidth,
        percentage: (item.bandwidth / totalBandwidth) * 100
      }));

      // Generate recommendations
      const recommendations = this.generateBandwidthRecommendations({
        patterns,
        topConsumers,
        regionData,
        contentTypeData,
        peakBandwidth,
        averageBandwidth
      });

      const analysis: BandwidthAnalysis = {
        totalBandwidth,
        peakBandwidth,
        averageBandwidth,
        patterns,
        topConsumers,
        regionBreakdown: regionData,
        contentTypeBreakdown: contentTypeData,
        recommendations
      };

      logger.info('Bandwidth analysis completed', {
        totalBandwidth,
        patternCount: patterns.length,
        topConsumerCount: topConsumers.length,
        recommendationCount: recommendations.length
      });

      return analysis;

    } catch (error) {
      logger.error('Failed to analyze bandwidth usage', { error, period, filter });
      this.performanceMonitor.endOperation(operationId, { errorOccurred: true });
      throw new Error(`Failed to analyze bandwidth usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.performanceMonitor.endOperation(operationId);
    }
  }

  /**
   * Analyze traffic trends and generate forecasts
   */
  async analyzeTrafficTrends(
    period: { start: string; end: string; granularity: string },
    comparisonPeriod?: { start: string; end: string },
    includeForecasting: boolean = false
  ): Promise<{
    trends: TrafficPattern[];
    growth: { metric: string; rate: number; trend: 'increasing' | 'decreasing' | 'stable' }[];
    seasonality: { pattern: string; strength: number; period: string }[];
    anomalies: { timestamp: string; metric: string; deviation: number; severity: string }[];
    forecasts?: TrafficForecast[];
  }> {
    const operationId = this.performanceMonitor.startOperation('analytics_traffic_trends');
    
    try {
      logger.info('Analyzing traffic trends', { period, comparisonPeriod, includeForecasting });

      // Fetch traffic data
      const [bandwidthData, requestData, errorData] = await Promise.all([
        this.fetchBandwidthTimeSeries(period),
        this.fetchRequestTimeSeries(period),
        this.fetchErrorTimeSeries(period)
      ]);

      // Detect patterns and trends
      const trends = [
        ...this.detectTrafficPatterns(bandwidthData),
        ...this.detectTrafficPatterns(requestData),
        ...this.detectTrafficPatterns(errorData)
      ];

      // Calculate growth rates
      let growth = [];
      if (comparisonPeriod) {
        const [prevBandwidth, prevRequests, prevErrors] = await Promise.all([
          this.fetchBandwidthTimeSeries(comparisonPeriod),
          this.fetchRequestTimeSeries(comparisonPeriod),
          this.fetchErrorTimeSeries(comparisonPeriod)
        ]);

        growth = this.calculateGrowthRates({
          current: { bandwidth: bandwidthData, requests: requestData, errors: errorData },
          previous: { bandwidth: prevBandwidth, requests: prevRequests, errors: prevErrors }
        });
      }

      // Detect seasonality patterns
      const seasonality = this.detectSeasonality(bandwidthData, requestData);

      // Detect anomalies
      const anomalies = this.detectAnomalies(bandwidthData, requestData, errorData);

      // Generate forecasts if requested
      let forecasts = undefined;
      if (includeForecasting) {
        forecasts = await this.generateTrafficForecasts(bandwidthData, period);
      }

      logger.info('Traffic trend analysis completed', {
        trendCount: trends.length,
        growthMetrics: growth.length,
        seasonalityPatterns: seasonality.length,
        anomalyCount: anomalies.length,
        forecastPoints: 0
      });

      return {
        trends,
        growth,
        seasonality,
        anomalies,
        forecasts
      };

    } catch (error) {
      logger.error('Failed to analyze traffic trends', { error, period });
      this.performanceMonitor.endOperation(operationId, { errorOccurred: true });
      throw new Error(`Failed to analyze traffic trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.performanceMonitor.endOperation(operationId);
    }
  }

  /**
   * Perform detailed cache performance analysis
   */
  async analyzeCachePerformance(
    period: { start: string; end: string; granularity: string },
    filter?: any,
    includeRecommendations: boolean = true
  ): Promise<CacheAnalysisDetailed> {
    const operationId = this.performanceMonitor.startOperation('analytics_cache_performance');
    
    try {
      logger.info('Analyzing cache performance', { period, filter, includeRecommendations });

      // Fetch cache-related data
      const [
        cacheMetrics,
        missReasonData,
        contentTypeCache
      ] = await Promise.all([
        this.fetchCacheMetrics(period, filter),
        this.fetchCacheMissReasons(period, filter),
        this.fetchCacheByContentType(period, filter)
      ]);

      // Calculate hit ratios
      const totalRequests = cacheMetrics.hits + cacheMetrics.misses + cacheMetrics.refreshHits;
      const hitRatio = (cacheMetrics.hits / totalRequests) * 100;
      const missRatio = (cacheMetrics.misses / totalRequests) * 100;
      const refreshHitRatio = (cacheMetrics.refreshHits / totalRequests) * 100;

      // Process miss reasons
      const missReasons = missReasonData.map(item => ({
        reason: item.reason,
        count: item.count,
        percentage: (item.count / cacheMetrics.misses) * 100
      }));

      // Process content type cache performance
      const cacheableContent = contentTypeCache.map(item => ({
        contentType: item.contentType,
        hitRatio: (item.hits / (item.hits + item.misses)) * 100,
        volume: item.hits + item.misses
      }));

      // Generate optimization opportunities
      let optimizationOpportunities = [];
      if (includeRecommendations) {
        optimizationOpportunities = this.generateCacheOptimizations({
          hitRatio,
          missReasons,
          cacheableContent
        });
      }

      const analysis: CacheAnalysisDetailed = {
        hitRatio,
        missRatio,
        refreshHitRatio,
        missReasons,
        cacheableContent,
        optimizationOpportunities
      };

      logger.info('Cache performance analysis completed', {
        hitRatio,
        missReasonCount: missReasons.length,
        contentTypes: cacheableContent.length,
        optimizationCount: optimizationOpportunities.length
      });

      return analysis;

    } catch (error) {
      logger.error('Failed to analyze cache performance', { error, period, filter });
      this.performanceMonitor.endOperation(operationId, { errorOccurred: true });
      throw new Error(`Failed to analyze cache performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.performanceMonitor.endOperation(operationId);
    }
  }

  /**
   * Analyze request patterns and user behavior
   */
  async analyzeRequestPatterns(
    period: { start: string; end: string; granularity: string },
    filter?: any
  ): Promise<RequestAnalysis> {
    const operationId = this.performanceMonitor.startOperation('analytics_request_patterns');
    
    try {
      logger.info('Analyzing request patterns', { period, filter });

      // Fetch request data
      const [
        requestMetrics,
        methodBreakdown,
        statusCodeData,
        endpointData,
        botData
      ] = await Promise.all([
        this.fetchRequestMetrics(period, filter),
        this.fetchRequestsByMethod(period, filter),
        this.fetchRequestsByStatusCode(period, filter),
        this.fetchTopEndpoints(period, filter),
        this.fetchBotTraffic(period, filter)
      ]);

      const totalRequests = requestMetrics.total;
      const peakRequests = requestMetrics.peak;
      const averageRequests = requestMetrics.average;

      // Process request types
      const requestTypes = methodBreakdown.map(item => ({
        method: item.method,
        count: item.count,
        percentage: (item.count / totalRequests) * 100
      }));

      // Process status codes
      const statusCodeDistribution = statusCodeData.map(item => ({
        statusCode: item.statusCode,
        count: item.count,
        percentage: (item.count / totalRequests) * 100
      }));

      // Process top endpoints
      const topEndpoints = endpointData.map(item => ({
        endpoint: item.endpoint,
        requests: item.requests,
        percentage: (item.requests / totalRequests) * 100
      }));

      // Process bot traffic
      const botTraffic = {
        percentage: (botData.total / totalRequests) * 100,
        requests: botData.total,
        topBots: botData.topBots
      };

      const analysis: RequestAnalysis = {
        totalRequests,
        peakRequests,
        averageRequests,
        requestTypes,
        statusCodeDistribution,
        topEndpoints,
        botTraffic
      };

      logger.info('Request pattern analysis completed', {
        totalRequests,
        methodTypes: requestTypes.length,
        statusCodes: statusCodeDistribution.length,
        topEndpointsCount: topEndpoints.length,
        botPercentage: botTraffic.percentage
      });

      return analysis;

    } catch (error) {
      logger.error('Failed to analyze request patterns', { error, period, filter });
      this.performanceMonitor.endOperation(operationId, { errorOccurred: true });
      throw new Error(`Failed to analyze request patterns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.performanceMonitor.endOperation(operationId);
    }
  }

  // Private helper methods

  private async fetchBandwidthTimeSeries(period: any, filter?: any): Promise<any[]> {
    // Simulate API call to Akamai Reporting API
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/bandwidth',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchBandwidthByHostname(period: any, filter?: any): Promise<any[]> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/bandwidth-by-hostname',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchBandwidthByRegion(period: any, filter?: any): Promise<any[]> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/bandwidth-by-region',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchBandwidthByContentType(period: any, filter?: any): Promise<any[]> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/bandwidth-by-content-type',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchRequestTimeSeries(period: any, filter?: any): Promise<any[]> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/requests',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchErrorTimeSeries(period: any, filter?: any): Promise<any[]> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/errors',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchCacheMetrics(period: any, filter?: any): Promise<any> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/cache-metrics',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchCacheMissReasons(period: any, filter?: any): Promise<any[]> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/cache-miss-reasons',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchCacheByContentType(period: any, filter?: any): Promise<any[]> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/cache-by-content-type',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchRequestMetrics(period: any, filter?: any): Promise<any> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/request-metrics',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchRequestsByMethod(period: any, filter?: any): Promise<any[]> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/requests-by-method',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchRequestsByStatusCode(period: any, filter?: any): Promise<any[]> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/requests-by-status',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchTopEndpoints(period: any, filter?: any): Promise<any[]> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/top-endpoints',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private async fetchBotTraffic(period: any, filter?: any): Promise<any> {
    const response = await this.client.request({
      method: 'GET',
      path: '/reporting/v1/reports/bot-traffic',
      queryParams: { ...period, ...filter }
    });
    return response.data;
  }

  private detectTrafficPatterns(timeSeriesData: any[]): TrafficPattern[] {
    // Simplified pattern detection algorithm
    const patterns: TrafficPattern[] = [];
    
    if (timeSeriesData.length === 0) return patterns;

    const values = timeSeriesData.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

    // Detect spikes (values > mean + 2 * stdDev)
    timeSeriesData.forEach((dataPoint) => {
      if (dataPoint.value > mean + 2 * stdDev) {
        patterns.push({
          type: 'spike',
          startTime: dataPoint.timestamp,
          endTime: dataPoint.timestamp,
          magnitude: (dataPoint.value - mean) / stdDev,
          description: `Traffic spike detected: ${((dataPoint.value - mean) / mean * 100).toFixed(1)}% above average`,
          confidence: 0.8
        });
      }
    });

    return patterns;
  }

  private calculateGrowthRates(data: any): any[] {
    // Simplified growth rate calculation
    const growth = [];
    
    const currentTotal = data.current.bandwidth.reduce((sum: number, d: any) => sum + d.value, 0);
    const previousTotal = data.previous.bandwidth.reduce((sum: number, d: any) => sum + d.value, 0);
    
    const bandwidthGrowth = ((currentTotal - previousTotal) / previousTotal) * 100;
    
    growth.push({
      metric: 'bandwidth',
      rate: bandwidthGrowth,
      trend: bandwidthGrowth > 5 ? 'increasing' : bandwidthGrowth < -5 ? 'decreasing' : 'stable'
    });

    return growth;
  }

  private detectSeasonality(_bandwidthData: any[], _requestData: any[]): any[] {
    // Simplified seasonality detection
    return [
      {
        pattern: 'Daily peak hours',
        strength: 0.7,
        period: '24h'
      }
    ];
  }

  private detectAnomalies(bandwidthData: any[], _requestData: any[], _errorData: any[]): any[] {
    // Simplified anomaly detection
    const anomalies: any[] = [];
    
    const bandwidthMean = bandwidthData.reduce((sum, d) => sum + d.value, 0) / bandwidthData.length;
    const bandwidthStdDev = Math.sqrt(bandwidthData.reduce((sum, d) => sum + Math.pow(d.value - bandwidthMean, 2), 0) / bandwidthData.length);

    bandwidthData.forEach(dataPoint => {
      const deviation = Math.abs(dataPoint.value - bandwidthMean) / bandwidthStdDev;
      if (deviation > 3) {
        anomalies.push({
          timestamp: dataPoint.timestamp,
          metric: 'bandwidth',
          deviation: deviation,
          severity: deviation > 4 ? 'high' : 'medium'
        });
      }
    });

    return anomalies;
  }

  private async generateTrafficForecasts(timeSeriesData: any[], _period: any): Promise<TrafficForecast[]> {
    // Simplified forecasting - would use proper time series forecasting algorithms
    const forecasts: TrafficForecast[] = [];
    
    if (timeSeriesData.length === 0) return forecasts;

    const values = timeSeriesData.map(d => d.value);
    const trend = this.calculateLinearTrend(values);
    const lastValue = values[values.length - 1];
    const lastTimestamp = new Date(timeSeriesData[timeSeriesData.length - 1].timestamp);

    // Generate forecasts for next 24 hours
    for (let i = 1; i <= 24; i++) {
      const forecastTimestamp = new Date(lastTimestamp.getTime() + i * 60 * 60 * 1000);
      const predictedValue = lastValue + (trend * i);
      const confidence = Math.max(0.5, 0.9 - (i * 0.02)); // Confidence decreases over time
      
      forecasts.push({
        timestamp: forecastTimestamp.toISOString(),
        predictedValue,
        confidence,
        upperBound: predictedValue * (1 + (1 - confidence)),
        lowerBound: predictedValue * (1 - (1 - confidence))
      });
    }

    return forecasts;
  }

  private calculateLinearTrend(values: number[]): number {
    // Simple linear regression to calculate trend
    const n = values.length;
    if (n < 2) return 0;

    const xSum = (n * (n - 1)) / 2;
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, index) => sum + val * index, 0);
    const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);
    return slope;
  }

  private generateBandwidthRecommendations(analysisData: any): string[] {
    const recommendations = [];

    // Check for high peak variance
    if (analysisData.peakBandwidth > analysisData.averageBandwidth * 3) {
      recommendations.push('Consider implementing adaptive caching during peak hours to reduce bandwidth spikes');
    }

    // Check for content type optimization
    const imagePercentage = analysisData.contentTypeData.find((ct: any) => ct.contentType === 'image')?.percentage || 0;
    if (imagePercentage > 40) {
      recommendations.push('Implement image optimization and compression to reduce bandwidth usage');
    }

    // Check for geographic optimization
    const maxRegionPercentage = Math.max(...analysisData.regionData.map((r: any) => r.percentage));
    if (maxRegionPercentage > 60) {
      recommendations.push('Consider edge server optimization for the dominant geographic region');
    }

    return recommendations;
  }

  private generateCacheOptimizations(cacheData: any): any[] {
    const optimizations = [];

    if (cacheData.hitRatio < 80) {
      optimizations.push({
        type: 'ttl_increase',
        description: 'Increase TTL for static content to improve cache hit ratio',
        potentialImprovement: (85 - cacheData.hitRatio),
        effort: 'low'
      });
    }

    const nocacheReason = cacheData.missReasons.find((r: any) => r.reason === 'no-cache');
    if (nocacheReason && nocacheReason.percentage > 20) {
      optimizations.push({
        type: 'cache_headers',
        description: 'Review and optimize cache control headers to reduce no-cache responses',
        potentialImprovement: nocacheReason.percentage * 0.7,
        effort: 'medium'
      });
    }

    return optimizations;
  }
}