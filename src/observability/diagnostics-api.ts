/**
 * Diagnostics API - System health and diagnostic data collector
 * Provides comprehensive system diagnostics, health checks, and troubleshooting data
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as os from 'os';
import { performance } from 'perf_hooks';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message?: string;
  lastCheck: number;
  duration: number;
  metadata?: Record<string, any>;
}

export interface SystemDiagnostics {
  timestamp: number;
  system: {
    platform: string;
    arch: string;
    release: string;
    uptime: number;
    loadAverage: number[];
    totalMemory: number;
    freeMemory: number;
    memoryUsage: number;
    cpuCount: number;
    homeDir: string;
    tempDir: string;
  };
  process: {
    pid: number;
    uptime: number;
    version: string;
    versions: Record<string, string>;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    env: Record<string, string>;
    argv: string[];
    cwd: string;
    execPath: string;
  };
  network: {
    hostname: string;
    networkInterfaces: Record<string, os.NetworkInterfaceInfo[]>;
    connections?: NetworkConnection[];
  };
  storage: {
    diskUsage?: DiskUsage[];
    tmpDirUsage?: DiskUsage;
  };
  performance: {
    eventLoopLag: number;
    gcStats?: GCStats;
    performanceMarks: PerformanceMark[];
    performanceMeasu_res: PerformanceMeasure[];
  };
}

export interface NetworkConnection {
  local: { address: string; port: number };
  remote: { address: string; port: number };
  state: string;
  protocol: string;
}

export interface DiskUsage {
  path: string;
  total: number;
  used: number;
  available: number;
  usagePercent: number;
}

export interface GCStats {
  totalHeapSize: number;
  totalHeapSizeExecutable: number;
  totalPhysicalSize: number;
  totalAvailableSize: number;
  usedHeapSize: number;
  heapSizeLimit: number;
  mallocedMemory: number;
  peakMallocedMemory: number;
}

export interface PerformanceMark {
  name: string;
  startTime: number;
  detail?: any;
}

export interface PerformanceMeasure {
  name: string;
  startTime: number;
  duration: number;
  detail?: any;
}

export interface DiagnosticCheck {
  name: string;
  category: 'system' | 'network' | 'storage' | 'performance' | 'application';
  execute(): Promise<HealthCheck>;
}

export interface AlertRule {
  name: string;
  condition: (diagnostics: SystemDiagnostics, healthChecks: HealthCheck[]) => boolean;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  cooldownMs: number;
  lastTriggered?: number;
}

export interface DiagnosticAlert {
  id: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  data?: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

export class DiagnosticsAPI extends EventEmitter {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private diagnosticChecks: Map<string, DiagnosticCheck> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private alerts: DiagnosticAlert[] = [];
  private systemDiagnostics: SystemDiagnostics | null = null;
  private diagnosticsInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private config: {
      diagnosticsIntervalMs?: number;
      healthCheckIntervalMs?: number;
      maxAlerts?: number;
      enablePerformanceMonitoring?: boolean;
      enableGCStats?: boolean;
      alertCooldownMs?: number;
    } = {},
  ) {
    super();
    this.config = {
      diagnosticsIntervalMs: 30000, // 30 seconds
      healthCheckIntervalMs: 10000, // 10 seconds
      maxAlerts: 1000,
      enablePerformanceMonitoring: true,
      enableGCStats: false,
      alertCooldownMs: 300000, // 5 minutes
      ...config,
    };

    this.initializeBuiltInChecks();
    this.initializeBuiltInAlerts();
    this.startDiagnostics();
  }

  /**
   * Register a health check
   */
  registerHealthCheck(check: DiagnosticCheck): void {
    this.diagnosticChecks.set(check.name, check);
    this.emit('healthCheckRegistered', check.name);
  }

  /**
   * Unregister a health check
   */
  unregisterHealthCheck(name: string): void {
    this.diagnosticChecks.delete(name);
    this.healthChecks.delete(name);
    this.emit('healthCheckUnregistered', name);
  }

  /**
   * Register an alert rule
   */
  registerAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.name, rule);
    this.emit('alertRuleRegistered', rule.name);
  }

  /**
   * Unregister an alert rule
   */
  unregisterAlertRule(name: string): void {
    this.alertRules.delete(name);
    this.emit('alertRuleUnregistered', name);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<HealthCheck[]> {
    const results: HealthCheck[] = [];

    for (const [name, check] of this.diagnosticChecks.entries()) {
      try {
        const startTime = performance.now();
        const result = await check.execute();
        const duration = performance.now() - startTime;

        const healthCheck: HealthCheck = {
          ...result,
          name,
          lastCheck: Date.now(),
          duration,
        };

        this.healthChecks.set(name, healthCheck);
        results.push(healthCheck);

        this.emit('healthCheckCompleted', healthCheck);
      } catch (_error) {
        const healthCheck: HealthCheck = {
          name,
          status: 'critical',
          message: `Health check failed: ${_error instanceof Error ? _error.message : String(_error)}`,
          lastCheck: Date.now(),
          duration: 0,
          metadata: { error: _error instanceof Error ? _error.stack : String(_error) },
        };

        this.healthChecks.set(name, healthCheck);
        results.push(healthCheck);

        this.emit('healthCheckError', name, _error);
      }
    }

    return results;
  }

  /**
   * Collect system diagnostics
   */
  async collectSystemDiagnostics(): Promise<SystemDiagnostics> {
    const timestamp = Date.now();

    // System information
    const system = {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptime: os.uptime() * 1000,
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      memoryUsage: (os.totalmem() - os.freemem()) / os.totalmem(),
      cpuCount: os.cpus().length,
      homeDir: os.homedir(),
      tempDir: os.tmpdir(),
    };

    // Process information
    const processInfo = {
      pid: process.pid,
      uptime: process.uptime() * 1000,
      version: process.version,
      versions: Object.fromEntries(
        Object.entries(process.versions).filter(([_, v]) => v !== undefined),
      ) as Record<string, string>,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      env: process.env as Record<string, string>,
      argv: process.argv,
      cwd: process.cwd(),
      execPath: process.execPath,
    };

    // Network information
    const network = {
      hostname: os.hostname(),
      networkInterfaces: Object.fromEntries(
        Object.entries(os.networkInterfaces()).filter(([_, value]) => value !== undefined),
      ) as Record<string, os.NetworkInterfaceInfo[]>,
      connections: await this.getNetworkConnections(),
    };

    // Storage information
    const storage = {
      diskUsage: await this.getDiskUsage(),
      tmpDirUsage: await this.getTmpDirUsage(),
    };

    // Performance information
    const performanceInfo = {
      eventLoopLag: await this.measureEventLoopLag(),
      gcStats: this.config.enableGCStats ? this.getGCStats() : undefined,
      performanceMarks: this.getPerformanceMarks(),
      performanceMeasu_res: this.getPerformanceMeasures(),
    };

    this.systemDiagnostics = {
      timestamp,
      system,
      process: processInfo,
      network,
      storage,
      performance: performanceInfo,
    };

    this.emit('systemDiagnosticsCollected', this.systemDiagnostics);
    return this.systemDiagnostics;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): {
    overall: 'healthy' | 'warning' | 'critical' | 'unknown';
    checks: HealthCheck[];
    summary: {
      total: number;
      healthy: number;
      warning: number;
      critical: number;
      unknown: number;
    };
  } {
    const checks = Array.from(this.healthChecks.values());

    const summary = {
      total: checks.length,
      healthy: checks.filter((c) => c.status === 'healthy').length,
      warning: checks.filter((c) => c.status === 'warning').length,
      critical: checks.filter((c) => c.status === 'critical').length,
      unknown: checks.filter((c) => c.status === 'unknown').length,
    };

    let overall: 'healthy' | 'warning' | 'critical' | 'unknown' = 'healthy';
    if (summary.critical > 0) {
      overall = 'critical';
    } else if (summary.warning > 0) {
      overall = 'warning';
    } else if (summary.unknown > 0) {
      overall = 'unknown';
    }

    return { overall, checks, summary };
  }

  /**
   * Get current system diagnostics
   */
  getCurrentDiagnostics(): SystemDiagnostics | null {
    return this.systemDiagnostics ? { ...this.systemDiagnostics } : null;
  }

  /**
   * Get alerts
   */
  getAlerts(filter?: {
    severity?: 'info' | 'warning' | 'critical';
    acknowledged?: boolean;
    since?: number;
  }): DiagnosticAlert[] {
    let alerts = [...this.alerts];

    if (filter) {
      if (filter.severity) {
        alerts = alerts.filter((a) => a.severity === filter.severity);
      }
      if (filter.acknowledged !== undefined) {
        alerts = alerts.filter((a) => a.acknowledged === filter.acknowledged);
      }
      if (filter.since) {
        alerts = alerts.filter((a) => a.timestamp >= filter.since!);
      }
    }

    return alerts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) {
return false;
}

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = Date.now();

    this.emit('alertAcknowledged', alert);
    return true;
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanMs: number): number {
    const cutoff = Date.now() - olderThanMs;
    const initialLength = this.alerts.length;

    this.alerts = this.alerts.filter((alert) => alert.timestamp > cutoff);

    const removed = initialLength - this.alerts.length;
    this.emit('alertsCleared', removed);

    return removed;
  }

  /**
   * Generate diagnostic report
   */
  async generateDiagnosticReport(): Promise<{
    timestamp: number;
    systemDiagnostics: SystemDiagnostics;
    healthStatus: ReturnType<DiagnosticsAPI['getHealthStatus']>;
    recentAlerts: DiagnosticAlert[];
    recommendations: string[];
  }> {
    const systemDiagnostics = await this.collectSystemDiagnostics();
    const healthStatus = this.getHealthStatus();
    const recentAlerts = this.getAlerts({ since: Date.now() - 3600000 }); // Last hour
    const recommendations = this.generateRecommendations(systemDiagnostics, healthStatus);

    return {
      timestamp: Date.now(),
      systemDiagnostics,
      healthStatus,
      recentAlerts,
      recommendations,
    };
  }

  /**
   * Export diagnostics data
   */
  async exportDiagnostics(format: 'json' | 'text' = 'json'): Promise<string> {
    const report = await this.generateDiagnosticReport();

    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else {
      return this.formatTextReport(report);
    }
  }

  /**
   * Stop the diagnostics API
   */
  stop(): void {
    if (this.diagnosticsInterval) {
      clearInterval(this.diagnosticsInterval);
      this.diagnosticsInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.emit('stopped');
  }

  private initializeBuiltInChecks(): void {
    // Memory usage check
    this.registerHealthCheck({
      name: 'memory_usage',
      category: 'system',
      async execute(): Promise<HealthCheck> {
        const memUsage = process.memoryUsage();
        const usagePercent = memUsage.heapUsed / memUsage.heapTotal;

        let status: HealthCheck['status'] = 'healthy';
        let message = `Memory usage: ${(usagePercent * 100).toFixed(1)}%`;

        if (usagePercent > 0.9) {
          status = 'critical';
          message += ' - Critical memory usage';
        } else if (usagePercent > 0.8) {
          status = 'warning';
          message += ' - High memory usage';
        }

        return {
          name: 'memory_usage',
          status,
          message,
          lastCheck: Date.now(),
          duration: 0,
          metadata: { memUsage, usagePercent },
        };
      },
    });

    // Event loop lag check
    this.registerHealthCheck({
      name: 'event_loop_lag',
      category: 'performance',
      execute: async (): Promise<HealthCheck> => {
        const lag = await this.measureEventLoopLag();

        let status: HealthCheck['status'] = 'healthy';
        let message = `Event loop lag: ${lag.toFixed(2)}ms`;

        if (lag > 100) {
          status = 'critical';
          message += ' - High event loop lag';
        } else if (lag > 50) {
          status = 'warning';
          message += ' - Elevated event loop lag';
        }

        return {
          name: 'event_loop_lag',
          status,
          message,
          lastCheck: Date.now(),
          duration: 0,
          metadata: { lag },
        };
      },
    });

    // Disk space check
    this.registerHealthCheck({
      name: 'disk_space',
      category: 'storage',
      execute: async (): Promise<HealthCheck> => {
        try {
          const diskUsage = await this.getDiskUsage();
          const rootUsage = diskUsage?.find((d) => d.path === '/') || diskUsage?.[0];

          if (!rootUsage) {
            return {
              name: 'disk_space',
              status: 'unknown',
              message: 'Unable to determine disk usage',
              lastCheck: Date.now(),
              duration: 0,
            };
          }

          let status: HealthCheck['status'] = 'healthy';
          let message = `Disk usage: ${rootUsage.usagePercent.toFixed(1)}%`;

          if (rootUsage.usagePercent > 95) {
            status = 'critical';
            message += ' - Critical disk space';
          } else if (rootUsage.usagePercent > 85) {
            status = 'warning';
            message += ' - Low disk space';
          }

          return {
            name: 'disk_space',
            status,
            message,
            lastCheck: Date.now(),
            duration: 0,
            metadata: { diskUsage },
          };
        } catch (_error) {
          return {
            name: 'disk_space',
            status: 'unknown',
            message: `Unable to check disk space: ${_error instanceof Error ? _error.message : String(_error)}`,
            lastCheck: Date.now(),
            duration: 0,
          };
        }
      },
    });
  }

  private initializeBuiltInAlerts(): void {
    // High memory usage alert
    this.registerAlertRule({
      name: 'high_memory_usage',
      condition: (diagnostics) => {
        const memUsage = diagnostics.process.memoryUsage;
        const usagePercent = memUsage.heapUsed / memUsage.heapTotal;
        return usagePercent > 0.85;
      },
      severity: 'warning',
      message: 'High memory usage detected',
      cooldownMs: this.config.alertCooldownMs || 300000,
    });

    // Critical memory usage alert
    this.registerAlertRule({
      name: 'critical_memory_usage',
      condition: (diagnostics) => {
        const memUsage = diagnostics.process.memoryUsage;
        const usagePercent = memUsage.heapUsed / memUsage.heapTotal;
        return usagePercent > 0.95;
      },
      severity: 'critical',
      message: 'Critical memory usage detected',
      cooldownMs: this.config.alertCooldownMs || 300000,
    });

    // Event loop lag alert
    this.registerAlertRule({
      name: 'high_event_loop_lag',
      condition: (diagnostics) => {
        return diagnostics.performance.eventLoopLag > 100;
      },
      severity: 'warning',
      message: 'High event loop lag detected',
      cooldownMs: this.config.alertCooldownMs || 300000,
    });

    // Health check failure alert
    this.registerAlertRule({
      name: 'health_check_failures',
      condition: (_, healthChecks) => {
        const criticalChecks = healthChecks.filter((c) => c.status === 'critical');
        return criticalChecks.length > 0;
      },
      severity: 'critical',
      message: 'One or more health checks are failing',
      cooldownMs: this.config.alertCooldownMs || 300000,
    });
  }

  private startDiagnostics(): void {
    // Initial collection
    this.collectSystemDiagnostics();
    this.runHealthChecks();

    // Start intervals
    this.diagnosticsInterval = setInterval(() => {
      this.collectSystemDiagnostics().then(() => this.checkAlerts());
    }, this.config.diagnosticsIntervalMs);

    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks().then(() => this.checkAlerts());
    }, this.config.healthCheckIntervalMs);
  }

  private async checkAlerts(): Promise<void> {
    if (!this.systemDiagnostics) {
return;
}

    const healthChecks = Array.from(this.healthChecks.values());
    const now = Date.now();

    for (const [name, rule] of this.alertRules.entries()) {
      // Check cooldown
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldownMs) {
        continue;
      }

      try {
        if (rule.condition(this.systemDiagnostics, healthChecks)) {
          const alert: DiagnosticAlert = {
            id: this.generateId(),
            ruleName: name,
            severity: rule.severity,
            message: rule.message,
            timestamp: now,
            acknowledged: false,
            data: {
              systemDiagnostics: this.systemDiagnostics,
              healthChecks: healthChecks.filter((c) => c.status !== 'healthy'),
            },
          };

          this.alerts.push(alert);
          rule.lastTriggered = now;

          // Maintain alert history limit
          if (this.alerts.length > (this.config.maxAlerts || 1000)) {
            this.alerts.shift();
          }

          this.emit('alertTriggered', alert);
        }
      } catch (_error) {
        this.emit('alertRuleError', name, _error);
      }
    }
  }

  private async measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      setImmediate(() => {
        const lag = performance.now() - start;
        resolve(lag);
      });
    });
  }

  private getGCStats(): GCStats | undefined {
    // This would require the v8 module and gc-stats
    // For now, return undefined
    return undefined;
  }

  private getPerformanceMarks(): PerformanceMark[] {
    try {
      const marks = performance.getEntriesByType('mark') as any[];
      return marks.map((mark) => ({
        name: mark.name,
        startTime: mark.startTime,
        detail: mark.detail,
      }));
    } catch {
      return [];
    }
  }

  private getPerformanceMeasures(): PerformanceMeasure[] {
    try {
      const measures = performance.getEntriesByType('measure') as any[];
      return measures.map((measure) => ({
        name: measure.name,
        startTime: measure.startTime,
        duration: measure.duration,
        detail: measure.detail,
      }));
    } catch {
      return [];
    }
  }

  private async getNetworkConnections(): Promise<NetworkConnection[]> {
    // This would require platform-specific implementations
    // For now, return empty array
    return [];
  }

  private async getDiskUsage(): Promise<DiskUsage[]> {
    // This would require platform-specific implementations
    // For now, return empty array
    return [];
  }

  private async getTmpDirUsage(): Promise<DiskUsage | undefined> {
    try {
      const tmpDir = os.tmpdir();
      await fs.stat(tmpDir);

      // This is a simplified implementation
      return {
        path: tmpDir,
        total: 0,
        used: 0,
        available: 0,
        usagePercent: 0,
      };
    } catch {
      return undefined;
    }
  }

  private generateRecommendations(
    diagnostics: SystemDiagnostics,
    healthStatus: ReturnType<DiagnosticsAPI['getHealthStatus']>,
  ): string[] {
    const recommendations: string[] = [];

    // Memory recommendations
    const memUsage = diagnostics.process.memoryUsage;
    const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

    if (memUsagePercent > 0.8) {
      recommendations.push('Consider increasing heap size or optimizing memory usage');
    }

    // Performance recommendations
    if (diagnostics.performance.eventLoopLag > 50) {
      recommendations.push(
        'High event loop lag detected - consider optimizing synchronous operations',
      );
    }

    // Health check recommendations
    const criticalChecks = healthStatus.checks.filter((c) => c.status === 'critical');
    if (criticalChecks.length > 0) {
      recommendations.push(
        `Address ${criticalChecks.length} critical health check(s): ${criticalChecks.map((c) => c.name).join(', ')}`,
      );
    }

    // System recommendations
    if (diagnostics.system.memoryUsage > 0.9) {
      recommendations.push(
        'System memory usage is high - consider freeing up memory or adding more RAM',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating within normal parameters');
    }

    return recommendations;
  }

  private formatTextReport(
    report: Awaited<ReturnType<DiagnosticsAPI['generateDiagnosticReport']>>,
  ): string {
    const lines: string[] = [];

    lines.push('=== DIAGNOSTIC REPORT ===');
    lines.push(`Generated: ${new Date(report.timestamp).toISOString()}`);
    lines.push('');

    lines.push('--- HEALTH STATUS ---');
    lines.push(`Overall Status: ${report.healthStatus.overall.toUpperCase()}`);
    lines.push(`Total Checks: ${report.healthStatus.summary.total}`);
    lines.push(`Healthy: ${report.healthStatus.summary.healthy}`);
    lines.push(`Warning: ${report.healthStatus.summary.warning}`);
    lines.push(`Critical: ${report.healthStatus.summary.critical}`);
    lines.push(`Unknown: ${report.healthStatus.summary.unknown}`);
    lines.push('');

    lines.push('--- SYSTEM INFORMATION ---');
    lines.push(
      `Platform: ${report.systemDiagnostics.system.platform} ${report.systemDiagnostics.system.arch}`,
    );
    lines.push(`Release: ${report.systemDiagnostics.system.release}`);
    lines.push(`Uptime: ${Math.round(report.systemDiagnostics.system.uptime / 1000)}s`);
    lines.push(`Memory: ${Math.round(report.systemDiagnostics.system.memoryUsage * 100)}% used`);
    lines.push(`CPU Count: ${report.systemDiagnostics.system.cpuCount}`);
    lines.push('');

    if (report.recentAlerts.length > 0) {
      lines.push('--- RECENT ALERTS ---');
      for (const alert of report.recentAlerts.slice(0, 10)) {
        lines.push(
          `[${alert.severity.toUpperCase()}] ${alert.message} (${new Date(alert.timestamp).toISOString()})`,
        );
      }
      lines.push('');
    }

    lines.push('--- RECOMMENDATIONS ---');
    for (const recommendation of report.recommendations) {
      lines.push(`- ${recommendation}`);
    }

    return lines.join('\n');
  }

  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }
}

export default DiagnosticsAPI;
