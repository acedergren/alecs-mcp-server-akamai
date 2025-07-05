import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

import { logger } from '../utils/logger';

import {
  FastPurgeService,
  type FastPurgeRequest,
  type FastPurgeResponse,
} from './FastPurgeService';

// Queue item interfaces
export interface QueueItem {
  id: string;
  customer: string;
  type: 'url' | 'cpcode' | 'tag';
  network: 'staging' | 'production';
  objects: string[];
  priority: number; // 0 = highest priority
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  response?: FastPurgeResponse[];
  dedupKey?: string;
  estimatedSize: number;
}

export interface QueueStats {
  customer: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  estimatedCompletionTime: number;
  throughputRate: number;
  queueDepth: number;
}

export interface ConsolidationSuggestion {
  type: 'cpcode' | 'tag';
  reason: string;
  originalCount: number;
  consolidatedCount: number;
  estimatedTimeSaving: number;
}

// Priority levels
export enum PurgePriority {
  CACHE_TAG = 0, // Highest priority - most efficient
  CP_CODE = 1, // Medium priority
  URL = 2, // Standard priority
  BULK = 3, // Low priority for bulk operations
}

// Sliding window rate limiter
class SlidingWindowRateLimiter {
  private window: Map<number, number> = new Map();
  private readonly windowSize: number;
  private readonly limit: number;

  constructor(windowSizeMs = 60000, limit = 100) {
    this.windowSize = windowSizeMs;
    this.limit = limit;
  }

  canProceed(): boolean {
    this.cleanup();
    const total = Array.from(this.window.values()).reduce((a, b) => a + b, 0);
    return total < this.limit;
  }

  record(count = 1): void {
    const now = Date.now();
    const bucket = Math.floor(now / 1000);
    this.window.set(bucket, (this.window.get(bucket) || 0) + count);
  }

  private cleanup(): void {
    const cutoff = Math.floor((Date.now() - this.windowSize) / 1000);
    for (const [bucket] of this.window) {
      if (bucket < cutoff) {
        this.window.delete(bucket);
      }
    }
  }

  getCurrentUsage(): number {
    this.cleanup();
    return Array.from(this.window.values()).reduce((a, b) => a + b, 0);
  }
}

export class PurgeQueueManager {
  private static instance: PurgeQueueManager;
  private fastPurgeService: FastPurgeService;
  private queues: Map<string, QueueItem[]> = new Map();
  private rateLimiters: Map<string, SlidingWindowRateLimiter> = new Map();
  private processing: Map<string, boolean> = new Map();
  private queueDir: string;
  private dedupWindow: Map<string, number> = new Map();
  private readonly DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private readonly PERSISTENCE_INTERVAL = 10000; // 10 seconds
  private persistenceTimer?: NodeJS.Timeout;

  private constructor() {
    this.fastPurgeService = FastPurgeService.getInstance();
    this.queueDir = process.env['QUEUE_PERSISTENCE_DIR'] || '/tmp/alecs-mcp-akamai/purge-queues';
    this.initializePersistence();
  }

  static getInstance(): PurgeQueueManager {
    if (!PurgeQueueManager.instance) {
      PurgeQueueManager.instance = new PurgeQueueManager();
    }
    return PurgeQueueManager.instance;
  }

  private async initializePersistence(): Promise<void> {
    try {
      await fs.mkdir(this.queueDir, { recursive: true });
      await this.loadQueues();

      // Start persistence timer
      this.persistenceTimer = setInterval(() => {
        this.persistQueues().catch((_err) =>
          logger.error(`Failed to persist queues: ${_err.message}`),
        );
      }, this.PERSISTENCE_INTERVAL);
      this.persistenceTimer.unref(); // Don't keep process alive
    } catch (_error: any) {
      logger.error(`Queue manager error: ${_error.message}`);
    }
  }

  private async loadQueues(): Promise<void> {
    try {
      const files = await fs.readdir(this.queueDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const customer = file.replace('.json', '');
          const filePath = path.join(this.queueDir, file);

          try {
            const data = await fs.readFile(filePath, 'utf-8');
            const items = JSON.parse(data).map((item: any) => ({
              ...item,
              createdAt: new Date(item.createdAt),
              lastAttempt: item.lastAttempt ? new Date(item.lastAttempt) : undefined,
            }));

            this.queues.set(customer, items);
            logger.info(`Loaded ${items.length} queue items for customer ${customer}`);
          } catch (_err: any) {
            logger.error(`Failed to load queue for ${customer}: ${_err.message}`);
          }
        }
      }
    } catch (_error: any) {
      logger.error(`Queue manager error: ${_error.message}`);
    }
  }

  private async persistQueues(): Promise<void> {
    for (const [customer, items] of this.queues) {
      const filePath = path.join(this.queueDir, `${customer}.json`);
      const tempPath = `${filePath}.tmp`;

      try {
        // Write to temp file first for atomic operation
        await fs.writeFile(tempPath, JSON.stringify(items, null, 2));
        await fs.rename(tempPath, filePath);
      } catch (_error: any) {
        logger.error(`Queue manager error: ${_error.message}`);
      }
    }
  }

  private getRateLimiter(customer: string): SlidingWindowRateLimiter {
    if (!this.rateLimiters.has(customer)) {
      this.rateLimiters.set(customer, new SlidingWindowRateLimiter());
    }
    return this.rateLimiters.get(customer)!;
  }

  private getCustomerQueue(customer: string): QueueItem[] {
    if (!this.queues.has(customer)) {
      this.queues.set(customer, []);
    }
    return this.queues.get(customer)!;
  }

  private generateDedupKey(type: string, objects: string[]): string {
    const sorted = [...objects].sort();
    const hash = crypto.createHash('sha256');
    hash.update(`${type}:${sorted.join(',')}`);
    return hash.digest('hex');
  }

  private isDuplicate(dedupKey: string): boolean {
    const lastSeen = this.dedupWindow.get(dedupKey);
    const now = Date.now();

    // Clean old entries
    for (const [key, time] of this.dedupWindow) {
      if (now - time > this.DEDUP_WINDOW_MS) {
        this.dedupWindow.delete(key);
      }
    }

    if (lastSeen && now - lastSeen < this.DEDUP_WINDOW_MS) {
      return true;
    }

    this.dedupWindow.set(dedupKey, now);
    return false;
  }

  private calculatePriority(type: string, objectCount: number): number {
    switch (type) {
      case 'tag':
        return PurgePriority.CACHE_TAG;
      case 'cpcode':
        return PurgePriority.CP_CODE;
      case 'url':
        return objectCount > 100 ? PurgePriority.BULK : PurgePriority.URL;
      default:
        return PurgePriority.URL;
    }
  }

  private analyzeConsolidation(items: QueueItem[]): ConsolidationSuggestion | null {
    // Group URLs by domain
    const urlItems = items.filter((item) => item.type === 'url' && item.status === 'pending');
    if (urlItems.length === 0) {
      return null;
    }

    const domainMap = new Map<string, Set<string>>();

    for (const item of urlItems) {
      for (const url of item.objects) {
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname;

          if (!domainMap.has(domain)) {
            domainMap.set(domain, new Set());
          }
          domainMap.get(domain)!.add(url);
        } catch (_err) {
          // Invalid URL, skip
        }
      }
    }

    // Check for consolidation opportunities
    for (const [domain, urls] of domainMap) {
      if (urls.size > 100) {
        return {
          type: 'cpcode',
          reason: `${urls.size} URLs under domain ${domain} could be purged more efficiently using CP code`,
          originalCount: urls.size,
          consolidatedCount: 1,
          estimatedTimeSaving: Math.floor((urls.size / 50) * 5), // 5 seconds per batch
        };
      }
    }

    return null;
  }

  async enqueue(_request: FastPurgeRequest & { customer: string }): Promise<QueueItem> {
    const dedupKey = this.generateDedupKey(_request.type || 'url', _request.objects);

    // Check for duplicates
    if (this.isDuplicate(dedupKey)) {
      logger.info(`Duplicate purge request detected for ${_request.customer}, skipping`);
      throw new Error('Duplicate purge request within 5-minute window');
    }

    const item: QueueItem = {
      id: crypto.randomUUID(),
      customer: _request.customer,
      type: _request.type || 'url',
      network: _request.network,
      objects: _request.objects,
      priority: this.calculatePriority(_request.type || 'url', _request.objects.length),
      createdAt: new Date(),
      status: 'pending',
      attempts: 0,
      dedupKey,
      estimatedSize: _request.objects.reduce((sum, obj) => sum + Buffer.byteLength(obj, 'utf8'), 0),
    };

    const queue = this.getCustomerQueue(_request.customer);
    queue.push(item);

    // Sort by priority
    queue.sort((a, b) => a.priority - b.priority);

    // Check for consolidation opportunities
    const suggestion = this.analyzeConsolidation(queue);
    if (suggestion) {
      logger.info(`Consolidation suggestion for ${_request.customer}: ${suggestion.reason}`);
    }

    // Start processing if not already running
    this.startProcessing(_request.customer);

    return item;
  }

  private async startProcessing(customer: string): Promise<void> {
    if (this.processing.get(customer)) {
      return;
    }

    this.processing.set(customer, true);

    try {
      while (true) {
        const queue = this.getCustomerQueue(customer);
        const pendingItems = queue.filter((item) => item.status === 'pending');

        if (pendingItems.length === 0) {
          break;
        }

        const rateLimiter = this.getRateLimiter(customer);
        if (!rateLimiter.canProceed()) {
          // Wait before checking again
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        // Process next item
        const item = pendingItems[0];
        if (item) {
          await this.processItem(item);
        }

        rateLimiter.record(1);
      }
    } finally {
      this.processing.set(customer, false);
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    item.status = 'processing';
    item.lastAttempt = new Date();
    item.attempts++;

    try {
      let response: FastPurgeResponse[];

      switch (item.type) {
        case 'url':
          response = await this.fastPurgeService.purgeByUrl(
            item.customer,
            item.network,
            item.objects,
          );
          break;
        case 'cpcode':
          response = await this.fastPurgeService.purgeByCpCode(
            item.customer,
            item.network,
            item.objects,
          );
          break;
        case 'tag':
          response = await this.fastPurgeService.purgeByCacheTag(
            item.customer,
            item.network,
            item.objects,
          );
          break;
        default:
          throw new Error(`Unknown purge type: ${item.type}`);
      }

      item.status = 'completed';
      item.response = response;

      logger.info(
        `Completed purge ${item.id} for ${item.customer}: ${item.objects.length} objects`,
      );
    } catch (_error: any) {
      item.error = _error.message;

      if (item.attempts >= 3) {
        item.status = 'failed';
        logger.error(`Queue manager error: ${_error.message}`);
      } else {
        item.status = 'pending';
        logger.warn(`Purge ${item.id} failed, will retry: ${_error.message}`);
      }
    }
  }

  async getQueueStatus(customer: string): Promise<QueueStats> {
    const queue = this.getCustomerQueue(customer);
    const rateLimiter = this.getRateLimiter(customer);

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      totalSize: 0,
    };

    for (const item of queue) {
      stats[item.status]++;
      if (item.status === 'pending') {
        stats.totalSize += item.estimatedSize;
      }
    }

    // Calculate throughput
    const recentCompleted = queue.filter(
      (item) =>
        item.status === 'completed' &&
        item.lastAttempt &&
        Date.now() - item.lastAttempt.getTime() < 60000,
    );

    const throughputRate = recentCompleted.length;
    const currentUsage = rateLimiter.getCurrentUsage();
    const availableCapacity = Math.max(0, 100 - currentUsage);

    // Estimate completion time
    const estimatedCompletionTime =
      stats.pending > 0 ? Math.ceil((stats.pending / Math.max(1, availableCapacity)) * 60) : 0;

    return {
      customer,
      pending: stats.pending,
      processing: stats.processing,
      completed: stats.completed,
      failed: stats.failed,
      estimatedCompletionTime,
      throughputRate,
      queueDepth: queue.length,
    };
  }

  async getQueueItems(customer: string, status?: string, limit = 100): Promise<QueueItem[]> {
    const queue = this.getCustomerQueue(customer);

    const items = status ? queue.filter((item) => item.status === status) : queue;

    return items.slice(0, limit);
  }

  async clearCompleted(customer: string, olderThan: number = 24 * 60 * 60 * 1000): Promise<number> {
    const queue = this.getCustomerQueue(customer);
    const cutoff = Date.now() - olderThan;
    const originalLength = queue.length;

    const filtered = queue.filter(
      (item) =>
        item.status !== 'completed' || !item.lastAttempt || item.lastAttempt.getTime() > cutoff,
    );

    this.queues.set(customer, filtered);

    const removed = originalLength - filtered.length;
    if (removed > 0) {
      logger.info(`Cleared ${removed} completed items for ${customer}`);
    }

    return removed;
  }

  async getConsolidationSuggestions(customer: string): Promise<ConsolidationSuggestion[]> {
    const queue = this.getCustomerQueue(customer);
    const suggestions: ConsolidationSuggestion[] = [];

    const suggestion = this.analyzeConsolidation(queue);
    if (suggestion) {
      suggestions.push(suggestion);
    }

    return suggestions;
  }

  // Cleanup on shutdown
  async shutdown(): Promise<void> {
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }

    await this.persistQueues();
    logger.info('PurgeQueueManager shutdown complete');
  }
}
