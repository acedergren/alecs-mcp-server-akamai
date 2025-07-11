/**
 * SEARCH PROPERTIES TOOL
 * 
 * CODE KAI ARCHITECTURE:
 * Specialized search tool for Akamai properties with enhanced features:
 * - Property-specific search logic
 * - Search by name, ID, hostname, or CP code
 * - Fuzzy matching support
 * - Contract and group filtering
 * 
 * USER EXPERIENCE:
 * - Fast property discovery
 * - Multiple search criteria
 * - Intelligent result ranking
 */

import { z } from 'zod';
import { BaseTool } from '../common/base-tool';
import { MCPToolResponse } from '../../types';
import { AkamaiClient } from '../../akamai-client';
import { unifiedSearch } from '../../services/unified-search-service';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('search-properties-tool');

/**
 * Input schema for search properties tool
 */
export const SearchPropertiesInputSchema = z.object({
  query: z.string().min(1).describe('Search query (property name, ID, hostname, or CP code)'),
  customer: z.string().optional().describe('Customer account to search within'),
  fuzzyMatch: z.boolean().optional().default(false).describe('Enable fuzzy matching for typos'),
  maxResults: z.number().optional().default(20).describe('Maximum number of results'),
  sortBy: z.enum(['relevance', 'name', 'modified']).optional().default('relevance')
    .describe('Sort order for results'),
  includeDetails: z.boolean().optional().default(true).describe('Include property details'),
  filters: z.object({
    contractIds: z.array(z.string()).optional().describe('Filter by contract IDs'),
    groupIds: z.array(z.string()).optional().describe('Filter by group IDs'),
    status: z.array(z.string()).optional().describe('Filter by activation status'),
    modifiedAfter: z.string().optional().describe('Modified after date (ISO 8601)'),
    modifiedBefore: z.string().optional().describe('Modified before date (ISO 8601)'),
  }).optional().describe('Advanced filtering options'),
});

/**
 * Search Properties Tool - Specialized property search
 */
// Handler function for tools registry
export async function searchPropertiesHandler(_client: AkamaiClient, args: unknown): Promise<MCPToolResponse> {
  const tool = new SearchPropertiesTool();
  return tool.execute(args);
}

export class SearchPropertiesTool extends BaseTool {
  protected readonly domain = 'search';
  name = 'search_properties';
  description = `Search for Akamai properties by name, ID, hostname, or CP code.

Search capabilities:
- Property name: "my-website" or "prod-*"
- Property ID: "prp_123456"
- Hostname: "www.example.com"
- CP code: "123456" or "cp_123456"
- Edge hostname: "example.edgekey.net"

Features:
- Fuzzy matching for typos (optional)
- Filter by contract or group
- Sort by relevance, name, or modification date`;

  inputSchema = SearchPropertiesInputSchema;

  async execute(args: unknown): Promise<MCPToolResponse> {
    const input = SearchPropertiesInputSchema.parse(args);
    logger.info({ input }, 'Executing property search');

    try {
      // Get client for the specified customer
      const client = await this.getClient(input.customer);

      // Execute search with property-specific options
      const response = await unifiedSearch.search(client, {
        query: input.query,
        customer: input.customer,
        resourceTypes: ['property'],
        fuzzyMatch: input.fuzzyMatch,
        maxResults: input.maxResults,
        sortBy: input.sortBy,
        includeDetails: input.includeDetails,
        filters: input.filters,
        searchDepth: 'deep', // Always use deep search for properties
        trackAnalytics: true,
      });

      logger.info({ 
        query: input.query,
        filters: input.filters,
      }, 'Property search completed successfully');

      return response;
    } catch (error) {
      logger.error({ error, input }, 'Property search failed');
      throw error;
    }
  }
}