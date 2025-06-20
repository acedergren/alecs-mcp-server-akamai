import { EventEmitter } from 'events';

import { EdgeGridClient } from '@utils/edgegrid-client';
import { logger } from '@utils/logger';
import { PerformanceMonitor } from '@utils/performance-monitor';

export interface RealTimeMetric {
  metric: string;
  value: number;
  timestamp: string;
  unit?: string;
  tags?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  consecutiveViolations: number;
  maxViolations: number;
  cooldownPeriod: number; // seconds
  lastTriggered?: string;
  notificationChannels: string[];
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  description: string;
  resolved?: boolean;
  resolvedAt?: string;
}

export interface MonitoringConfiguration {
  refreshInterval: number; // seconds
  retentionPeriod: number; // hours
  maxMetricsPerRequest: number;
  alertEvaluationInterval: number; // seconds
  enabledMetrics: string[];
  defaultFilters?: Record<string, any>;
}

export interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown';
  services: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    lastCheck: string;
    responseTime?: number;
    details?: string;
  }>;
  metrics: Array<{
    name: string;
    value: number;
    status: 'normal' | 'warning' | 'critical';
    threshold?: number;
  }>;
  activeAlerts: number;
  lastUpdate: string;
}

export class RealTimeMonitoringService extends EventEmitter {
  private client: EdgeGridClient;
  private performanceMonitor: PerformanceMonitor;
  private config: MonitoringConfiguration;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private metricHistory: Map<string, RealTimeMetric[]> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private alertInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(customer = 'default', config?: Partial<MonitoringConfiguration>) {
    super();
    this.client = EdgeGridClient.getInstance(customer);
    this.performanceMonitor = new PerformanceMonitor();

    this.config = {
      refreshInterval: 60, // 1 minute
      retentionPeriod: 24, // 24 hours
      maxMetricsPerRequest: 50,
      alertEvaluationInterval: 30, // 30 seconds
      enabledMetrics: [
        'bandwidth',
        'requests',
        'error-rate',
        'response-time',
        'cache-hit-ratio',
        'origin-response-time',
      ],
      ...config,
    };
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Real-time monitoring is already running');
      return;
    }

    try {
      logger.info('Starting real-time monitoring', { config: this.config });

      this.isMonitoring = true;

      // Start metric collection
      this.monitoringInterval = setInterval(
        () => this.collectMetrics(),
        this.config.refreshInterval * 1000,
      );

      // Start alert evaluation
      this.alertInterval = setInterval(
        () => this.evaluateAlerts(),
        this.config.alertEvaluationInterval * 1000,
      );

      // Initial metric collection
      await this.collectMetrics();

      this.emit('monitoring-started', { timestamp: new Date().toISOString() });
      logger.info('Real-time monitoring started successfully');
    } catch (_error) {
      logger.error('Failed to start real-time monitoring', { error: _error });
      this.isMonitoring = false;
      throw new Error(
        `Failed to start real-time monitoring: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      logger.warn('Real-time monitoring is not running');
      return;
    }

    logger.info('Stopping real-time monitoring');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = undefined;
    }

    this.isMonitoring = false;
    this.emit('monitoring-stopped', { timestamp: new Date().toISOString() });
    logger.info('Real-time monitoring stopped');
  }

  /**
   * Get current real-time metrics
   */
  async getCurrentMetrics(
    metrics?: string[],
    filter?: Record<string, any>,
  ): Promise<RealTimeMetric[]> {
    const timer = this.performanceMonitor.startOperation('realtime_get_current_metrics');

    try {
      const metricsToFetch = metrics || this.config.enabledMetrics;
      logger.info('Fetching current real-time metrics', { metrics: metricsToFetch, filter });

      const currentMetrics: RealTimeMetric[] = [];
      const timestamp = new Date().toISOString();

      // Fetch metrics in parallel
      const metricPromises = metricsToFetch.map(async (metric) => {
        try {
          const value = await this.fetchCurrentMetricValue(metric, filter);
          return {
            metric,
            value,
            timestamp,
            unit: this.getMetricUnit(metric),
            tags: filter,
          };
        } catch (_error) {
          logger.error(`Failed to fetch metric ${metric}`, { error: _error });
          return null;
        }
      });

      const results = await Promise.all(metricPromises);

      for (const result of results) {
        if (result) {
          currentMetrics.push(result);
          this.updateMetricHistory(result);
        }
      }

      logger.info('Current metrics fetched successfully', {
        metricCount: currentMetrics.length,
        timestamp,
      });

      return currentMetrics;
    } catch (_error) {
      logger.error('Failed to get current metrics', { _error, metrics, filter });
      throw new Error(
        `Failed to get current metrics: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    } finally {
      this.performanceMonitor.endOperation(timer);
    }
  }

  /**
   * Add or update an alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const ruleId = this.generateRuleId();
    const alertRule: AlertRule = {
      ...rule,
      id: ruleId,
      consecutiveViolations: 0,
      lastTriggered: undefined,
    };

    this.alertRules.set(ruleId, alertRule);

    logger.info('Alert rule added', {
      ruleId,
      name: rule.name,
      metric: rule.metric,
      threshold: rule.threshold,
    });

    this.emit('alert-rule-added', { rule: alertRule });
    return ruleId;
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);

    if (removed) {
      logger.info('Alert rule removed', { ruleId });
      this.emit('alert-rule-removed', { ruleId });
    }

    return removed;
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get metric history for a specific metric
   */
  getMetricHistory(metric: string, timeWindow = '1h'): RealTimeMetric[] {
    const history = this.metricHistory.get(metric) || [];
    const cutoffTime = this.calculateCutoffTime(timeWindow);

    return history.filter((m) => new Date(m.timestamp) >= cutoffTime);
  }

  /**
   * Get overall health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const timer = this.performanceMonitor.startOperation('realtime_health_status');

    try {
      logger.info('Calculating health status');

      // Get current metrics
      const currentMetrics = await this.getCurrentMetrics();

      // Check service health
      const services = await this.checkServiceHealth();

      // Evaluate metric status
      const metricStatuses = this.evaluateMetricHealth(currentMetrics);

      // Determine overall status
      const overallStatus = this.calculateOverallStatus(services, metricStatuses);

      const healthStatus: HealthStatus = {
        overall: overallStatus,
        services,
        metrics: metricStatuses,
        activeAlerts: this.activeAlerts.size,
        lastUpdate: new Date().toISOString(),
      };

      logger.info('Health status calculated', {
        overall: overallStatus,
        serviceCount: services.length,
        metricCount: metricStatuses.length,
        activeAlerts: this.activeAlerts.size,
      });

      return healthStatus;
    } catch (_error) {
      logger.error('Failed to get health status', { error: _error });
      throw new Error(
        `Failed to get health status: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    } finally {
      this.performanceMonitor.endOperation(timer);
    }
  }

  /**
   * Configure monitoring settings
   */
  updateConfiguration(config: Partial<MonitoringConfiguration>): void {
    logger.info('Updating monitoring configuration', { config });

    const wasMonitoring = this.isMonitoring;

    if (wasMonitoring) {
      this.stopMonitoring();
    }

    this.config = { ...this.config, ...config };

    if (wasMonitoring) {
      this.startMonitoring();
    }

    this.emit('configuration-updated', { config: this.config });
    logger.info('Monitoring configuration updated');
  }

  // Private methods

  private async collectMetrics(): Promise<void> {
    try {
      logger.debug('Collecting real-time metrics');

      const metrics = await this.getCurrentMetrics(
        this.config.enabledMetrics,
        this.config.defaultFilters,
      );

      this.emit('metrics-collected', {
        metrics,
        timestamp: new Date().toISOString(),
        count: metrics.length,
      });

      // Clean up old metric history
      this.cleanupMetricHistory();
    } catch (_error) {
      logger.error('Failed to collect metrics', { error: _error });
      this.emit('metrics-collection-failed', {
        error: _error instanceof Error ? _error.message : String(_error),
      });
    }
  }

  private async evaluateAlerts(): Promise<void> {
    try {
      logger.debug('Evaluating alert rules');

      const currentTime = new Date();
      const evaluatedRules = [];

      for (const rule of this.alertRules.values()) {
        if (!rule.enabled) {
continue;
}

        // Check cooldown period
        if (rule.lastTriggered) {
          const lastTriggeredTime = new Date(rule.lastTriggered);
          const timeSinceLastTrigger = (currentTime.getTime() - lastTriggeredTime.getTime()) / 1000;

          if (timeSinceLastTrigger < rule.cooldownPeriod) {
            continue;
          }
        }

        await this.evaluateAlertRule(rule);
        evaluatedRules.push(rule.id);
      }

      logger.debug('Alert evaluation completed', { evaluatedRules: evaluatedRules.length });
    } catch (_error) {
      logger.error('Failed to evaluate alerts', { error: _error });
    }
  }

  private async evaluateAlertRule(rule: AlertRule): Promise<void> {
    try {
      // Get current metric value
      const currentValue = await this.fetchCurrentMetricValue(rule.metric);

      // Check if threshold is violated
      const isViolation = this.checkThresholdViolation(currentValue, rule.operator, rule.threshold);

      if (isViolation) {
        rule.consecutiveViolations++;

        if (rule.consecutiveViolations >= rule.maxViolations) {
          await this.triggerAlert(rule, currentValue);
          rule.lastTriggered = new Date().toISOString();
          rule.consecutiveViolations = 0;
        }
      } else {
        // Reset consecutive violations if threshold is not violated
        if (rule.consecutiveViolations > 0) {
          rule.consecutiveViolations = 0;

          // Check if we need to resolve any active alerts for this rule
          const activeAlert = Array.from(this.activeAlerts.values()).find(
            (alert) => alert.ruleId === rule.id && !alert.resolved,
          );

          if (activeAlert) {
            await this.resolveAlert(activeAlert.id);
          }
        }
      }
    } catch (_error) {
      logger.error('Failed to evaluate alert rule', { _error, ruleId: rule.id });
    }
  }

  private async triggerAlert(rule: AlertRule, currentValue: number): Promise<void> {
    const alertId = this.generateAlertId();
    const alertEvent: AlertEvent = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      value: currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      description: this.generateAlertDescription(rule, currentValue),
      resolved: false,
    };

    this.activeAlerts.set(alertId, alertEvent);

    logger.warn('Alert triggered', {
      alertId,
      ruleName: rule.name,
      metric: rule.metric,
      value: currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
    });

    this.emit('alert-triggered', { alert: alertEvent });

    // Send notifications
    await this.sendAlertNotifications(alertEvent, rule.notificationChannels);
  }

  private async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
return;
}

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();

    logger.info('Alert resolved', { alertId, ruleName: alert.ruleName });
    this.emit('alert-resolved', { alert });

    // Remove from active alerts after a delay to allow for notification
    setTimeout(() => {
      this.activeAlerts.delete(alertId);
    }, 60000); // 1 minute delay
  }

  private async sendAlertNotifications(alert: AlertEvent, channels: string[]): Promise<void> {
    // Implementation would depend on notification system
    logger.info('Sending alert notifications', {
      alertId: alert.id,
      channels: channels.length,
      severity: alert.severity,
    });

    // Simulate notification sending
    this.emit('notifications-sent', {
      alert,
      channels,
      timestamp: new Date().toISOString(),
    });
  }

  private async fetchCurrentMetricValue(
    metric: string,
    filter?: Record<string, any>,
  ): Promise<number> {
    // This would make actual API calls to Akamai's real-time reporting endpoints
    const response = await this.client.request({
      method: 'GET',
      path: `/reporting/v1/realtime/${metric}`,
      queryParams: {
        timeWindow: '1m',
        ...filter,
      },
    });

    return response.data.value || 0;
  }

  private updateMetricHistory(metric: RealTimeMetric): void {
    if (!this.metricHistory.has(metric.metric)) {
      this.metricHistory.set(metric.metric, []);
    }

    const history = this.metricHistory.get(metric.metric)!;
    history.push(metric);

    // Keep only recent history based on retention period
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod * 60 * 60 * 1000);
    const filteredHistory = history.filter((m) => new Date(m.timestamp) >= cutoffTime);

    this.metricHistory.set(metric.metric, filteredHistory);
  }

  private cleanupMetricHistory(): void {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod * 60 * 60 * 1000);

    for (const [metric, history] of this.metricHistory.entries()) {
      const filteredHistory = history.filter((m) => new Date(m.timestamp) >= cutoffTime);
      this.metricHistory.set(metric, filteredHistory);
    }
  }

  private checkThresholdViolation(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  private generateAlertDescription(rule: AlertRule, currentValue: number): string {
    const direction = ['gt', 'gte'].includes(rule.operator) ? 'above' : 'below';
    return `${rule.metric} is ${direction} threshold: ${currentValue} ${rule.operator} ${rule.threshold}`;
  }

  private async checkServiceHealth(): Promise<HealthStatus['services']> {
    // Check health of various Akamai services
    const services = [
      { name: 'Property Manager API', endpoint: '/papi/v1' },
      { name: 'Edge DNS API', endpoint: '/config-dns/v2' },
      { name: 'Reporting API', endpoint: '/reporting/v1' },
      { name: 'Fast Purge API', endpoint: '/ccu/v3' },
    ];

    const healthChecks = services.map(async (service) => {
      try {
        const startTime = Date.now();
        await this.client.request({
          method: 'GET',
          path: service.endpoint + '/health',
        });
        const responseTime = Date.now() - startTime;

        return {
          name: service.name,
          status: 'healthy' as const,
          lastCheck: new Date().toISOString(),
          responseTime,
          details: `Response time: ${responseTime}ms`,
        };
      } catch (_error) {
        return {
          name: service.name,
          status: 'critical' as const,
          lastCheck: new Date().toISOString(),
          details: _error instanceof Error ? _error.message : String(_error),
        };
      }
    });

    return Promise.all(healthChecks);
  }

  private evaluateMetricHealth(metrics: RealTimeMetric[]): HealthStatus['metrics'] {
    return metrics.map((metric) => {
      const alertRule = Array.from(this.alertRules.values()).find(
        (rule) => rule.metric === metric.metric && rule.enabled,
      );

      let status: 'normal' | 'warning' | 'critical' = 'normal';

      if (alertRule) {
        const isViolation = this.checkThresholdViolation(
          metric.value,
          alertRule.operator,
          alertRule.threshold,
        );

        if (isViolation) {
          status = alertRule.severity === 'critical' ? 'critical' : 'warning';
        }
      }

      return {
        name: metric.metric,
        value: metric.value,
        status,
        threshold: alertRule?.threshold,
      };
    });
  }

  private calculateOverallStatus(
    services: HealthStatus['services'],
    metrics: HealthStatus['metrics'],
  ): HealthStatus['overall'] {
    const hasCriticalService = services.some((s) => s.status === 'critical');
    const hasCriticalMetric = metrics.some((m) => m.status === 'critical');

    if (hasCriticalService || hasCriticalMetric) {
      return 'critical';
    }

    const hasWarningService = services.some((s) => s.status === 'warning');
    const hasWarningMetric = metrics.some((m) => m.status === 'warning');

    if (hasWarningService || hasWarningMetric) {
      return 'warning';
    }

    return 'healthy';
  }

  private calculateCutoffTime(timeWindow: string): Date {
    const now = new Date();
    const unit = timeWindow.slice(-1);
    const value = parseInt(timeWindow.slice(0, -1));

    switch (unit) {
      case 'm':
        return new Date(now.getTime() - value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() - value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 60 * 60 * 1000); // Default 1 hour
    }
  }

  private getMetricUnit(metric: string): string {
    const units: Record<string, string> = {
      bandwidth: 'bytes',
      requests: 'count',
      'error-rate': '%',
      'response-time': 'ms',
      'cache-hit-ratio': '%',
      'origin-response-time': 'ms',
    };

    return units[metric] || '';
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
