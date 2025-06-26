/**
 * MCP Progress Token Support
 * 
 * Provides progress notification for long-running operations
 * like property activations that can take 20-30 minutes
 */

import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';

export interface ProgressUpdate {
  token: string;
  progress: number; // 0-100
  message: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  metadata?: {
    activationId?: string;
    propertyId?: string;
    network?: string;
    startTime?: number;
    estimatedTimeRemaining?: number;
  };
}

export interface ProgressOptions {
  totalSteps?: number;
  estimatedDuration?: number; // in seconds
  updateInterval?: number; // in seconds
}

export class ProgressToken {
  public readonly token: string;
  private emitter: EventEmitter;
  private startTime: number;
  private currentProgress: number = 0;
  private status: ProgressUpdate['status'] = 'pending';
  private intervalId?: NodeJS.Timeout;

  constructor(
    private readonly operation: string,
    private readonly options: ProgressOptions = {}
  ) {
    this.token = this.generateToken();
    this.emitter = new EventEmitter();
    this.startTime = Date.now();
  }

  private generateToken(): string {
    return `progress_${randomBytes(16).toString('hex')}`;
  }

  /**
   * Start progress tracking
   */
  start(initialMessage?: string): void {
    this.status = 'in_progress';
    this.emit({
      progress: 0,
      message: initialMessage || `Starting ${this.operation}...`,
      status: 'in_progress'
    });

    // Set up automatic progress updates if configured
    if (this.options.updateInterval) {
      this.intervalId = setInterval(() => {
        this.autoUpdate();
      }, this.options.updateInterval * 1000);
    }
  }

  /**
   * Update progress
   */
  update(progress: number, message: string, metadata?: ProgressUpdate['metadata']): void {
    this.currentProgress = Math.min(100, Math.max(0, progress));
    this.emit({
      progress: this.currentProgress,
      message,
      status: this.status,
      metadata
    });
  }

  /**
   * Complete the operation
   */
  complete(message?: string): void {
    this.clearInterval();
    this.status = 'completed';
    this.currentProgress = 100;
    this.emit({
      progress: 100,
      message: message || `${this.operation} completed successfully`,
      status: 'completed'
    });
  }

  /**
   * Mark as failed
   */
  fail(error: string): void {
    this.clearInterval();
    this.status = 'failed';
    this.emit({
      progress: this.currentProgress,
      message: `Failed: ${error}`,
      status: 'failed'
    });
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: (update: ProgressUpdate) => void): () => void {
    this.emitter.on('progress', callback);
    return () => this.emitter.off('progress', callback);
  }

  /**
   * Get current status
   */
  getStatus(): ProgressUpdate {
    return {
      token: this.token,
      progress: this.currentProgress,
      message: `${this.operation} ${this.status}`,
      status: this.status
    };
  }

  private emit(update: Omit<ProgressUpdate, 'token'>): void {
    this.emitter.emit('progress', {
      ...update,
      token: this.token
    });
  }

  private autoUpdate(): void {
    if (this.status !== 'in_progress') return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const estimatedTotal = this.options.estimatedDuration || 300; // 5 min default
    const estimatedProgress = Math.min(95, (elapsed / estimatedTotal) * 100);

    if (estimatedProgress > this.currentProgress) {
      this.update(
        estimatedProgress,
        this.getProgressMessage(estimatedProgress),
        {
          estimatedTimeRemaining: Math.max(0, estimatedTotal - elapsed)
        }
      );
    }
  }

  private getProgressMessage(progress: number): string {
    if (progress < 25) return `${this.operation} initializing...`;
    if (progress < 50) return `${this.operation} in progress...`;
    if (progress < 75) return `${this.operation} processing...`;
    if (progress < 95) return `${this.operation} finalizing...`;
    return `${this.operation} almost complete...`;
  }

  private clearInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

/**
 * Progress manager for tracking multiple operations
 */
export class ProgressManager {
  private static instance: ProgressManager;
  private tokens: Map<string, ProgressToken> = new Map();

  static getInstance(): ProgressManager {
    if (!ProgressManager.instance) {
      ProgressManager.instance = new ProgressManager();
    }
    return ProgressManager.instance;
  }

  /**
   * Create a new progress token
   */
  createToken(operation: string, options?: ProgressOptions): ProgressToken {
    const token = new ProgressToken(operation, options);
    this.tokens.set(token.token, token);
    
    // Auto-cleanup completed/failed tokens after 1 hour
    token.onProgress((update) => {
      if (update.status === 'completed' || update.status === 'failed') {
        setTimeout(() => {
          this.tokens.delete(update.token);
        }, 3600000); // 1 hour
      }
    });

    return token;
  }

  /**
   * Get a progress token by ID
   */
  getToken(tokenId: string): ProgressToken | undefined {
    return this.tokens.get(tokenId);
  }

  /**
   * Get all active tokens
   */
  getActiveTokens(): ProgressToken[] {
    return Array.from(this.tokens.values()).filter(
      token => ['pending', 'in_progress'].includes(token.getStatus().status)
    );
  }

  /**
   * Clear all tokens
   */
  clear(): void {
    this.tokens.clear();
  }
}

/**
 * Helper function for property activation progress
 */
export function createActivationProgress(
  propertyId: string,
  network: 'STAGING' | 'PRODUCTION',
  activationId?: string
): ProgressToken {
  const estimatedDuration = network === 'PRODUCTION' ? 1800 : 600; // 30 min : 10 min
  
  return ProgressManager.getInstance().createToken(
    `Property activation to ${network}`,
    {
      estimatedDuration,
      updateInterval: 30 // Update every 30 seconds
    }
  );
}