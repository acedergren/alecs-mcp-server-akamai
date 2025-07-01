/**
 * ETAG HANDLER FOR CONCURRENT MODIFICATION PREVENTION
 * 
 * ARCHITECTURAL PURPOSE:
 * Implements ETag (Entity Tag) handling for Akamai API operations to prevent
 * concurrent modification conflicts. ETags ensure that updates are applied to
 * the expected version of a resource, preventing lost updates in multi-user
 * environments.
 * 
 * HOW ETAGS WORK:
 * 1. GET request returns resource + ETag header
 * 2. Client stores ETag with resource data
 * 3. PUT/PATCH request includes If-Match: [etag] header
 * 4. Server rejects if ETag doesn't match current version
 * 5. Client must refresh and retry with new ETag
 * 
 * BENEFITS:
 * - Prevents lost updates from concurrent modifications
 * - Ensures changes are applied to expected version
 * - Provides clear conflict detection
 * - Enables safe collaborative editing
 */

import { type AkamaiClient } from '../akamai-client';
import { createConcurrentModificationError } from './rfc7807-errors';

/**
 * Storage for ETags by resource path
 * In production, this could be Redis or another persistent store
 */
const etagCache = new Map<string, string>();

/**
 * Extract ETag from response headers
 * @param response - API response object
 * @returns ETag value or null if not present
 */
export function extractETag(response: any): string | null {
  // Check various header formats
  const etag = response.headers?.etag || 
                response.headers?.ETag || 
                response.headers?.['etag'] ||
                response.etag ||
                response.ETag;
  
  if (etag) {
    // Remove quotes if present (W/"abc123" -> abc123)
    return etag.replace(/^W?\/?"?|"$/g, '');
  }
  
  return null;
}

/**
 * Store ETag for a resource
 * @param resourcePath - The API path for the resource
 * @param etag - The ETag value to store
 */
export function storeETag(resourcePath: string, etag: string): void {
  if (resourcePath && etag) {
    etagCache.set(resourcePath, etag);
  }
}

/**
 * Retrieve stored ETag for a resource
 * @param resourcePath - The API path for the resource
 * @returns Stored ETag or null if not found
 */
export function getStoredETag(resourcePath: string): string | null {
  return etagCache.get(resourcePath) || null;
}

/**
 * Clear ETag for a resource (e.g., after deletion)
 * @param resourcePath - The API path for the resource
 */
export function clearETag(resourcePath: string): void {
  etagCache.delete(resourcePath);
}

/**
 * Clear all stored ETags
 */
export function clearAllETags(): void {
  etagCache.clear();
}

/**
 * Make an API request with ETag support
 * Automatically handles ETag storage and If-Match headers
 */
export async function requestWithETag(
  client: AkamaiClient,
  options: {
    path: string;
    method: string;
    body?: any;
    queryParams?: Record<string, string>;
    useStoredETag?: boolean;
    etag?: string;
  }
): Promise<any> {
  const headers: Record<string, string> = {};
  
  // For update operations, include If-Match header
  if ((options.method === 'PUT' || options.method === 'PATCH') && 
      (options.useStoredETag || options.etag)) {
    const etag = options.etag || getStoredETag(options.path);
    if (etag) {
      headers['If-Match'] = etag;
    }
  }
  
  try {
    const response = await client.request({
      path: options.path,
      method: options.method,
      body: options.body,
      queryParams: options.queryParams,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    
    // Store ETag from response for future use
    const newETag = extractETag(response);
    if (newETag) {
      storeETag(options.path, newETag);
    }
    
    return response;
  } catch (error: any) {
    // Handle 412 Precondition Failed (ETag mismatch)
    if (error.response?.status === 412) {
      throw createConcurrentModificationError(
        options.path,
        headers['If-Match'],
        error.response.headers?.etag
      );
    }
    throw error;
  }
}

/**
 * Enhanced property rules getter that stores ETag
 */
export async function getPropertyRulesWithETag(
  client: AkamaiClient,
  propertyId: string,
  version: number,
  validateRules?: boolean
): Promise<{ rules: any; etag: string | null }> {
  const path = `/papi/v1/properties/${propertyId}/versions/${version}/rules`;
  const queryParams: Record<string, string> = {};
  if (validateRules) {queryParams['validateRules'] = 'true';}
  
  const response = await requestWithETag(client, {
    path,
    method: 'GET',
    queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  });
  
  return {
    rules: response,
    etag: getStoredETag(path),
  };
}

/**
 * Enhanced property rules updater that uses stored ETag
 */
export async function updatePropertyRulesWithETag(
  client: AkamaiClient,
  propertyId: string,
  version: number,
  rules: any,
  options?: {
    validateRules?: boolean;
    etag?: string;
    useStoredETag?: boolean;
  }
): Promise<any> {
  const path = `/papi/v1/properties/${propertyId}/versions/${version}/rules`;
  const queryParams: Record<string, string> = {};
  if (options?.validateRules) {queryParams['validateRules'] = 'true';}
  
  return requestWithETag(client, {
    path,
    method: 'PUT',
    body: rules,
    queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    etag: options?.etag,
    useStoredETag: options?.useStoredETag !== false, // Default to true
  });
}

/**
 * Retry an operation with fresh ETag after conflict
 */
export async function retryWithFreshETag<T>(
  operation: () => Promise<T>,
  refreshOperation: () => Promise<void>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on ETag conflicts
      if (error.status === 409 || error.status === 412) {
        if (attempt < maxRetries - 1) {
          // Refresh the resource to get new ETag
          await refreshOperation();
          // Continue to next attempt
          continue;
        }
      }
      
      // Don't retry other errors
      throw error;
    }
  }
  
  // Max retries exceeded
  throw lastError;
}

/**
 * ETag-aware wrapper for property operations
 */
export class ETagAwarePropertyManager {
  constructor(private client: AkamaiClient) {}
  
  /**
   * Get property rules with automatic ETag storage
   */
  async getRules(propertyId: string, version: number, validateRules?: boolean) {
    return getPropertyRulesWithETag(this.client, propertyId, version, validateRules);
  }
  
  /**
   * Update property rules with automatic ETag handling
   */
  async updateRules(
    propertyId: string,
    version: number,
    rules: any,
    options?: { validateRules?: boolean; etag?: string }
  ) {
    return updatePropertyRulesWithETag(this.client, propertyId, version, rules, options);
  }
  
  /**
   * Update rules with automatic retry on conflict
   */
  async updateRulesWithRetry(
    propertyId: string,
    version: number,
    transformer: (currentRules: any) => any,
    options?: { validateRules?: boolean; maxRetries?: number }
  ): Promise<any> {
    return retryWithFreshETag(
      async () => {
        // Get current rules with ETag
        const { rules } = await this.getRules(propertyId, version);
        
        // Transform the rules
        const updatedRules = transformer(rules);
        
        // Update with stored ETag
        return this.updateRules(propertyId, version, updatedRules, {
          validateRules: options?.validateRules,
        });
      },
      async () => {
        // Refresh operation: just get rules again to update ETag
        await this.getRules(propertyId, version);
      },
      options?.maxRetries
    );
  }
}

/**
 * Create an ETag-aware property manager instance
 */
export function createETagAwareClient(client: AkamaiClient): ETagAwarePropertyManager {
  return new ETagAwarePropertyManager(client);
}