/**
 * UNIFIED SEARCH TOOL
 * 
 * CODE KAI ARCHITECTURE:
 * Single search interface for all Akamai resources.
 * Automatically detects what you're searching for and uses
 * the optimal search strategy.
 * 
 * KAIZEN UX IMPROVEMENTS:
 * - One search function instead of multiple
 * - Intelligent query understanding
 * - Automatic bulk search for deep searches
 * - Human-readable results with ID translation
 * - Fast cached results when available
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { unifiedSearch } from '../services/unified-search-service';
import { withToolErrorHandling, type ErrorContext } from '../utils/tool-error-handling';

/**
 * Universal search across all Akamai resources
 * 
 * Examples:
 * - Search by property name: "my website"
 * - Search by hostname: "www.example.com"
 * - Search by property ID: "prp_123456"
 * - Search by origin: "origin.example.com"
 * - Search for behaviors: "caching"
 * - Search for rules: "redirect rule"
 */
export async function search(
  client: AkamaiClient,
  args: {
    query: string;
    includeDetails?: boolean;
    useCache?: boolean;
    searchDepth?: 'shallow' | 'deep';
    maxResults?: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  const _context: ErrorContext = {
    operation: 'search',
    customer: args.customer || client.getCustomer(),
  };

  return withToolErrorHandling(async () => {
    // Use the unified search service
    return await unifiedSearch.search(client, {
      query: args.query,
      customer: args.customer,
      useCache: args.useCache !== false, // Default to true
      includeDetails: args.includeDetails,
      maxResults: args.maxResults || 20,
      searchDepth: args.searchDepth || 'shallow',
    });
  }, _context);
}

/**
 * Search specifically for properties
 * This is a convenience wrapper around the universal search
 */
export async function searchProperties(
  client: AkamaiClient,
  args: {
    query: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  return search(client, {
    ...args,
    searchDepth: 'shallow', // Properties are at the top level
  });
}

/**
 * Search for hostnames within property configurations
 * This uses deep search to look inside property rules
 */
export async function searchHostnames(
  client: AkamaiClient,
  args: {
    hostname: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  return search(client, {
    query: args.hostname,
    searchDepth: 'deep', // Need to search inside rules
    includeDetails: true,
    customer: args.customer,
  });
}

/**
 * Search for origins within property configurations
 */
export async function searchOrigins(
  client: AkamaiClient,
  args: {
    origin: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  return search(client, {
    query: args.origin,
    searchDepth: 'deep',
    includeDetails: true,
    customer: args.customer,
  });
}