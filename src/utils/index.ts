// Export unified error handler as the primary error handling interface
export {
  UnifiedErrorHandler,
  AkamaiError,
  AkamaiErrorTypes,
  createErrorHandler,
  handleApiError,
  parseAkamaiError,
  createPropertyNotFoundError,
  createValidationError,
  createConcurrentModificationError,
  createConfigurationError,
  ErrorRecovery,
  type ProblemDetails,
  type ErrorContext,
} from './unified-error-handler';

// Export all other utility functions
export * from './customer-config';
export * from './edgegrid-client';
export * from './formatting';
export * from './logger';
export * from './mcp-tools';
export * from './parameter-validation';
export * from './performance-monitor';
export * from './product-mapping';
export * from './progress';
export * from './response-parsing';
export * from './tree-view';

// Export from resilience-manager (selective to avoid conflicts)
export {
  CircuitBreakerState,
  ErrorSeverity,
  OperationType,
  type ErrorCategory,
  type RecoveryStrategy,
  CircuitBreaker,
  RetryHandler,
  ErrorClassifier,
  ResilienceManager,
  globalResilienceManager,
  HealthChecker,
} from './resilience-manager';

// Legacy exports for backward compatibility (to be deprecated)
// These will be removed in a future version
export {
  withEnhancedErrorHandling,
  handleAkamaiError as legacyHandleAkamaiError,
  ErrorType,
  type EnhancedErrorResult,
} from './enhanced-error-handling';

export {
  formatApiError,
  createErrorResponse,
  extractErrorMessage,
} from './error-handling';

export {
  ErrorTranslator,
  type TranslatedError,
} from './errors';

export * from './tool-error-handling';
