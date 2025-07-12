/**
 * Reporting API Implementation Details
 * 
 * Contains endpoints, schemas, and formatters for reporting tools
 */

import { z } from 'zod';

/**
 * Reporting API Endpoints
 */
export const ReportingEndpoints = {
  // Traffic reports
  trafficByProperty: (propertyId: string) => `/reporting-api/v1/reports/traffic/property/${propertyId}`,
  trafficByCpCode: () => '/reporting-api/v1/reports/traffic/cpcode',
  trafficByGeography: () => '/reporting-api/v1/reports/traffic/geography',
  
  // Performance reports
  performanceByProperty: (propertyId: string) => `/reporting-api/v1/reports/performance/property/${propertyId}`,
  performanceByUrl: () => '/reporting-api/v1/reports/performance/url',
  
  // Error reports
  errorsByProperty: (propertyId: string) => `/reporting-api/v1/reports/errors/property/${propertyId}`,
  errorsByStatusCode: () => '/reporting-api/v1/reports/errors/status-codes',
  
  // Origin reports
  originPerformance: () => '/reporting-api/v1/reports/origin/performance',
  originErrors: () => '/reporting-api/v1/reports/origin/errors',
  
  // Report types
  availableReports: () => '/reporting-api/v1/reports'
};

/**
 * Reporting Tool Schemas
 */
export const ReportingToolSchemas = {
  trafficByProperty: z.object({
    propertyId: z.string(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    interval: z.enum(['5min', 'hour', 'day', 'week', 'month']).optional(),
    metrics: z.array(z.enum(['bandwidth', 'requests', 'hits', 'offload'])).optional(),
    customer: z.string().optional(),
    format: z.enum(['json', 'text']).optional()
  }),
  
  trafficByCpCode: z.object({
    cpCodes: z.array(z.string()),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    interval: z.enum(['5min', 'hour', 'day', 'week', 'month']).optional(),
    metrics: z.array(z.enum(['bandwidth', 'requests', 'hits', 'offload'])).optional(),
    customer: z.string().optional(),
    format: z.enum(['json', 'text']).optional()
  }),
  
  trafficByGeography: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    country: z.string().optional(),
    propertyId: z.string().optional(),
    cpCodes: z.array(z.string()).optional(),
    customer: z.string().optional(),
    format: z.enum(['json', 'text']).optional()
  }),
  
  performanceReport: z.object({
    propertyId: z.string(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    metrics: z.array(z.enum(['avgOriginTime', 'avgDownloadTime', 'cacheHitRate', 'availability'])).optional(),
    customer: z.string().optional(),
    format: z.enum(['json', 'text']).optional()
  }),
  
  errorReport: z.object({
    propertyId: z.string(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    statusCodes: z.array(z.string()).optional(),
    groupBy: z.enum(['statusCode', 'url', 'userAgent']).optional(),
    customer: z.string().optional(),
    format: z.enum(['json', 'text']).optional()
  })
};

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format traffic report response
 */
export function formatTrafficReport(response: any, args: any): string {
  const data = (response as any).data || [];
  
  let text = `**Traffic Report**\n\n`;
  text += `**Period:** ${args.startDate} to ${args.endDate}\n`;
  
  if (args.propertyId) {
    text += `**Property:** ${args.propertyId}\n`;
  }
  
  if (data.length === 0) {
    text += '\n**Warning:** No traffic data found for the specified period.\n';
    return text;
  }
  
  text += `\n**Summary:**\n`;
  
  // Calculate totals
  const totals = data.reduce((acc: any, point: any) => {
    acc.bandwidth += point.bandwidth || 0;
    acc.requests += point.requests || 0;
    acc.hits += point.hits || 0;
    return acc;
  }, { bandwidth: 0, requests: 0, hits: 0 });
  
  text += `• Total Bandwidth: ${formatBytes(totals.bandwidth)}\n`;
  text += `• Total Requests: ${totals.requests.toLocaleString()}\n`;
  text += `• Total Hits: ${totals.hits.toLocaleString()}\n`;
  
  const offloadRate = totals.requests > 0 ? ((totals.hits / totals.requests) * 100).toFixed(2) : '0';
  text += `• Offload Rate: ${offloadRate}%\n`;
  
  // Show top data points
  text += `\n**Top Traffic Periods:**\n`;
  const topPeriods = data
    .sort((a: any, b: any) => b.bandwidth - a.bandwidth)
    .slice(0, 5);
    
  topPeriods.forEach((point: any) => {
    text += `• ${point.time}: ${formatBytes(point.bandwidth)} (${point.requests.toLocaleString()} requests)\n`;
  });
  
  return text;
}

/**
 * Format performance report response
 */
export function formatPerformanceReport(response: any, args: any): string {
  const data = (response as any).data || [];
  
  let text = `**Performance Report**\n\n`;
  text += `**Property:** ${args.propertyId}\n`;
  text += `**Period:** ${args.startDate} to ${args.endDate}\n`;
  
  if (data.length === 0) {
    text += '\n**Warning:** No performance data found for the specified period.\n';
    return text;
  }
  
  // Calculate averages
  const avgMetrics = data.reduce((acc: any, point: any) => {
    acc.count++;
    acc.originTime += point.avgOriginTime || 0;
    acc.downloadTime += point.avgDownloadTime || 0;
    acc.cacheHitRate += point.cacheHitRate || 0;
    return acc;
  }, { count: 0, originTime: 0, downloadTime: 0, cacheHitRate: 0 });
  
  text += `\n**Average Metrics:**\n`;
  text += `• Origin Response Time: ${(avgMetrics.originTime / avgMetrics.count).toFixed(0)}ms\n`;
  text += `• Download Time: ${(avgMetrics.downloadTime / avgMetrics.count).toFixed(0)}ms\n`;
  text += `• Cache Hit Rate: ${(avgMetrics.cacheHitRate / avgMetrics.count).toFixed(2)}%\n`;
  
  // Performance insights
  const avgCacheHit = avgMetrics.cacheHitRate / avgMetrics.count;
  if (avgCacheHit < 80) {
    text += `\n**Performance Alert:** Cache hit rate is below 80%. Consider optimizing cache settings.\n`;
  }
  
  const avgOrigin = avgMetrics.originTime / avgMetrics.count;
  if (avgOrigin > 1000) {
    text += `\n**Performance Alert:** Origin response time exceeds 1 second. Check origin server performance.\n`;
  }
  
  return text;
}

/**
 * Format error report response
 */
export function formatErrorReport(response: any, args: any): string {
  const errors = (response as any).errors || [];
  
  let text = `**Error Report**\n\n`;
  text += `**Property:** ${args.propertyId}\n`;
  text += `**Period:** ${args.startDate} to ${args.endDate}\n`;
  
  if (errors.length === 0) {
    text += '\n**Success:** No errors found for the specified period.\n';
    return text;
  }
  
  // Group errors by status code
  const byStatusCode: { [key: string]: number } = {};
  let totalErrors = 0;
  
  errors.forEach((error: any) => {
    const code = (error as any).statusCode || 'Unknown';
    byStatusCode[code] = (byStatusCode[code] || 0) + (error as any).count;
    totalErrors += (error as any).count;
  });
  
  text += `\n**Total Errors:** ${totalErrors.toLocaleString()}\n`;
  text += `\n**Errors by Status Code:**\n`;
  
  Object.entries(byStatusCode)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([code, count]) => {
      const percentage = ((count / totalErrors) * 100).toFixed(2);
      text += `• ${code}: ${count.toLocaleString()} (${percentage}%)\n`;
    });
    
  // Show top error URLs if available
  if (args.groupBy === 'url' && errors[0]?.url) {
    text += `\n**Top Error URLs:**\n`;
    errors.slice(0, 5).forEach((error: any) => {
      text += `• ${error.url}: ${(error as any).count.toLocaleString()} errors\n`;
    });
  }
  
  return text;
}

/**
 * Format geography report response
 */
export function formatGeographyReport(response: any): string {
  const data = (response as any).data || [];
  
  let text = `**Geographic Traffic Report**\n\n`;
  
  if (data.length === 0) {
    text += '**Warning:** No geographic data found.\n';
    return text;
  }
  
  // Sort by traffic volume
  const topCountries = data
    .sort((a: any, b: any) => b.bandwidth - a.bandwidth)
    .slice(0, 20);
    
  text += `**Top Countries by Traffic:**\n`;
  topCountries.forEach((country: any, index: number) => {
    text += `${index + 1}. **${country.country}**\n`;
    text += `   • Bandwidth: ${formatBytes(country.bandwidth)}\n`;
    text += `   • Requests: ${country.requests.toLocaleString()}\n`;
    text += `   • Unique Visitors: ${country.uniqueVisitors?.toLocaleString() || 'N/A'}\n`;
    text += `\n`;
  });
  
  if (data.length > 20) {
    text += `_... and ${data.length - 20} more countries_\n`;
  }
  
  return text;
}