/**
 * SEARCH DNS ZONES TOOL
 * 
 * CODE KAI ARCHITECTURE:
 * Specialized search tool for Akamai Edge DNS zones:
 * - Zone name and comment search
 * - Record type filtering
 * - Zone status filtering
 * 
 * USER EXPERIENCE:
 * - Quick DNS zone discovery
 * - Search by domain or description
 * - Filter by zone properties
 */

import { z } from 'zod';
import { BaseTool } from '../common/base-tool';
import { MCPToolResponse } from '../../types';
import { AkamaiClient } from '../../akamai-client';
import { unifiedSearch } from '../../services/unified-search-service';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('search-dns-zones-tool');

/**
 * Input schema for search DNS zones tool
 */
export const SearchDnsZonesInputSchema = z.object({
  query: z.string().min(1).describe('Search query (domain name or zone comment)'),
  customer: z.string().optional().describe('Customer account to search within'),
  fuzzyMatch: z.boolean().optional().default(true).describe('Enable fuzzy matching for typos'),
  maxResults: z.number().optional().default(20).describe('Maximum number of results'),
  sortBy: z.enum(['relevance', 'name', 'modified']).optional().default('relevance')
    .describe('Sort order for results'),
  includeDetails: z.boolean().optional().default(true).describe('Include zone details'),
  filters: z.object({
    status: z.array(z.string()).optional().describe('Filter by zone status'),
    modifiedAfter: z.string().optional().describe('Modified after date (ISO 8601)'),
    modifiedBefore: z.string().optional().describe('Modified before date (ISO 8601)'),
    tags: z.array(z.string()).optional().describe('Filter by zone tags'),
  }).optional().describe('Advanced filtering options'),
});

/**
 * Search DNS Zones Tool - Specialized DNS zone search
 */
// Handler function for tools registry
export async function searchDnsZonesHandler(_client: AkamaiClient, args: unknown): Promise<MCPToolResponse> {
  const tool = new SearchDnsZonesTool();
  return tool.execute(args);
}

export class SearchDnsZonesTool extends BaseTool {
  protected readonly domain = 'search';
  name = 'search_dns_zones';
  description = `Search for Akamai Edge DNS zones by domain name or zone comment.

Search capabilities:
- Domain name: "example.com" or "*.example.com"
- Partial domain: "example"
- Zone comment: "production DNS"

Features:
- Fuzzy matching for typos
- Filter by zone status
- Sort by relevance, name, or modification date`;

  inputSchema = SearchDnsZonesInputSchema;

  async execute(args: unknown): Promise<MCPToolResponse> {
    const input = SearchDnsZonesInputSchema.parse(args);
    logger.info({ input }, 'Executing DNS zone search');

    try {
      // Get client for the specified customer
      const client = await this.getClient(input.customer);

      // Execute search with DNS-specific options
      const response = await unifiedSearch.search(client, {
        query: input.query,
        customer: input.customer,
        resourceTypes: ['dns'],
        fuzzyMatch: input.fuzzyMatch,
        maxResults: input.maxResults,
        sortBy: input.sortBy,
        includeDetails: input.includeDetails,
        filters: input.filters,
        searchDepth: 'shallow', // DNS zones don't need deep search
        trackAnalytics: true,
      });

      logger.info({ 
        query: input.query,
      }, 'DNS zone search completed successfully');

      return response;
    } catch (error) {
      logger.error({ error, input }, 'DNS zone search failed');
      throw error;
    }
  }
}