/**
 * SEARCH CERTIFICATES TOOL
 * 
 * CODE KAI ARCHITECTURE:
 * Specialized search tool for Akamai CPS certificates:
 * - Search by common name (CN)
 * - Search by enrollment ID
 * - Filter by certificate type and status
 * 
 * USER EXPERIENCE:
 * - Quick certificate discovery
 * - Search by domain or ID
 * - Filter by certificate properties
 */

import { z } from 'zod';
import { BaseTool } from '../common/base-tool';
import { MCPToolResponse } from '../../types';
import { AkamaiClient } from '../../akamai-client';
import { unifiedSearch } from '../../services/unified-search-service';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('search-certificates-tool');

/**
 * Input schema for search certificates tool
 */
export const SearchCertificatesInputSchema = z.object({
  query: z.string().min(1).describe('Search query (domain name, CN, or enrollment ID)'),
  customer: z.string().optional().describe('Customer account to search within'),
  fuzzyMatch: z.boolean().optional().default(true).describe('Enable fuzzy matching for typos'),
  maxResults: z.number().optional().default(20).describe('Maximum number of results'),
  sortBy: z.enum(['relevance', 'name', 'modified']).optional().default('relevance')
    .describe('Sort order for results'),
  includeDetails: z.boolean().optional().default(true).describe('Include certificate details'),
  filters: z.object({
    status: z.array(z.string()).optional().describe('Filter by certificate status (e.g., active, pending)'),
    certificateType: z.array(z.string()).optional().describe('Filter by type (e.g., san, wildcard)'),
    validationType: z.array(z.string()).optional().describe('Filter by validation type (e.g., dv, ov, ev)'),
    tags: z.array(z.string()).optional().describe('Filter by certificate tags'),
  }).optional().describe('Advanced filtering options'),
});

/**
 * Search Certificates Tool - Specialized certificate search
 */
// Handler function for tools registry
export async function searchCertificatesHandler(_client: AkamaiClient, args: unknown): Promise<MCPToolResponse> {
  const tool = new SearchCertificatesTool();
  return tool.execute(args);
}

export class SearchCertificatesTool extends BaseTool {
  protected readonly domain = 'search';
  name = 'search_certificates';
  description = `Search for Akamai CPS certificates by common name, domain, or enrollment ID.

Search capabilities:
- Domain/CN: "www.example.com" or "*.example.com"
- Partial domain: "example"
- Enrollment ID: "12345"

Features:
- Fuzzy matching for typos
- Filter by status, type, or validation
- Sort by relevance, name, or modification date`;

  inputSchema = SearchCertificatesInputSchema;

  async execute(args: unknown): Promise<MCPToolResponse> {
    const input = SearchCertificatesInputSchema.parse(args);
    logger.info({ input }, 'Executing certificate search');

    try {
      // Get client for the specified customer
      const client = await this.getClient(input.customer);

      // Build filters with certificate-specific options
      const filters = input.filters ? {
        ...input.filters,
        customFilters: {
          certificateType: input.filters.certificateType,
          validationType: input.filters.validationType,
        },
      } : undefined;

      // Execute search with certificate-specific options
      const response = await unifiedSearch.search(client, {
        query: input.query,
        customer: input.customer,
        resourceTypes: ['certificate'],
        fuzzyMatch: input.fuzzyMatch,
        maxResults: input.maxResults,
        sortBy: input.sortBy,
        includeDetails: input.includeDetails,
        filters,
        searchDepth: 'shallow',
        trackAnalytics: true,
      });

      logger.info({ 
        query: input.query,
      }, 'Certificate search completed successfully');

      return response;
    } catch (error) {
      logger.error({ error, input }, 'Certificate search failed');
      throw error;
    }
  }
}