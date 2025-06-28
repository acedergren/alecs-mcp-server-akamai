/**
 * Fast Purge API Response Types  
 * @see https://techdocs.akamai.com/purge/reference/api
 * 
 * CODE KAI IMPLEMENTATION:
 * - Runtime validation with Zod schemas
 * - Type guards for safe type assertions
 * - Custom error classes for actionable feedback
 * - Production-grade validation patterns
 */

import { z } from 'zod';

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

// CODE KAI Validation Schemas and Type Guards

/**
 * Zod schema for PurgeResponse validation
 */
export const PurgeResponseSchema = z.object({
  httpStatus: z.number().int().min(200).max(599),
  detail: z.string().min(1),
  estimatedSeconds: z.number().int().min(0),
  purgeId: z.string().min(1),
  supportId: z.string().min(1),
  title: z.string().optional(),
  describedBy: z.string().optional(),
});

/**
 * Zod schema for PurgeStatusResponse validation
 */
export const PurgeStatusResponseSchema = z.object({
  httpStatus: z.number().int().min(200).max(599),
  completionTime: z.string().optional(),
  submissionTime: z.string().min(1),
  originalEstimatedSeconds: z.number().int().min(0),
  progressUri: z.string().min(1),
  purgeId: z.string().min(1),
  supportId: z.string().min(1),
  status: z.enum(['Done', 'In-Progress', 'Unknown']),
  submittedBy: z.string().min(1),
  originalQueueLength: z.number().int().min(0),
  title: z.string().optional(),
  describedBy: z.string().optional(),
});

/**
 * Custom error class for FastPurge validation failures
 */
export class FastPurgeValidationError extends Error {
  public override readonly name = 'FastPurgeValidationError';
  public readonly received: unknown;
  public readonly expected: string;

  constructor(message: string, received: unknown, expected: string) {
    super(message);
    this.received = received;
    this.expected = expected;
    
    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FastPurgeValidationError);
    }
  }
}

/**
 * Type guard for PurgeResponse
 */
export function isPurgeResponse(data: unknown): data is PurgeResponse {
  try {
    PurgeResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for PurgeStatusResponse
 */
export function isPurgeStatusResponse(data: unknown): data is PurgeStatusResponse {
  try {
    PurgeStatusResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}