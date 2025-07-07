/**
 * Monitor Middleware - Health monitoring for ALECSCore
 * 
 * Provides health checks, performance monitoring, and heartbeat tracking
 */

import { logger } from '../../../utils/logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cache: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  pool: {
    active: number;
    idle: number;
    pending: number;
  };
  tools: {
    total: number;
    executed: number;
    errors: number;
    avgDuration: number;
  };
}

export interface MonitorOptions {
  interval?: number;
  enableHeartbeat?: boolean;
  enableMetrics?: boolean;
  thresholds?: {
    memoryMB?: number;
    errorRate?: number;
    avgDuration?: number;
  };
}

export class MonitorMiddleware {
  private stats = {
    toolExecutions: 0,
    toolErrors: 0,
    totalDuration: 0,
    startTime: Date.now(),
  };
  
  private heartbeatInterval?: NodeJS.Timeout;
  
  constructor(private options: MonitorOptions = {}) {
    if (options.enableHeartbeat) {
      this.startHeartbeat();
    }
  }
  
  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    const interval = this.options.interval || 60000; // 1 minute default
    
    this.heartbeatInterval = setInterval(() => {
      const health = this.getHealth();
      
      logger.info('[ALECSCore] Heartbeat', {
        status: health.status,
        uptime: Math.floor(health.uptime),
        memory: Math.floor(health.memory.heapUsed / 1024 / 1024) + 'MB',
        cacheHitRate: Math.floor(health.cache.hitRate * 100) + '%',
        toolsExecuted: health.tools.executed,
        avgDuration: Math.floor(health.tools.avgDuration) + 'ms',
      });
      
      // Check thresholds
      this.checkThresholds(health);
    }, interval);
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }
  
  /**
   * Record tool execution
   */
  recordExecution(toolName: string, duration: number, error?: Error): void {
    this.stats.toolExecutions++;
    this.stats.totalDuration += duration;
    
    if (error) {
      this.stats.toolErrors++;
      logger.warn(`Tool execution failed: ${toolName}`, {
        error: error.message,
        duration,
      });
    } else if (this.options.enableMetrics) {
      logger.debug(`Tool execution completed: ${toolName}`, {
        duration,
        avgDuration: this.getAverageDuration(),
      });
    }
  }
  
  /**
   * Get current health status
   */
  getHealth(cache?: any, pool?: any): HealthStatus {
    const uptime = (Date.now() - this.stats.startTime) / 1000;
    const avgDuration = this.getAverageDuration();
    const errorRate = this.getErrorRate();
    
    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    const memoryUsedMB = process.memoryUsage().heapUsed / 1024 / 1024;
    const thresholds = this.options.thresholds || {};
    
    if (
      (thresholds.memoryMB && memoryUsedMB > thresholds.memoryMB) ||
      (thresholds.errorRate && errorRate > thresholds.errorRate) ||
      (thresholds.avgDuration && avgDuration > thresholds.avgDuration)
    ) {
      status = 'degraded';
    }
    
    if (errorRate > 0.5) {
      status = 'unhealthy';
    }
    
    return {
      status,
      timestamp: new Date(),
      uptime,
      memory: process.memoryUsage(),
      cache: cache?.getStats() || {
        size: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
      pool: pool?.getStats() || {
        active: 0,
        idle: 0,
        pending: 0,
      },
      tools: {
        total: this.stats.toolExecutions + this.stats.toolErrors,
        executed: this.stats.toolExecutions,
        errors: this.stats.toolErrors,
        avgDuration,
      },
    };
  }
  
  /**
   * Get average tool execution duration
   */
  private getAverageDuration(): number {
    if (this.stats.toolExecutions === 0) return 0;
    return this.stats.totalDuration / this.stats.toolExecutions;
  }
  
  /**
   * Get error rate
   */
  private getErrorRate(): number {
    const total = this.stats.toolExecutions + this.stats.toolErrors;
    if (total === 0) return 0;
    return this.stats.toolErrors / total;
  }
  
  /**
   * Check health thresholds and log warnings
   */
  private checkThresholds(health: HealthStatus): void {
    const thresholds = this.options.thresholds || {};
    const warnings: string[] = [];
    
    const memoryUsedMB = health.memory.heapUsed / 1024 / 1024;
    if (thresholds.memoryMB && memoryUsedMB > thresholds.memoryMB) {
      warnings.push(`Memory usage high: ${Math.floor(memoryUsedMB)}MB > ${thresholds.memoryMB}MB`);
    }
    
    const errorRate = this.getErrorRate();
    if (thresholds.errorRate && errorRate > thresholds.errorRate) {
      warnings.push(`Error rate high: ${Math.floor(errorRate * 100)}% > ${Math.floor(thresholds.errorRate * 100)}%`);
    }
    
    if (thresholds.avgDuration && health.tools.avgDuration > thresholds.avgDuration) {
      warnings.push(`Avg duration high: ${Math.floor(health.tools.avgDuration)}ms > ${thresholds.avgDuration}ms`);
    }
    
    if (warnings.length > 0) {
      logger.warn('[ALECSCore] Health threshold warnings', { warnings });
    }
  }
  
  /**
   * Get formatted health report
   */
  getHealthReport(format: 'json' | 'text' = 'text'): string {
    const health = this.getHealth();
    
    if (format === 'json') {
      return JSON.stringify(health, null, 2);
    }
    
    // Text format
    const lines = [
      `=== ALECSCore Health Report ===`,
      `Status: ${health.status.toUpperCase()}`,
      `Uptime: ${Math.floor(health.uptime / 60)} minutes`,
      ``,
      `Memory Usage:`,
      `  Heap Used: ${Math.floor(health.memory.heapUsed / 1024 / 1024)}MB`,
      `  Heap Total: ${Math.floor(health.memory.heapTotal / 1024 / 1024)}MB`,
      `  RSS: ${Math.floor(health.memory.rss / 1024 / 1024)}MB`,
      ``,
      `Cache Performance:`,
      `  Size: ${health.cache.size}`,
      `  Hit Rate: ${Math.floor(health.cache.hitRate * 100)}%`,
      `  Hits: ${health.cache.hits}`,
      `  Misses: ${health.cache.misses}`,
      ``,
      `Connection Pool:`,
      `  Active: ${health.pool.active}`,
      `  Idle: ${health.pool.idle}`,
      `  Pending: ${health.pool.pending}`,
      ``,
      `Tool Execution:`,
      `  Total: ${health.tools.total}`,
      `  Successful: ${health.tools.executed}`,
      `  Errors: ${health.tools.errors}`,
      `  Avg Duration: ${Math.floor(health.tools.avgDuration)}ms`,
      `  Error Rate: ${Math.floor(this.getErrorRate() * 100)}%`,
    ];
    
    return lines.join('\n');
  }
}