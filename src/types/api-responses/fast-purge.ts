/**
 * Fast Purge API Response Types  
 * @see https://techdocs.akamai.com/purge/reference/api
 */

/**
 * Purge action types
 */
export enum PurgeAction {
  INVALIDATE = 'invalidate',
  DELETE = 'delete',
}

/**
 * Purge network
 */
export enum PurgeNetwork {
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * Purge type
 */
export enum PurgeType {
  URL = 'url',
  TAG = 'tag',
  CPCODE = 'cpcode',
}

/**
 * Response from POST /ccu/v3/invalidate/* or /ccu/v3/delete/*
 */
export interface PurgeResponse {
  httpStatus: number;
  detail: string;
  estimatedSeconds: number;
  purgeId: string;
  supportId: string;
  title?: string;
  describedBy?: string;
}

/**
 * Response from GET /ccu/v3/purges/{purgeId}
 */
export interface PurgeStatusResponse {
  httpStatus: number;
  completionTime?: string;
  submissionTime: string;
  originalEstimatedSeconds: number;
  progressUri: string;
  purgeId: string;
  supportId: string;
  status: 'Done' | 'In-Progress' | 'Unknown';
  submittedBy: string;
  originalQueueLength: number;
  title?: string;
  describedBy?: string;
}

/**
 * Purge request body for URLs
 */
export interface PurgeUrlRequest {
  objects: string[];
  hostname?: string;
  type?: 'arl' | 'url';
}

/**
 * Purge request body for CP codes
 */
export interface PurgeCpCodeRequest {
  objects: string[];
  type?: 'cpcode';
}

/**
 * Purge request body for cache tags
 */
export interface PurgeTagRequest {
  objects: string[];
  type?: 'tag';
}

/**
 * Rate limit information in response headers
 */
export interface PurgeRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  next?: string;
}

/**
 * Extended purge response with rate limit info
 */
export interface PurgeResponseWithRateLimit extends PurgeResponse {
  rateLimit?: PurgeRateLimit;
}

/**
 * Bulk purge operation
 */
export interface BulkPurgeRequest {
  action: PurgeAction;
  network?: PurgeNetwork;
  type: PurgeType;
  objects: string[];
}

/**
 * Historical purge information
 */
export interface PurgeHistoryItem {
  purgeId: string;
  submittedBy: string;
  submissionTime: string;
  completionTime?: string;
  status: string;
  network: string;
  action: string;
  type: string;
  objectCount: number;
}

/**
 * Response from purge history endpoints
 */
export interface PurgeHistoryResponse {
  purges: PurgeHistoryItem[];
  metadata?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
  };
}