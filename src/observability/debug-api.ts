// @ts-nocheck
/**
 * Debug Dashboard API - Real-time debugging data API for external dashboards
 * Provides streaming debug information, request traces, and system state
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface DebugEvent {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: any;
  source: string;
  traceId?: string;
  spanId?: string;
  context?: Record<string, any>;
}

export interface RequestTrace {
  traceId: string;
  parentSpanId?: string;
  spans: Array<{
    spanId: string;
    parentSpanId?: string;
    operationName: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    tags: Record<string, any>;
    logs: Array<{
      timestamp: number;
      fields: Record<string, any>;
    }>;
    status: 'active' | 'completed' | 'error';
    error?: Error;
  }>;
  metadata: {
    customer?: string;
    service: string;
    endpoint?: string;
    method?: string;
    userAgent?: string;
    remoteAddress?: string;
  };
}

export interface SystemState {
  timestamp: number;
  uptime: number;
  connections: {
    active: number;
    total: number;
    byCustomer: Record<string, number>;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  performance: {
    eventLoopLag: number;
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    maxSize: number;
  };
  rateLimits: Record<
    string,
    {
      remaining: number;
      limit: number;
      resetTime: number;
    }
  >;
  circuits: Record<
    string,
    {
      state: 'closed' | 'open' | 'half-open';
      failures: number;
      successRate: number;
      lastFailure?: number;
    }
  >;
}

export interface DebugSubscription {
  id: string;
  filters: {
    levels?: Array<'debug' | 'info' | 'warn' | 'error'>;
    categories?: string[];
    sources?: string[];
    traceIds?: string[];
    keywords?: string[];
  };
  callback: (event: DebugEvent) => void;
  active: boolean;
  created: number;
}

export interface StreamingConnection {
  id: string;
  type: 'websocket' | 'sse' | 'webhook';
  url?: string;
  filters: DebugSubscription['filters'];
  lastActivity: number;
  send: (data: any) => Promise<void>;
  close: () => void;
  active: boolean;
}

export class DebugAPI extends EventEmitter {
  private events: DebugEvent[] = [];
  private traces: Map<string, RequestTrace> = new Map();
  private subscriptions: Map<string, DebugSubscription> = new Map();
  private streamingConnections: Map<string, StreamingConnection> = new Map();
  private systemState: SystemState | null = null;
  private stateUpdateInterval: NodeJS.Timeout | null = null;
  private traceCleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private config: {
      maxEvents?: number;
      maxTraces?: number;
      traceRetentionMs?: number;
      stateUpdateIntervalMs?: number;
      enableStackTraces?: boolean;
      enablePerformanceMonitoring?: boolean;
    } = {},
  ) {
    super();
    this.config = {
      maxEvents: 10000,
      maxTraces: 1000,
      traceRetentionMs: 3600000, // 1 hour
      stateUpdateIntervalMs: 5000, // 5 seconds
      enableStackTraces: true,
      enablePerformanceMonitoring: true,
      ...config,
    };

    this.startSystemStateUpdates();
    this.startTraceCleanup();
  }

  /**
   * Log a debug event
   */
  logEvent(
    level: 'debug' | 'info' | 'warn' | 'error',
    category: string,
    message: string,
    data?: any,
    source = 'unknown',
    traceId?: string,
    spanId?: string,
    context?: Record<string, any>,
  ): void {
    const event: DebugEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      data: this.sanitizeData(data),
      source,
      traceId,
      spanId,
      context,
    };

    this.events.push(event);

    // Maintain event history limit
    if (this.events.length > (this.config.maxEvents || 10000)) {
      this.events.shift();
    }

    // Notify subscribers
    this.notifySubscribers(event);

    // Send to streaming connections
    this.broadcastToStreams(event);

    this.emit('eventLogged', event);
  }

  /**
   * Start a new request trace
   */
  startTrace(
    traceId: string,
    metadata: RequestTrace['metadata'],
    parentSpanId?: string,
  ): RequestTrace {
    const trace: RequestTrace = {
      traceId,
      parentSpanId,
      spans: [],
      metadata,
    };

    this.traces.set(traceId, trace);
    this.emit('traceStarted', trace);

    return trace;
  }

  /**
   * Start a new span within a trace
   */
  startSpan(
    traceId: string,
    operationName: string,
    parentSpanId?: string,
    tags: Record<string, any> = {},
  ): string {
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    const spanId = this.generateId();
    const span = {
      spanId,
      parentSpanId,
      operationName,
      startTime: performance.now(),
      tags: { ...tags },
      logs: [] as Array<{
        timestamp: number;
        fields: Record<string, any>;
      }>,
      status: 'active' as const,
    };

    trace.spans.push(span);
    this.emit('spanStarted', traceId, span);

    return spanId;
  }

  /**
   * Finish a span
   */
  finishSpan(
    traceId: string,
    spanId: string,
    error?: Error,
    finalTags: Record<string, any> = {},
  ): void {
    const trace = this.traces.get(traceId);
    if (!trace) {
      return;
    }

    const span = trace.spans.find((s) => s.spanId === spanId);
    if (!span) {
      return;
    }

    span.endTime = performance.now();
    span.duration = span.endTime - span.startTime;
    span.status = error ? 'error' : 'completed';
    span.error = error;
    span.tags = { ...span.tags, ...finalTags };

    this.emit('spanFinished', traceId, span);
  }

  /**
   * Add log to span
   */
  logToSpan(traceId: string, spanId: string, fields: Record<string, any>): void {
    const trace = this.traces.get(traceId);
    if (!trace) {
      return;
    }

    const span = trace.spans.find((s) => s.spanId === spanId);
    if (!span) {
      return;
    }

    span.logs.push({
      timestamp: performance.now(),
      fields: this.sanitizeData(fields),
    });

    this.emit('spanLogged', traceId, spanId, fields);
  }

  /**
   * Subscribe to debug events
   */
  subscribe(filters: DebugSubscription['filters'], callback: (event: DebugEvent) => void): string {
    const subscription: DebugSubscription = {
      id: this.generateId(),
      filters,
      callback,
      active: true,
      created: Date.now(),
    };

    this.subscriptions.set(subscription.id, subscription);
    this.emit('subscriptionCreated', subscription);

    return subscription.id;
  }

  /**
   * Unsubscribe from debug events
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
      this.emit('subscriptionRemoved', subscriptionId);
    }
  }

  /**
   * Add streaming connection
   */
  addStreamingConnection(
    connection: Omit<StreamingConnection, 'id' | 'lastActivity' | 'active'>,
  ): string {
    const id = this.generateId();
    const streamingConnection: StreamingConnection = {
      id,
      lastActivity: Date.now(),
      active: true,
      ...connection,
    };

    this.streamingConnections.set(id, streamingConnection);
    this.emit('streamingConnectionAdded', streamingConnection);

    return id;
  }

  /**
   * Remove streaming connection
   */
  removeStreamingConnection(connectionId: string): void {
    const connection = this.streamingConnections.get(connectionId);
    if (connection) {
      connection.active = false;
      connection.close();
      this.streamingConnections.delete(connectionId);
      this.emit('streamingConnectionRemoved', connectionId);
    }
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit = 100, filters?: DebugSubscription['filters']): DebugEvent[] {
    let events = [...this.events];

    if (filters) {
      events = events.filter((event) => this.matchesFilters(event, filters));
    }

    return events.slice(-limit);
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): RequestTrace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Get all traces
   */
  getAllTraces(): RequestTrace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Get recent traces
   */
  getRecentTraces(limit = 50): RequestTrace[] {
    const traces = Array.from(this.traces.values());
    traces.sort((a, b) => {
      const aLatest = Math.max(...a.spans.map((s) => s.startTime));
      const bLatest = Math.max(...b.spans.map((s) => s.startTime));
      return bLatest - aLatest;
    });

    return traces.slice(0, limit);
  }

  /**
   * Search events
   */
  searchEvents(query: string, filters?: DebugSubscription['filters'], limit = 100): DebugEvent[] {
    const lowerQuery = query.toLowerCase();
    let events = this.events.filter((event) => {
      const searchableText = [
        event.message,
        event.category,
        event.source,
        JSON.stringify(event.data || {}),
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(lowerQuery);
    });

    if (filters) {
      events = events.filter((event) => this.matchesFilters(event, filters));
    }

    return events.slice(-limit);
  }

  /**
   * Get current system state
   */
  getCurrentSystemState(): SystemState | null {
    return this.systemState ? { ...this.systemState } : null;
  }

  /**
   * Get debug statistics
   */
  getStatistics(): {
    events: {
      total: number;
      byLevel: Record<string, number>;
      byCategory: Record<string, number>;
      bySource: Record<string, number>;
    };
    traces: {
      total: number;
      active: number;
      completed: number;
      errored: number;
    };
    subscriptions: {
      total: number;
      active: number;
    };
    connections: {
      total: number;
      active: number;
      byType: Record<string, number>;
    };
  } {
    const eventsByLevel: Record<string, number> = {};
    const eventsByCategory: Record<string, number> = {};
    const eventsBySource: Record<string, number> = {};

    for (const event of this.events) {
      eventsByLevel[event.level] = (eventsByLevel[event.level] || 0) + 1;
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      eventsBySource[event.source] = (eventsBySource[event.source] || 0) + 1;
    }

    let activeTraces = 0;
    let completedTraces = 0;
    let erroredTraces = 0;

    for (const trace of this.traces.values()) {
      const hasActiveSpans = trace.spans.some((s) => s.status === 'active');
      const hasErrors = trace.spans.some((s) => s.status === 'error');

      if (hasActiveSpans) {
        activeTraces++;
      } else if (hasErrors) {
        erroredTraces++;
      } else {
        completedTraces++;
      }
    }

    const activeSubscriptions = Array.from(this.subscriptions.values()).filter(
      (s) => s.active,
    ).length;

    const activeConnections = Array.from(this.streamingConnections.values()).filter(
      (c) => c.active,
    ).length;

    const connectionsByType: Record<string, number> = {};
    for (const connection of this.streamingConnections.values()) {
      connectionsByType[connection.type] = (connectionsByType[connection.type] || 0) + 1;
    }

    return {
      events: {
        total: this.events.length,
        byLevel: eventsByLevel,
        byCategory: eventsByCategory,
        bySource: eventsBySource,
      },
      traces: {
        total: this.traces.size,
        active: activeTraces,
        completed: completedTraces,
        errored: erroredTraces,
      },
      subscriptions: {
        total: this.subscriptions.size,
        active: activeSubscriptions,
      },
      connections: {
        total: this.streamingConnections.size,
        active: activeConnections,
        byType: connectionsByType,
      },
    };
  }

  /**
   * Clear old events
   */
  clearOldEvents(olderThanMs: number): number {
    const cutoff = Date.now() - olderThanMs;
    const initialLength = this.events.length;

    this.events = this.events.filter((event) => event.timestamp > cutoff);

    const removed = initialLength - this.events.length;
    this.emit('eventsCleared', removed);

    return removed;
  }

  /**
   * Stop the debug API
   */
  stop(): void {
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval);
      this.stateUpdateInterval = null;
    }

    if (this.traceCleanupInterval) {
      clearInterval(this.traceCleanupInterval);
      this.traceCleanupInterval = null;
    }

    // Close all streaming connections
    for (const connection of this.streamingConnections.values()) {
      connection.close();
    }
    this.streamingConnections.clear();

    // Clear subscriptions
    this.subscriptions.clear();

    this.emit('stopped');
  }

  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // Remove circular references and limit depth
    try {
      return JSON.parse(
        JSON.stringify(data, (_key, value) => {
          if (typeof value === 'function') {
            return '[Function]';
          }
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: this.config.enableStackTraces ? value.stack : undefined,
            };
          }
          return value;
        }),
      );
    } catch (_error) {
      return '[Non-serializable data]';
    }
  }

  private notifySubscribers(event: DebugEvent): void {
    for (const subscription of this.subscriptions.values()) {
      if (!subscription.active) {
        continue;
      }

      if (this.matchesFilters(event, subscription.filters)) {
        try {
          subscription.callback(event);
        } catch (_error) {
          this.emit('subscriptionError', subscription.id, _error);
        }
      }
    }
  }

  private async broadcastToStreams(event: DebugEvent): Promise<void> {
    const now = Date.now();
    const promises = [];

    for (const connection of this.streamingConnections.values()) {
      if (!connection.active) {
        continue;
      }

      if (this.matchesFilters(event, connection.filters)) {
        connection.lastActivity = now;
        promises.push(
          connection.send({ type: 'debug-event', data: event }).catch((_error) => {
            this.emit('streamingError', connection.id, _error);
            // Deactivate connection on error
            connection.active = false;
          }),
        );
      }
    }

    await Promise.allSettled(promises);
  }

  private matchesFilters(event: DebugEvent, filters: DebugSubscription['filters']): boolean {
    if (filters.levels && !filters.levels.includes(event.level)) {
      return false;
    }

    if (filters.categories && !filters.categories.includes(event.category)) {
      return false;
    }

    if (filters.sources && !filters.sources.includes(event.source)) {
      return false;
    }

    if (filters.traceIds && event.traceId && !filters.traceIds.includes(event.traceId)) {
      return false;
    }

    if (filters.keywords && filters.keywords.length > 0) {
      const searchableText = [
        event.message,
        event.category,
        event.source,
        JSON.stringify(event.data || {}),
      ]
        .join(' ')
        .toLowerCase();

      const hasKeyword = filters.keywords.some((keyword) =>
        searchableText.includes(keyword.toLowerCase()),
      );

      if (!hasKeyword) {
        return false;
      }
    }

    return true;
  }

  private updateSystemState(): void {
    const now = Date.now();

    // Calculate system metrics
    const memUsage =
      typeof process !== 'undefined'
        ? process.memoryUsage()
        : {
            heapUsed: 0,
            heapTotal: 0,
            external: 0,
            rss: 0,
          };

    // Simple performance metrics (would be enhanced with actual monitoring)
    const recentEvents = this.events.filter((e) => now - e.timestamp < 60000);
    const errorEvents = recentEvents.filter((e) => e.level === 'error');

    this.systemState = {
      timestamp: now,
      uptime: typeof process !== 'undefined' ? process.uptime() * 1000 : 0,
      connections: {
        active: this.streamingConnections.size,
        total: this.streamingConnections.size,
        byCustomer: {}, // Would be populated with actual connection data
      },
      memory: memUsage,
      performance: {
        eventLoopLag: 0, // Would be calculated with actual monitoring
        requestsPerSecond: recentEvents.length / 60,
        averageResponseTime: 0, // Would be calculated from traces
        errorRate: recentEvents.length > 0 ? errorEvents.length / recentEvents.length : 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        maxSize: 0,
      },
      rateLimits: {}, // Would be populated with actual rate limit data
      circuits: {}, // Would be populated with actual circuit breaker data
    };

    this.emit('systemStateUpdated', this.systemState);
  }

  private startSystemStateUpdates(): void {
    this.updateSystemState();

    this.stateUpdateInterval = setInterval(() => {
      this.updateSystemState();
    }, this.config.stateUpdateIntervalMs || 5000);
  }

  private startTraceCleanup(): void {
    this.traceCleanupInterval = setInterval(() => {
      const now = Date.now();
      const retentionMs = this.config.traceRetentionMs || 3600000;
      const cutoff = now - retentionMs;

      for (const [traceId, trace] of this.traces.entries()) {
        const latestSpanTime = Math.max(...trace.spans.map((s) => s.startTime));
        if (latestSpanTime < cutoff) {
          this.traces.delete(traceId);
        }
      }

      // Also limit total number of traces
      if (this.traces.size > (this.config.maxTraces || 1000)) {
        const sortedTraces = Array.from(this.traces.entries()).sort(([, a], [, b]) => {
          const aLatest = Math.max(...a.spans.map((s) => s.startTime));
          const bLatest = Math.max(...b.spans.map((s) => s.startTime));
          return aLatest - bLatest;
        });

        const toRemove = sortedTraces.slice(0, sortedTraces.length - this.config.maxTraces!);
        for (const [traceId] of toRemove) {
          this.traces.delete(traceId);
        }
      }
    }, 60000); // Run cleanup every minute
  }
}

export default DebugAPI;
