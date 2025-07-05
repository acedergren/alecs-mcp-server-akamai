/**
 * API Response Validator
 * Provides type-safe validation for Akamai API responses
 */

/**
 * Safely validates and casts API responses
 * This is a pragmatic solution to handle unknown API responses
 * while maintaining some type safety
 */
export function validateApiResponse<T>(response: unknown): T {
  // In production, we would add runtime validation here
  // For now, we're doing a type assertion with a safety check
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid API response: expected object');
  }
  return response as T;
}

/**
 * Type guards for common Akamai response structures
 */
export function isPropertyResponse(response: unknown): response is any {
  return response !== null && typeof response === 'object' && 'properties' in response;
}

export function isHostnamesResponse(response: unknown): response is any {
  return response !== null && typeof response === 'object' && 'hostnames' in response;
}

export function isActivationResponse(response: unknown): response is any {
  return response !== null && typeof response === 'object' && 'activationId' in response;
}

export function isZonesResponse(response: unknown): response is any {
  return response !== null && typeof response === 'object' && 'zones' in response;
}

export function isNetworkListResponse(response: unknown): response is any {
  return response !== null && typeof response === 'object' && 'networkLists' in response;
}

/**
 * Generic safe property access
 */
export function safeAccess<T>(obj: unknown, accessor: (obj: Record<string, unknown>) => T, defaultValue: T): T {
  try {
    if (obj && typeof obj === 'object') {
      return accessor(obj as Record<string, unknown>) ?? defaultValue;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Quick type definitions for missing types
 */
export interface ZoneSubmitResponse {
  submissionId: string;
  changeId?: string;
  status?: string;
}

export interface PropertyHostname {
  hostname: string;
  cnameFrom?: string;
  cnameTo?: string;
}

export type CPSEnrollmentMetadata = {
  enrollmentId: number;
  status: string;
  certificateType: string;
  [key: string]: any;
}