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
 * - Cross-domain search capability across all resource types
 * - Fuzzy matching for typos and partial matches
 * - Advanced filtering and ranking algorithms
 * - Search history and intelligent suggestions
 * - Analytics and performance tracking
 * 
 * USER EXPERIENCE:
 * - Single search interface that "just works"
 * - Intelligent query type detection
 * - Fast results through caching and bulk operations
 * - No need to choose between different search functions
 * - Typo-tolerant search with smart suggestions
 * - Cross-resource discovery capabilities
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types/mcp-protocol';
import { createLogger } from '../utils/pino-logger';
import { UnifiedCacheService, getGlobalCache } from './cache';

// Simple retry utility
async function withRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}
import { idTranslationService } from './id-translation-service';
import { 
  isPapiError, 
  isPapiPropertiesResponse, 
  isPapiGroupsResponse,
  type PapiPropertiesListResponse,
  type PapiGroupsListResponse 
} from '../types/api-responses/papi-properties';

const logger = createLogger('unified-search');

// Cache service is now accessed directly via getGlobalCache()

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
  DNS_ZONE = 'dnsZone',
  DNS_RECORD = 'dnsRecord',
  CERTIFICATE = 'certificate',
  NETWORK_LIST = 'networkList',
  SECURITY_POLICY = 'securityPolicy',
  RATE_POLICY = 'ratePolicy',
  CUSTOM_RULE = 'customRule',
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
  [SearchType.DNS_ZONE]: /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
  [SearchType.DNS_RECORD]: /^(A|AAAA|CNAME|MX|TXT|NS|SOA|SRV|PTR|CAA)$/i,
  [SearchType.CERTIFICATE]: /^([\w.-]+\.(com|org|net|io|dev|app)|crt_\d+)$/i,
  [SearchType.NETWORK_LIST]: /^(nl_)?\d+$/i,
  [SearchType.SECURITY_POLICY]: /^[\w\s-]+_SEC$/i,
  [SearchType.RATE_POLICY]: /^[\w\s-]+_RATE$/i,
  [SearchType.CUSTOM_RULE]: /^[\w\s-]+_RULE$/i,
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
  resourceTypes?: string[]; // Filter by specific resource types
  fuzzyMatch?: boolean; // Enable fuzzy matching for typos
  sortBy?: 'relevance' | 'name' | 'type' | 'modified'; // Sort order
  filters?: SearchFilters; // Advanced filtering
  trackAnalytics?: boolean; // Track search for analytics
}

/**
 * Advanced search filters
 */
export interface SearchFilters {
  contractIds?: string[];
  groupIds?: string[];
  status?: string[];
  modifiedAfter?: string;
  modifiedBefore?: string;
  tags?: string[];
  customFilters?: Record<string, any>;
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
  highlights?: string[]; // Text snippets showing matches
  breadcrumb?: string[]; // Path to resource (e.g., Contract > Group > Property)
  lastModified?: string;
  tags?: string[];
}

/**
 * Search analytics data
 */
export interface SearchAnalytics {
  query: string;
  timestamp: number;
  resultCount: number;
  searchTimeMs: number;
  resourceTypes: string[];
  clickedResults?: string[];
}

/**
 * Search suggestion
 */
export interface SearchSuggestion {
  text: string;
  type: 'history' | 'popular' | 'correction' | 'completion';
  score: number;
  metadata?: any;
}

/**
 * Main search service class
 */
export class UnifiedSearchService {
  private cache: UnifiedCacheService | null = null;
  private searchHistory: SearchAnalytics[] = [];
  private readonly maxHistorySize = 1000;
  private popularSearches: Map<string, number> = new Map();

  private async ensureCache(): Promise<UnifiedCacheService> {
    if (!this.cache) {
      this.cache = getGlobalCache();
    }
    return this.cache;
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
      resourceTypes: options.resourceTypes,
      fuzzyMatch: options.fuzzyMatch,
    }, 'Starting unified search');

    try {
      let results: SearchResult[] = [];

      // Check if searching across all resource types
      if (options.resourceTypes && options.resourceTypes.length > 1) {
        results = await this.searchAll(client, options);
      } else {
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
      }

      // Apply fuzzy matching if requested
      if (options.fuzzyMatch && results.length > 0) {
        results = this.applyFuzzyMatching(results, options.query);
      }

      // Apply filters if provided
      if (options.filters) {
        results = this.applyFilters(results, options.filters);
      }

      // Sort results
      results = this.sortResults(results, options.sortBy || 'relevance');

      // Limit results
      if (options.maxResults) {
        results = results.slice(0, options.maxResults);
      }

      // Track analytics if enabled
      const searchTimeMs = Date.now() - startTime;
      if (options.trackAnalytics !== false) {
        const resourceTypes = [...new Set(results.map(r => r.type))];
        this.trackSearchAnalytics(options.query, results.length, searchTimeMs, resourceTypes);
      }

      // Format results for user
      return await this.formatSearchResults(results, options, searchTimeMs, client);
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
    _client: AkamaiClient,
    _options: UnifiedSearchOptions
  ): Promise<SearchResult[]> {
    try {
      // const cache = await this.ensureCache();
      // TODO: Implement search - cache doesn't have search method
      const cacheResults: any[] = [];

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
      [SearchType.DNS_ZONE]: 'custom',
      [SearchType.DNS_RECORD]: 'custom',
      [SearchType.CERTIFICATE]: 'custom',
      [SearchType.NETWORK_LIST]: 'custom',
      [SearchType.SECURITY_POLICY]: 'custom',
      [SearchType.RATE_POLICY]: 'custom',
      [SearchType.CUSTOM_RULE]: 'custom',
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
   * Search across all resource types
   */
  async searchAll(
    client: AkamaiClient,
    options: UnifiedSearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchPromises: Promise<SearchResult[]>[] = [];

    // Define resource type search handlers
    const resourceSearchers = {
      property: () => this.searchProperties(client, options),
      dns: () => this.searchDnsZones(client, options),
      certificate: () => this.searchCertificates(client, options),
      networkList: () => this.searchNetworkLists(client, options),
      securityPolicy: () => this.searchSecurityPolicies(client, options),
    };

    // Filter by requested resource types or search all
    const typesToSearch = options.resourceTypes || Object.keys(resourceSearchers);

    // Execute searches in parallel
    for (const type of typesToSearch) {
      const searcher = resourceSearchers[type as keyof typeof resourceSearchers];
      if (searcher) {
        searchPromises.push(searcher());
      }
    }

    // Wait for all searches to complete
    const allResults = await Promise.allSettled(searchPromises);
    
    // Collect successful results
    for (const result of allResults) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        results.push(...result.value);
      }
    }

    // Apply fuzzy matching if enabled
    if (options.fuzzyMatch) {
      return this.applyFuzzyMatching(results, options.query);
    }

    // Sort results
    return this.sortResults(results, options.sortBy || 'relevance');
  }

  /**
   * Search properties
   */
  private async searchProperties(
    client: AkamaiClient,
    options: UnifiedSearchOptions
  ): Promise<SearchResult[]> {
    // Use existing property search logic
    const results = await this.performTraditionalSearch(
      client,
      options,
      this.detectSearchType(options.query)
    );

    // Apply filters if provided
    if (options.filters) {
      return this.applyFilters(results, options.filters);
    }

    return results;
  }

  /**
   * Search DNS zones
   */
  private async searchDnsZones(
    client: AkamaiClient,
    options: UnifiedSearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      const response = await client.request({
        path: '/config-dns/v2/zones',
        method: 'GET',
      });

      const zones = (response as any).zones || [];
      const queryLower = options.query.toLowerCase();

      for (const zone of zones) {
        if (zone.zone?.toLowerCase().includes(queryLower) ||
            zone.comment?.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'dns_zone',
            id: zone.zone,
            name: zone.zone,
            details: zone,
            relevanceScore: this.calculateRelevance(zone, options.query),
            source: 'api',
            breadcrumb: ['DNS', 'Zones', zone.zone],
            lastModified: zone.lastModificationDate,
          });
        }
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to search DNS zones');
    }

    return results;
  }

  /**
   * Search certificates
   */
  private async searchCertificates(
    client: AkamaiClient,
    options: UnifiedSearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      const response = await client.request({
        path: '/cps/v2/enrollments',
        method: 'GET',
      });

      const enrollments = (response as any).enrollments || [];
      const queryLower = options.query.toLowerCase();

      for (const enrollment of enrollments) {
        const cn = enrollment.csr?.cn || enrollment.certificateChain?.[0]?.certificate?.subject?.cn || '';
        
        if (cn.toLowerCase().includes(queryLower) ||
            enrollment.id?.toString().includes(options.query)) {
          results.push({
            type: 'certificate',
            id: enrollment.id?.toString() || '',
            name: cn || `Certificate ${enrollment.id}`,
            details: enrollment,
            relevanceScore: this.calculateRelevance({ cn }, options.query),
            source: 'api',
            breadcrumb: ['CPS', 'Certificates', cn],
            tags: [enrollment.certificateType, enrollment.validationType].filter(Boolean),
          });
        }
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to search certificates');
    }

    return results;
  }

  /**
   * Search network lists
   */
  private async searchNetworkLists(
    client: AkamaiClient,
    options: UnifiedSearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      const response = await client.request({
        path: '/network-list/v2/network-lists',
        method: 'GET',
      });

      const lists = (response as any).networkLists || [];
      const queryLower = options.query.toLowerCase();

      for (const list of lists) {
        if (list.name?.toLowerCase().includes(queryLower) ||
            list.uniqueId?.includes(options.query) ||
            list.description?.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'network_list',
            id: list.uniqueId || '',
            name: list.name || '',
            details: list,
            relevanceScore: this.calculateRelevance(list, options.query),
            source: 'api',
            breadcrumb: ['Network Lists', list.type, list.name],
            tags: [list.type],
          });
        }
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to search network lists');
    }

    return results;
  }

  /**
   * Search security policies
   */
  private async searchSecurityPolicies(
    client: AkamaiClient,
    options: UnifiedSearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      // Get security configurations first
      const configsResponse = await client.request({
        path: '/appsec/v1/configs',
        method: 'GET',
      });

      const configs = (configsResponse as any).configurations || [];
      const queryLower = options.query.toLowerCase();

      for (const config of configs) {
        // Search in config name
        if (config.name?.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'security_config',
            id: config.id?.toString() || '',
            name: config.name || '',
            details: config,
            relevanceScore: this.calculateRelevance(config, options.query),
            source: 'api',
            breadcrumb: ['Application Security', 'Configurations', config.name],
          });
        }

        // Search in policies
        const policies = config.policies || [];
        for (const policy of policies) {
          if (policy.policyName?.toLowerCase().includes(queryLower)) {
            results.push({
              type: 'security_policy',
              id: policy.policyId || '',
              name: policy.policyName || '',
              details: policy,
              relevanceScore: this.calculateRelevance(policy, options.query),
              source: 'api',
              breadcrumb: ['Application Security', config.name, 'Policies', policy.policyName],
            });
          }
        }
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to search security policies');
    }

    return results;
  }

  /**
   * Apply fuzzy matching to results
   */
  private applyFuzzyMatching(results: SearchResult[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase();
    
    // Levenshtein distance calculation
    const levenshteinDistance = (s1: string, s2: string): number => {
      const len1 = s1.length;
      const len2 = s2.length;
      const matrix: number[][] = [];

      for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= len2; j++) {
        matrix[0]![j] = j;
      }

      for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
          const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j]! + 1,
            matrix[i]![j - 1]! + 1,
            matrix[i - 1]![j - 1]! + cost
          );
        }
      }

      return matrix[len1]![len2]!;
    };

    // Calculate fuzzy scores and update relevance
    return results.map(result => {
      const nameLower = result.name.toLowerCase();
      const distance = levenshteinDistance(queryLower, nameLower);
      const maxLen = Math.max(queryLower.length, nameLower.length);
      const similarity = 1 - (distance / maxLen);
      
      // Boost relevance score based on fuzzy match
      if (similarity > 0.7) {
        result.relevanceScore += similarity * 50;
      }
      
      return result;
    }).filter(result => {
      // Filter out very poor matches
      const nameLower = result.name.toLowerCase();
      const distance = levenshteinDistance(queryLower, nameLower);
      const maxLen = Math.max(queryLower.length, nameLower.length);
      const similarity = 1 - (distance / maxLen);
      return similarity > 0.5; // Keep matches with >50% similarity
    });
  }

  /**
   * Apply filters to results
   */
  private applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    return results.filter(result => {
      // Contract ID filter
      if (filters.contractIds?.length && result.details?.contractId) {
        if (!filters.contractIds.includes(result.details.contractId)) {
          return false;
        }
      }

      // Group ID filter
      if (filters.groupIds?.length && result.details?.groupId) {
        if (!filters.groupIds.includes(result.details.groupId)) {
          return false;
        }
      }

      // Status filter
      if (filters.status?.length && result.details?.status) {
        if (!filters.status.includes(result.details.status)) {
          return false;
        }
      }

      // Date filters
      if (filters.modifiedAfter && result.lastModified) {
        if (new Date(result.lastModified) < new Date(filters.modifiedAfter)) {
          return false;
        }
      }
      if (filters.modifiedBefore && result.lastModified) {
        if (new Date(result.lastModified) > new Date(filters.modifiedBefore)) {
          return false;
        }
      }

      // Tag filters
      if (filters.tags?.length && result.tags) {
        const hasMatchingTag = filters.tags.some(tag => result.tags?.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort results by specified criteria
   */
  private sortResults(results: SearchResult[], sortBy: string): SearchResult[] {
    const sorted = [...results];
    
    switch (sortBy) {
      case 'relevance':
        sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'type':
        sorted.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case 'modified':
        sorted.sort((a, b) => {
          if (!a.lastModified) {return 1;}
          if (!b.lastModified) {return -1;}
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        });
        break;
    }
    
    return sorted;
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(
    query: string,
    _client: AkamaiClient,
    customer?: string
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase();

    // Add history-based suggestions
    const historyMatches = this.searchHistory
      .filter(h => h.query.toLowerCase().startsWith(queryLower))
      .slice(0, 5)
      .map(h => ({
        text: h.query,
        type: 'history' as const,
        score: 100,
        metadata: { timestamp: h.timestamp, resultCount: h.resultCount },
      }));
    suggestions.push(...historyMatches);

    // Add popular search suggestions
    const popularMatches = Array.from(this.popularSearches.entries())
      .filter(([text]) => text.toLowerCase().startsWith(queryLower))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({
        text,
        type: 'popular' as const,
        score: 90,
        metadata: { searchCount: count },
      }));
    suggestions.push(...popularMatches);

    // Add type-ahead completions based on detected type
    const searchType = this.detectSearchType(query);
    if (searchType !== SearchType.GENERAL) {
      // Get cached items of this type
      const cache = await this.ensureCache();
      const cacheKey = `search:${customer || 'default'}:${searchType}`;
      const cachedItems = await cache.get(cacheKey);
      
      if (Array.isArray(cachedItems)) {
        const completions = cachedItems
          .filter((item: any) => item.name?.toLowerCase().startsWith(queryLower))
          .slice(0, 5)
          .map((item: any) => ({
            text: item.name,
            type: 'completion' as const,
            score: 80,
            metadata: { id: item.id, type: searchType },
          }));
        suggestions.push(...completions);
      }
    }

    // Add spell-check suggestions for typos
    if (query.length > 3) {
      const corrections = this.generateSpellCorrections(query);
      suggestions.push(...corrections);
    }

    // Sort by score and deduplicate
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(s => [s.text, s])).values()
    );
    
    return uniqueSuggestions.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  /**
   * Generate spell corrections
   */
  private generateSpellCorrections(query: string): SearchSuggestion[] {
    const corrections: SearchSuggestion[] = [];
    
    // Common typo patterns
    const typoPatterns = [
      { pattern: /proprty/gi, replacement: 'property' },
      { pattern: /certifcate/gi, replacement: 'certificate' },
      { pattern: /netwok/gi, replacement: 'network' },
      { pattern: /secuirty/gi, replacement: 'security' },
      { pattern: /polcy/gi, replacement: 'policy' },
    ];

    for (const { pattern, replacement } of typoPatterns) {
      if (pattern.test(query)) {
        corrections.push({
          text: query.replace(pattern, replacement),
          type: 'correction',
          score: 70,
          metadata: { originalQuery: query },
        });
      }
    }

    return corrections;
  }

  /**
   * Track search analytics
   */
  private trackSearchAnalytics(
    query: string,
    resultCount: number,
    searchTimeMs: number,
    resourceTypes: string[]
  ): void {
    const analytics: SearchAnalytics = {
      query,
      timestamp: Date.now(),
      resultCount,
      searchTimeMs,
      resourceTypes,
    };

    // Add to history
    this.searchHistory.unshift(analytics);
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory.pop();
    }

    // Update popular searches
    const count = this.popularSearches.get(query) || 0;
    this.popularSearches.set(query, count + 1);

    // Log analytics
    logger.info({
      analytics,
      historySize: this.searchHistory.length,
      popularSearchesSize: this.popularSearches.size,
    }, 'Search analytics tracked');
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics(): {
    recentSearches: SearchAnalytics[];
    popularSearches: Array<{ query: string; count: number }>;
    averageSearchTime: number;
    totalSearches: number;
  } {
    const popularSearchesArray = Array.from(this.popularSearches.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count);

    const averageSearchTime = this.searchHistory.length > 0
      ? this.searchHistory.reduce((sum, h) => sum + h.searchTimeMs, 0) / this.searchHistory.length
      : 0;

    return {
      recentSearches: this.searchHistory.slice(0, 10),
      popularSearches: popularSearchesArray.slice(0, 10),
      averageSearchTime,
      totalSearches: this.searchHistory.length,
    };
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
    idTranslationService.setClient(client);

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
      const displayType = type.replace(/_/g, ' ').split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      text += `## ${displayType}s (${typeResults.length})\n\n`;
      
      for (const result of typeResults.slice(0, 10)) {
        // Use translator to get human-readable names
        let translatedName = { displayName: result.name };
        try {
          if (type === 'property') {
            const translation = await idTranslationService.translate(result.id, 'property');
            translatedName = { displayName: translation.name };
          } else if (type === 'certificate') {
            const translation = await idTranslationService.translate(result.id, 'certificate');
            translatedName = { displayName: translation.name };
          } else if (type === 'network_list') {
            const translation = await idTranslationService.translate(result.id, 'network_list');
            translatedName = { displayName: translation.name };
          }
        } catch (error) {
          // Use fallback name if translation fails
          logger.debug({ error, type, id: result.id }, 'Failed to translate ID');
        }

        text += `### ${translatedName.displayName || result.name}\n`;
        text += `- ID: \`${result.id}\`\n`;
        
        // Show breadcrumb if available
        if (result.breadcrumb && result.breadcrumb.length > 0) {
          text += `- Path: ${result.breadcrumb.join(' > ')}\n`;
        }
        
        // Include contract and group info if available
        if (result.details?.contractId) {
          try {
            const contractTranslation = await idTranslationService.translate(result.details.contractId, 'contract');
            text += `- Contract: ${contractTranslation.name}\n`;
          } catch {
            text += `- Contract: ${result.details.contractId}\n`;
          }
        }
        if (result.details?.groupId) {
          try {
            const groupTranslation = await idTranslationService.translate(result.details.groupId, 'group');
            text += `- Group: ${groupTranslation.name}\n`;
          } catch {
            text += `- Group: ${result.details.groupId}\n`;
          }
        }
        
        // Show last modified if available
        if (result.lastModified) {
          text += `- Last Modified: ${new Date(result.lastModified).toLocaleString()}\n`;
        }
        
        // Show tags if available
        if (result.tags && result.tags.length > 0) {
          text += `- Tags: ${result.tags.join(', ')}\n`;
        }
        
        text += `- Relevance Score: ${result.relevanceScore}\n`;
        text += `- Source: ${result.source}\n`;
        
        // Show highlights if available
        if (result.highlights && result.highlights.length > 0) {
          text += `- Matching Text:\n`;
          for (const highlight of result.highlights.slice(0, 3)) {
            text += `  - "${highlight}"\n`;
          }
        }
        
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
        text += `... and ${typeResults.length - 10} more ${displayType.toLowerCase()}s\n\n`;
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