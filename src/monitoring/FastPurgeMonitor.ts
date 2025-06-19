import { FastPurgeService } from '@services/FastPurgeService';
import { PurgeQueueManager } from '@services/PurgeQueueManager';
import { PurgeStatusTracker } from '@services/PurgeStatusTracker';
import { CustomerConfigManager } from '@utils/customer-config';
import { logger } from '@utils/logger';

export interface FastPurgeMetrics {
  timestamp: Date;
  customer: string;
  successRate: number;
  averageCompletionTime: number;
  rateLimitUtilization: number;
  queueDepth: number;
  throughput: number;
  errorRate: number;
  costMetrics: {
    operationsToday: number;
    projectedMonthly: number;
    efficiency: number;
  };
}

export interface AlertCondition {
  id: string;
  name: string;
  condition: (metrics: FastPurgeMetrics) => boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    fastPurgeApi: 'healthy' | 'degraded' | 'unhealthy';
    queueManager: 'healthy' | 'degraded' | 'unhealthy';
    statusTracker: 'healthy' | 'degraded' | 'unhealthy';
    rateLimiting: 'healthy' | 'degraded' | 'unhealthy';
  };
  details: {
    apiLatency: number;
    queueProcessingRate: number;
    errorRate: number;
    rateLimitHealth: number;
  };
  recommendations: string[];
}

export interface CapacityPlan {
  customer: string;
  currentUsage: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  projectedUsage: {
    nextWeek: number;
    nextMonth: number;
    nextQuarter: number;
  };
  recommendations: {
    rateLimitOptimization: string[];
    batchingImprovements: string[];
    costOptimization: string[];
  };
  alerts: string[];
}

export class FastPurgeMonitor {
  private static instance: FastPurgeMonitor;
  private fastPurgeService: FastPurgeService;
  private queueManager: PurgeQueueManager;
  private statusTracker: PurgeStatusTracker;
  private configManager: CustomerConfigManager;
  private metrics: Map<string, FastPurgeMetrics[]> = new Map();
  private alertConditions: AlertCondition[] = [];
  private isCollecting = false;
  private collectionInterval?: NodeJS.Timeout;

  private constructor() {
    this.fastPurgeService = FastPurgeService.getInstance();
    this.queueManager = PurgeQueueManager.getInstance();
    this.statusTracker = PurgeStatusTracker.getInstance();
    this.configManager = CustomerConfigManager.getInstance();
    this.initializeAlertConditions();
  }

  static getInstance(): FastPurgeMonitor {
    if (!FastPurgeMonitor.instance) {
      FastPurgeMonitor.instance = new FastPurgeMonitor();
    }
    return FastPurgeMonitor.instance;
  }

  private initializeAlertConditions(): void {
    this.alertConditions = [
      {
        id: 'success_rate_critical',
        name: 'Success Rate Critical',
        condition: (metrics) => metrics.successRate < 95,
        severity: 'critical',
        message: 'FastPurge success rate below 95%',
        cooldownMinutes: 15,
      },
      {
        id: 'queue_backup',
        name: 'Queue Backup',
        condition: (metrics) => metrics.queueDepth > 1000,
        severity: 'warning',
        message: 'FastPurge queue backup exceeding 1000 operations',
        cooldownMinutes: 10,
      },
      {
        id: 'rate_limit_high',
        name: 'Rate Limit High Usage',
        condition: (metrics) => metrics.rateLimitUtilization > 80,
        severity: 'warning',
        message: 'Rate limit consumption above 80%',
        cooldownMinutes: 5,
      },
      {
        id: 'error_rate_high',
        name: 'High Error Rate',
        condition: (metrics) => metrics.errorRate > 10,
        severity: 'critical',
        message: 'FastPurge error rate above 10%',
        cooldownMinutes: 10,
      },
      {
        id: 'api_degradation',
        name: 'API Response Degradation',
        condition: (metrics) => metrics.averageCompletionTime > 15,
        severity: 'warning',
        message: 'Average completion time exceeding 15 seconds',
        cooldownMinutes: 15,
      },
    ];
  }

  async startCollection(intervalMs = 60000): Promise<void> {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    logger.info('Starting FastPurge metrics collection');

    this.collectionInterval = setInterval(async () => {
      await this.collectMetrics();
    }, intervalMs);

    // Initial collection
    await this.collectMetrics();
  }

  async stopCollection(): Promise<void> {
    this.isCollecting = false;
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }
    logger.info('Stopped FastPurge metrics collection');
  }

  private async collectMetrics(): Promise<void> {
    try {
      const customers = await this.configManager.getCustomers();

      for (const customer of customers) {
        const metrics = await this.generateMetrics(customer);

        // Store metrics
        if (!this.metrics.has(customer)) {
          this.metrics.set(customer, []);
        }

        const customerMetrics = this.metrics.get(customer)!;
        customerMetrics.push(metrics);

        // Keep only last 24 hours of metrics
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        this.metrics.set(
          customer,
          customerMetrics.filter((m) => m.timestamp.getTime() > cutoff),
        );

        // Check alerts
        await this.checkAlerts(metrics);
      }
    } catch (error: any) {
      logger.error(`Failed to collect FastPurge metrics: ${error.message}`);
    }
  }

  private async generateMetrics(customer: string): Promise<FastPurgeMetrics> {
    const dashboard = await this.statusTracker.getCustomerDashboard(customer);
    const queueStats = await this.queueManager.getQueueStatus(customer);
    const rateLimitStatus = this.fastPurgeService.getRateLimitStatus(customer);

    // Calculate cost metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const operationsToday = dashboard.completedToday;
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const projectedMonthly = (operationsToday / today.getDate()) * daysInMonth;

    return {
      timestamp: new Date(),
      customer,
      successRate: dashboard.performance.successRate,
      averageCompletionTime: dashboard.averageCompletionTime,
      rateLimitUtilization: ((100 - rateLimitStatus.available) / 100) * 100,
      queueDepth: queueStats.queueDepth,
      throughput: dashboard.performance.throughput,
      errorRate: 100 - dashboard.performance.successRate,
      costMetrics: {
        operationsToday,
        projectedMonthly,
        efficiency: this.calculateEfficiency(dashboard),
      },
    };
  }

  private calculateEfficiency(dashboard: any): number {
    // Calculate efficiency based on success rate, throughput, and average latency
    const successWeight = dashboard.performance.successRate;
    const throughputWeight = Math.min(100, dashboard.performance.throughput);
    const latencyWeight = Math.max(0, 100 - dashboard.averageCompletionTime);

    return successWeight * 0.5 + throughputWeight * 0.3 + latencyWeight * 0.2;
  }

  private async checkAlerts(metrics: FastPurgeMetrics): Promise<void> {
    for (const condition of this.alertConditions) {
      if (condition.condition(metrics)) {
        const now = new Date();
        const lastTriggered = condition.lastTriggered;

        if (
          !lastTriggered ||
          now.getTime() - lastTriggered.getTime() > condition.cooldownMinutes * 60 * 1000
        ) {
          condition.lastTriggered = now;
          await this.triggerAlert(condition, metrics);
        }
      }
    }
  }

  private async triggerAlert(condition: AlertCondition, metrics: FastPurgeMetrics): Promise<void> {
    const alert = {
      timestamp: new Date(),
      customer: metrics.customer,
      severity: condition.severity,
      condition: condition.name,
      message: condition.message,
      metrics: {
        successRate: metrics.successRate,
        queueDepth: metrics.queueDepth,
        rateLimitUtilization: metrics.rateLimitUtilization,
        errorRate: metrics.errorRate,
      },
    };

    logger.warn(
      `FastPurge Alert [${condition.severity.toUpperCase()}] ${metrics.customer}: ${condition.message}`,
      alert,
    );

    // In a production environment, you would send this to your alerting system
    // Examples: PagerDuty, Slack, email, etc.
  }

  async getHealthCheck(
    customer?: string,
  ): Promise<HealthCheckResult | Map<string, HealthCheckResult>> {
    if (customer) {
      return this.performHealthCheck(customer);
    } else {
      const customers = await this.configManager.getCustomers();
      const results = new Map<string, HealthCheckResult>();

      for (const cust of customers) {
        results.set(cust, await this.performHealthCheck(cust));
      }

      return results;
    }
  }

  private async performHealthCheck(customer: string): Promise<HealthCheckResult> {
    const dashboard = await this.statusTracker.getCustomerDashboard(customer);
    const queueStats = await this.queueManager.getQueueStatus(customer);
    const rateLimitStatus = this.fastPurgeService.getRateLimitStatus(customer);

    // Test API connectivity
    let apiLatency = 0;
    let apiHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      const start = Date.now();
      await this.fastPurgeService.getRateLimitStatus(customer);
      apiLatency = Date.now() - start;

      if (apiLatency > 5000) {
apiHealth = 'unhealthy';
} else if (apiLatency > 2000) {
apiHealth = 'degraded';
}
    } catch (error) {
      apiHealth = 'unhealthy';
      apiLatency = -1;
    }

    // Assess queue health
    const queueHealth: 'healthy' | 'unhealthy' | 'degraded' =
      queueStats.failed > queueStats.completed * 0.1 ? 'degraded' : 'healthy';

    // Assess status tracker health
    const statusHealth: 'healthy' | 'unhealthy' | 'degraded' =
      dashboard.performance.successRate < 95 ? 'degraded' : 'healthy';

    // Assess rate limiting health
    const rateLimitHealth: 'healthy' | 'unhealthy' | 'degraded' =
      rateLimitStatus.available < 10 ? 'degraded' : 'healthy';

    const components = {
      fastPurgeApi: apiHealth,
      queueManager: queueHealth,
      statusTracker: statusHealth,
      rateLimiting: rateLimitHealth,
    };

    // Determine overall health
    const healthScores = Object.values(components);
    const overall = healthScores.includes('unhealthy')
      ? 'unhealthy'
      : healthScores.includes('degraded')
        ? 'degraded'
        : 'healthy';

    const recommendations: string[] = [];

    if (apiHealth === 'degraded') {
      recommendations.push('API response times are elevated - consider reducing batch sizes');
    }
    if (queueHealth === 'degraded') {
      recommendations.push('High queue failure rate - check error logs and reduce load');
    }
    if (rateLimitHealth === 'degraded') {
      recommendations.push('Rate limit capacity low - implement queue-based processing');
    }
    if (dashboard.performance.successRate < 98) {
      recommendations.push('Success rate below optimal - review error patterns');
    }

    return {
      overall,
      components,
      details: {
        apiLatency,
        queueProcessingRate: queueStats.throughputRate,
        errorRate: 100 - dashboard.performance.successRate,
        rateLimitHealth: rateLimitStatus.available,
      },
      recommendations,
    };
  }

  async getMetricsSummary(customer: string, hoursBack = 24): Promise<any> {
    const customerMetrics = this.metrics.get(customer) || [];
    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
    const recentMetrics = customerMetrics.filter((m) => m.timestamp.getTime() > cutoff);

    if (recentMetrics.length === 0) {
      return {
        customer,
        message: 'No metrics available for the specified time period',
        hoursBack,
      };
    }

    // Calculate aggregated metrics
    const avgSuccessRate =
      recentMetrics.reduce((sum, m) => sum + m.successRate, 0) / recentMetrics.length;
    const avgCompletionTime =
      recentMetrics.reduce((sum, m) => sum + m.averageCompletionTime, 0) / recentMetrics.length;
    const maxQueueDepth = Math.max(...recentMetrics.map((m) => m.queueDepth));
    const totalThroughput = recentMetrics.reduce((sum, m) => sum + m.throughput, 0);

    return {
      customer,
      timeRange: `${hoursBack} hours`,
      summary: {
        averageSuccessRate: Math.round(avgSuccessRate * 100) / 100,
        averageCompletionTime: Math.round(avgCompletionTime * 100) / 100,
        maxQueueDepth,
        totalThroughput,
        dataPoints: recentMetrics.length,
      },
      trends: {
        successRateTrend: this.calculateTrend(recentMetrics.map((m) => m.successRate)),
        throughputTrend: this.calculateTrend(recentMetrics.map((m) => m.throughput)),
        latencyTrend: this.calculateTrend(recentMetrics.map((m) => m.averageCompletionTime)),
      },
      costAnalysis: {
        totalOperations: recentMetrics[recentMetrics.length - 1]?.costMetrics.operationsToday || 0,
        projectedMonthly:
          recentMetrics[recentMetrics.length - 1]?.costMetrics.projectedMonthly || 0,
        efficiency: recentMetrics[recentMetrics.length - 1]?.costMetrics.efficiency || 0,
      },
    };
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) {
return 'stable';
}

    const first = values.slice(0, Math.ceil(values.length / 2));
    const second = values.slice(Math.floor(values.length / 2));

    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;

    const diff = secondAvg - firstAvg;
    const threshold = firstAvg * 0.05; // 5% threshold

    if (diff > threshold) {
return 'increasing';
}
    if (diff < -threshold) {
return 'decreasing';
}
    return 'stable';
  }

  async generateCapacityPlan(customer: string): Promise<CapacityPlan> {
    const dashboard = await this.statusTracker.getCustomerDashboard(customer);
    const customerMetrics = this.metrics.get(customer) || [];

    // Calculate usage patterns
    const daily = dashboard.completedToday;
    const weekly = customerMetrics
      .filter((m) => Date.now() - m.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000)
      .reduce((sum, m) => sum + m.costMetrics.operationsToday, 0);
    const monthly = customerMetrics
      .filter((m) => Date.now() - m.timestamp.getTime() < 30 * 24 * 60 * 60 * 1000)
      .reduce((sum, m) => sum + m.costMetrics.operationsToday, 0);

    // Project future usage based on trends
    const growthRate = this.calculateGrowthRate(customerMetrics);
    const nextWeek = weekly * (1 + growthRate);
    const nextMonth = monthly * (1 + growthRate);
    const nextQuarter = monthly * 3 * (1 + growthRate * 3);

    const recommendations = {
      rateLimitOptimization: [] as string[],
      batchingImprovements: [] as string[],
      costOptimization: [] as string[],
    };

    const alerts: string[] = [];

    // Generate recommendations
    if (dashboard.rateLimitUtilization > 70) {
      recommendations.rateLimitOptimization.push(
        'Implement queue-based processing to handle rate limits',
      );
      recommendations.rateLimitOptimization.push(
        'Consider spreading operations across multiple time periods',
      );
    }

    if (dashboard.performance.averageLatency > 10) {
      recommendations.batchingImprovements.push('Optimize batch sizes for better throughput');
      recommendations.batchingImprovements.push(
        'Review object size distribution for batching efficiency',
      );
    }

    if (growthRate > 0.5) {
      recommendations.costOptimization.push(
        'High growth rate detected - consider cache tag optimization',
      );
      alerts.push('Rapid usage growth may impact costs');
    }

    return {
      customer,
      currentUsage: { daily, weekly, monthly },
      projectedUsage: { nextWeek, nextMonth, nextQuarter },
      recommendations,
      alerts,
    };
  }

  private calculateGrowthRate(metrics: FastPurgeMetrics[]): number {
    if (metrics.length < 2) {
return 0;
}

    const recent = metrics.slice(-7); // Last 7 data points
    const older = metrics.slice(-14, -7); // Previous 7 data points

    if (older.length === 0) {
return 0;
}

    const recentAvg =
      recent.reduce((sum, m) => sum + m.costMetrics.operationsToday, 0) / recent.length;
    const olderAvg =
      older.reduce((sum, m) => sum + m.costMetrics.operationsToday, 0) / older.length;

    return olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
  }

  async resetMetrics(customer?: string): Promise<void> {
    if (customer) {
      this.metrics.delete(customer);
      logger.info(`Reset metrics for customer ${customer}`);
    } else {
      this.metrics.clear();
      logger.info('Reset all FastPurge metrics');
    }
  }

  async exportMetrics(customer: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const customerMetrics = this.metrics.get(customer) || [];

    if (format === 'csv') {
      const headers = [
        'timestamp',
        'customer',
        'successRate',
        'averageCompletionTime',
        'rateLimitUtilization',
        'queueDepth',
        'throughput',
        'errorRate',
        'operationsToday',
        'projectedMonthly',
        'efficiency',
      ];

      const rows = customerMetrics.map((m) => [
        m.timestamp.toISOString(),
        m.customer,
        m.successRate,
        m.averageCompletionTime,
        m.rateLimitUtilization,
        m.queueDepth,
        m.throughput,
        m.errorRate,
        m.costMetrics.operationsToday,
        m.costMetrics.projectedMonthly,
        m.costMetrics.efficiency,
      ]);

      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    } else {
      return JSON.stringify(customerMetrics, null, 2);
    }
  }
}
