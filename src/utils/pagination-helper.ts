/**
 * PAGINATION HELPER FOR AKAMAI API RESPONSES
 * 
 * CODE KAI ARCHITECTURE:
 * This module provides consistent pagination support across all Akamai APIs
 * to prevent token limit errors in MCP responses and improve performance.
 * 
 * PROBLEM SOLVED:
 * - MCP has a 25,000 token response limit
 * - Some Akamai responses (groups, properties, etc.) can exceed this
 * - Need consistent pagination across different API patterns
 * 
 * AKAMAI PAGINATION PATTERNS:
 * 1. Property Manager API (PAPI): No native pagination
 * 2. Edge DNS API: page/pageSize pattern for some endpoints
 * 3. Network Lists API: offset/limit pattern
 * 4. Reporting API: Custom pagination with links
 * 
 * SOLUTION:
 * - Client-side pagination for APIs without native support
 * - Consistent interface across all pagination patterns
 * - Automatic response truncation to stay under token limits
 */

import { createLogger } from './pino-logger';

const logger = createLogger('pagination-helper');

/**
 * Maximum tokens allowed in an MCP response
 */
export const MCP_MAX_TOKENS = 25000;

/**
 * Estimated tokens per character (conservative estimate)
 */
export const TOKENS_PER_CHAR = 0.25;

/**
 * Safety margin to ensure we stay under limit
 */
export const SAFETY_MARGIN = 0.9;

/**
 * Maximum safe response size in characters
 */
export const MAX_SAFE_RESPONSE_SIZE = Math.floor((MCP_MAX_TOKENS * SAFETY_MARGIN) / TOKENS_PER_CHAR);

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
  maxItems?: number;
  estimatedItemSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  metadata?: {
    truncated: boolean;
    originalCount: number;
  };
}

/**
 * Estimate the token count for a response
 */
export function estimateTokenCount(data: any): number {
  const jsonString = JSON.stringify(data);
  return Math.ceil(jsonString.length * TOKENS_PER_CHAR);
}

/**
 * Check if response would exceed token limit
 */
export function wouldExceedTokenLimit(data: any): boolean {
  const estimatedTokens = estimateTokenCount(data);
  return estimatedTokens > MCP_MAX_TOKENS * SAFETY_MARGIN;
}

/**
 * Paginate an array of items client-side
 */
export function paginateArray<T>(
  items: T[],
  options: PaginationOptions = {}
): PaginatedResponse<T> {
  const page = options.page || 1;
  const pageSize = options.pageSize || calculateOptimalPageSize(items, options);
  const offset = (page - 1) * pageSize;
  
  const paginatedItems = items.slice(offset, offset + pageSize);
  const totalPages = Math.ceil(items.length / pageSize);
  
  return {
    items: paginatedItems,
    pagination: {
      page,
      pageSize,
      totalItems: items.length,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    metadata: {
      truncated: false,
      originalCount: items.length,
    },
  };
}

/**
 * Calculate optimal page size based on estimated item size
 */
export function calculateOptimalPageSize<T>(
  items: T[],
  options: PaginationOptions = {}
): number {
  // If pageSize is explicitly provided, use it
  if (options.pageSize) {
    return options.pageSize;
  }
  
  // If we have an estimated item size, calculate based on that
  if (options.estimatedItemSize) {
    const maxItemsPerPage = Math.floor(MAX_SAFE_RESPONSE_SIZE / options.estimatedItemSize);
    return Math.min(maxItemsPerPage, 100); // Cap at 100 items per page
  }
  
  // Sample the first few items to estimate size
  const sampleSize = Math.min(5, items.length);
  if (sampleSize === 0) {
    return 50; // Default page size
  }
  
  const sampleItems = items.slice(0, sampleSize);
  const sampleJsonSize = JSON.stringify(sampleItems).length;
  const avgItemSize = sampleJsonSize / sampleSize;
  
  const maxItemsPerPage = Math.floor(MAX_SAFE_RESPONSE_SIZE / avgItemSize);
  
  // Apply reasonable bounds
  return Math.max(10, Math.min(maxItemsPerPage, 100));
}

/**
 * Truncate response to fit within token limits
 */
export function truncateResponse<T>(
  items: T[],
  options: { includeMetadata?: boolean } = {}
): { items: T[]; truncated: boolean; originalCount: number } {
  let truncatedItems = items;
  let truncated = false;
  const originalCount = items.length;
  
  // Binary search for maximum items that fit
  let low = 0;
  let high = items.length;
  
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const testItems = items.slice(0, mid);
    const testResponse = options.includeMetadata
      ? { items: testItems, metadata: { truncated: true, originalCount } }
      : testItems;
    
    if (wouldExceedTokenLimit(testResponse)) {
      high = mid - 1;
    } else {
      low = mid;
    }
  }
  
  if (low < items.length) {
    truncatedItems = items.slice(0, low);
    truncated = true;
    
    logger.warn({
      originalCount,
      truncatedCount: low,
      reason: 'Token limit exceeded',
    }, 'Response truncated to fit token limit');
  }
  
  return {
    items: truncatedItems,
    truncated,
    originalCount,
  };
}

/**
 * Format pagination info for display
 */
export function formatPaginationInfo(pagination: PaginatedResponse<any>['pagination']): string {
  const { page, pageSize, totalItems, totalPages } = pagination;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  
  return `Showing ${start}-${end} of ${totalItems} items (Page ${page}/${totalPages})`;
}

/**
 * Convert between different pagination patterns
 */
export function normalizePaginationParams(params: PaginationOptions): {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
} {
  if (params.page !== undefined && params.pageSize !== undefined) {
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, params.pageSize);
    return {
      page,
      pageSize,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    };
  }
  
  if (params.offset !== undefined && params.limit !== undefined) {
    const offset = Math.max(0, params.offset);
    const limit = Math.max(1, params.limit);
    const page = Math.floor(offset / limit) + 1;
    return {
      page,
      pageSize: limit,
      offset,
      limit,
    };
  }
  
  // Default values
  const pageSize = params.pageSize || params.limit || 50;
  const page = params.page || 1;
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

/**
 * Build pagination query parameters for different API patterns
 */
export function buildPaginationQuery(
  pattern: 'page' | 'offset' | 'none',
  params: PaginationOptions
): Record<string, string | number> {
  const normalized = normalizePaginationParams(params);
  
  switch (pattern) {
    case 'page':
      return {
        page: normalized.page,
        pageSize: normalized.pageSize,
      };
    
    case 'offset':
      return {
        offset: normalized.offset,
        limit: normalized.limit,
      };
    
    case 'none':
    default:
      return {};
  }
}

/**
 * Create pagination suggestions for user
 */
export function createPaginationSuggestions(
  response: PaginatedResponse<any>,
  toolName: string
): string[] {
  const suggestions: string[] = [];
  const { pagination } = response;
  
  if (pagination.hasNext) {
    suggestions.push(
      `To see the next page: "${toolName} --page ${pagination.page + 1}"`
    );
  }
  
  if (pagination.hasPrevious) {
    suggestions.push(
      `To see the previous page: "${toolName} --page ${pagination.page - 1}"`
    );
  }
  
  if (pagination.totalPages > 1) {
    suggestions.push(
      `To jump to a specific page: "${toolName} --page <number>"`,
      `To change page size: "${toolName} --pageSize <number>"`
    );
  }
  
  return suggestions;
}