/**
 * Continuous Monitoring Integration System
 * Provides real-time monitoring, alerting, and integration with monitoring stacks
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class ContinuousMonitor extends EventEmitter {
  constructor() {
    super();
    this.monitoringConfig = {
      enabled: true,
      intervalMs: 30000, // 30 seconds
      healthCheckIntervalMs: 60000, // 1 minute
      alertingEnabled: true,
      metricsRetentionDays: 7,
      maxConcurrentChecks: 5
    };

    this.metrics = {
      system: new Map(),
      tests: new Map(),
      performance: new Map(),
      errors: new Map(),
      alerts: new Map()
    };

    this.alertRules = new Map();
    this.monitoringTargets = new Map();
    this.activeMonitors = new Map();
    this.integrations = new Map();
    
    this.status = {
      isRunning: false,
      lastCheck: null,
      totalChecks: 0,
      failedChecks: 0,
      alerts: []
    };

    this.thresholds = {
      responseTime: { warning: 5000, critical: 10000 },
      errorRate: { warning: 0.05, critical: 0.1 },
      memoryUsage: { warning: 0.8, critical: 0.9 },
      cpuUsage: { warning: 0.8, critical: 0.9 },
      diskUsage: { warning: 0.8, critical: 0.9 },
      testSuccessRate: { warning: 0.9, critical: 0.8 }
    };
  }

  /**
   * Initialize continuous monitoring system
   */
  async initializeMonitoring() {
    console.log('\n📡 Initializing Continuous Monitoring System');
    console.log('=============================================\n');

    // Setup monitoring targets
    await this.setupMonitoringTargets();

    // Initialize alert rules
    await this.initializeAlertRules();

    // Setup integrations
    await this.setupIntegrations();

    // Start monitoring loops
    await this.startMonitoring();

    console.log('✅ Continuous monitoring initialized and running');
  }

  /**
   * Setup monitoring targets
   */
  async setupMonitoringTargets() {
    console.log('🎯 Setting up monitoring targets...\n');

    // System health targets
    this.monitoringTargets.set('system-health', {
      name: 'System Health Monitor',
      type: 'system',
      interval: this.monitoringConfig.healthCheckIntervalMs,
      monitor: this.monitorSystemHealth.bind(this),
      alertOnFailure: true,
      criticalThreshold: 0.9
    });

    // MCP server health
    this.monitoringTargets.set('mcp-server', {
      name: 'MCP Server Health',
      type: 'service',
      interval: this.monitoringConfig.intervalMs,
      monitor: this.monitorMCPServer.bind(this),
      alertOnFailure: true,
      criticalThreshold: 0.95
    });

    // Test suite execution monitoring
    this.monitoringTargets.set('test-execution', {
      name: 'Test Execution Monitor',
      type: 'test',
      interval: this.monitoringConfig.intervalMs * 2,
      monitor: this.monitorTestExecution.bind(this),
      alertOnFailure: true,
      criticalThreshold: 0.8
    });

    // API endpoint health
    this.monitoringTargets.set('api-endpoints', {
      name: 'API Endpoint Health',
      type: 'api',
      interval: this.monitoringConfig.intervalMs,
      monitor: this.monitorAPIEndpoints.bind(this),
      alertOnFailure: true,
      criticalThreshold: 0.9
    });

    // Performance metrics
    this.monitoringTargets.set('performance-metrics', {
      name: 'Performance Metrics',
      type: 'performance',
      interval: this.monitoringConfig.intervalMs,
      monitor: this.monitorPerformanceMetrics.bind(this),
      alertOnFailure: false,
      criticalThreshold: null
    });

    // Error rate monitoring
    this.monitoringTargets.set('error-rate', {
      name: 'Error Rate Monitor',
      type: 'error',
      interval: this.monitoringConfig.intervalMs,
      monitor: this.monitorErrorRates.bind(this),
      alertOnFailure: true,
      criticalThreshold: 0.05
    });

    console.log(`✅ Setup ${this.monitoringTargets.size} monitoring targets`);
  }

  /**
   * Initialize alert rules
   */
  async initializeAlertRules() {
    console.log('🚨 Initializing alert rules...\n');

    // High error rate alert
    this.alertRules.set('high-error-rate', {
      name: 'High Error Rate Alert',
      condition: (metrics) => metrics.errorRate > this.thresholds.errorRate.critical,
      severity: 'critical',
      message: 'Error rate exceeds critical threshold',
      cooldownMs: 300000, // 5 minutes
      lastTriggered: null
    });

    // Low test success rate alert
    this.alertRules.set('low-test-success', {
      name: 'Low Test Success Rate',
      condition: (metrics) => metrics.testSuccessRate < this.thresholds.testSuccessRate.critical,
      severity: 'critical',
      message: 'Test success rate below critical threshold',
      cooldownMs: 600000, // 10 minutes
      lastTriggered: null
    });

    // High response time alert
    this.alertRules.set('high-response-time', {
      name: 'High Response Time',
      condition: (metrics) => metrics.averageResponseTime > this.thresholds.responseTime.critical,
      severity: 'warning',
      message: 'API response time exceeds threshold',
      cooldownMs: 180000, // 3 minutes
      lastTriggered: null
    });

    // System resource alerts
    this.alertRules.set('high-memory-usage', {
      name: 'High Memory Usage',
      condition: (metrics) => metrics.memoryUsage > this.thresholds.memoryUsage.critical,
      severity: 'warning',
      message: 'Memory usage exceeds critical threshold',
      cooldownMs: 300000,
      lastTriggered: null
    });

    this.alertRules.set('high-cpu-usage', {
      name: 'High CPU Usage',
      condition: (metrics) => metrics.cpuUsage > this.thresholds.cpuUsage.critical,
      severity: 'warning',
      message: 'CPU usage exceeds critical threshold',
      cooldownMs: 300000,
      lastTriggered: null
    });

    // Service availability alert
    this.alertRules.set('service-unavailable', {
      name: 'Service Unavailable',
      condition: (metrics) => metrics.serviceAvailability < 0.99,
      severity: 'critical',
      message: 'Service availability below acceptable threshold',
      cooldownMs: 60000, // 1 minute
      lastTriggered: null
    });

    console.log(`✅ Initialized ${this.alertRules.size} alert rules`);
  }

  /**
   * Setup monitoring integrations
   */
  async setupIntegrations() {
    console.log('🔗 Setting up monitoring integrations...\n');

    // Prometheus integration
    this.integrations.set('prometheus', {
      name: 'Prometheus Metrics',
      type: 'metrics',
      enabled: true,
      endpoint: '/metrics',
      exporter: this.exportPrometheusMetrics.bind(this),
      port: 9090
    });

    // Grafana dashboard integration
    this.integrations.set('grafana', {
      name: 'Grafana Dashboard',
      type: 'visualization',
      enabled: true,
      dashboardUrl: 'http://localhost:3000',
      exporter: this.exportGrafanaMetrics.bind(this)
    });

    // DataDog integration
    this.integrations.set('datadog', {
      name: 'DataDog Monitoring',
      type: 'apm',
      enabled: false, // Enable when API key is available
      apiKey: process.env.DATADOG_API_KEY,
      exporter: this.exportDataDogMetrics.bind(this)
    });

    // New Relic integration
    this.integrations.set('newrelic', {
      name: 'New Relic APM',
      type: 'apm',
      enabled: false, // Enable when license key is available
      licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
      exporter: this.exportNewRelicMetrics.bind(this)
    });

    // Slack alerting integration
    this.integrations.set('slack', {
      name: 'Slack Notifications',
      type: 'alerting',
      enabled: false, // Enable when webhook is configured
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      exporter: this.sendSlackAlert.bind(this)
    });

    // Email alerting integration
    this.integrations.set('email', {
      name: 'Email Notifications',
      type: 'alerting',
      enabled: false, // Enable when SMTP is configured
      smtpConfig: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      recipients: (process.env.ALERT_EMAILS || '').split(',').filter(Boolean),
      exporter: this.sendEmailAlert.bind(this)
    });

    const enabledIntegrations = Array.from(this.integrations.values()).filter(i => i.enabled).length;
    console.log(`✅ Setup ${this.integrations.size} integrations (${enabledIntegrations} enabled)`);
  }

  /**
   * Start monitoring loops
   */
  async startMonitoring() {
    if (this.status.isRunning) {
      console.log('⚠️  Monitoring already running');
      return;
    }

    console.log('▶️  Starting monitoring loops...\n');

    this.status.isRunning = true;

    // Start monitoring each target
    for (const [targetId, target] of this.monitoringTargets) {
      const intervalId = setInterval(async () => {
        try {
          await this.executeMonitoringCheck(targetId, target);
        } catch (error) {
          console.error(`❌ Monitoring error for ${targetId}:`, error.message);
          this.status.failedChecks++;
        }
      }, target.interval);

      this.activeMonitors.set(targetId, intervalId);
      console.log(`  📊 Started monitoring: ${target.name} (${target.interval}ms interval)`);
    }

    // Start metrics cleanup loop
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000); // Every hour

    console.log('\n✅ All monitoring loops started');
  }

  /**
   * Execute a monitoring check
   */
  async executeMonitoringCheck(targetId, target) {
    const startTime = Date.now();
    
    try {
      // Execute the monitor function
      const result = await target.monitor();
      
      const duration = Date.now() - startTime;
      this.status.totalChecks++;
      this.status.lastCheck = new Date().toISOString();

      // Store metrics
      this.storeMetrics(targetId, result, duration);

      // Check alert conditions
      if (target.alertOnFailure) {
        await this.checkAlertConditions(targetId, result);
      }

      // Emit monitoring event
      this.emit('monitoringCheck', {
        targetId,
        target: target.name,
        result,
        duration,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.status.failedChecks++;
      
      // Store error metrics
      this.storeErrorMetrics(targetId, error);

      // Emit error event
      this.emit('monitoringError', {
        targetId,
        target: target.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Store metrics in memory
   */
  storeMetrics(targetId, result, duration) {
    const timestamp = Date.now();
    
    if (!this.metrics.tests.has(targetId)) {
      this.metrics.tests.set(targetId, []);
    }

    const metrics = this.metrics.tests.get(targetId);
    metrics.push({
      timestamp,
      duration,
      result,
      success: result.success !== false
    });

    // Keep only recent metrics (last N entries)
    const maxEntries = 1000;
    if (metrics.length > maxEntries) {
      metrics.splice(0, metrics.length - maxEntries);
    }
  }

  /**
   * Store error metrics
   */
  storeErrorMetrics(targetId, error) {
    const timestamp = Date.now();
    
    if (!this.metrics.errors.has(targetId)) {
      this.metrics.errors.set(targetId, []);
    }

    const errors = this.metrics.errors.get(targetId);
    errors.push({
      timestamp,
      error: error.message,
      stack: error.stack
    });

    // Keep only recent errors
    const maxErrors = 100;
    if (errors.length > maxErrors) {
      errors.splice(0, errors.length - maxErrors);
    }
  }

  /**
   * Check alert conditions
   */
  async checkAlertConditions(targetId, result) {
    const currentMetrics = this.calculateCurrentMetrics(targetId, result);

    for (const [ruleId, rule] of this.alertRules) {
      try {
        // Check cooldown period
        if (rule.lastTriggered && Date.now() - rule.lastTriggered < rule.cooldownMs) {
          continue;
        }

        // Evaluate condition
        if (rule.condition(currentMetrics)) {
          await this.triggerAlert(ruleId, rule, currentMetrics, targetId);
        }
      } catch (error) {
        console.error(`❌ Alert rule evaluation error for ${ruleId}:`, error.message);
      }
    }
  }

  /**
   * Calculate current metrics for alert evaluation
   */
  calculateCurrentMetrics(targetId, result) {
    const recentMetrics = this.getRecentMetrics(targetId, 300000); // Last 5 minutes
    
    const metrics = {
      errorRate: this.calculateErrorRate(recentMetrics),
      averageResponseTime: this.calculateAverageResponseTime(recentMetrics),
      testSuccessRate: this.calculateTestSuccessRate(recentMetrics),
      serviceAvailability: this.calculateServiceAvailability(recentMetrics),
      memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
      cpuUsage: process.cpuUsage().user / (process.cpuUsage().user + process.cpuUsage().system)
    };

    // Add current result metrics
    if (result) {
      Object.assign(metrics, result);
    }

    return metrics;
  }

  /**
   * Get recent metrics for a target
   */
  getRecentMetrics(targetId, timeWindowMs) {
    const targetMetrics = this.metrics.tests.get(targetId) || [];
    const cutoff = Date.now() - timeWindowMs;
    
    return targetMetrics.filter(metric => metric.timestamp >= cutoff);
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(ruleId, rule, metrics, targetId) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ruleId,
      ruleName: rule.name,
      severity: rule.severity,
      message: rule.message,
      targetId,
      metrics,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    // Store alert
    this.metrics.alerts.set(alert.id, alert);
    this.status.alerts.push(alert);

    // Update rule trigger time
    rule.lastTriggered = Date.now();

    console.log(`🚨 ALERT TRIGGERED: ${rule.name} (${rule.severity.toUpperCase()})`);
    console.log(`   Target: ${targetId}`);
    console.log(`   Message: ${rule.message}`);

    // Send alert through integrations
    await this.sendAlert(alert);

    // Emit alert event
    this.emit('alert', alert);
  }

  /**
   * Send alert through configured integrations
   */
  async sendAlert(alert) {
    for (const [integrationId, integration] of this.integrations) {
      if (integration.enabled && integration.type === 'alerting') {
        try {
          await integration.exporter(alert);
        } catch (error) {
          console.error(`❌ Failed to send alert via ${integrationId}:`, error.message);
        }
      }
    }
  }

  /**
   * Individual monitoring functions
   */
  async monitorSystemHealth() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      success: true,
      memoryUsage: memUsage.heapUsed / memUsage.heapTotal,
      memoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      uptime: process.uptime(),
      timestamp: Date.now()
    };
  }

  async monitorMCPServer() {
    // Simulate MCP server health check
    try {
      // In a real implementation, this would check actual MCP server endpoints
      const responseTime = Math.random() * 1000 + 100; // Simulated response time
      const success = Math.random() > 0.05; // 95% success rate simulation
      
      return {
        success,
        responseTime,
        status: success ? 'healthy' : 'degraded',
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  async monitorTestExecution() {
    // Check for recent test executions and their success rates
    const recentTests = Array.from(this.metrics.tests.values())
      .flat()
      .filter(test => Date.now() - test.timestamp < 3600000) // Last hour
      .filter(test => test.result && typeof test.result.success === 'boolean');

    const successRate = recentTests.length > 0 ? 
      recentTests.filter(test => test.result.success).length / recentTests.length : 1;

    return {
      success: successRate >= this.thresholds.testSuccessRate.critical,
      testSuccessRate: successRate,
      recentTestCount: recentTests.length,
      timestamp: Date.now()
    };
  }

  async monitorAPIEndpoints() {
    // Simulate API endpoint health checks
    const endpoints = [
      '/papi/v1/properties',
      '/config-dns/v2/zones',
      '/cps/v2/enrollments'
    ];

    const results = [];
    for (const endpoint of endpoints) {
      const responseTime = Math.random() * 2000 + 200;
      const success = Math.random() > 0.02; // 98% success rate
      
      results.push({
        endpoint,
        success,
        responseTime,
        status: success ? 200 : 500
      });
    }

    const overallSuccess = results.every(r => r.success);
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    return {
      success: overallSuccess,
      averageResponseTime,
      endpointResults: results,
      timestamp: Date.now()
    };
  }

  async monitorPerformanceMetrics() {
    // Collect performance metrics
    const metrics = {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      eventLoopLag: this.measureEventLoopLag(),
      timestamp: Date.now()
    };

    return metrics;
  }

  async monitorErrorRates() {
    // Calculate error rates from recent metrics
    const allRecentMetrics = Array.from(this.metrics.tests.values())
      .flat()
      .filter(metric => Date.now() - metric.timestamp < 3600000); // Last hour

    const totalRequests = allRecentMetrics.length;
    const errorCount = allRecentMetrics.filter(metric => !metric.success).length;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

    return {
      success: errorRate <= this.thresholds.errorRate.critical,
      errorRate,
      totalRequests,
      errorCount,
      timestamp: Date.now()
    };
  }

  /**
   * Utility methods for metric calculations
   */
  calculateErrorRate(metrics) {
    if (metrics.length === 0) return 0;
    const errorCount = metrics.filter(m => !m.success).length;
    return errorCount / metrics.length;
  }

  calculateAverageResponseTime(metrics) {
    if (metrics.length === 0) return 0;
    const totalTime = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return totalTime / metrics.length;
  }

  calculateTestSuccessRate(metrics) {
    if (metrics.length === 0) return 1;
    const successCount = metrics.filter(m => m.success).length;
    return successCount / metrics.length;
  }

  calculateServiceAvailability(metrics) {
    if (metrics.length === 0) return 1;
    const availableCount = metrics.filter(m => m.result && m.result.success !== false).length;
    return availableCount / metrics.length;
  }

  measureEventLoopLag() {
    const start = process.hrtime.bigint();
    return setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
      return lag;
    });
  }

  /**
   * Integration exporters
   */
  async exportPrometheusMetrics() {
    const metrics = [];
    
    // System metrics
    const memUsage = process.memoryUsage();
    metrics.push(`node_memory_heap_used_bytes ${memUsage.heapUsed}`);
    metrics.push(`node_memory_heap_total_bytes ${memUsage.heapTotal}`);
    metrics.push(`node_uptime_seconds ${process.uptime()}`);

    // Test metrics
    let totalTests = 0;
    let successfulTests = 0;
    
    for (const [targetId, targetMetrics] of this.metrics.tests) {
      const recentMetrics = this.getRecentMetrics(targetId, 3600000); // Last hour
      totalTests += recentMetrics.length;
      successfulTests += recentMetrics.filter(m => m.success).length;
      
      if (recentMetrics.length > 0) {
        const avgResponseTime = this.calculateAverageResponseTime(recentMetrics);
        metrics.push(`test_average_response_time_ms{target="${targetId}"} ${avgResponseTime}`);
      }
    }

    if (totalTests > 0) {
      const successRate = successfulTests / totalTests;
      metrics.push(`test_success_rate ${successRate}`);
    }

    // Alert metrics
    const activeAlerts = this.status.alerts.filter(a => !a.resolved).length;
    metrics.push(`active_alerts_total ${activeAlerts}`);

    return metrics.join('\n');
  }

  async exportGrafanaMetrics() {
    // Export metrics in format suitable for Grafana
    const dashboardData = {
      dashboard: {
        title: 'Akamai MCP Monitoring',
        panels: [
          {
            title: 'Test Success Rate',
            type: 'stat',
            targets: [{ expr: 'test_success_rate' }]
          },
          {
            title: 'Response Time',
            type: 'graph',
            targets: [{ expr: 'test_average_response_time_ms' }]
          },
          {
            title: 'Memory Usage',
            type: 'graph',
            targets: [{ expr: 'node_memory_heap_used_bytes' }]
          }
        ]
      }
    };

    return dashboardData;
  }

  async exportDataDogMetrics(metrics) {
    if (!this.integrations.get('datadog').enabled) return;
    
    // Format metrics for DataDog API
    const ddMetrics = {
      series: [
        {
          metric: 'alecs.mcp.akamai.test.success_rate',
          points: [[Date.now() / 1000, metrics.testSuccessRate || 0]],
          tags: ['service:alecs-mcp-akamai', 'env:production']
        }
      ]
    };

    // In production, send to DataDog API
    console.log('📊 Would send to DataDog:', ddMetrics);
  }

  async exportNewRelicMetrics(metrics) {
    if (!this.integrations.get('newrelic').enabled) return;
    
    // Format metrics for New Relic
    const nrMetrics = {
      metrics: [
        {
          name: 'Custom/Akamai/MCP/TestSuccessRate',
          value: metrics.testSuccessRate || 0,
          timestamp: Date.now()
        }
      ]
    };

    console.log('📊 Would send to New Relic:', nrMetrics);
  }

  async sendSlackAlert(alert) {
    if (!this.integrations.get('slack').enabled) return;
    
    const slackMessage = {
      text: `🚨 Alert: ${alert.ruleName}`,
      attachments: [
        {
          color: alert.severity === 'critical' ? 'danger' : 'warning',
          fields: [
            { title: 'Target', value: alert.targetId, short: true },
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
            { title: 'Message', value: alert.message, short: false },
            { title: 'Time', value: new Date(alert.timestamp).toLocaleString(), short: true }
          ]
        }
      ]
    };

    console.log('📱 Would send Slack alert:', slackMessage);
  }

  async sendEmailAlert(alert) {
    if (!this.integrations.get('email').enabled) return;
    
    const emailContent = {
      subject: `🚨 Alert: ${alert.ruleName}`,
      html: `
        <h2>Alert Notification</h2>
        <p><strong>Rule:</strong> ${alert.ruleName}</p>
        <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
        <p><strong>Target:</strong> ${alert.targetId}</p>
        <p><strong>Message:</strong> ${alert.message}</p>
        <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
      `
    };

    console.log('📧 Would send email alert:', emailContent);
  }

  /**
   * Cleanup old metrics
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - (this.monitoringConfig.metricsRetentionDays * 24 * 60 * 60 * 1000);
    
    for (const [targetId, metrics] of this.metrics.tests) {
      const filteredMetrics = metrics.filter(metric => metric.timestamp >= cutoff);
      this.metrics.tests.set(targetId, filteredMetrics);
    }

    for (const [targetId, errors] of this.metrics.errors) {
      const filteredErrors = errors.filter(error => error.timestamp >= cutoff);
      this.metrics.errors.set(targetId, filteredErrors);
    }

    console.log('🧹 Cleaned up old metrics');
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    if (!this.status.isRunning) {
      console.log('⚠️  Monitoring not running');
      return;
    }

    console.log('⏹️  Stopping monitoring...');

    // Clear all intervals
    for (const [targetId, intervalId] of this.activeMonitors) {
      clearInterval(intervalId);
    }

    this.activeMonitors.clear();
    this.status.isRunning = false;

    console.log('✅ Monitoring stopped');
  }

  /**
   * Get monitoring status and metrics
   */
  getMonitoringStatus() {
    const recentAlerts = this.status.alerts.filter(alert => 
      Date.now() - new Date(alert.timestamp).getTime() < 3600000); // Last hour

    return {
      isRunning: this.status.isRunning,
      lastCheck: this.status.lastCheck,
      totalChecks: this.status.totalChecks,
      failedChecks: this.status.failedChecks,
      successRate: this.status.totalChecks > 0 ? 
        ((this.status.totalChecks - this.status.failedChecks) / this.status.totalChecks) * 100 : 100,
      activeMonitors: this.activeMonitors.size,
      recentAlerts: recentAlerts.length,
      enabledIntegrations: Array.from(this.integrations.values()).filter(i => i.enabled).length
    };
  }

  /**
   * Generate monitoring report
   */
  async generateMonitoringReport() {
    console.log('\n📊 Generating Monitoring Report...\n');

    const report = {
      timestamp: new Date().toISOString(),
      status: this.getMonitoringStatus(),
      metrics: {
        totalTargets: this.monitoringTargets.size,
        activeMonitors: this.activeMonitors.size,
        totalAlerts: this.status.alerts.length,
        recentAlerts: this.status.alerts.filter(a => 
          Date.now() - new Date(a.timestamp).getTime() < 86400000).length, // Last 24 hours
      },
      targets: Array.from(this.monitoringTargets.entries()).map(([id, target]) => ({
        id,
        name: target.name,
        type: target.type,
        interval: target.interval,
        isActive: this.activeMonitors.has(id),
        recentChecks: this.getRecentMetrics(id, 3600000).length,
        successRate: this.calculateTestSuccessRate(this.getRecentMetrics(id, 3600000))
      })),
      integrations: Array.from(this.integrations.entries()).map(([id, integration]) => ({
        id,
        name: integration.name,
        type: integration.type,
        enabled: integration.enabled
      })),
      recentAlerts: this.status.alerts
        .filter(a => Date.now() - new Date(a.timestamp).getTime() < 86400000)
        .slice(0, 10) // Latest 10 alerts
    };

    // Save report
    const reportDir = path.join(__dirname, '../reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const filename = `monitoring-report-${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(
      path.join(reportDir, filename),
      JSON.stringify(report, null, 2)
    );

    console.log('📈 Monitoring Report Summary:');
    console.log(`  Status: ${report.status.isRunning ? 'Running' : 'Stopped'}`);
    console.log(`  Success Rate: ${report.status.successRate.toFixed(1)}%`);
    console.log(`  Active Monitors: ${report.status.activeMonitors}`);
    console.log(`  Recent Alerts: ${report.status.recentAlerts}`);
    console.log(`  Enabled Integrations: ${report.status.enabledIntegrations}`);

    console.log(`\n📄 Report saved: ${filename}`);
    return report;
  }
}

// Export for use in other modules
module.exports = {
  ContinuousMonitor
};

// Demonstration
if (require.main === module) {
  async function demonstrateContinuousMonitoring() {
    const monitor = new ContinuousMonitor();
    
    try {
      await monitor.initializeMonitoring();
      
      // Let it run for a bit
      console.log('\n⏳ Running monitoring for 30 seconds...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Generate report
      await monitor.generateMonitoringReport();
      
      // Stop monitoring
      await monitor.stopMonitoring();
      
      console.log('\n🎉 Continuous monitoring demonstration completed');
    } catch (error) {
      console.error('❌ Demonstration failed:', error);
    }
  }

  demonstrateContinuousMonitoring().catch(console.error);
}