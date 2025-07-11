/**
 * UNIFIED SEARCH SERVICE
 * 
 * CODE KAI ARCHITECTURE:
 * Single source of truth for all Akamai search operations.
 * Consolidates property search, bulk search, universal search,
 * and intelligent caching into one streamlined service.
 * 
 * KAIZEN IMPROVEMENTS:
 * - Eliminates duplicate search logic across multiple files
 * - Provides consistent search experience across all resources
 * - Automatically selects optimal search strategy
 * - Transparent bulk search integration for better performance
 * - Unified caching layer for all search operations
 * 
 * USER EXPERIENCE:
 * - Single search interface that "just works"
 * - Intelligent query type detection
 * - Fast results through caching and bulk operations
 * - No need to choose between different search functions
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { createLogger } from '../utils/pino-logger';
import { withRetry } from '../utils/akamai-search-helper';
import { AkamaiCacheService } from './akamai-cache-service';
import { idTranslator } from '../utils/id-translator';
import { 
  isPapiError, 
  isPapiPropertiesResponse, 
  isPapiGroupsResponse,
  type PapiPropertiesListResponse,
  type PapiGroupsListResponse 
} from '../types/api-responses/papi-properties';

const logger = createLogger('unified-search');

// Singleton cache service
let cacheService: AkamaiCacheService | null = null;

function getCacheService(): AkamaiCacheService {
  if (!cacheService) {
    cacheService = new AkamaiCacheService();
    cacheService.initialize().catch((err) => {
      logger.error({ error: err }, 'Failed to initialize cache');
    });
  }
  return cacheService;
}

/**
 * Search query types and patterns
 */
export enum SearchType {
  PROPERTY_ID = 'propertyId',
  PROPERTY_NAME = 'propertyName',
  HOSTNAME = 'hostname',
  CP_CODE = 'cpCode',
  CONTRACT_ID = 'contractId',
  GROUP_ID = 'groupId',
  EDGE_HOSTNAME = 'edgeHostname',
  ORIGIN = 'origin',
  BEHAVIOR = 'behavior',
  RULE = 'rule',
  GENERAL = 'general',
}

const SEARCH_PATTERNS: Record<SearchType, RegExp> = {
  [SearchType.PROPERTY_ID]: /^prp_\d+$/i,
  [SearchType.CONTRACT_ID]: /^ctr_[\w-]+$/i,
  [SearchType.GROUP_ID]: /^grp_\d+$/i,
  [SearchType.CP_CODE]: /^(cp_)?\d{4,7}$/i,
  [SearchType.EDGE_HOSTNAME]: /\.(edgekey|edgesuite|akamaized|akamai)\.net$/i,
  [SearchType.HOSTNAME]: /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
  [SearchType.PROPERTY_NAME]: /^[\w\s-]+$/,
  [SearchType.ORIGIN]: /^[\w.-]+$/,
  [SearchType.BEHAVIOR]: /^[\w-]+$/,
  [SearchType.RULE]: /^[\w\s-]+$/,
  [SearchType.GENERAL]: /.*/,
};

/**
 * Unified search options
 */
export interface UnifiedSearchOptions {
  query: string;
  customer?: string;
  useCache?: boolean;
  includeDetails?: boolean;
  maxResults?: number;
  searchDepth?: 'shallow' | 'deep';
}

/**
 * Search result structure
 */
export interface SearchResult {
  type: string;
  id: string;
  name: string;
  details?: any;
  relevanceScore: number;
  source: 'cache' | 'api' | 'bulk-search';
}

/**
 * Main search service class
 */
export class UnifiedSearchService {
  private cache: AkamaiCacheService;

  constructor() {
    this.cache = getCacheService();
  }

  /**
   * Main search entry point - intelligently routes to optimal search strategy
   */
  async search(
    client: AkamaiClient,
    options: UnifiedSearchOptions
  ): Promise<MCPToolResponse> {
    const startTime = Date.now();
    const searchType = this.detectSearchType(options.query);
    
    logger.info({
      query: options.query,
      searchType,
      useCache: options.useCache,
    }, 'Starting unified search');

    try {
      let results: SearchResult[] = [];

      // Try cache first for common searches
      if (options.useCache !== false) {
        const cacheResults = await this.searchCache(client, options);
        if (cacheResults.length > 0) {
          results = cacheResults;
        }
      }

      // If no cache results or need fresh data
      if (results.length === 0 || options.useCache === false) {
        // Use bulk search for complex queries
        if (this.shouldUseBulkSearch(searchType, options)) {
          results = await this.performBulkSearch(client, options);
        } else {
          // Use traditional search for simple queries
          results = await this.performTraditionalSearch(client, options, searchType);
        }
      }

      // Format results for user
      return await this.formatSearchResults(results, options, Date.now() - startTime, client);
    } catch (error) {
      logger.error({ error, query: options.query }, 'Search failed');
      throw error;
    }
  }

  /**
   * Detect the type of search query
   */
  private detectSearchType(query: string): SearchType {
    const normalized = query.trim();

    for (const [type, pattern] of Object.entries(SEARCH_PATTERNS)) {
      if (pattern.test(normalized)) {
        return type as SearchType;
      }
    }

    return SearchType.GENERAL;
  }

  /**
   * Determine if bulk search should be used
   */
  private shouldUseBulkSearch(searchType: SearchType, options: UnifiedSearchOptions): boolean {
    // Use bulk search for:
    // - Deep searches
    // - Hostname/origin searches (need to look inside rules)
    // - Behavior/rule searches
    // - When searching across multiple properties
    return (
      options.searchDepth === 'deep' ||
      searchType === SearchType.HOSTNAME ||
      searchType === SearchType.ORIGIN ||
      searchType === SearchType.BEHAVIOR ||
      searchType === SearchType.RULE ||
      (searchType === SearchType.GENERAL && options.query.includes('.'))
    );
  }

  /**
   * Search using cache
   */
  private async searchCache(
    client: AkamaiClient,
    options: UnifiedSearchOptions
  ): Promise<SearchResult[]> {
    try {
      const cacheResults = await this.cache.search(
        client,
        options.query,
        options.customer || 'default'
      );

      if (Array.isArray(cacheResults) && cacheResults.length > 0) {
        return cacheResults.map((match: unknown) => {
          const m = match as any;
          return {
            type: m.resourceType || 'property',
            id: m.resourceId || m.propertyId,
            name: m.resourceName || m.propertyName,
            details: m,
            relevanceScore: m.score || 100,
            source: 'cache' as const,
          };
        });
      }
    } catch (error) {
      logger.warn({ error }, 'Cache search failed, falling back to API');
    }

    return [];
  }

  /**
   * Perform bulk search using Akamai's bulk search API
   */
  private async performBulkSearch(
    client: AkamaiClient,
    options: UnifiedSearchOptions
  ): Promise<SearchResult[]> {
    const searchType = this.mapToBulkSearchType(this.detectSearchType(options.query));
    
    try {
      // Use synchronous bulk search for faster results
      const bulkQuery = this.buildBulkSearchQuery(searchType, options.query);
      
      const response = await withRetry(async () => {
        return await client.request({
          path: '/papi/v1/bulk/rules-search-requests-synch',
          method: 'POST',
          body: { bulkSearchQuery: bulkQuery },
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });
      });

      return this.processBulkSearchResults(response);
    } catch (error) {
      logger.warn({ error }, 'Bulk search failed, falling back to traditional search');
      return this.performTraditionalSearch(client, options, this.detectSearchType(options.query));
    }
  }

  /**
   * Perform traditional property-by-property search
   */
  private async performTraditionalSearch(
    client: AkamaiClient,
    options: UnifiedSearchOptions,
    searchType: SearchType
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Get all groups first
    const groupsResponse = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    });

    if (isPapiError(groupsResponse)) {
      throw new Error(`Failed to list groups: ${groupsResponse.detail}`);
    }

    if (!isPapiGroupsResponse(groupsResponse)) {
      throw new Error('Invalid groups response');
    }

    const groups = (groupsResponse as PapiGroupsListResponse).groups?.items || [];
    
    // Search properties in each group
    const searchPromises = groups.slice(0, 5).map(async (group) => {
      try {
        const propertiesResponse = await client.request({
          path: `/papi/v1/properties?contractId=${group.contractIds[0]}&groupId=${group.groupId}`,
          method: 'GET',
        });

        if (isPapiPropertiesResponse(propertiesResponse)) {
          const properties = (propertiesResponse as PapiPropertiesListResponse).properties?.items || [];
          
          for (const property of properties) {
            if (this.matchesQuery(property, options.query, searchType)) {
              results.push({
                type: 'property',
                id: property.propertyId,
                name: property.propertyName,
                details: property,
                relevanceScore: this.calculateRelevance(property, options.query),
                source: 'api',
              });
            }
          }
        }
      } catch (error) {
        logger.debug({ error, group: group.groupId }, 'Failed to search group');
      }
    });

    await Promise.all(searchPromises);
    
    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return results.slice(0, options.maxResults || 20);
  }

  /**
   * Map search type to bulk search type
   */
  private mapToBulkSearchType(searchType: SearchType): string {
    const mapping: Record<SearchType, string> = {
      [SearchType.HOSTNAME]: 'hostname',
      [SearchType.ORIGIN]: 'origin',
      [SearchType.CP_CODE]: 'cpCode',
      [SearchType.BEHAVIOR]: 'behavior',
      [SearchType.RULE]: 'rule',
      [SearchType.PROPERTY_ID]: 'custom',
      [SearchType.PROPERTY_NAME]: 'custom',
      [SearchType.CONTRACT_ID]: 'custom',
      [SearchType.GROUP_ID]: 'custom',
      [SearchType.EDGE_HOSTNAME]: 'hostname',
      [SearchType.GENERAL]: 'custom',
    };

    return mapping[searchType] || 'custom';
  }

  /**
   * Build bulk search query
   */
  private buildBulkSearchQuery(searchType: string, searchValue: string): unknown {
    const queries: Record<string, unknown> = {
      origin: {
        match: searchValue,
        syntax: 'JSONPATH',
        queryFields: [
          '$.behaviors[?(@.name == "origin")].options.hostname',
          '$.behaviors[?(@.name == "origin")].options.originSni',
        ],
      },
      hostname: {
        match: searchValue,
        syntax: 'JSONPATH',
        queryFields: [
          '$.criteria[?(@.name == "hostname")].options.values[*]',
          '$.rules..criteria[?(@.name == "hostname")].options.values[*]',
        ],
      },
      cpCode: {
        match: searchValue,
        syntax: 'JSONPATH',
        queryFields: [
          '$.behaviors[?(@.name == "cpCode")].options.value.name',
          '$.behaviors[?(@.name == "cpCode")].options.value.id',
        ],
      },
      behavior: {
        match: searchValue,
        syntax: 'JSONPATH',
        queryFields: [
          '$.behaviors[*].name',
          '$.rules..behaviors[*].name',
        ],
      },
      rule: {
        match: searchValue,
        syntax: 'JSONPATH',
        queryFields: [
          '$.rules[*].name',
          '$.rules..name',
        ],
      },
      custom: {
        match: searchValue,
        syntax: 'JSONPATH',
        queryFields: ['$..'],
      },
    };

    return queries[searchType] || queries['custom'];
  }

  /**
   * Process bulk search results
   */
  private processBulkSearchResults(response: unknown): SearchResult[] {
    const results: SearchResult[] = [];
    const resp = response as any;

    if (resp.results && Array.isArray(resp.results)) {
      for (const result of resp.results) {
        results.push({
          type: 'property',
          id: result.propertyId,
          name: result.propertyName,
          details: {
            propertyVersion: result.propertyVersion,
            matches: result.matchLocations,
          },
          relevanceScore: result.matchLocations?.length || 1,
          source: 'bulk-search',
        });
      }
    }

    return results;
  }

  /**
   * Check if a property matches the search query
   */
  private matchesQuery(property: unknown, query: string, searchType: SearchType): boolean {
    const queryLower = query.toLowerCase();
    const prop = property as any;
    
    switch (searchType) {
      case SearchType.PROPERTY_ID:
        return prop.propertyId === query;
      
      case SearchType.PROPERTY_NAME:
        return prop.propertyName.toLowerCase().includes(queryLower);
      
      default:
        return (
          prop.propertyName.toLowerCase().includes(queryLower) ||
          prop.propertyId.includes(query)
        );
    }
  }

  /**
   * Calculate relevance score for a result
   */
  private calculateRelevance(item: unknown, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;
    const i = item as any;

    // Exact match
    if (i.propertyName?.toLowerCase() === queryLower) {
      score += 100;
    }
    // Starts with
    else if (i.propertyName?.toLowerCase().startsWith(queryLower)) {
      score += 50;
    }
    // Contains
    else if (i.propertyName?.toLowerCase().includes(queryLower)) {
      score += 25;
    }

    return score;
  }

  /**
   * Format search results for user presentation
   */
  private async formatSearchResults(
    results: SearchResult[],
    options: UnifiedSearchOptions,
    searchTimeMs: number,
    client: AkamaiClient
  ): Promise<MCPToolResponse> {
    if (results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No results found for "${options.query}"\n\nTry:\n- Checking the spelling\n- Using a broader search term\n- Searching by property ID (prp_XXXXX)`,
        }],
      };
    }

    // Get ID translator for human-readable names
    const translator = idTranslator;

    let text = `# Search Results for "${options.query}"\n\n`;
    text += `Found ${results.length} result${results.length > 1 ? 's' : ''} in ${searchTimeMs}ms\n\n`;

    // Group results by type
    const resultsByType = results.reduce((acc, result) => {
      if (!acc[result.type]) {acc[result.type] = [];}
      acc[result.type]!.push(result);
      return acc;
    }, {} as Record<string, SearchResult[]>);

    // Display results by type
    for (const [type, typeResults] of Object.entries(resultsByType)) {
      text += `## ${type.charAt(0).toUpperCase() + type.slice(1)}s (${typeResults.length})\n\n`;
      
      for (const result of typeResults.slice(0, 10)) {
        // Use translator to get human-readable names
        const translatedName = type === 'property' 
          ? await translator.translateProperty(result.id, client)
          : { displayName: result.name };

        text += `### ${translatedName.displayName || result.name}\n`;
        text += `- ID: \`${result.id}\`\n`;
        
        // Include contract and group info if available
        if (result.details?.contractId) {
          const contractName = await translator.translateContract(result.details.contractId, client);
          text += `- Contract: ${contractName.displayName}\n`;
        }
        if (result.details?.groupId) {
          const groupName = await translator.translateGroup(result.details.groupId, client);
          text += `- Group: ${groupName.displayName}\n`;
        }
        
        text += `- Relevance: ${result.relevanceScore}\n`;
        text += `- Source: ${result.source}\n`;
        
        if (options.includeDetails && result.details) {
          if (result.details.matches) {
            text += `- Matches found:\n`;
            for (const match of result.details.matches.slice(0, 3)) {
              text += `  - ${match.path}: ${match.value}\n`;
            }
          }
        }
        text += '\n';
      }
      
      if (typeResults.length > 10) {
        text += `... and ${typeResults.length - 10} more ${type}s\n\n`;
      }
    }

    // Add performance info
    text += '---\n';
    text += `Search completed in ${searchTimeMs}ms using ${results[0]?.source || 'unknown'} source\n`;

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  }
}

// Export singleton instance
export const unifiedSearch = new UnifiedSearchService();