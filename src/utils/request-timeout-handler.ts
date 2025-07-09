/**
 * REQUEST TIMEOUT HANDLER
 * 
 * CODE KAI ARCHITECTURE:
 * Provides robust timeout handling for Akamai API requests to prevent
 * hanging connections and improve overall application stability.
 * 
 * KEY FEATURES:
 * - AbortController-based timeouts
 * - Configurable timeout durations per operation type
 * - Automatic cleanup of resources
 * - Integration with retry logic
 * 
 * STABILITY IMPROVEMENTS:
 * - Prevents indefinite hanging on slow/unresponsive APIs
 * - Frees up resources from abandoned requests
 * - Provides clear timeout errors for better debugging
 */

import { createLogger } from './pino-logger';

// CODE KAI: Type-safe timeout error interfaces
interface TimeoutError extends Error {
  code: 'ETIMEDOUT';
  timeout: number;
}

interface ControllerWithTimeout extends AbortController {
  timeoutId?: NodeJS.Timeout;
}

const logger = createLogger('request-timeout-handler');

/**
 * Timeout configurations for different operation types
 */
export const TIMEOUT_CONFIGS = {
  // Fast operations (simple GETs)
  fast: 10000, // 10 seconds
  
  // Standard operations (most API calls)
  standard: 30000, // 30 seconds
  
  // Slow operations (property activations, bulk operations)
  slow: 120000, // 2 minutes
  
  // Very slow operations (large bulk updates)
  verySlow: 300000, // 5 minutes
} as const;

export type TimeoutType = keyof typeof TIMEOUT_CONFIGS;

/**
 * Create a timeout-wrapped request
 */
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number | TimeoutType = 'standard',
  operationName?: string
): Promise<T> {
  const timeout = typeof timeoutMs === 'string' ? TIMEOUT_CONFIGS[timeoutMs] : timeoutMs;
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
    logger.warn({
      operationName,
      timeout,
    }, 'Request timeout - aborting operation');
  }, timeout);

  try {
    const result = await operation(controller.signal);
    clearTimeout(timeoutId);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Check if it was a timeout
    if (controller.signal.aborted) {
      const timeoutError = new Error(
        `Operation${operationName ? ` '${operationName}'` : ''} timed out after ${timeout}ms`
      ) as TimeoutError;
      timeoutError.code = 'ETIMEDOUT';
      timeoutError.timeout = timeout;
      throw timeoutError;
    }
    
    throw error;
  }
}

/**
 * Create a request with timeout and retry capabilities
 */
export async function resilientRequest<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: {
    timeout?: number | TimeoutType;
    retries?: number;
    retryDelay?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    timeout = 'standard',
    retries = 3,
    retryDelay = 1000,
    operationName,
  } = options;

  let lastError: unknown;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(operation, timeout, operationName);
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // Check if it's a timeout error
      const isTimeout = error.code === 'ETIMEDOUT';
      
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        
        logger.info({
          attempt: attempt + 1,
          maxRetries: retries,
          delay,
          isTimeout,
          error: (error as any).message,
          operationName,
        }, 'Request failed, retrying...');
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Batch timeout handler for multiple concurrent requests
 */
export class BatchTimeoutHandler {
  private controllers: Map<string, AbortController> = new Map();
  
  /**
   * Start a new timeout for an operation
   */
  startTimeout(
    operationId: string,
    timeoutMs: number | TimeoutType = 'standard'
  ): AbortSignal {
    const timeout = typeof timeoutMs === 'string' ? TIMEOUT_CONFIGS[timeoutMs] : timeoutMs;
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => {
      controller.abort();
      this.controllers.delete(operationId);
      logger.warn({
        operationId,
        timeout,
      }, 'Batch operation timeout');
    }, timeout);
    
    // Store controller with timeout ID for cleanup
    const controllerWithTimeout = controller as ControllerWithTimeout;
    controllerWithTimeout.timeoutId = timeoutId;
    this.controllers.set(operationId, controller);
    
    return controller.signal;
  }
  
  /**
   * Clear a specific timeout
   */
  clearTimeout(operationId: string): void {
    const controller = this.controllers.get(operationId);
    if (controller) {
      const controllerWithTimeout = controller as ControllerWithTimeout;
      const timeoutId = controllerWithTimeout.timeoutId;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      this.controllers.delete(operationId);
    }
  }
  
  /**
   * Clear all timeouts
   */
  clearAll(): void {
    for (const [, controller] of this.controllers) {
      const controllerWithTimeout = controller as ControllerWithTimeout;
      const timeoutId = controllerWithTimeout.timeoutId;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
    this.controllers.clear();
  }
  
  /**
   * Abort a specific operation
   */
  abort(operationId: string): void {
    const controller = this.controllers.get(operationId);
    if (controller) {
      controller.abort();
      this.clearTimeout(operationId);
    }
  }
  
  /**
   * Abort all operations
   */
  abortAll(): void {
    for (const controller of this.controllers.values()) {
      controller.abort();
    }
    this.clearAll();
  }
}

/**
 * Determine appropriate timeout based on operation type
 */
export function getTimeoutForOperation(operationType: string): TimeoutType {
  const slowOperations = [
    'activate',
    'bulk',
    'create-property',
    'create-zone',
    'import',
    'export',
  ];
  
  const verySlowOperations = [
    'bulk-activate',
    'bulk-update',
    'bulk-import',
  ];
  
  const fastOperations = [
    'get',
    'list',
    'status',
    'check',
  ];
  
  const operationLower = operationType.toLowerCase();
  
  if (verySlowOperations.some(op => operationLower.includes(op))) {
    return 'verySlow';
  }
  
  if (slowOperations.some(op => operationLower.includes(op))) {
    return 'slow';
  }
  
  if (fastOperations.some(op => operationLower.includes(op))) {
    return 'fast';
  }
  
  return 'standard';
}