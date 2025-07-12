/**
 * Akamai Operation Metrics Utility
 * 
 * Extracted from AkamaiOperation for better maintainability
 * Provides metrics collection and reporting for operation performance
 */

import { getGlobalCache } from '../services/cache';

/**
 * Operation execution metrics
 */
interface OperationMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  cacheHits: number;
  cacheMisses: number;
  lastExecuted?: Date;
  errors: Array<{
    timestamp: Date;
    error: string;
    domain: string;
    operation: string;
  }>;
}

/**
 * Global metrics storage
 */
const operationMetrics = new Map<string, OperationMetrics>();

/**
 * Initialize metrics for an operation
 */
function initializeMetrics(key: string): OperationMetrics {
  if (!operationMetrics.has(key)) {
    operationMetrics.set(key, {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: []
    });
  }
  return operationMetrics.get(key)!;
}

/**
 * Record successful operation execution
 */
export function recordOperationSuccess(domain: string, operation: string, executionTime: number, fromCache: boolean = false): void {
  const key = `${domain}:${operation}`;
  const metrics = initializeMetrics(key);
  
  metrics.totalExecutions++;
  metrics.successfulExecutions++;
  metrics.totalExecutionTime += executionTime;
  metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalExecutions;
  metrics.lastExecuted = new Date();
  
  if (fromCache) {
    metrics.cacheHits++;
  } else {
    metrics.cacheMisses++;
  }
}

/**
 * Record failed operation execution
 */
export function recordOperationFailure(domain: string, operation: string, error: string, executionTime: number): void {
  const key = `${domain}:${operation}`;
  const metrics = initializeMetrics(key);
  
  metrics.totalExecutions++;
  metrics.failedExecutions++;
  metrics.totalExecutionTime += executionTime;
  metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalExecutions;
  metrics.lastExecuted = new Date();
  
  // Store error details (keep last 10 errors)
  metrics.errors.unshift({
    timestamp: new Date(),
    error,
    domain,
    operation
  });
  
  if (metrics.errors.length > 10) {
    metrics.errors = metrics.errors.slice(0, 10);
  }
}

/**
 * Get metrics for all operations
 */
export function getAllMetrics(): Record<string, any> {
  const allMetrics: Record<string, any> = {};
  
  // Convert Map to Object for better JSON serialization
  for (const [key, metrics] of operationMetrics.entries()) {
    allMetrics[key] = {
      ...metrics,
      successRate: metrics.totalExecutions > 0 ? (metrics.successfulExecutions / metrics.totalExecutions) * 100 : 0,
      cacheHitRate: (metrics.cacheHits + metrics.cacheMisses) > 0 ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100 : 0
    };
  }
  
  // Add global statistics
  const globalStats = {
    totalOperations: operationMetrics.size,
    totalExecutions: Array.from(operationMetrics.values()).reduce((sum, m) => sum + m.totalExecutions, 0),
    totalSuccesses: Array.from(operationMetrics.values()).reduce((sum, m) => sum + m.successfulExecutions, 0),
    totalFailures: Array.from(operationMetrics.values()).reduce((sum, m) => sum + m.failedExecutions, 0),
    averageExecutionTime: 0,
    globalCacheHitRate: 0
  };
  
  globalStats.averageExecutionTime = Array.from(operationMetrics.values())
    .reduce((sum, m) => sum + m.averageExecutionTime, 0) / operationMetrics.size || 0;
  
  const totalCacheOperations = Array.from(operationMetrics.values())
    .reduce((sum, m) => sum + m.cacheHits + m.cacheMisses, 0);
  const totalCacheHits = Array.from(operationMetrics.values())
    .reduce((sum, m) => sum + m.cacheHits, 0);
  
  globalStats.globalCacheHitRate = totalCacheOperations > 0 ? (totalCacheHits / totalCacheOperations) * 100 : 0;
  
  return {
    global: globalStats,
    operations: allMetrics
  };
}

/**
 * Get metrics for a specific operation
 */
export function getOperationMetrics(domain: string, operation: string): OperationMetrics | undefined {
  const key = `${domain}:${operation}`;
  return operationMetrics.get(key);
}

/**
 * Get metrics summary by domain
 */
export function getMetricsByDomain(domain: string): Record<string, any> {
  const domainMetrics: Record<string, any> = {};
  
  for (const [key, metrics] of operationMetrics.entries()) {
    if (key.startsWith(`${domain}:`)) {
      const operation = key.split(':')[1];
      domainMetrics[operation] = {
        ...metrics,
        successRate: metrics.totalExecutions > 0 ? (metrics.successfulExecutions / metrics.totalExecutions) * 100 : 0,
        cacheHitRate: (metrics.cacheHits + metrics.cacheMisses) > 0 ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100 : 0
      };
    }
  }
  
  return domainMetrics;
}

/**
 * Clear all metrics data
 */
export function clearAllMetrics(): void {
  operationMetrics.clear();
}

/**
 * Clear all cached data across all domains
 */
export async function clearAllCaches(): Promise<void> {
  const cache = getGlobalCache();
  if (cache) {
    await cache.flushAll();
  }
}

/**
 * Get performance insights
 */
export function getPerformanceInsights(): Array<{
  type: 'warning' | 'info' | 'error';
  message: string;
  metric?: string;
  value?: number;
}> {
  const insights: Array<{ type: 'warning' | 'info' | 'error'; message: string; metric?: string; value?: number }> = [];
  const allMetrics = getAllMetrics();
  
  // Check for slow operations
  for (const [operation, metrics] of Object.entries(allMetrics.operations)) {
    if (metrics.averageExecutionTime > 5000) { // 5 seconds
      insights.push({
        type: 'warning',
        message: `Operation ${operation} has high average execution time`,
        metric: 'averageExecutionTime',
        value: metrics.averageExecutionTime
      });
    }
    
    // Check for high failure rates
    if (metrics.successRate < 90 && metrics.totalExecutions > 5) {
      insights.push({
        type: 'error',
        message: `Operation ${operation} has low success rate`,
        metric: 'successRate',
        value: metrics.successRate
      });
    }
    
    // Check for low cache hit rates
    if (metrics.cacheHitRate < 50 && (metrics.cacheHits + metrics.cacheMisses) > 10) {
      insights.push({
        type: 'warning',
        message: `Operation ${operation} has low cache hit rate`,
        metric: 'cacheHitRate',
        value: metrics.cacheHitRate
      });
    }
  }
  
  // Global insights
  if (allMetrics.global.globalCacheHitRate < 30) {
    insights.push({
      type: 'warning',
      message: 'Global cache hit rate is low - consider reviewing cache strategies',
      metric: 'globalCacheHitRate',
      value: allMetrics.global.globalCacheHitRate
    });
  }
  
  return insights;
}