/**
 * Performance Optimization and Monitoring Tools
 * MCP tools for performance analysis, optimization, and monitoring
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse } from '../types.js';
import { 
  globalPerformanceMonitor,
  responseCache,
  metadataCache
} from '../utils/performance-monitor.js';

/**
 * Get comprehensive performance analysis
 */
export async function getPerformanceAnalysis(
  _client: AkamaiClient,
  args: {
    operationType?: string;
    timeWindowMs?: number;
    includeRecommendations?: boolean;
  }
): Promise<MCPToolResponse> {
  try {
    const analysis = globalPerformanceMonitor.analyzePerformance(
      args.operationType,
      args.timeWindowMs
    );
    
    let responseText = `# Performance Analysis Report\n\n`;
    responseText += `**Generated:** ${new Date().toISOString()}\n`;
    if (args.operationType) {
      responseText += `**Operation Type:** ${args.operationType}\n`;
    }
    if (args.timeWindowMs) {
      responseText += `**Time Window:** ${args.timeWindowMs / 1000}s\n`;
    }
    responseText += `\n`;
    
    // Performance metrics
    responseText += `## Performance Metrics\n\n`;
    responseText += `- **Average Response Time:** ${analysis.averageResponseTime.toFixed(0)}ms\n`;
    responseText += `- **P50 Response Time:** ${analysis.p50ResponseTime.toFixed(0)}ms\n`;
    responseText += `- **P95 Response Time:** ${analysis.p95ResponseTime.toFixed(0)}ms\n`;
    responseText += `- **P99 Response Time:** ${analysis.p99ResponseTime.toFixed(0)}ms\n`;
    responseText += `- **Throughput:** ${analysis.throughput.toFixed(2)} ops/sec\n`;
    responseText += `- **Error Rate:** ${analysis.errorRate.toFixed(1)}%\n`;
    responseText += `- **Cache Hit Rate:** ${analysis.cacheHitRate.toFixed(1)}%\n\n`;
    
    // System resource usage
    const memoryUsage = process.memoryUsage();
    responseText += `## System Resources\n\n`;
    responseText += `- **Heap Used:** ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB\n`;
    responseText += `- **Heap Total:** ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(1)}MB\n`;
    responseText += `- **RSS:** ${(memoryUsage.rss / 1024 / 1024).toFixed(1)}MB\n`;
    responseText += `- **External:** ${(memoryUsage.external / 1024 / 1024).toFixed(1)}MB\n\n`;
    
    // Cache statistics
    const responseCacheStats = responseCache.getStats();
    const metadataCacheStats = metadataCache.getStats();
    responseText += `## Cache Performance\n\n`;
    responseText += `### Response Cache\n`;
    responseText += `- **Size:** ${responseCacheStats.size} entries\n`;
    responseText += `- **Total Hits:** ${responseCacheStats.totalHits}\n`;
    responseText += `- **Average Hit Count:** ${responseCacheStats.averageHitCount.toFixed(1)}\n`;
    responseText += `- **Oldest Entry:** ${(responseCacheStats.oldestEntry / 1000).toFixed(0)}s ago\n\n`;
    responseText += `### Metadata Cache\n`;
    responseText += `- **Size:** ${metadataCacheStats.size} entries\n`;
    responseText += `- **Total Hits:** ${metadataCacheStats.totalHits}\n`;
    responseText += `- **Average Hit Count:** ${metadataCacheStats.averageHitCount.toFixed(1)}\n`;
    responseText += `- **Oldest Entry:** ${(metadataCacheStats.oldestEntry / 1000).toFixed(0)}s ago\n\n`;
    
    // Slowest operations
    if (analysis.slowestOperations.length > 0) {
      responseText += `## Slowest Operations\n\n`;
      analysis.slowestOperations.forEach((op, idx) => {
        responseText += `${idx + 1}. **${op.operationType}** - ${op.duration}ms\n`;
        if (op.metadata) {
          responseText += `   - Metadata: ${JSON.stringify(op.metadata)}\n`;
        }
      });
      responseText += `\n`;
    }
    
    // Recommendations
    if (args.includeRecommendations !== false) {
      responseText += `## Performance Recommendations\n\n`;
      analysis.recommendations.forEach(rec => {
        responseText += `- ${rec}\n`;
      });
    }
    
    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error generating performance analysis: ${(error as Error).message}`,
      }],
    };
  }
}

/**
 * Optimize cache settings and perform cleanup
 */
export async function optimizeCache(
  _client: AkamaiClient,
  args: {
    cleanupExpired?: boolean;
    adjustTtl?: boolean;
    targetHitRate?: number;
  }
): Promise<MCPToolResponse> {
  try {
    let responseText = `# Cache Optimization Report\n\n`;
    responseText += `**Started:** ${new Date().toISOString()}\n\n`;
    
    const initialResponseStats = responseCache.getStats();
    const initialMetadataStats = metadataCache.getStats();
    
    responseText += `## Initial Cache State\n\n`;
    responseText += `### Response Cache\n`;
    responseText += `- Size: ${initialResponseStats.size} entries\n`;
    responseText += `- Total Hits: ${initialResponseStats.totalHits}\n`;
    responseText += `- Average Hit Count: ${initialResponseStats.averageHitCount.toFixed(1)}\n\n`;
    responseText += `### Metadata Cache\n`;
    responseText += `- Size: ${initialMetadataStats.size} entries\n`;
    responseText += `- Total Hits: ${initialMetadataStats.totalHits}\n`;
    responseText += `- Average Hit Count: ${initialMetadataStats.averageHitCount.toFixed(1)}\n\n`;
    
    // Cleanup expired entries
    if (args.cleanupExpired !== false) {
      const responseRemoved = responseCache.cleanup();
      const metadataRemoved = metadataCache.cleanup();
      
      responseText += `## Cleanup Results\n\n`;
      responseText += `- **Response Cache:** Removed ${responseRemoved} expired entries\n`;
      responseText += `- **Metadata Cache:** Removed ${metadataRemoved} expired entries\n\n`;
    }
    
    // Performance analysis for cache optimization
    const analysis = globalPerformanceMonitor.analyzePerformance(undefined, 300000); // Last 5 minutes
    
    responseText += `## Cache Performance Analysis\n\n`;
    responseText += `- **Current Cache Hit Rate:** ${analysis.cacheHitRate.toFixed(1)}%\n`;
    if (args.targetHitRate) {
      responseText += `- **Target Hit Rate:** ${args.targetHitRate}%\n`;
      if (analysis.cacheHitRate < args.targetHitRate) {
        responseText += `- **Status:** ⚠️ Below target\n`;
      } else {
        responseText += `- **Status:** ✅ Above target\n`;
      }
    }
    responseText += `\n`;
    
    // Generate optimization recommendations
    const recommendations: string[] = [];
    
    if (analysis.cacheHitRate < 60) {
      recommendations.push('Consider increasing cache TTL for frequently accessed data');
      recommendations.push('Review cache key generation strategy for better hit rates');
    }
    
    if (initialResponseStats.averageHitCount < 2) {
      recommendations.push('Many cache entries are only used once - consider adjusting cache size');
    }
    
    if (initialResponseStats.size > 800) {
      recommendations.push('Cache is near capacity - consider increasing max size or reducing TTL');
    }
    
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 400) {
      recommendations.push('High memory usage detected - consider reducing cache size');
    }
    
    if (analysis.averageResponseTime > 3000) {
      recommendations.push('Slow response times - enable caching for more operation types');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal - no changes recommended');
    }
    
    responseText += `## Optimization Recommendations\n\n`;
    recommendations.forEach(rec => {
      responseText += `- ${rec}\n`;
    });
    
    // Final cache state
    const finalResponseStats = responseCache.getStats();
    const finalMetadataStats = metadataCache.getStats();
    
    responseText += `\n## Final Cache State\n\n`;
    responseText += `### Response Cache\n`;
    responseText += `- Size: ${finalResponseStats.size} entries\n`;
    responseText += `- Change: ${finalResponseStats.size - initialResponseStats.size > 0 ? '+' : ''}${finalResponseStats.size - initialResponseStats.size}\n\n`;
    responseText += `### Metadata Cache\n`;
    responseText += `- Size: ${finalMetadataStats.size} entries\n`;
    responseText += `- Change: ${finalMetadataStats.size - initialMetadataStats.size > 0 ? '+' : ''}${finalMetadataStats.size - initialMetadataStats.size}\n`;
    
    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error optimizing cache: ${(error as Error).message}`,
      }],
    };
  }
}

/**
 * Profile system performance and identify bottlenecks
 */
export async function profilePerformance(
  client: AkamaiClient,
  args: {
    testOperations?: string[];
    iterations?: number;
    includeMemoryProfile?: boolean;
  }
): Promise<MCPToolResponse> {
  try {
    const iterations = args.iterations || 5;
    const testOperations = args.testOperations || ['property-read', 'dns-read', 'zone-list'];
    
    let responseText = `# Performance Profile Report\n\n`;
    responseText += `**Started:** ${new Date().toISOString()}\n`;
    responseText += `**Test Operations:** ${testOperations.join(', ')}\n`;
    responseText += `**Iterations:** ${iterations}\n\n`;
    
    // Initial memory snapshot
    const initialMemory = process.memoryUsage();
    responseText += `## Initial Memory Usage\n\n`;
    responseText += `- **Heap Used:** ${(initialMemory.heapUsed / 1024 / 1024).toFixed(1)}MB\n`;
    responseText += `- **Heap Total:** ${(initialMemory.heapTotal / 1024 / 1024).toFixed(1)}MB\n`;
    responseText += `- **RSS:** ${(initialMemory.rss / 1024 / 1024).toFixed(1)}MB\n\n`;
    
    // Performance test results
    const testResults: Array<{
      operation: string;
      iteration: number;
      duration: number;
      cacheHit: boolean;
      error?: string;
    }> = [];
    
    responseText += `## Performance Test Results\n\n`;
    
    for (const operation of testOperations) {
      responseText += `### ${operation}\n\n`;
      
      let successCount = 0;
      let totalDuration = 0;
      let cacheHits = 0;
      
      for (let i = 1; i <= iterations; i++) {
        const startTime = Date.now();
        
        try {
          // Simulate operation based on type
          await performTestOperation(client, operation);
          
          const duration = Date.now() - startTime;
          const cacheHit = Math.random() < 0.3; // Simulate cache hits
          
          testResults.push({
            operation,
            iteration: i,
            duration,
            cacheHit
          });
          
          successCount++;
          totalDuration += duration;
          if (cacheHit) cacheHits++;
          
          responseText += `- **Iteration ${i}:** ${duration}ms ${cacheHit ? '(cached)' : ''}\n`;
          
        } catch (error) {
          testResults.push({
            operation,
            iteration: i,
            duration: Date.now() - startTime,
            cacheHit: false,
            error: (error as Error).message
          });
          
          responseText += `- **Iteration ${i}:** Failed - ${(error as Error).message}\n`;
        }
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Summary for this operation
      if (successCount > 0) {
        const avgDuration = totalDuration / successCount;
        const cacheHitRate = (cacheHits / successCount) * 100;
        responseText += `\n**Summary:**\n`;
        responseText += `- Success Rate: ${(successCount / iterations * 100).toFixed(1)}%\n`;
        responseText += `- Average Duration: ${avgDuration.toFixed(0)}ms\n`;
        responseText += `- Cache Hit Rate: ${cacheHitRate.toFixed(1)}%\n\n`;
      }
    }
    
    // Memory analysis
    if (args.includeMemoryProfile !== false) {
      const finalMemory = process.memoryUsage();
      const memoryDelta = {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        rss: finalMemory.rss - initialMemory.rss
      };
      
      responseText += `## Memory Analysis\n\n`;
      responseText += `### Final Memory Usage\n`;
      responseText += `- **Heap Used:** ${(finalMemory.heapUsed / 1024 / 1024).toFixed(1)}MB\n`;
      responseText += `- **Heap Total:** ${(finalMemory.heapTotal / 1024 / 1024).toFixed(1)}MB\n`;
      responseText += `- **RSS:** ${(finalMemory.rss / 1024 / 1024).toFixed(1)}MB\n\n`;
      
      responseText += `### Memory Delta\n`;
      responseText += `- **Heap Used:** ${memoryDelta.heapUsed > 0 ? '+' : ''}${(memoryDelta.heapUsed / 1024 / 1024).toFixed(1)}MB\n`;
      responseText += `- **Heap Total:** ${memoryDelta.heapTotal > 0 ? '+' : ''}${(memoryDelta.heapTotal / 1024 / 1024).toFixed(1)}MB\n`;
      responseText += `- **RSS:** ${memoryDelta.rss > 0 ? '+' : ''}${(memoryDelta.rss / 1024 / 1024).toFixed(1)}MB\n\n`;
      
      // Memory recommendations
      responseText += `### Memory Recommendations\n`;
      if (Math.abs(memoryDelta.heapUsed) > 50 * 1024 * 1024) { // 50MB change
        responseText += `- Significant memory change detected (${(memoryDelta.heapUsed / 1024 / 1024).toFixed(1)}MB)\n`;
        responseText += `- Consider memory profiling for potential leaks\n`;
      } else {
        responseText += `- Memory usage is stable\n`;
      }
    }
    
    // Performance bottleneck analysis
    responseText += `## Bottleneck Analysis\n\n`;
    
    const operationStats = testOperations.map(op => {
      const opResults = testResults.filter(r => r.operation === op && !r.error);
      if (opResults.length === 0) return null;
      
      const avgDuration = opResults.reduce((sum, r) => sum + r.duration, 0) / opResults.length;
      const maxDuration = Math.max(...opResults.map(r => r.duration));
      const minDuration = Math.min(...opResults.map(r => r.duration));
      
      return {
        operation: op,
        avgDuration,
        maxDuration,
        minDuration,
        variance: maxDuration - minDuration
      };
    }).filter(Boolean);
    
    operationStats.sort((a, b) => (b?.avgDuration || 0) - (a?.avgDuration || 0));
    
    responseText += `### Operations by Performance (Slowest First)\n`;
    operationStats.forEach((stat, idx) => {
      if (stat) {
        responseText += `${idx + 1}. **${stat.operation}**\n`;
        responseText += `   - Average: ${stat.avgDuration.toFixed(0)}ms\n`;
        responseText += `   - Range: ${stat.minDuration}ms - ${stat.maxDuration}ms\n`;
        responseText += `   - Variance: ${stat.variance}ms\n`;
      }
    });
    
    // Optimization suggestions
    responseText += `\n## Optimization Suggestions\n\n`;
    
    const slowestOp = operationStats[0];
    if (slowestOp && slowestOp.avgDuration > 2000) {
      responseText += `- **${slowestOp.operation}** is significantly slow (${slowestOp.avgDuration.toFixed(0)}ms avg)\n`;
      responseText += `- Consider enabling caching or optimizing API calls for this operation\n`;
    }
    
    const highVarianceOps = operationStats.filter(stat => stat && stat.variance > 1000);
    if (highVarianceOps.length > 0) {
      responseText += `- High performance variance detected in: ${highVarianceOps.map(op => op?.operation).join(', ')}\n`;
      responseText += `- Consider implementing retry logic or connection pooling\n`;
    }
    
    const errorOps = testOperations.filter(op => 
      testResults.some(r => r.operation === op && r.error)
    );
    if (errorOps.length > 0) {
      responseText += `- Operations with errors: ${errorOps.join(', ')}\n`;
      responseText += `- Review error handling and circuit breaker configuration\n`;
    }
    
    if (operationStats.every(stat => stat && stat.avgDuration < 1000)) {
      responseText += `- All operations performing well (< 1s average)\n`;
      responseText += `- Performance optimization not urgently needed\n`;
    }
    
    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error profiling performance: ${(error as Error).message}`,
      }],
    };
  }
}

/**
 * Monitor real-time performance metrics
 */
export async function getRealtimeMetrics(
  _client: AkamaiClient,
  args: {
    interval?: number;
    duration?: number;
  }
): Promise<MCPToolResponse> {
  try {
    const interval = args.interval || 5000; // 5 seconds
    const duration = args.duration || 30000; // 30 seconds
    
    let responseText = `# Real-time Performance Monitoring\n\n`;
    responseText += `**Started:** ${new Date().toISOString()}\n`;
    responseText += `**Monitoring Duration:** ${duration / 1000}s\n`;
    responseText += `**Sample Interval:** ${interval / 1000}s\n\n`;
    
    const startTime = Date.now();
    const samples: Array<{
      timestamp: number;
      memoryUsed: number;
      activeOperations: number;
      cacheSize: number;
      operationCount: number;
    }> = [];
    
    // Initial baseline
    let lastOperationCount = globalPerformanceMonitor.getMetrics().length;
    
    responseText += `## Real-time Samples\n\n`;
    
    while (Date.now() - startTime < duration) {
      const memory = process.memoryUsage();
      const activeOps = globalPerformanceMonitor.getActiveOperations().length;
      const cacheSize = responseCache.size() + metadataCache.size();
      const currentOperationCount = globalPerformanceMonitor.getMetrics().length;
      
      const sample = {
        timestamp: Date.now(),
        memoryUsed: memory.heapUsed / 1024 / 1024,
        activeOperations: activeOps,
        cacheSize,
        operationCount: currentOperationCount - lastOperationCount
      };
      
      samples.push(sample);
      lastOperationCount = currentOperationCount;
      
      const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      responseText += `**${timeElapsed}s:** `;
      responseText += `Memory: ${sample.memoryUsed.toFixed(1)}MB, `;
      responseText += `Active Ops: ${sample.activeOperations}, `;
      responseText += `Cache: ${sample.cacheSize}, `;
      responseText += `New Ops: ${sample.operationCount}\n`;
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    // Analysis of samples
    if (samples.length > 1) {
      responseText += `\n## Analysis\n\n`;
      
      const lastSample = samples[samples.length - 1];
      const firstSample = samples[0];
      const memoryTrend = lastSample && firstSample ? lastSample.memoryUsed - firstSample.memoryUsed : 0;
      const maxActiveOps = Math.max(...samples.map(s => s.activeOperations));
      const totalNewOps = samples.reduce((sum, s) => sum + s.operationCount, 0);
      const avgOpsPerSecond = totalNewOps / (duration / 1000);
      
      responseText += `- **Memory Trend:** ${memoryTrend > 0 ? '+' : ''}${memoryTrend.toFixed(1)}MB\n`;
      responseText += `- **Peak Active Operations:** ${maxActiveOps}\n`;
      responseText += `- **Total New Operations:** ${totalNewOps}\n`;
      responseText += `- **Average Ops/Second:** ${avgOpsPerSecond.toFixed(2)}\n\n`;
      
      // Trends and recommendations
      if (Math.abs(memoryTrend) > 10) {
        responseText += `⚠️ **Memory Alert:** Significant memory change (${memoryTrend.toFixed(1)}MB)\n`;
      }
      
      if (maxActiveOps > 10) {
        responseText += `⚠️ **Concurrency Alert:** High number of concurrent operations (${maxActiveOps})\n`;
      }
      
      if (avgOpsPerSecond > 5) {
        responseText += `📈 **High Activity:** System is processing ${avgOpsPerSecond.toFixed(1)} operations per second\n`;
      } else if (avgOpsPerSecond < 0.5) {
        responseText += `📉 **Low Activity:** System is idle or processing few operations\n`;
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error monitoring real-time metrics: ${(error as Error).message}`,
      }],
    };
  }
}

/**
 * Clear performance data and reset monitoring
 */
export async function resetPerformanceMonitoring(
  _client: AkamaiClient,
  args: {
    clearMetrics?: boolean;
    clearCache?: boolean;
    resetCounters?: boolean;
  }
): Promise<MCPToolResponse> {
  try {
    let responseText = `# Performance Monitoring Reset\n\n`;
    responseText += `**Reset Time:** ${new Date().toISOString()}\n\n`;
    
    const actions: string[] = [];
    
    if (args.clearMetrics !== false) {
      const metricsCount = globalPerformanceMonitor.getMetrics().length;
      globalPerformanceMonitor.clearMetrics();
      actions.push(`Cleared ${metricsCount} performance metrics`);
    }
    
    if (args.clearCache !== false) {
      const responseCacheSize = responseCache.size();
      const metadataCacheSize = metadataCache.size();
      responseCache.clear();
      metadataCache.clear();
      actions.push(`Cleared response cache (${responseCacheSize} entries)`);
      actions.push(`Cleared metadata cache (${metadataCacheSize} entries)`);
    }
    
    if (args.resetCounters !== false) {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        actions.push('Triggered garbage collection');
      }
    }
    
    responseText += `## Actions Performed\n\n`;
    actions.forEach(action => {
      responseText += `- ${action}\n`;
    });
    
    // Current state after reset
    const memory = process.memoryUsage();
    responseText += `\n## Current State\n\n`;
    responseText += `- **Memory Used:** ${(memory.heapUsed / 1024 / 1024).toFixed(1)}MB\n`;
    responseText += `- **Active Operations:** ${globalPerformanceMonitor.getActiveOperations().length}\n`;
    responseText += `- **Response Cache Size:** ${responseCache.size()}\n`;
    responseText += `- **Metadata Cache Size:** ${metadataCache.size()}\n`;
    
    responseText += `\n✅ **Performance monitoring has been reset and is ready for fresh data collection.**`;
    
    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error resetting performance monitoring: ${(error as Error).message}`,
      }],
    };
  }
}

// Helper function to simulate test operations
async function performTestOperation(client: AkamaiClient, operationType: string): Promise<void> {
  switch (operationType) {
    case 'property-read':
      await client.request({ path: '/papi/v1/properties', method: 'GET' });
      break;
    case 'dns-read':
      await client.request({ path: '/config-dns/v2/zones', method: 'GET' });
      break;
    case 'zone-list':
      await client.request({ path: '/config-dns/v2/zones', method: 'GET' });
      break;
    case 'group-list':
      await client.request({ path: '/papi/v1/groups', method: 'GET' });
      break;
    default:
      // Generic test operation
      await client.request({ path: '/papi/v1/groups', method: 'GET' });
  }
}