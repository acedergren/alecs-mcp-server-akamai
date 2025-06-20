import { promises as fs } from 'fs';
import * as path from 'path';

import { logger } from '@utils/logger';

import { FastPurgeService, type FastPurgeResponse } from './FastPurgeService';

export interface PurgeOperation {
  id: string;
  customer: string;
  type: 'url' | 'cpcode' | 'tag';
  network: 'staging' | 'production';
  purgeIds: string[];
  totalObjects: number;
  processedObjects: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'partial';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedSeconds: number;
  remainingSeconds: number;
  progress: number; // 0-100
  batches: BatchStatus[];
  errors: OperationError[];
  summary?: OperationSummary;
}

export interface BatchStatus {
  purgeId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  objects: string[];
  response?: FastPurgeResponse;
  error?: string;
  estimatedSeconds?: number;
  completedAt?: Date;
}

export interface OperationError {
  type: 'rate_limit' | 'batch_failure' | 'network_error' | 'validation_error' | 'unknown';
  message: string;
  supportId?: string;
  retryable: boolean;
  guidance: string;
  occurredAt: Date;
  batchIndex?: number;
}

export interface OperationSummary {
  totalRequested: number;
  successfullyPurged: number;
  failed: number;
  duration: number;
  averageBatchTime: number;
  rateLimitHits: number;
  retries: number;
  efficiency: number; // percentage
}

export interface ProgressUpdate {
  operationId: string;
  customer: string;
  progress: number;
  remainingSeconds: number;
  message: string;
  timestamp: Date;
}

export interface CustomerDashboard {
  customer: string;
  activeOperations: number;
  completedToday: number;
  failureRate: number;
  averageCompletionTime: number;
  totalObjectsPurged: number;
  rateLimitUtilization: number;
  recentErrors: OperationError[];
  performance: {
    successRate: number;
    averageLatency: number;
    throughput: number;
  };
}

export class PurgeStatusTracker {
  private static instance: PurgeStatusTracker;
  private fastPurgeService: FastPurgeService;
  private operations: Map<string, PurgeOperation> = new Map();
  private statusDir: string;
  private progressCallbacks: Map<string, (update: ProgressUpdate) => void> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly RETENTION_PERIOD = 24 * 60 * 60 * 1000; // 24 hours
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.fastPurgeService = FastPurgeService.getInstance();
    this.statusDir = process.env.STATUS_PERSISTENCE_DIR || '/tmp/alecs-mcp-akamai/purge-status';
    this.initializePersistence();
  }

  static getInstance(): PurgeStatusTracker {
    if (!PurgeStatusTracker.instance) {
      PurgeStatusTracker.instance = new PurgeStatusTracker();
    }
    return PurgeStatusTracker.instance;
  }

  private async initializePersistence(): Promise<void> {
    try {
      await fs.mkdir(this.statusDir, { recursive: true });
      await this.loadOperations();

      // Start cleanup timer
      this.cleanupTimer = setInterval(
        () => {
          this.cleanupOldOperations().catch((_err) =>
            logger.error(`Failed to cleanup old operations: ${_err.message}`),
          );
        },
        60 * 60 * 1000,
      ); // Every hour
    } catch (error: any) {
      logger.error(`Status tracker error: ${error.message}`);
    }
  }

  private async loadOperations(): Promise<void> {
    try {
      const files = await fs.readdir(this.statusDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const operationId = file.replace('.json', '');
          const filePath = path.join(this.statusDir, file);

          try {
            const data = await fs.readFile(filePath, 'utf-8');
            const operation = JSON.parse(data);

            // Convert date strings back to Date objects
            operation.createdAt = new Date(operation.createdAt);
            if (operation.startedAt) {
operation.startedAt = new Date(operation.startedAt);
}
            if (operation.completedAt) {
operation.completedAt = new Date(operation.completedAt);
}

            operation.batches.forEach((batch: any) => {
              if (batch.completedAt) {
batch.completedAt = new Date(batch.completedAt);
}
            });

            operation.errors.forEach((error: any) => {
              _error.occurredAt = new Date(_error.occurredAt);
            });

            this.operations.set(operationId, operation);

            // Resume polling for in-progress operations
            if (operation.status === 'in-progress') {
              this.startPolling(operationId);
            }
          } catch (_err: any) {
            logger.error(`Failed to load operation ${operationId}: ${_err.message}`);
          }
        }
      }

      logger.info(`Loaded ${this.operations.size} purge operations from persistence`);
    } catch (error: any) {
      logger.error(`Status tracker error: ${error.message}`);
    }
  }

  private async persistOperation(operation: PurgeOperation): Promise<void> {
    const filePath = path.join(this.statusDir, `${operation.id}.json`);

    try {
      await fs.writeFile(filePath, JSON.stringify(operation, null, 2));
    } catch (error: any) {
      logger.error(`Status tracker error: ${error.message}`);
    }
  }

  async trackOperation(
    customer: string,
    type: 'url' | 'cpcode' | 'tag',
    network: 'staging' | 'production',
    objects: string[],
    responses: FastPurgeResponse[],
  ): Promise<string> {
    const operationId = `${customer}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const operation: PurgeOperation = {
      id: operationId,
      customer,
      type,
      network,
      purgeIds: responses.map((r) => r.purgeId),
      totalObjects: objects.length,
      processedObjects: 0,
      status: 'in-progress',
      createdAt: new Date(),
      startedAt: new Date(),
      estimatedSeconds: Math.max(...responses.map((r) => r.estimatedSeconds)),
      remainingSeconds: Math.max(...responses.map((r) => r.estimatedSeconds)),
      progress: 0,
      batches: responses.map((response, index) => ({
        purgeId: response.purgeId,
        status: 'in-progress',
        objects: this.getBatchObjects(objects, responses, index),
        response,
        estimatedSeconds: response.estimatedSeconds,
      })),
      errors: [],
    };

    this.operations.set(operationId, operation);
    await this.persistOperation(operation);

    // Start polling for status updates
    this.startPolling(operationId);

    logger.info(`Tracking operation ${operationId} with ${responses.length} batches`);
    return operationId;
  }

  private getBatchObjects(
    objects: string[],
    responses: FastPurgeResponse[],
    batchIndex: number,
  ): string[] {
    // Calculate which objects belong to this batch
    // This is a simplified version - in practice, you'd need to track batch boundaries
    const batchSize = Math.ceil(objects.length / responses.length);
    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, objects.length);
    return objects.slice(start, end);
  }

  private startPolling(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation || operation.status !== 'in-progress') {
      return;
    }

    // Intelligent polling intervals
    const elapsed = Date.now() - (operation.startedAt?.getTime() || Date.now());
    const interval = elapsed < 10000 ? 1000 : 5000; // 1s for first 10s, then 5s

    const timer = setInterval(async () => {
      await this.updateOperationStatus(operationId);
    }, interval);

    this.pollingIntervals.set(operationId, timer);

    // Stop polling after reasonable time limit
    setTimeout(
      () => {
        const timer = this.pollingIntervals.get(operationId);
        if (timer) {
          clearInterval(timer);
          this.pollingIntervals.delete(operationId);
        }
      },
      operation.estimatedSeconds * 2000 + 30000,
    ); // 2x estimate + 30s buffer
  }

  private async updateOperationStatus(operationId: string): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation) {
return;
}

    try {
      let _completedBatches = 0;
      let _failedBatches = 0;
      let totalProcessed = 0;

      for (const batch of operation.batches) {
        if (batch.status === 'completed' || batch.status === 'failed') {
          continue;
        }

        try {
          const status = await this.fastPurgeService.checkPurgeStatus(
            operation.customer,
            batch.purgeId,
          );

          if (status.status === 'Done') {
            batch.status = 'completed';
            batch.completedAt = new Date();
            _completedBatches++;
            totalProcessed += batch.objects.length;
          } else if (status.status === 'Failed') {
            batch.status = 'failed';
            batch.error = 'Purge operation failed';
            _failedBatches++;

            this.addError(operation, {
              type: 'batch_failure',
              message: `Batch ${batch.purgeId} failed`,
              supportId: status.supportId,
              retryable: false,
              guidance: 'Check purge parameters and retry if necessary',
              occurredAt: new Date(),
            });
          }
        } catch (error: any) {
          logger.error(`Status tracker error: ${error.message}`);

          this.addError(operation, {
            type: 'network_error',
            message: `Status check failed: ${error.message}`,
            retryable: true,
            guidance: 'Network issue, status will be checked again automatically',
            occurredAt: new Date(),
          });
        }
      }

      // Update operation progress
      const totalBatches = operation.batches.length;
      const completed = operation.batches.filter((b) => b.status === 'completed').length;
      const failed = operation.batches.filter((b) => b.status === 'failed').length;

      operation.progress = Math.round((completed / totalBatches) * 100);
      operation.processedObjects = totalProcessed;

      // Calculate remaining time
      const elapsed = Date.now() - (operation.startedAt?.getTime() || Date.now());
      const elapsedSeconds = elapsed / 1000;
      operation.remainingSeconds = Math.max(0, operation.estimatedSeconds - elapsedSeconds);

      // Check if operation is complete
      if (completed + failed === totalBatches) {
        operation.completedAt = new Date();

        if (failed === 0) {
          operation.status = 'completed';
        } else if (completed > 0) {
          operation.status = 'partial';
        } else {
          operation.status = 'failed';
        }

        // Generate summary
        operation.summary = this.generateSummary(operation);

        // Stop polling
        const timer = this.pollingIntervals.get(operationId);
        if (timer) {
          clearInterval(timer);
          this.pollingIntervals.delete(operationId);
        }
      }

      await this.persistOperation(operation);

      // Notify progress callbacks
      this.notifyProgressUpdate(operation);
    } catch (error: any) {
      logger.error(`Status tracker error: ${error.message}`);
    }
  }

  private addError(operation: PurgeOperation, error: OperationError): void {
    operation.errors.push(_error);

    // Limit error history
    if (operation.errors.length > 50) {
      operation.errors = operation.errors.slice(-25);
    }
  }

  private generateSummary(operation: PurgeOperation): OperationSummary {
    const completed = operation.batches.filter((b) => b.status === 'completed');
    const failed = operation.batches.filter((b) => b.status === 'failed');
    const duration =
      operation.completedAt && operation.startedAt
        ? operation.completedAt.getTime() - operation.startedAt.getTime()
        : 0;

    const rateLimitErrors = operation.errors.filter((e) => e.type === 'rate_limit').length;
    const retries = operation.errors.filter((e) => e.retryable).length;

    return {
      totalRequested: operation.totalObjects,
      successfullyPurged: completed.reduce((sum, batch) => sum + batch.objects.length, 0),
      failed: failed.reduce((sum, batch) => sum + batch.objects.length, 0),
      duration: duration / 1000, // seconds
      averageBatchTime: completed.length > 0 ? duration / completed.length / 1000 : 0,
      rateLimitHits: rateLimitErrors,
      retries,
      efficiency:
        operation.totalObjects > 0
          ? (operation.processedObjects / operation.totalObjects) * 100
          : 0,
    };
  }

  private notifyProgressUpdate(operation: PurgeOperation): void {
    const callback = this.progressCallbacks.get(operation.id);
    if (callback) {
      const update: ProgressUpdate = {
        operationId: operation.id,
        customer: operation.customer,
        progress: operation.progress,
        remainingSeconds: operation.remainingSeconds,
        message: this.getProgressMessage(operation),
        timestamp: new Date(),
      };

      callback(update);
    }
  }

  private getProgressMessage(operation: PurgeOperation): string {
    if (operation.status === 'completed') {
      return `Purge completed successfully - ${operation.processedObjects} objects purged`;
    } else if (operation.status === 'failed') {
      return 'Purge operation failed - check errors for details';
    } else if (operation.status === 'partial') {
      return `Purge partially completed - ${operation.processedObjects} of ${operation.totalObjects} objects purged`;
    } else {
      const completed = operation.batches.filter((b) => b.status === 'completed').length;
      const total = operation.batches.length;
      return `Processing batch ${completed + 1} of ${total} - ${operation.remainingSeconds}s remaining`;
    }
  }

  async getOperationStatus(operationId: string): Promise<PurgeOperation | null> {
    return this.operations.get(operationId) || null;
  }

  async getCustomerOperations(
    customer: string,
    status?: string,
    limit = 50,
  ): Promise<PurgeOperation[]> {
    const operations = Array.from(this.operations.values())
      .filter((op) => op.customer === customer)
      .filter((op) => !status || op.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return operations;
  }

  async getCustomerDashboard(customer: string): Promise<CustomerDashboard> {
    const operations = Array.from(this.operations.values()).filter(
      (op) => op.customer === customer,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOps = operations.filter((op) => op.createdAt >= today);
    const completedOps = operations.filter((op) => op.status === 'completed');
    const failedOps = operations.filter((op) => op.status === 'failed');

    const recentErrors = operations
      .flatMap((op) => op.errors)
      .filter((err) => Date.now() - err.occurredAt.getTime() < 24 * 60 * 60 * 1000)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, 10);

    return {
      customer,
      activeOperations: operations.filter(
        (op) => op.status === 'in-progress' || op.status === 'pending',
      ).length,
      completedToday: todayOps.filter((op) => op.status === 'completed').length,
      failureRate: operations.length > 0 ? (failedOps.length / operations.length) * 100 : 0,
      averageCompletionTime:
        completedOps.length > 0
          ? completedOps.reduce((sum, op) => sum + (op.summary?.duration || 0), 0) /
            completedOps.length
          : 0,
      totalObjectsPurged: completedOps.reduce(
        (sum, op) => sum + (op.summary?.successfullyPurged || 0),
        0,
      ),
      rateLimitUtilization: this.fastPurgeService.getRateLimitStatus(customer).available / 100,
      recentErrors,
      performance: {
        successRate: operations.length > 0 ? (completedOps.length / operations.length) * 100 : 100,
        averageLatency:
          completedOps.length > 0
            ? completedOps.reduce((sum, op) => sum + (op.summary?.averageBatchTime || 0), 0) /
              completedOps.length
            : 0,
        throughput: todayOps.reduce((sum, op) => sum + (op.summary?.successfullyPurged || 0), 0),
      },
    };
  }

  onProgress(operationId: string, callback: (update: ProgressUpdate) => void): void {
    this.progressCallbacks.set(operationId, callback);
  }

  removeProgressCallback(operationId: string): void {
    this.progressCallbacks.delete(operationId);
  }

  private async cleanupOldOperations(): Promise<void> {
    const cutoff = Date.now() - this.RETENTION_PERIOD;
    const toRemove: string[] = [];

    for (const [operationId, operation] of this.operations) {
      if (operation.completedAt && operation.completedAt.getTime() < cutoff) {
        toRemove.push(operationId);
      }
    }

    for (const operationId of toRemove) {
      this.operations.delete(operationId);

      // Remove progress callback if exists
      this.progressCallbacks.delete(operationId);

      // Stop polling if exists
      const timer = this.pollingIntervals.get(operationId);
      if (timer) {
        clearInterval(timer);
        this.pollingIntervals.delete(operationId);
      }

      // Remove persisted file
      try {
        const filePath = path.join(this.statusDir, `${operationId}.json`);
        await fs.unlink(filePath);
      } catch (error: any) {
        // File might not exist, ignore error
      }
    }

    if (toRemove.length > 0) {
      logger.info(`Cleaned up ${toRemove.length} old purge operations`);
    }
  }

  async shutdown(): Promise<void> {
    // Stop all polling
    for (const timer of this.pollingIntervals.values()) {
      clearInterval(timer);
    }
    this.pollingIntervals.clear();

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Persist all operations
    for (const operation of this.operations.values()) {
      await this.persistOperation(operation);
    }

    logger.info('PurgeStatusTracker shutdown complete');
  }
}
