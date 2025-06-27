/**
 * Common types shared across all Akamai API responses
 */

/**
 * RFC 7807 Problem Details for HTTP APIs
 * Used for all Akamai API error responses
 */
export interface AkamaiErrorResponse {
  type?: string;
  title: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Array<{
    type: string;
    title: string;
    detail?: string;
    field?: string;
  }>;
  requestId?: string;
  traceId?: string;
}

/**
 * Common pagination structure used across list endpoints
 */
export interface PaginationInfo {
  totalItems?: number;
  pageSize?: number;
  currentPage?: number;
  links?: {
    self?: string;
    next?: string;
    prev?: string;
  };
}

/**
 * Common status values across Akamai APIs
 */
export enum ActivationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  DEACTIVATED = 'DEACTIVATED',
  FAILED = 'FAILED',
  NEW = 'NEW',
  REACTIVATING = 'REACTIVATING',
  ZONE_1 = 'ZONE_1',
  ZONE_2 = 'ZONE_2',
  ZONE_3 = 'ZONE_3',
  ABORTED = 'ABORTED',
}

/**
 * Common network types
 */
export enum NetworkType {
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
}

/**
 * Base response wrapper for list endpoints
 */
export interface ListResponse<T> {
  items: T[];
}

/**
 * Metadata often included in responses
 */
export interface ResponseMetadata {
  lastModified?: string;
  etag?: string;
  accountId?: string;
}

/**
 * Common link structure
 */
export interface Links {
  [key: string]: string;
}

/**
 * Common activation type
 */
export enum ActivationType {
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
}