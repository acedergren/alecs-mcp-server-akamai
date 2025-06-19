# Critical Features Implementation Plan

## Feature 1: Enhanced EdgeGrid Authentication with Auto-Recovery

### Problem Statement

- 15+ Stack Overflow questions about "Invalid timestamp" errors
- Complete automation blockage when auth fails
- Manual intervention required to fix system time

### Implementation Details

#### 1.1 Automatic Timestamp Synchronization

```typescript
// src/auth/enhanced-edgegrid-auth.ts
import { execSync } from 'child_process';
import { EdgeGridAuth } from './edgegrid-auth';

export class EnhancedEdgeGridAuth extends EdgeGridAuth {
  private lastSyncTime: number = 0;
  private syncInterval: number = 3600000; // 1 hour

  async authenticate(request: Request): Promise<AuthHeaders> {
    try {
      return await super.authenticate(request);
    } catch (error) {
      if (this.isTimestampError(error)) {
        await this.syncSystemTime();
        // Retry with synchronized time
        return await super.authenticate(request);
      }
      throw error;
    }
  }

  private isTimestampError(error: any): boolean {
    const timestampErrors = [
      'Invalid timestamp',
      'Timestamp outside valid range',
      'Request timestamp too far in past',
    ];
    return timestampErrors.some(
      (msg) => error.message?.includes(msg) || error.response?.data?.detail?.includes(msg),
    );
  }

  private async syncSystemTime(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSyncTime < this.syncInterval) {
      return; // Recently synced
    }

    try {
      // Get Akamai's server time from response headers
      const akamaiTime = await this.getAkamaiServerTime();
      const localTime = new Date().getTime();
      const drift = Math.abs(akamaiTime - localTime);

      if (drift > 30000) {
        // 30 seconds drift
        logger.warn(`System time drift detected: ${drift}ms`);

        // Platform-specific time sync
        if (process.platform === 'linux') {
          execSync('sudo ntpdate -s time.nist.gov');
        } else if (process.platform === 'darwin') {
          execSync('sudo sntp -sS time.apple.com');
        } else if (process.platform === 'win32') {
          execSync('w32tm /resync');
        }

        this.lastSyncTime = Date.now();
        logger.info('System time synchronized');
      }
    } catch (error) {
      logger.error('Failed to sync time, using offset adjustment', error);
      // Fall back to offset adjustment
      this.timeOffset = akamaiTime - localTime;
    }
  }
}
```

#### 1.2 New Diagnostic Tool

```typescript
// src/tools/auth-diagnostic-tool.ts
export const diagnoseAuthIssues: Tool = {
  name: 'diagnose-auth-issues',
  description: 'Diagnose and fix EdgeGrid authentication problems',

  async execute(args: { testEndpoint?: string }): Promise<ToolResponse> {
    const diagnostics = {
      systemTime: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      edgercPath: process.env.AKAMAI_EDGERC || '~/.edgerc',
      issues: [],
      fixes: [],
    };

    // Check 1: System time accuracy
    const akamaiTime = await getAkamaiServerTime();
    const drift = Math.abs(akamaiTime - Date.now());
    if (drift > 30000) {
      diagnostics.issues.push({
        severity: 'critical',
        issue: 'System time drift',
        details: `System time is off by ${drift}ms`,
        fix: 'Run: sudo ntpdate -s time.nist.gov',
      });
    }

    // Check 2: EdgeRC file permissions
    const stats = await fs.stat(diagnostics.edgercPath);
    if (stats.mode & 0o077) {
      diagnostics.issues.push({
        severity: 'high',
        issue: 'Insecure .edgerc permissions',
        details: '.edgerc file is readable by others',
        fix: 'Run: chmod 600 ~/.edgerc',
      });
    }

    // Check 3: Credential format
    const creds = await parseEdgeRc();
    for (const [section, config] of Object.entries(creds)) {
      if (!config.client_token || !config.client_secret) {
        diagnostics.issues.push({
          severity: 'critical',
          issue: `Invalid credentials in [${section}]`,
          details: 'Missing required fields',
          fix: 'Regenerate credentials in Akamai Control Center',
        });
      }
    }

    // Check 4: Test authentication
    if (args.testEndpoint) {
      try {
        await makeAuthenticatedRequest(args.testEndpoint);
        diagnostics.fixes.push('Authentication test passed');
      } catch (error) {
        diagnostics.issues.push({
          severity: 'critical',
          issue: 'Authentication test failed',
          details: error.message,
          fix: 'Check credentials and system time',
        });
      }
    }

    return {
      type: 'diagnostic-report',
      content: diagnostics,
      _meta: {
        'alecs/diagnostic-version': '1.0',
        'alecs/run-fixes': diagnostics.issues.length > 0,
      },
    };
  },
};
```

## Feature 2: Intelligent Rate Limit Handler

### Problem Statement

- 60/40/20 requests per minute limits cause automation failures
- No built-in queuing or retry logic
- Batch operations fail midway through

### Implementation Details

#### 2.1 Adaptive Rate Limiter

```typescript
// src/services/rate-limit-manager.ts
interface RateLimitConfig {
  endpoint: string;
  limit: number;
  window: number; // in seconds
  priority: number;
}

export class RateLimitManager {
  private queues = new Map<string, PriorityQueue<QueuedRequest>>();
  private counters = new Map<string, RateLimitCounter>();

  // Akamai's documented rate limits
  private limits: RateLimitConfig[] = [
    { endpoint: '/papi/v1/properties', limit: 60, window: 60, priority: 1 },
    { endpoint: '/papi/v1/contracts', limit: 60, window: 60, priority: 2 },
    { endpoint: '/ccu/v3/delete', limit: 40, window: 60, priority: 1 },
    { endpoint: '/cps/v2/enrollments', limit: 20, window: 60, priority: 1 },
    // Default for unknown endpoints
    { endpoint: '*', limit: 20, window: 60, priority: 3 },
  ];

  async executeWithRateLimit<T>(
    request: AkamaiRequest,
    priority: Priority = Priority.NORMAL,
  ): Promise<T> {
    const endpoint = this.getEndpointPattern(request.path);
    const limit = this.getRateLimit(endpoint);

    // Check if we can execute immediately
    if (this.canExecute(endpoint)) {
      return this.execute(request);
    }

    // Queue the request
    return this.enqueue(request, endpoint, priority);
  }

  private async execute<T>(request: AkamaiRequest): Promise<T> {
    const endpoint = this.getEndpointPattern(request.path);
    this.incrementCounter(endpoint);

    try {
      const response = await this.client.request(request);

      // Learn from rate limit headers
      this.updateLimitsFromHeaders(endpoint, response.headers);

      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited - get retry after
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60');

        // Update our limits based on actual API response
        this.adjustLimits(endpoint, retryAfter);

        // Re-queue with higher priority
        return this.enqueue(request, endpoint, Priority.HIGH);
      }
      throw error;
    }
  }

  private canExecute(endpoint: string): boolean {
    const counter = this.counters.get(endpoint);
    if (!counter) return true;

    const limit = this.getRateLimit(endpoint);
    const windowStart = Date.now() - limit.window * 1000;
    const recentRequests = counter.requests.filter((time) => time > windowStart).length;

    return recentRequests < limit.limit;
  }

  private async processQueue(endpoint: string): Promise<void> {
    const queue = this.queues.get(endpoint);
    if (!queue || queue.isEmpty()) return;

    while (!queue.isEmpty() && this.canExecute(endpoint)) {
      const item = queue.dequeue();
      if (item) {
        this.execute(item.request).then(item.resolve).catch(item.reject);

        // Adaptive delay based on remaining capacity
        const delay = this.calculateDelay(endpoint);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Schedule next processing
    if (!queue.isEmpty()) {
      setTimeout(() => this.processQueue(endpoint), 1000);
    }
  }

  private calculateDelay(endpoint: string): number {
    const limit = this.getRateLimit(endpoint);
    const utilization = this.getUtilization(endpoint);

    // Adaptive delay: slow down as we approach limits
    if (utilization > 0.8) {
      return ((limit.window * 1000) / limit.limit) * 2; // Double spacing
    } else if (utilization > 0.6) {
      return ((limit.window * 1000) / limit.limit) * 1.5; // 1.5x spacing
    }
    return (limit.window * 1000) / limit.limit; // Even spacing
  }
}
```

#### 2.2 Batch Operations Tool

```typescript
// src/tools/batch-operations-tool.ts
export const batchOperations: Tool = {
  name: 'batch-operations',
  description: 'Execute operations in batches with rate limit management',

  async *execute(args: {
    operations: Operation[];
    batchSize?: number;
    priority?: 'high' | 'normal' | 'low';
  }): AsyncGenerator<ToolResponse> {
    const rateLimiter = RateLimitManager.getInstance();
    const batchSize = args.batchSize || 10;
    const priority = args.priority || 'normal';

    // Group operations by endpoint to optimize rate limits
    const grouped = this.groupByEndpoint(args.operations);

    yield {
      type: 'progress',
      content: {
        status: 'starting',
        total: args.operations.length,
        message: `Processing ${args.operations.length} operations in batches of ${batchSize}`,
      },
    };

    let completed = 0;
    const results = [];

    for (const [endpoint, operations] of grouped.entries()) {
      // Process each endpoint group in parallel batches
      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);

        const batchPromises = batch.map((op) =>
          rateLimiter
            .executeWithRateLimit(op, priority)
            .then((result) => {
              completed++;
              return { success: true, operation: op, result };
            })
            .catch((error) => {
              completed++;
              return { success: false, operation: op, error };
            }),
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        yield {
          type: 'progress',
          content: {
            status: 'processing',
            completed,
            total: args.operations.length,
            currentBatch: Math.floor(i / batchSize) + 1,
            totalBatches: Math.ceil(operations.length / batchSize),
            endpoint,
            successes: batchResults.filter((r) => r.success).length,
            failures: batchResults.filter((r) => !r.success).length,
          },
        };
      }
    }

    yield {
      type: 'complete',
      content: {
        status: 'complete',
        total: args.operations.length,
        successes: results.filter((r) => r.success).length,
        failures: results.filter((r) => !r.success).length,
        results,
      },
      _meta: {
        'alecs/execution-time': Date.now() - startTime,
        'alecs/rate-limit-delays': rateLimiter.getTotalDelay(),
      },
    };
  },
};
```

## Feature 3: Property Activation Monitor with Streaming

### Problem Statement

- 15-minute production activations with no progress visibility
- Users repeatedly check status manually
- No way to track multiple activations

### Implementation Details

#### 3.1 Streaming Activation Service

```typescript
// src/services/activation-streaming-service.ts
export class ActivationStreamingService {
  private activeMonitors = new Map<string, ActivationMonitor>();

  async *streamActivationStatus(
    propertyId: string,
    version: number,
    network: 'STAGING' | 'PRODUCTION',
  ): AsyncGenerator<ActivationStatus> {
    const activationId = `${propertyId}_v${version}_${network}`;

    // Start activation
    const activation = await this.startActivation(propertyId, version, network);

    // Create monitor
    const monitor = new ActivationMonitor(activation);
    this.activeMonitors.set(activationId, monitor);

    try {
      // Initial status
      yield {
        type: 'activation-started',
        activationId: activation.activationId,
        propertyId,
        version,
        network,
        status: 'PENDING',
        progress: 0,
        phase: 'initialization',
        estimatedTime: this.estimateActivationTime(network),
        startTime: new Date().toISOString(),
      };

      // Poll for updates
      while (!monitor.isComplete()) {
        const status = await monitor.checkStatus();

        yield {
          type: 'activation-progress',
          activationId: activation.activationId,
          status: status.status,
          progress: this.calculateProgress(status),
          phase: this.determinePhase(status),
          message: status.message,
          estimatedTimeRemaining: this.estimateTimeRemaining(status),
          elapsedTime: Date.now() - monitor.startTime,
          details: {
            serversUpdated: status.serversUpdated || 0,
            totalServers: status.totalServers || 0,
            regions: status.regions || [],
          },
        };

        // Adaptive polling - slow down as we get closer to completion
        const pollInterval = this.calculatePollInterval(status);
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      // Final status
      const finalStatus = await monitor.getFinalStatus();
      yield {
        type: 'activation-complete',
        activationId: activation.activationId,
        status: finalStatus.status,
        progress: 100,
        phase: 'complete',
        totalTime: Date.now() - monitor.startTime,
        result: finalStatus.status === 'ACTIVE' ? 'success' : 'failed',
        message: finalStatus.message,
        activationLink: finalStatus.activationLink,
      };
    } finally {
      this.activeMonitors.delete(activationId);
    }
  }

  private calculateProgress(status: ActivationStatus): number {
    // Intelligent progress calculation based on phase and time
    const phases = {
      initialization: { weight: 5, duration: 30 },
      validation: { weight: 15, duration: 120 },
      distribution: { weight: 40, duration: 300 },
      propagation: { weight: 30, duration: 400 },
      verification: { weight: 10, duration: 60 },
    };

    const currentPhase = this.determinePhase(status);
    const phaseConfig = phases[currentPhase];

    if (!phaseConfig) return 0;

    // Calculate progress within phase
    const phaseProgress = Math.min((status.elapsedTime / (phaseConfig.duration * 1000)) * 100, 100);

    // Calculate total progress
    let totalProgress = 0;
    for (const [phase, config] of Object.entries(phases)) {
      if (phase === currentPhase) {
        totalProgress += (phaseProgress * config.weight) / 100;
        break;
      }
      totalProgress += config.weight;
    }

    return Math.min(Math.round(totalProgress), 99); // Never show 100% until truly complete
  }

  private estimateTimeRemaining(status: ActivationStatus): number {
    const network = status.network;
    const baseTime = network === 'PRODUCTION' ? 900000 : 300000; // 15 min : 5 min

    // Adjust based on current progress
    const progress = this.calculateProgress(status);
    const elapsed = Date.now() - status.startTime;

    if (progress > 0) {
      const estimatedTotal = elapsed / (progress / 100);
      return Math.max(0, estimatedTotal - elapsed);
    }

    return baseTime - elapsed;
  }
}
```

#### 3.2 Streaming Activation Tool

```typescript
// src/tools/activate-property-stream-tool.ts
export const activatePropertyStream: Tool = {
  name: 'activate-property-stream',
  description: 'Activate property with real-time progress streaming',

  async *execute(args: {
    propertyId: string;
    version?: number;
    network: 'STAGING' | 'PRODUCTION';
    notes?: string;
    notifyEmails?: string[];
    autoFallback?: boolean;
  }): AsyncGenerator<ToolResponse> {
    const streamingService = new ActivationStreamingService();

    try {
      // Validate inputs
      const validation = await this.validateActivation(args);
      if (!validation.valid) {
        yield {
          type: 'error',
          content: {
            error: 'Validation failed',
            issues: validation.issues,
          },
        };
        return;
      }

      // Start streaming activation
      const stream = streamingService.streamActivationStatus(
        args.propertyId,
        args.version || validation.latestVersion,
        args.network,
      );

      for await (const status of stream) {
        yield {
          type: 'activation-status',
          content: status,
          _meta: {
            'alecs/stream-type': 'activation',
            'alecs/can-cancel': status.phase === 'initialization',
            'alecs/refresh-interval': this.getRefreshInterval(status),
          },
        };

        // Handle auto-fallback for staging failures
        if (
          args.autoFallback &&
          args.network === 'PRODUCTION' &&
          status.type === 'activation-complete' &&
          status.result === 'failed'
        ) {
          yield {
            type: 'info',
            content: {
              message: 'Production activation failed, falling back to staging',
              action: 'auto-fallback',
            },
          };

          // Start staging activation
          const stagingStream = streamingService.streamActivationStatus(
            args.propertyId,
            args.version || validation.latestVersion,
            'STAGING',
          );

          for await (const stagingStatus of stagingStream) {
            yield {
              type: 'activation-status',
              content: { ...stagingStatus, fallback: true },
            };
          }
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: 'Activation failed',
          details: error.message,
          troubleshooting: this.getTroubleshootingSteps(error),
        },
      };
    }
  },
};
```

## Testing Strategy

### Unit Tests

```typescript
// __tests__/unit/enhanced-edgegrid-auth.test.ts
describe('EnhancedEdgeGridAuth', () => {
  it('should auto-recover from timestamp errors', async () => {
    const auth = new EnhancedEdgeGridAuth();

    // Mock timestamp error
    jest
      .spyOn(EdgeGridAuth.prototype, 'authenticate')
      .mockRejectedValueOnce(new Error('Invalid timestamp'));

    // Mock time sync
    jest.spyOn(auth, 'syncSystemTime').mockResolvedValue();

    const result = await auth.authenticate(mockRequest);

    expect(auth.syncSystemTime).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/rate-limit-manager.test.ts
describe('RateLimitManager Integration', () => {
  it('should handle 100 concurrent requests within rate limits', async () => {
    const manager = new RateLimitManager();
    const requests = Array(100)
      .fill(null)
      .map((_, i) => ({
        path: '/papi/v1/properties',
        method: 'GET',
        params: { contractId: `ctr_${i}` },
      }));

    const start = Date.now();
    const results = await Promise.all(requests.map((req) => manager.executeWithRateLimit(req)));
    const duration = Date.now() - start;

    expect(results).toHaveLength(100);
    expect(duration).toBeGreaterThan(1500); // Should take >1.5s due to rate limiting
    // Verify no 429 errors
    expect(results.every((r) => r.success)).toBe(true);
  });
});
```

## Rollout Plan

### Week 1

1. Deploy Enhanced EdgeGrid Auth to 10% of users
2. Monitor authentication success rate
3. Collect feedback on diagnostic tool

### Week 2

1. Expand EdgeGrid Auth to 100%
2. Deploy Rate Limit Manager to 25% of users
3. Launch Property Activation Monitor in beta

### Week 3

1. Full rollout of all three features
2. Monitor performance metrics
3. Iterate based on user feedback

## Success Metrics

### Authentication (Feature 1)

- Target: <0.1% authentication failure rate
- Current: ~5% failure rate
- Measurement: Track all auth attempts and failures

### Rate Limiting (Feature 2)

- Target: 0% automation failures due to rate limits
- Current: ~15% of batch operations fail
- Measurement: Track 429 errors and retry success

### Activation Monitoring (Feature 3)

- Target: 90% user satisfaction with progress visibility
- Current: Major complaint in forums
- Measurement: User feedback and usage analytics
