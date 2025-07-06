/**
 * CODE KAI: Timeout Handler
 * World-class timeout management with detailed error messages
 * No shortcuts - comprehensive timeout handling for all operations
 */

import { AxiosRequestConfig } from 'axios';
import { TIMEOUT_CONFIG, ToolError, BaseToolArgs } from '../types/tool-infrastructure';

/**
 * Operation types for timeout configuration
 */
export enum OperationType {
  DEFAULT = 'default',
  PROPERTY_LIST = 'property-list',
  PROPERTY_CREATE = 'property-create',
  PROPERTY_ACTIVATE = 'property-activate',
  PROPERTY_VALIDATION = 'property-validation',
  DNS_RECORD_CREATE = 'dns-record-create',
  DNS_ZONE_CREATE = 'dns-zone-create',
  REPORT_GENERATE = 'report-generate',
  PURGE_REQUEST = 'purge-request',
  CERTIFICATE_CREATE = 'certificate-create',
  RULE_UPDATE = 'rule-update',
  BULK_OPERATION = 'bulk-operation'
}

/**
 * Get timeout for specific operation type
 */
export function getOperationTimeout(
  operationType: OperationType,
  customTimeout?: number
): number {
  // Custom timeout takes precedence
  if (customTimeout && customTimeout > 0) {
    return customTimeout;
  }

  // Operation-specific timeouts
  switch (operationType) {
    case OperationType.PROPERTY_ACTIVATE:
    case OperationType.CERTIFICATE_CREATE:
      return TIMEOUT_CONFIG.ACTIVATION;
    
    case OperationType.BULK_OPERATION:
    case OperationType.DNS_ZONE_CREATE:
      return TIMEOUT_CONFIG.LONG_OPERATION;
    
    case OperationType.REPORT_GENERATE:
      return TIMEOUT_CONFIG.REPORT;
    
    case OperationType.PROPERTY_LIST:
    case OperationType.PROPERTY_CREATE:
    case OperationType.PROPERTY_VALIDATION:
    case OperationType.DNS_RECORD_CREATE:
    case OperationType.PURGE_REQUEST:
    case OperationType.RULE_UPDATE:
    default:
      return TIMEOUT_CONFIG.DEFAULT;
  }
}

/**
 * Enhance Axios config with timeout handling
 */
export function withTimeout(
  config: AxiosRequestConfig,
  operationType: OperationType = OperationType.DEFAULT,
  customTimeout?: number
): AxiosRequestConfig {
  const timeout = getOperationTimeout(operationType, customTimeout);
  
  return {
    ...config,
    timeout,
    // Add timeout error transformer
    transformResponse: [
      ...(Array.isArray(config.transformResponse) 
        ? config.transformResponse 
        : config.transformResponse ? [config.transformResponse] : []),
      (data) => {
        // Pass through data
        return data;
      }
    ]
  };
}

/**
 * Create timeout-aware error message
 */
export function createTimeoutError(
  operation: string,
  timeout: number,
  context?: {
    propertyId?: string;
    customer?: string;
    network?: string;
  }
): Error {
  let message = `Operation '${operation}' timed out after ${timeout / 1000} seconds`;
  
  if (context?.propertyId) {
    message += ` for property ${context.propertyId}`;
  }
  
  if (context?.network) {
    message += ` on ${context.network} network`;
  }
  
  const suggestions = [
    'The API might be experiencing high load',
    'Try again with a longer timeout',
    'Check if the operation requires pre-validation',
    'Consider breaking large operations into smaller chunks'
  ];
  
  if (operation.includes('activation')) {
    suggestions.push('Property activations can take 5-10 minutes');
  }
  
  if (operation.includes('report')) {
    suggestions.push('Large reports may need extended timeout periods');
  }
  
  message += `\\n\\nSuggestions:\\n- ${suggestions.join('\\n- ')}`;
  
  return new Error(message);
}

/**
 * Execute operation with timeout handling
 */
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  options: {
    operationType: OperationType;
    toolName: string;
    operationName: string;
    timeout?: number;
    context?: BaseToolArgs & Record<string, unknown>;
  }
): Promise<T> {
  const timeout = getOperationTimeout(options.operationType, options.timeout);
  
  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(createTimeoutError(
        options.operationName,
        timeout,
        options.context
      ));
    }, timeout);
  });
  
  try {
    // Race between operation and timeout
    return await Promise.race([
      operation(),
      timeoutPromise
    ]);
  } catch (error: unknown) {
    // Enhance timeout errors with context
    if (error.message?.includes('timed out')) {
      throw new ToolError({
        operation: options.operationName,
        toolName: options.toolName,
        args: options.context || {},
        customer: options.context?.customer,
        propertyId: options.context?.['propertyId'],
        originalError: error,
        suggestion: `Operation exceeded ${timeout / 1000}s timeout. ${getTimeoutSuggestion(options.operationType)}`
      });
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Get operation-specific timeout suggestions
 */
function getTimeoutSuggestion(operationType: OperationType): string {
  switch (operationType) {
    case OperationType.PROPERTY_ACTIVATE:
      return 'Property activations typically take 3-5 minutes. Consider checking activation status instead';
    
    case OperationType.CERTIFICATE_CREATE:
      return 'Certificate provisioning can take several minutes. Check certificate status separately';
    
    case OperationType.REPORT_GENERATE:
      return 'Large reports may timeout. Try reducing the date range or filtering criteria';
    
    case OperationType.BULK_OPERATION:
      return 'Bulk operations should be broken into smaller batches';
    
    default:
      return 'Try increasing the timeout parameter or check API status';
  }
}

/**
 * Timeout-aware retry logic
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    shouldRetry = (error) => {
      // Retry on timeout and 5xx errors
      return error.message?.includes('timed out') ||
             error.response?.status >= 500;
    }
  } = options;
  
  let lastError: unknown;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }
  
  throw lastError;
}

/**
 * Create progress reporter for long operations
 */
export class ProgressReporter {
  private startTime: number;
  private lastUpdate: number;
  private timeout: number;
  
  constructor(
    _operation: string,
    timeout: number,
    private onProgress?: (message: string) => void
  ) {
    this.startTime = Date.now();
    this.lastUpdate = this.startTime;
    this.timeout = timeout;
  }
  
  /**
   * Report progress
   */
  report(message: string): void {
    const elapsed = Date.now() - this.startTime;
    const remaining = this.timeout - elapsed;
    
    if (remaining < 10000 && Date.now() - this.lastUpdate > 5000) {
      // Warn when close to timeout
      this.onProgress?.(
        `${message} (${Math.round(remaining / 1000)}s remaining before timeout)`
      );
    } else {
      this.onProgress?.(message);
    }
    
    this.lastUpdate = Date.now();
  }
  
  /**
   * Get elapsed time
   */
  getElapsed(): number {
    return Date.now() - this.startTime;
  }
}