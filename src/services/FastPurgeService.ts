import { EdgeGridClient } from '@utils/edgegrid-client';
import { AkamaiError } from '@utils/errors';
import { logger } from '@utils/logger';
import { ResilienceManager, OperationType } from '@utils/resilience-manager';

// TypeScript interfaces for FastPurge API
export interface FastPurgeRequest {
  network: 'staging' | 'production';
  objects: string[];
  type?: 'url' | 'cpcode' | 'tag';
  hostname?: string;
}

export interface FastPurgeResponse {
  purgeId: string;
  supportId: string;
  detail: string;
  estimatedSeconds: number;
  _httpStatus: number;
  purgedCount?: number;
  title?: string;
  pingAfterSeconds?: number;
}

export interface PurgeStatus {
  purgeId: string;
  status: 'In-Progress' | 'Done' | 'Failed';
  submittedBy: string;
  submittedTime: string;
  completionTime?: string;
  estimatedSeconds: number;
  purgedCount: number;
  supportId: string;
  customer?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset?: number;
  retryAfter?: number;
}

export interface BatchResult {
  successful: string[];
  failed: string[];
  errors: Error[];
  rateLimitInfo?: RateLimitInfo;
}

// Token bucket for rate limiting
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly burstCapacity: number;

  constructor(
    capacity = 100,
    refillRate: number = 100 / 60, // 100 per minute
    burstCapacity = 50,
  ) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.burstCapacity = burstCapacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(count = 1): Promise<boolean> {
    this.refill();

    if (count > this.burstCapacity) {
      return false;
    }

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

export class FastPurgeService {
  private static instance: FastPurgeService;
  private clients: Map<string, EdgeGridClient> = new Map();
  private resilienceManager: ResilienceManager;
  private rateLimiters: Map<string, TokenBucket> = new Map();

  // Constants
  private readonly MAX_REQUEST_SIZE = 50 * 1024; // 50KB
  private readonly MAX_URLS_PER_REQUEST = 5000;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 16000; // 16 seconds
  private readonly MAX_RETRIES = 5;

  private constructor() {
    this.resilienceManager = ResilienceManager.getInstance();
  }

  private getClient(customer: string): EdgeGridClient {
    if (!this.clients.has(customer)) {
      this.clients.set(customer, EdgeGridClient.getInstance(customer));
    }
    return this.clients.get(customer)!;
  }

  static getInstance(): FastPurgeService {
    if (!FastPurgeService.instance) {
      FastPurgeService.instance = new FastPurgeService();
    }
    return FastPurgeService.instance;
  }

  private getRateLimiter(customer: string): TokenBucket {
    if (!this.rateLimiters.has(customer)) {
      this.rateLimiters.set(customer, new TokenBucket());
    }
    return this.rateLimiters.get(customer)!;
  }

  private calculateBatchSize(objects: string[]): number[] {
    const batches: number[] = [];
    let currentBatchSize = 0;
    let currentBatchCount = 0;

    for (const obj of objects) {
      const objSize = Buffer.byteLength(obj, 'utf8');

      if (
        currentBatchSize + objSize > this.MAX_REQUEST_SIZE ||
        currentBatchCount >= this.MAX_URLS_PER_REQUEST
      ) {
        batches.push(currentBatchCount);
        currentBatchSize = objSize;
        currentBatchCount = 1;
      } else {
        currentBatchSize += objSize;
        currentBatchCount++;
      }
    }

    if (currentBatchCount > 0) {
      batches.push(currentBatchCount);
    }

    return batches;
  }

  private async executeWithRetry<T>(
    _customer: string,
    operation: () => Promise<T>,
    _context: string,
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.INITIAL_RETRY_DELAY;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await this.resilienceManager.executeWithCircuitBreaker(
          OperationType.BULK_OPERATION,
          operation,
        );
      } catch (_error: any) {
        lastError = _error;

        // Handle rate limiting
        if (_error.status === 429) {
          const retryAfter = parseInt(_error.headers?.['retry-after'] || '0') * 1000;
          const waitTime = retryAfter || delay;

          logger.warn(`Rate limited on ${_context}. Waiting ${waitTime}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));

          delay = Math.min(delay * 2, this.MAX_RETRY_DELAY);
          continue;
        }

        // Don't retry on client errors (except rate limits)
        if (_error.status && _error.status >= 400 && _error.status < 500) {
          throw _error;
        }

        // Exponential backoff for other errors
        if (attempt < this.MAX_RETRIES - 1) {
          logger.warn(`Retry ${attempt + 1} for ${_context} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, this.MAX_RETRY_DELAY);
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries`);
  }

  private parseRateLimitHeaders(headers: any): RateLimitInfo {
    return {
      limit: parseInt(headers?.['x-ratelimit-limit'] || '100'),
      remaining: parseInt(headers?.['x-ratelimit-remaining'] || '0'),
      reset: headers?.['x-ratelimit-reset'] ? parseInt(headers['x-ratelimit-reset']) : undefined,
      retryAfter: headers?.['retry-after'] ? parseInt(headers['retry-after']) : undefined,
    };
  }

  private validateNetwork(network: string): 'staging' | 'production' {
    const normalizedNetwork = network.toLowerCase();
    if (normalizedNetwork !== 'staging' && normalizedNetwork !== 'production') {
      throw new AkamaiError(
        `Invalid network: ${network}. Must be 'staging' or 'production'`,
        400,
        'INVALID_NETWORK',
      );
    }
    return normalizedNetwork;
  }

  async purgeByUrl(
    customer: string,
    network: string,
    urls: string[],
  ): Promise<FastPurgeResponse[]> {
    const validatedNetwork = this.validateNetwork(network);
    const rateLimiter = this.getRateLimiter(customer);

    if (!(await rateLimiter.consume(1))) {
      throw new AkamaiError(
        'Rate limit exceeded. Please wait before making more requests.',
        429,
        'RATE_LIMIT_EXCEEDED',
      );
    }

    const client = this.getClient(customer);
    const batchSizes = this.calculateBatchSize(urls);
    const responses: FastPurgeResponse[] = [];
    let processedCount = 0;

    for (const batchSize of batchSizes) {
      const batch = urls.slice(processedCount, processedCount + batchSize);

      try {
        const response = await this.executeWithRetry(
          customer,
          async () => {
            const result = await client.request({
              method: 'POST',
              path: `/ccu/v3/invalidate/url/${validatedNetwork}`,
              body: {
                objects: batch,
              },
              headers: {
                'Content-Type': 'application/json',
              },
            });

            const rateLimitInfo = this.parseRateLimitHeaders(result.headers);
            logger.info(
              `FastPurge URL batch completed. Rate limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`,
            );

            return result;
          },
          `FastPurge URL batch for ${customer}`,
        );

        responses.push({
          purgeId: response.data.purgeId,
          supportId: response.data.supportId,
          detail: response.data.detail,
          estimatedSeconds: response.data.estimatedSeconds,
          _httpStatus: response.data.httpStatus,
          purgedCount: batch.length,
          title: response.data.title,
          pingAfterSeconds: response.data.pingAfterSeconds,
        });

        processedCount += batchSize;
      } catch (_error: any) {
        logger.error(`FastPurge error: ${_error.message}`);

        // Handle RFC 7807 problem details
        if (_error.response?.data?.type) {
          throw new AkamaiError(
            _error.response.data.detail || _error.response.data.title,
            _error.response.status || 500,
            'FASTPURGE_ERROR',
            {
              type: _error.response.data.type,
              supportId: _error.response.data.supportId,
              instance: _error.response.data.instance,
              status: _error.response.data.status,
            },
          );
        }

        throw _error;
      }
    }

    return responses;
  }

  async purgeByCpCode(
    customer: string,
    network: string,
    cpCodes: string[],
  ): Promise<FastPurgeResponse[]> {
    const validatedNetwork = this.validateNetwork(network);
    const rateLimiter = this.getRateLimiter(customer);
    const client = this.getClient(customer);
    const responses: FastPurgeResponse[] = [];

    for (const cpCode of cpCodes) {
      if (!(await rateLimiter.consume(1))) {
        throw new AkamaiError(
          'Rate limit exceeded. Please wait before making more requests.',
          429,
          'RATE_LIMIT_EXCEEDED',
        );
      }

      try {
        const response = await this.executeWithRetry(
          customer,
          async () => {
            const result = await client.request({
              method: 'POST',
              path: `/ccu/v3/invalidate/cpcode/${validatedNetwork}`,
              body: {
                objects: [cpCode],
              },
              headers: {
                'Content-Type': 'application/json',
              },
            });

            const rateLimitInfo = this.parseRateLimitHeaders(result.headers);
            logger.info(
              `FastPurge CP code completed. Rate limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`,
            );

            return result;
          },
          `FastPurge CP code ${cpCode} for ${customer}`,
        );

        responses.push({
          purgeId: response.data.purgeId,
          supportId: response.data.supportId,
          detail: response.data.detail,
          estimatedSeconds: response.data.estimatedSeconds,
          _httpStatus: response.data.httpStatus,
          purgedCount: 1,
          title: response.data.title,
          pingAfterSeconds: response.data.pingAfterSeconds,
        });
      } catch (_error: any) {
        logger.error(`FastPurge error: ${_error.message}`);

        if (_error.response?.data?.type) {
          throw new AkamaiError(
            _error.response.data.detail || _error.response.data.title,
            _error.response.status || 500,
            'FASTPURGE_ERROR',
            {
              type: _error.response.data.type,
              supportId: _error.response.data.supportId,
              cpCode: cpCode,
            },
          );
        }

        throw _error;
      }
    }

    return responses;
  }

  async purgeByCacheTag(
    customer: string,
    network: string,
    tags: string[],
  ): Promise<FastPurgeResponse[]> {
    const validatedNetwork = this.validateNetwork(network);
    const rateLimiter = this.getRateLimiter(customer);

    if (!(await rateLimiter.consume(1))) {
      throw new AkamaiError(
        'Rate limit exceeded. Please wait before making more requests.',
        429,
        'RATE_LIMIT_EXCEEDED',
      );
    }

    const client = this.getClient(customer);
    const batchSizes = this.calculateBatchSize(tags);
    const responses: FastPurgeResponse[] = [];
    let processedCount = 0;

    for (const batchSize of batchSizes) {
      const batch = tags.slice(processedCount, processedCount + batchSize);

      try {
        const response = await this.executeWithRetry(
          customer,
          async () => {
            const result = await client.request({
              method: 'POST',
              path: `/ccu/v3/invalidate/tag/${validatedNetwork}`,
              body: {
                objects: batch,
              },
              headers: {
                'Content-Type': 'application/json',
              },
            });

            const rateLimitInfo = this.parseRateLimitHeaders(result.headers);
            logger.info(
              `FastPurge tag batch completed. Rate limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`,
            );

            return result;
          },
          `FastPurge tag batch for ${customer}`,
        );

        responses.push({
          purgeId: response.data.purgeId,
          supportId: response.data.supportId,
          detail: response.data.detail,
          estimatedSeconds: response.data.estimatedSeconds,
          _httpStatus: response.data.httpStatus,
          purgedCount: batch.length,
          title: response.data.title,
          pingAfterSeconds: response.data.pingAfterSeconds,
        });

        processedCount += batchSize;
      } catch (_error: any) {
        logger.error(`FastPurge error: ${_error.message}`);

        if (_error.response?.data?.type) {
          throw new AkamaiError(
            _error.response.data.detail || _error.response.data.title,
            _error.response.status || 500,
            'FASTPURGE_ERROR',
            {
              type: _error.response.data.type,
              supportId: _error.response.data.supportId,
              tags: batch,
            },
          );
        }

        throw _error;
      }
    }

    return responses;
  }

  async checkPurgeStatus(customer: string, purgeId: string): Promise<PurgeStatus> {
    const client = this.getClient(customer);

    try {
      const response = await this.executeWithRetry(
        customer,
        async () => {
          const result = await client.request({
            method: 'GET',
            path: `/ccu/v3/purges/${purgeId}`,
            headers: {
              Accept: 'application/json',
            },
          });

          return result;
        },
        `Check purge status ${purgeId} for ${customer}`,
      );

      return {
        purgeId: response.data.purgeId,
        status: response.data.purgeStatus,
        submittedBy: response.data.submittedBy,
        submittedTime: response.data.submittedTime,
        completionTime: response.data.completionTime,
        estimatedSeconds: response.data.estimatedSeconds,
        purgedCount: response.data.purgedCount || 0,
        supportId: response.data.supportId,
        customer: customer,
      };
    } catch (_error: any) {
      logger.error(`FastPurge validation error: ${_error.message}`);

      if (_error.response?.data?.type) {
        throw new AkamaiError(
          _error.response.data.detail || _error.response.data.title,
          _error.response.status || 500,
          'FASTPURGE_STATUS_ERROR',
          {
            type: _error.response.data.type,
            supportId: _error.response.data.supportId,
            purgeId: purgeId,
          },
        );
      }

      throw _error;
    }
  }

  getRateLimitStatus(customer: string): { available: number; capacity: number } {
    const rateLimiter = this.getRateLimiter(customer);
    return {
      available: rateLimiter.getAvailableTokens(),
      capacity: 100,
    };
  }

  // Helper method to estimate completion time
  estimateCompletionTime(objects: string[]): number {
    const batchSizes = this.calculateBatchSize(objects);
    const batchCount = batchSizes.length;

    // Akamai typically completes purges in ~5 seconds
    // Add buffer for multiple batches
    return 5 + (batchCount - 1) * 2;
  }
}
