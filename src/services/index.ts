// Export all services

// Export unified cache service with all aliases for backward compatibility
export { 
  UnifiedCacheService,
  UnifiedCacheService as CacheService,
  UnifiedCacheService as AkamaiCacheService,
  UnifiedCacheService as SmartCache,
  getCacheService,
  isCacheAvailable,
  closeCacheService,
  CacheFactory,
  getDefaultCache,
  resetDefaultCache,
  createCacheService,
  CacheTTL,
  type PropertySearchResult,
  type SmartCacheOptions,
  type CacheEntry,
  type ICache,
  type CacheMetrics,
  type CacheFactoryOptions
} from './unified-cache-service';

export * from './BaseAkamaiClient';
export * from './certificate-deployment-coordinator';
export * from './certificate-enrollment-service';
export * from './certificate-validation-monitor';
export * from './contract-group-discovery-service';
export * from './dns-changelist-service';
// export {
//   FastPurgeService,
//   type FastPurgeRequest,
//   type FastPurgeResponse,
//   type PurgeStatus,
// } from './FastPurgeService';
// export * from './PurgeQueueManager';
// export * from './PurgeStatusTracker';
export * from './RealTimeMonitoringService';
// export * from './ReportingService';
// export * from './TrafficAnalyticsService';
export * from './error-recovery-service';
