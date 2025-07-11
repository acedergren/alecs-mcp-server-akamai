/**
 * SEARCH ALL TOOL
 * 
 * CODE KAI ARCHITECTURE:
 * Universal search across all Akamai resources with advanced features:
 * - Cross-domain search (properties, DNS, certificates, etc.)
 * - Fuzzy matching for typo tolerance
 * - Advanced filtering and sorting
 * - Search analytics tracking
 * 
 * USER EXPERIENCE:
 * - Single command to search everything
 * - Smart query understanding
 * - Typo-tolerant search
 * - Rich results with context
 */

import { z } from 'zod';
import { BaseTool } from '../common/base-tool';
import { MCPToolResponse } from '../../types';
import { AkamaiClient } from '../../akamai-client';
import { unifiedSearch } from '../../services/unified-search-service';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('search-all-tool');

/**
 * Input schema for search all tool
 */
export const SearchAllInputSchema = z.object({
  query: z.string().min(1).describe('Search query string'),
  customer: z.string().optional().describe('Customer account to search within'),
  resourceTypes: z.array(z.string()).optional().describe(
    'Resource types to search (e.g., ["property", "dns", "certificate"]). Leave empty to search all types.'
  ),
  fuzzyMatch: z.boolean().optional().default(true).describe('Enable fuzzy matching for typos'),
  maxResults: z.number().optional().default(20).describe('Maximum number of results to return'),
  sortBy: z.enum(['relevance', 'name', 'type', 'modified']).optional().default('relevance')
    .describe('Sort order for results'),
  includeDetails: z.boolean().optional().default(false).describe('Include detailed information in results'),
  filters: z.object({
    contractIds: z.array(z.string()).optional().describe('Filter by contract IDs'),
    groupIds: z.array(z.string()).optional().describe('Filter by group IDs'),
    status: z.array(z.string()).optional().describe('Filter by status values'),
    modifiedAfter: z.string().optional().describe('Filter by modification date (ISO 8601)'),
    modifiedBefore: z.string().optional().describe('Filter by modification date (ISO 8601)'),
    tags: z.array(z.string()).optional().describe('Filter by tags'),
  }).optional().describe('Advanced filtering options'),
});

// Handler function for tools registry
export async function searchAllHandler(_client: AkamaiClient, args: unknown): Promise<MCPToolResponse> {
  const tool = new SearchAllTool();
  return tool.execute(args);
}

/**
 * Search All Tool - Universal search across all Akamai resources
 */
export class SearchAllTool extends BaseTool {
  protected readonly domain = 'search';
  name = 'search_all';
  description = `Search across all Akamai resources including properties, DNS zones, certificates, network lists, and security policies. 
Features include fuzzy matching for typos, advanced filtering, and smart relevance ranking.

Examples:
- Search for a property: "my-website"
- Search with typo tolerance: "certifcate example.com" (will find certificates)
- Search by ID: "prp_123456"
- Search DNS zones: "example.com"
- Filter by contract: Use filters.contractIds`;

  inputSchema = SearchAllInputSchema;

  async execute(args: unknown): Promise<MCPToolResponse> {
    const input = SearchAllInputSchema.parse(args);
    logger.info({ input }, 'Executing search all');

    try {
      // Get client for the specified customer
      const client = await this.getClient(input.customer);

      // Execute search with all options
      const response = await unifiedSearch.search(client, {
        query: input.query,
        customer: input.customer,
        resourceTypes: input.resourceTypes,
        fuzzyMatch: input.fuzzyMatch,
        maxResults: input.maxResults,
        sortBy: input.sortBy,
        includeDetails: input.includeDetails,
        filters: input.filters,
        searchDepth: 'deep',
        trackAnalytics: true,
      });

      logger.info({ 
        query: input.query,
        resourceTypes: input.resourceTypes,
      }, 'Search all completed successfully');

      return response;
    } catch (error) {
      logger.error({ error, input }, 'Search all failed');
      throw error;
    }
  }
}