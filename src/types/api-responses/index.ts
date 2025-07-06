/**
 * Akamai API Response Types
 * 
 * This module exports all response types for Akamai APIs used in the MCP server.
 * Each API has its own module with properly typed responses.
 */

// Common types used across all APIs
export * from './common';

// Property Manager API (PAPI)
export * from './property-manager';

// Edge DNS API
export * from './edge-dns';

// Certificate Provisioning System (CPS)
export * from './certificate';

// Network Lists API
export * from './network-lists';

// Fast Purge API
export * from './fast-purge';

// Application Security API
export * from './security';

/**
 * Type guard to check if a response is an error
 */
export function isAkamaiError(response: unknown): response is import('./common').AkamaiErrorResponse {
  return response && typeof response === 'object' && 'title' in response && 'status' in response;
}

/**
 * Type guard to check if a response has items array
 */
export function hasItemsArray<T>(response: unknown): response is { items: T[] } {
  return response && typeof response === 'object' && Array.isArray(response.items);
}

/**
 * Utility type to extract item type from list response
 */
export type ExtractItemType<T> = T extends { items: Array<infer U> } ? U : never;

/**
 * Utility type for API response with headers
 */
export interface ApiResponseWithHeaders<T> {
  data: T;
  headers: Record<string, string>;
  status: number;
}